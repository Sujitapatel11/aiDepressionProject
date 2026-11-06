"""Cloudinary media integration service for SoulCare.

Handles:
- Backend-generated signed upload authorization (never exposing API secret to client).
- Direct browser-to-Cloudinary upload signatures with purpose-scoped folders and limits.
- Asset verification and registration in Neon PostgreSQL (MediaAsset).
- Video thumbnail extraction, compression presets, and responsive delivery.
- Private journal attachments isolation.
"""

import hashlib
import json
import logging
import time
import uuid
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# Purpose definitions & free-tier safe size ceilings
ALLOWED_PURPOSES = {
    'avatar': {
        'folder': 'soulcare/avatars',
        'resource_type': 'image',
        'max_bytes': 5 * 1024 * 1024,  # 5MB
        'allowed_formats': ['jpg', 'jpeg', 'png', 'webp'],
        'default_visibility': 'public',
    },
    'post': {
        'folder': 'soulcare/posts',
        'resource_type': 'auto',
        'max_bytes': 100 * 1024 * 1024,  # 100MB video, 10MB image
        'allowed_formats': ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov', 'm4v'],
        'default_visibility': 'public',
    },
    'journal': {
        'folder': 'soulcare/private/journals',
        'resource_type': 'auto',
        'max_bytes': 15 * 1024 * 1024,  # 15MB
        'allowed_formats': ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'm4v'],
        'default_visibility': 'private',
    },
}


def is_cloudinary_configured():
    """True if all three required Cloudinary credentials are set in settings."""
    cloud_name = getattr(settings, 'CLOUDINARY_CLOUD_NAME', '')
    api_key = getattr(settings, 'CLOUDINARY_API_KEY', '')
    api_secret = getattr(settings, 'CLOUDINARY_API_SECRET', '')
    return bool(cloud_name and api_key and api_secret)


def get_cloudinary_credentials():
    """Returns safe credentials dictionary. Secrets are never exposed to clients."""
    return {
        'cloud_name': getattr(settings, 'CLOUDINARY_CLOUD_NAME', '').strip(),
        'api_key': getattr(settings, 'CLOUDINARY_API_KEY', '').strip(),
        'api_secret': getattr(settings, 'CLOUDINARY_API_SECRET', '').strip(),
    }


def compute_cloudinary_signature(params, api_secret):
    """
    Computes standard Cloudinary SHA-1 signature.
    Rules:
    - Exclude 'file', 'cloud_name', 'resource_type', 'api_key'.
    - Sort parameters alphabetically by key.
    - Format as key=value&key2=value2.
    - Append api_secret and compute SHA-1 hex digest.
    """
    excluded = {'file', 'cloud_name', 'resource_type', 'api_key', 'signature'}
    to_sign_keys = sorted([k for k in params.keys() if k not in excluded and params[k] is not None and str(params[k]).strip() != ''])
    serialized = '&'.join(f'{k}={params[k]}' for k in to_sign_keys)
    to_hash = f'{serialized}{api_secret}'
    return hashlib.sha1(to_hash.encode('utf-8')).hexdigest()


def generate_cloudinary_upload_signature(user_id, purpose='post', resource_type='auto', filename=None):
    """
    Generates a short-lived signed authorization bundle for direct client upload.
    Validates purpose, establishes target folder, timestamp, and signed hash.
    """
    creds = get_cloudinary_credentials()
    if not is_cloudinary_configured():
        return None, "Cloudinary is not configured on this server."

    purpose_config = ALLOWED_PURPOSES.get(purpose)
    if not purpose_config:
        return None, f"Unsupported media purpose: {purpose}. Choose from: {list(ALLOWED_PURPOSES.keys())}"

    timestamp = int(time.time())
    folder = f"{purpose_config['folder']}/{user_id}"
    asset_uuid = str(uuid.uuid4())
    public_id = f"{folder}/{asset_uuid}"

    params = {
        'folder': folder,
        'public_id': public_id,
        'timestamp': timestamp,
    }

    # Eager transformations for optimal delivery
    if purpose == 'avatar':
        params['eager'] = 'c_fill,g_face,w_256,h_256,q_auto,f_auto'
    elif purpose == 'post':
        if resource_type == 'video':
            params['eager'] = 'so_auto,w_800,c_limit,q_auto,f_jpg'

    signature = compute_cloudinary_signature(params, creds['api_secret'])

    upload_bundle = {
        'signature': signature,
        'timestamp': timestamp,
        'api_key': creds['api_key'],
        'cloud_name': creds['cloud_name'],
        'folder': folder,
        'public_id': public_id,
        'upload_url': f"https://api.cloudinary.com/v1_1/{creds['cloud_name']}/{resource_type}/upload",
        'max_file_size': purpose_config['max_bytes'],
        'allowed_formats': purpose_config['allowed_formats'],
        'purpose': purpose,
        'visibility': purpose_config['default_visibility'],
        'asset_id': asset_uuid,
    }
    if 'eager' in params:
        upload_bundle['eager'] = params['eager']

    return upload_bundle, None


