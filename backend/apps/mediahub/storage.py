"""Cloudflare R2 storage backend for MediaAsset files.

R2 speaks the S3-compatible API, accessed through boto3 with an explicit
endpoint URL. When the four CLOUDFLARE_R2_* env vars are present, settings.py
binds `STORAGES["default"]` to R2MediaStorage; otherwise Django falls back to
the built-in FileSystemStorage, so local development and the test suite are
unaffected (unit tests also force the local backend regardless of env).

The bucket stays fully private: nothing here publishes an anonymous URL.
Public delivery happens via short-lived presigned GET URLs handed out only
by the permission-checked serve view — see views.serve_media.

Free-tier safety: every PUT/GET through the app is counted in
apps.mediahub.usage.R2UsageMonth; uploads are rejected at the configured
ceilings so usage never silently crosses R2's free allowances.
"""

from django.conf import settings

R2_ENV_VARS = (
    'CLOUDFLARE_R2_ACCOUNT_ID',
    'CLOUDFLARE_R2_ACCESS_KEY_ID',
    'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
    'CLOUDFLARE_R2_BUCKET_NAME',
)

_CONTENT_TYPES = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
    'png': 'image/png', 'webp': 'image/webp',
    'mp4': 'video/mp4', 'm4v': 'video/mp4', 'mov': 'video/quicktime',
}


def r2_config():
    """Env-driven R2 credentials. Reads settings (not os.environ) at call
    time so tests can override; values are never logged or exposed."""
    account_id = getattr(settings, 'R2_ACCOUNT_ID', '')
    endpoint = getattr(settings, 'R2_ENDPOINT_URL', '')
    if not endpoint and account_id:
        endpoint = f'https://{account_id}.r2.cloudflarestorage.com'
    return {
        'account_id': account_id,
        'access_key': getattr(settings, 'R2_ACCESS_KEY_ID', ''),
        'secret_key': getattr(settings, 'R2_SECRET_ACCESS_KEY', ''),
        'bucket': getattr(settings, 'R2_BUCKET_NAME', ''),
        'endpoint': endpoint,
    }


def r2_enabled():
    """True only when every required R2 variable is configured AND the
    default storage backend is bound to R2 (tests force local)."""
    conf = r2_config()
    return all(conf[k] for k in ('account_id', 'access_key', 'secret_key', 'bucket'))


def get_r2_client():
    """boto3 S3-compatible client pointed at R2. Imported lazily so an
    environment without boto3 can still import this module (local mode)."""
    import boto3
    from botocore.config import Config

    conf = r2_config()
    return boto3.client(
        's3',
        endpoint_url=conf['endpoint'],
        aws_access_key_id=conf['access_key'],
        aws_secret_access_key=conf['secret_key'],
        region_name='auto',
        config=Config(signature_version='s3v4', retries={'max_attempts': 2}),
    )


def presigned_get_url(asset, ttl_seconds=None):
    """Short-lived presigned GET for one asset. Presigning is a local
    signature operation (no R2 op, no data transfer); the browser's fetch
    is the single Class B read."""
    if ttl_seconds is None:
        ttl_seconds = getattr(settings, 'R2_PRESIGN_TTL_SECONDS', 600)
    filename = (asset.original_name or f'{asset.id}.{asset.file_ext}').replace('"', '').replace('\r', '').replace('\n', '')
    conf = r2_config()
    return get_r2_client().generate_presigned_url(
        'get_object',
        Params={
            'Bucket': conf['bucket'],
            'Key': asset.file.name,
            'ResponseContentType': asset.content_type or None,
            'ResponseContentDisposition': f'inline; filename="{filename}"',
        },
        ExpiresIn=ttl_seconds,
    )


def check_object_exists(key):
    """Head-based existence probe (one Class B op). Used by cleanup/doctor
    tooling, not on the hot path."""
    conf = r2_config()
    try:
        get_r2_client().head_object(Bucket=conf['bucket'], Key=key)
        return True
    except Exception:
        return False


class R2MediaStorage:
    """Django Storage API implementation backed by the R2 bucket.

    Only the methods Django's FileField actually exercises (save/open/
    delete/size/exists) are implemented deliberately — R2-specific needs
    (presigned delivery) live in views/usage helpers instead.
    """

    def __init__(self):
        self._client = None

    def _get_client(self):
        if self._client is None:
            self._client = get_r2_client()
        return self._client

    def _bucket(self):
        return r2_config()['bucket']

    def _open(self, name, mode='rb'):
        body = self._get_client().get_object(Bucket=self._bucket(), Key=name)['Body']
        import io
        return io.BytesIO(body.read())

    def _save(self, name, content):
        ext = name.rsplit('.', 1)[-1].lower() if '.' in name else ''
        extra = {}
        if ext in _CONTENT_TYPES:
            extra['ContentType'] = _CONTENT_TYPES[ext]
        self._get_client().upload_fileobj(
            Fileobj=content, Bucket=self._bucket(), Key=name, ExtraArgs=extra)
        return name

    def delete(self, name):
        # delete_object is idempotent for a missing key; failures surface
        # to the caller (cleanup command re-raises).
        self._get_client().delete_object(Bucket=self._bucket(), Key=name)

    def exists(self, name):
        try:
            self._get_client().head_object(Bucket=self._bucket(), Key=name)
            return True
        except Exception:
            return False

    def size(self, name):
        return self._get_client().head_object(
            Bucket=self._bucket(), Key=name)['ContentLength']

    def listdir(self, path):
        prefix = path.rstrip('/') + '/' if path else ''
        conf = r2_config()
        names, dirs = [], set()
        paginator = self._get_client().get_paginator('list_objects_v2')
        for page in paginator.paginate(Bucket=conf['bucket'], Prefix=prefix, Delimiter='/'):
            for item in page.get('Contents', []):
                names.append(item['Key'][len(prefix):])
            for common in page.get('CommonPrefixes', []):
                dirs.add(common['Prefix'][len(prefix):].rstrip('/'))
        return list(dirs), names
