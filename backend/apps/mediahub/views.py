import logging
import re

from django.conf import settings
from django.core.files.base import ContentFile
from django.db.models import Q
from django.http import HttpResponse, JsonResponse, HttpResponseRedirect, StreamingHttpResponse
from django.utils import timezone
from django.utils.http import content_disposition_header
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes, throttle_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.identity.models import CreatorPost

from config.throttles import MediaUploadRateThrottle

from .media_validation import ValidationError, validate_and_prepare
from .models import MediaAsset
from .serializers import MediaAssetSerializer
from .signing import verify_media_token
from .storage import presigned_get_url, r2_enabled
from . import usage
from .cloudinary_service import (
    verify_and_register_cloudinary_asset,
    upload_to_cloudinary_direct,
    delete_from_cloudinary,
    is_cloudinary_configured,
)

logger = logging.getLogger(__name__)

MAX_FILES_PER_UPLOAD = settings.MEDIA_MAX_FILES_PER_UPLOAD
RANGE_RE = re.compile(r'^bytes=(\d*)-(\d*)$')

_EXTENSION_CONTENT_TYPES = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp',
    'mp4': 'video/mp4', 'm4v': 'video/mp4', 'mov': 'video/quicktime',
}


def _storage_error_detail(kind):
    return (
        f'The {kind} uploaded but could not be stored. '
        'Media storage is unavailable; please try again shortly.'
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([MediaUploadRateThrottle])
@parser_classes([MultiPartParser])
def upload_media(request):
    """Multipart upload endpoint. Accepts one or more `files`; each file is
    content-validated, re-encoded (images), stored in the durable media backend
    (Cloudinary or R2), and returned as an asset ready to be attached to a post.
    Nothing here fabricates success — files that fail validation or storage are
    reported per-item in `errors`."""
    files = request.FILES.getlist('files')
    if not files:
        return Response({'detail': 'No files were provided.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(files) > MAX_FILES_PER_UPLOAD:
        return Response(
            {'detail': f'At most {MAX_FILES_PER_UPLOAD} files per upload.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    prepared_items, errors = [], []
    for file_obj in files:
        try:
            prepared_items.append(validate_and_prepare(file_obj))
        except ValidationError as exc:
            errors.append({'file': file_obj.name, 'detail': exc.detail})
        except Exception:
            logger.exception('Unexpected media validation failure for %s', file_obj.name)
            errors.append({'file': file_obj.name, 'detail': 'This file could not be validated.'})

    # Free-tier gate (R2 mode): refuse BEFORE any object is written.
    if usage.uploads_blocked(sum(p['size_bytes'] for p in prepared_items)):
        return Response(
            {
                'detail': usage.blocked_reason(sum(p['size_bytes'] for p in prepared_items)),
                'usage': usage.usage_snapshot(),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    use_cloudinary = is_cloudinary_configured()
    uploaded = []
    for prepared in prepared_items:
        try:
            if use_cloudinary:
                asset = _store_in_cloudinary(prepared, request.user)
            else:
                asset = _store_in_default_storage(prepared, request.user)
            uploaded.append(asset)
        except Exception:
            logger.exception('Media storage failed for %s', prepared['original_name'])
            errors.append({
                'file': prepared['original_name'],
                'detail': _storage_error_detail(prepared['kind']),
            })

    if uploaded and r2_enabled() and not use_cloudinary:
        usage.record_put(n=len(uploaded))

    response_payload = {
        'uploaded': MediaAssetSerializer(uploaded, many=True).data,
        'errors': errors,
    }
    if usage.usage_snapshot()['warnings']:
        response_payload['usage'] = usage.usage_snapshot()
    if not uploaded:
        return Response(response_payload, status=status.HTTP_400_BAD_REQUEST)
    return Response(response_payload, status=status.HTTP_201_CREATED)


def _store_in_default_storage(prepared, user):
    asset = MediaAsset(
        id=prepared['id'],
        user=user,
        file_ext=prepared['file_ext'],
        kind=prepared['kind'],
        original_name=prepared['original_name'],
        content_type=prepared['content_type'],
        size_bytes=prepared['size_bytes'],
        width=prepared['width'],
        height=prepared['height'],
        storage_provider=MediaAsset.StorageProvider.R2 if r2_enabled() else MediaAsset.StorageProvider.LOCAL,
    )
    filename = f"{asset.id}.{asset.file_ext}"
    if prepared['data'] is not None:
        payload = ContentFile(prepared['data'], name=filename)
    else:
        payload = prepared['file_obj']
    # FileField.save streams the payload to the configured storage backend and
    # only persists the row after the object write succeeds.
    asset.file.save(filename, payload, save=True)
    return asset


def _store_in_cloudinary(prepared, user):
    filename = f"{prepared['id']}.{prepared['file_ext']}"
    if prepared['data'] is not None:
        upload_source = ContentFile(prepared['data'], name=filename)
    else:
        upload_source = prepared['file_obj']
    resource_type = 'video' if prepared['kind'] == MediaAsset.Kind.VIDEO else 'image'
    result = upload_to_cloudinary_direct(
        upload_source, user.id, purpose='post', resource_type=resource_type,
    )
    if not result.get('secure_url'):
        raise RuntimeError('Cloudinary did not return a secure delivery URL.')
    asset = verify_and_register_cloudinary_asset(user, result, purpose='post')
    # Keep the validated MIME type (Cloudinary's resource_type/format pair is
    # not always a valid HTTP Content-Type, e.g. video/mov).
    asset.content_type = prepared['content_type']
    asset.file_ext = prepared['file_ext']
    asset.save(update_fields=['content_type', 'file_ext'])
    return asset


def _content_type_for(asset):
    content_type = (asset.content_type or '').strip()
    if content_type and '/' in content_type:
        return content_type
    return _EXTENSION_CONTENT_TYPES.get((asset.file_ext or '').lower(), 'application/octet-stream')


def serve_media(request, asset_id):
    """Permission-checked media serving. Access rules mirror post visibility:
    orphan assets are visible to their uploader (or staff) only, drafts to
    the owner only, hidden community posts stay blocked, published posts are
    public, and SoulTube room videos are visible to room participants.

    Cloudinary: 302 to the object's secure URL after the permission check.
    R2: 302 to a short-TTL presigned GET (R2 handles Range natively).
    Local: stream bytes directly with hand-rolled Range support."""
    asset = MediaAsset.objects.filter(id=asset_id).select_related(
        'creator_post__creator',
        'community_post',
        'journal_entry',
    ).first()
    user = _request_user(request)
    signed_user_id = verify_media_token(request.GET.get('at'), asset_id)
    if not asset or not _asset_access_allowed(asset, user, signed_user_id):
        return JsonResponse({'detail': 'Not found.'}, status=404)

    if asset.storage_provider == MediaAsset.StorageProvider.CLOUDINARY:
        target = asset.secure_url
        if target:
            response = HttpResponseRedirect(target)
            response['Cache-Control'] = 'private, max-age=300'
            return response
        return JsonResponse({'detail': 'Media file is unavailable.'}, status=404)

    if r2_enabled():
        try:
            redirect_url = presigned_get_url(asset)
        except Exception:
            logger.exception('Could not presign media %s', asset.id)
            return JsonResponse({'detail': 'Media storage is temporarily unavailable.'}, status=503)
        response = HttpResponseRedirect(redirect_url)
        response['Cache-Control'] = 'private, max-age=300'
        usage.record_get()
        return response

    try:
        media_file = asset.file.open('rb')
    except (FileNotFoundError, ValueError, OSError):
        logger.warning('Stored media object is missing for asset %s', asset.id)
        return JsonResponse({'detail': 'Media file is missing from storage.'}, status=404)

    return _stream_file(request, media_file, asset)


def _request_user(request):
    """Best-effort user resolution for a plain (non-DRF) view: the session
    user for browser requests, or the JWT Bearer user for programmatic ones.
    Anonymous requests resolve to Django's AnonymousUser."""
    user = getattr(request, 'user', None)
    if user is not None and getattr(user, 'is_authenticated', False):
        return user
    try:
        jwt_user, _ = JWTAuthentication().authenticate(request)
    except Exception:
        jwt_user = None
    return jwt_user or user


def _is_authenticated(user):
    return user is not None and getattr(user, 'is_authenticated', False)


def _watch_room_access(asset, user):
    """True when this video belongs to an active SoulTube room the user is in."""
    if not _is_authenticated(user):
        return False
    try:
        from apps.soultube.models import WatchRoom, WatchRoomParticipant
        return WatchRoomParticipant.objects.filter(
            room__video_asset=asset,
            room__status=WatchRoom.Status.ACTIVE,
            room__expires_at__gt=timezone.now(),
            user=user,
        ).exists()
    except Exception:
        return False


def _asset_access_allowed(asset, user, signed_user_id=None):
    # Private journal media is strictly owner-only (or staff).
    if asset.journal_entry_id or asset.visibility == MediaAsset.Visibility.PRIVATE:
        if signed_user_id is not None and asset.user_id == signed_user_id:
            return True
        return _is_authenticated(user) and (user.is_staff or asset.user_id == user.id)

    # A valid signed preview token binds this exact asset to its uploader.
    if signed_user_id is not None and asset.user_id == signed_user_id:
        return True

    if asset.creator_post_id:
        post = asset.creator_post
        if post.deleted_at:
            return False
        if post.status == CreatorPost.Status.PUBLISHED and post.published_at and \
                post.published_at <= timezone.now():
            return True
        return _is_authenticated(user) and (user.is_staff or post.creator.user_id == user.id)

    if asset.community_post_id:
        post = asset.community_post
        if not post.is_hidden:
            return True
        return _is_authenticated(user) and (user.is_staff or post.user_id == user.id)

    if _watch_room_access(asset, user):
        return True

    # Orphan: only the uploader (or staff) may fetch/preview it.
    return _is_authenticated(user) and (user.is_staff or asset.user_id == user.id)


def _parse_range(header, total):
    match = RANGE_RE.match(header or '')
    if not match or total <= 0:
        return None
    start_text, end_text = match.groups()
    start = int(start_text) if start_text else 0
    end = int(end_text) if end_text else total - 1
    if start_text == '' and end_text:
        # suffix form: bytes=-N → last N bytes
        start = max(total - end, 0)
        end = total - 1
    if start > end or start >= total:
        return None
    end = min(end, total - 1)
    return start, end


def _stream_file(request, media_file, asset):
    """Stream with HTTP Range support (Django 4.2 FileResponse lacks it),
    which browsers need for video seeking and partial playback."""
    total = media_file.size
    content_type = _content_type_for(asset)
    range_header = request.META.get('HTTP_RANGE')
    span = _parse_range(range_header, total)

    if span is None and range_header:
        # Malformed/unsatisfiable range → tell the client the real extent.
        media_file.close()
        response = JsonResponse({'detail': 'Requested range not satisfiable.'}, status=416)
        response['Content-Range'] = f'bytes */{total}'
        response['Accept-Ranges'] = 'bytes'
        return response

    if span is None:
        start, end = 0, total - 1
        status_code = 200
    else:
        start, end = span
        status_code = 206

    filename = (asset.original_name or f'{asset.id}.{asset.file_ext}').replace('\r', '').replace('\n', '')
    common_headers = {
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': content_disposition_header(False, filename),
        'X-Content-Type-Options': 'nosniff',
    }

    if request.method == 'HEAD':
        media_file.close()
        response = HttpResponse(status=status_code, content_type=content_type)
        for key, value in common_headers.items():
            response[key] = value
        response['Content-Length'] = max(end - start + 1, 0)
        if status_code == 206:
            response['Content-Range'] = f'bytes {start}-{end}/{total}'
        return response

    def chunk_reader():
        try:
            media_file.seek(start)
            remaining = end - start + 1
            while remaining > 0:
                chunk = media_file.read(min(64 * 1024, remaining))
                if not chunk:
                    break
                remaining -= len(chunk)
                yield chunk
        finally:
            media_file.close()

    response = StreamingHttpResponse(chunk_reader(), status=status_code, content_type=content_type)
    for key, value in common_headers.items():
        response[key] = value
    if status_code == 206:
        response['Content-Range'] = f'bytes {start}-{end}/{total}'
    response['Content-Length'] = end - start + 1
    return response


class MediaUploadPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 50


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_my_media(request):
    """The caller's own uploads, newest first.

    Used by the SoulTube host picker to choose a video they uploaded. Only
    assets owned by the requester are ever returned, and draft preview URLs
    stay owner-signed. `?kind=video|image` narrows the list; unknown values are
    rejected instead of silently returning everything.
    """
    kind = request.query_params.get('kind')
    if kind and kind not in MediaAsset.Kind.values:
        return Response({'kind': ['Choose image or video.']},
                        status=status.HTTP_400_BAD_REQUEST)

    assets = MediaAsset.objects.filter(user=request.user).filter(
        Q(storage_provider=MediaAsset.StorageProvider.CLOUDINARY, secure_url__gt='')
        | (Q(file__isnull=False) & ~Q(file=''))
    ).order_by('-created_at')
    if kind:
        assets = assets.filter(kind=kind)

    paginator = MediaUploadPagination()
    page = paginator.paginate_queryset(assets, request)
    serializer = MediaAssetSerializer(page, many=True, context={'request': request})
    return paginator.get_paginated_response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def storage_usage(request):
    """Staff-only free-tier monitoring: projected R2 usage, ceilings and
    warnings for the current calendar month. Non-staff get 403 visibly
    (this is operational data, not user content)."""
    if not request.user.is_staff:
        return Response({'detail': 'Staff only.'}, status=status.HTTP_403_FORBIDDEN)
    return Response(usage.usage_snapshot())


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_orphan_media(request, asset_id):
    """Uploader-side removal of a not-yet-published asset (e.g. after the
    user removes it from the composer before posting)."""
    asset = MediaAsset.objects.filter(id=asset_id, user=request.user).first()
    if not asset or asset.creator_post_id or asset.community_post_id:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    if asset.storage_provider == MediaAsset.StorageProvider.CLOUDINARY and asset.cloudinary_public_id:
        resource_type = 'video' if asset.kind == MediaAsset.Kind.VIDEO else 'image'
        delete_from_cloudinary(asset.cloudinary_public_id, resource_type)
    elif asset.file:
        asset.file.delete(save=False)
    asset.delete()
    return Response({'detail': 'Deleted.'}, status=status.HTTP_200_OK)