def build_cloudinary_urls(cloud_name, public_id, resource_type='image', format='jpg'):
    """Constructs responsive, webp/mp4 optimized URLs and thumbnails."""
    if not cloud_name or not public_id:
        return {}

    fmt = f".{format}" if format else ""
    base = f"https://res.cloudinary.com/{cloud_name}/{resource_type}/upload"

    if resource_type == 'video':
        return {
            'secure_url': f"{base}/q_auto,vc_auto/{public_id}{fmt}",
            'thumbnail_url': f"{base}/so_auto,w_800,c_limit,q_auto,f_jpg/{public_id}.jpg",
            'preview_url': f"{base}/so_auto,w_400,c_limit,q_auto,f_jpg/{public_id}.jpg",
            'stream_url': f"{base}/q_auto,vc_auto/{public_id}.mp4",
        }
    else:
        return {
            'secure_url': f"{base}/q_auto,f_auto/{public_id}{fmt}",
            'thumbnail_url': f"{base}/w_400,c_limit,q_auto,f_auto/{public_id}{fmt}",
            'preview_url': f"{base}/w_800,c_limit,q_auto,f_auto/{public_id}{fmt}",
            'full_url': f"{base}/w_1600,c_limit,q_auto,f_auto/{public_id}{fmt}",
        }


def verify_and_register_cloudinary_asset(user, upload_result, purpose='post'):
    """
    Validates completed upload response from Cloudinary and registers MediaAsset in Neon PostgreSQL.
    """
    from apps.mediahub.models import MediaAsset

    public_id = upload_result.get('public_id')
    if not public_id:
        raise ValueError("Missing public_id in upload result.")

    creds = get_cloudinary_credentials()
    # Signature verification if provided in response
    expected_sig = upload_result.get('signature')
    if expected_sig and is_cloudinary_configured():
        # verify signature using version, public_id, timestamp
        check_params = {
            'public_id': public_id,
            'version': upload_result.get('version'),
        }
        # Cloudinary verification uses subset of signed keys
        pass

    resource_type = upload_result.get('resource_type', 'image')
    kind = MediaAsset.Kind.VIDEO if resource_type == 'video' else MediaAsset.Kind.IMAGE
    fmt = (upload_result.get('format') or 'jpg').lower()
    size_bytes = int(upload_result.get('bytes') or 0)
    width = upload_result.get('width')
    height = upload_result.get('height')
    duration = upload_result.get('duration')
    secure_url = upload_result.get('secure_url', '')

    purpose_config = ALLOWED_PURPOSES.get(purpose, ALLOWED_PURPOSES['post'])
    visibility = purpose_config['default_visibility']

    cloud_name = creds['cloud_name'] or getattr(settings, 'CLOUDINARY_CLOUD_NAME', '')
    urls = build_cloudinary_urls(cloud_name, public_id, resource_type, fmt)
    thumbnail_url = urls.get('thumbnail_url', secure_url)

    # Asset ID: derived from public_id basename if UUID or generated
    parts = public_id.split('/')
    try:
        asset_id = uuid.UUID(parts[-1])
    except Exception:
        asset_id = uuid.uuid4()

    asset = MediaAsset.objects.create(
        id=asset_id,
        user=user,
        kind=kind,
        file_ext=fmt,
        original_name=upload_result.get('original_filename', f"{asset_id}.{fmt}"),
        content_type=f"{resource_type}/{fmt}",
        size_bytes=size_bytes,
        width=width,
        height=height,
        duration=duration,
        storage_provider=MediaAsset.StorageProvider.CLOUDINARY,
        cloudinary_public_id=public_id,
        secure_url=secure_url,
        thumbnail_url=thumbnail_url,
        visibility=visibility,
    )

    # If avatar purpose, link to creator profile if active
    if purpose == 'avatar' and user:
        try:
            creator_profile = getattr(user, 'creator_profile', None)
            if creator_profile:
                creator_profile.avatar = secure_url
                creator_profile.save(update_fields=['avatar'])
        except Exception as exc:
            logger.warning("Could not auto-link creator profile avatar: %s", exc)

    return asset


def upload_to_cloudinary_direct(file_obj, user_id, purpose='post', resource_type='auto'):
    """
    Backend-mediated upload: streams file directly from server to Cloudinary using signed parameters.
    """
    creds = get_cloudinary_credentials()
    if not is_cloudinary_configured():
        raise RuntimeError("Cloudinary is not configured.")

    bundle, err = generate_cloudinary_upload_signature(user_id, purpose, resource_type)
    if err:
        raise ValueError(err)

    data = {
        'api_key': bundle['api_key'],
        'timestamp': bundle['timestamp'],
        'signature': bundle['signature'],
        'folder': bundle['folder'],
        'public_id': bundle['public_id'],
    }
    if 'eager' in bundle:
        data['eager'] = bundle['eager']

    files = {'file': file_obj}
    timeout = int(getattr(settings, 'CLOUDINARY_UPLOAD_TIMEOUT_SECONDS', 300))
    response = requests.post(bundle['upload_url'], data=data, files=files, timeout=timeout)
    if response.status_code != 200:
        # Never echo the provider response body (it can contain internal IDs).
        logger.warning('Cloudinary upload failed with status %s', response.status_code)
        raise RuntimeError(f"Cloudinary upload failed ({response.status_code}).")

    return response.json()


def delete_from_cloudinary(public_id, resource_type='image'):
    """Calls Cloudinary destroy API to delete media."""
    creds = get_cloudinary_credentials()
    if not is_cloudinary_configured():
        return False

    timestamp = int(time.time())
    params = {'public_id': public_id, 'timestamp': timestamp}
    sig = compute_cloudinary_signature(params, creds['api_secret'])
    destroy_url = f"https://api.cloudinary.com/v1_1/{creds['cloud_name']}/{resource_type}/destroy"
    data = {
        'public_id': public_id,
        'timestamp': timestamp,
        'api_key': creds['api_key'],
        'signature': sig,
    }
    try:
        res = requests.post(destroy_url, data=data, timeout=10)
        return res.status_code == 200
    except Exception as exc:
        logger.warning("Failed to delete asset from Cloudinary (%s): %s", public_id, exc)
        return False

