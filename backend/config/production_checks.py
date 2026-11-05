"""Fail-fast configuration validation for production deployments.

Django silently degrades when optional environment variables are missing:
media falls back to local disk, channels fall back to an in-memory layer, and
the database falls back to a local SQLite file. On an ephemeral platform
filesystem those defaults lose data on the next redeploy and break WebSocket
fan-out across workers. These checks convert that silent degradation into a
startup error whenever DEBUG is off, while leaving local development and the
test suite untouched.

Every failure names the exact environment variable to configure. Each check
can be relaxed deliberately with the documented opt-out variable, so the
operators always make an explicit choice instead of inheriting a silent one.
"""

from django.core.exceptions import ImproperlyConfigured

# Same names as apps.mediahub.storage.R2_ENV_VARS (kept here so settings can
# validate before the mediahub app is importable).
R2_ENV_VARS = (
    'CLOUDFLARE_R2_ACCOUNT_ID',
    'CLOUDFLARE_R2_ACCESS_KEY_ID',
    'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
    'CLOUDFLARE_R2_BUCKET_NAME',
)

DEFAULT_DEV_SECRET_KEY = 'dev-secret-key-unsafe-change-in-prod'
DEFAULT_DB_PASSWORD = 'postgres'

_TRUE_VALUES = {'1', 'true', 'yes', 'on'}


def env_flag(value):
    """Parse an opt-out style environment flag. Anything unrecognised is off."""
    return str(value or '').strip().lower() in _TRUE_VALUES


def validate_media_storage(
    *,
    debug,
    running_tests,
    r2_configured,
    r2_partial,
    allow_local_storage,
    media_root,
):
    """Reject a production deploy that would store uploads on ephemeral disk.

    - Fully configured R2 is the supported production path.
    - A partially configured R2 is always an error in production (half-set
      credentials indicate a broken deploy, not an intentional local setup).
    - Local storage is accepted only with the explicit
      SOULCARE_ALLOW_LOCAL_MEDIA_STORAGE opt-in (for a mounted persistent
      volume).
    """
    if debug or running_tests:
        return
    if r2_configured:
        return
    if r2_partial:
        missing = ' / '.join(R2_ENV_VARS)
        raise ImproperlyConfigured(
            'Media storage is partially configured: only some of '
            f'{missing} are set. Set all four Cloudflare R2 values '
            '(the private bucket is the supported production media store) or '
            'unset all of them and explicitly opt in to local storage with '
            'SOULCARE_ALLOW_LOCAL_MEDIA_STORAGE=true.'
        )
    if allow_local_storage:
        return
    raise ImproperlyConfigured(
        'Media storage is not configured for production: no Cloudflare R2 '
        f'credentials are set, so uploads would be written to {media_root} on '
        'the application filesystem and lost on the next redeploy. Configure '
        'CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, '
        'CLOUDFLARE_R2_SECRET_ACCESS_KEY and CLOUDFLARE_R2_BUCKET_NAME. If this '
        'deployment intentionally uses a persistent mounted volume, set '
        'SOULCARE_ALLOW_LOCAL_MEDIA_STORAGE=true.'
    )


def validate_production_security(
    *,
    debug,
    running_tests,
    secret_key,
    allowed_hosts,
    cors_allow_all_origins,
    redis_url,
    allow_in_memory_channels,
    db_engine,
    db_password,
):
    """Reject production deployments with unsafe or silently-degraded config."""
    if debug or running_tests:
        return

    problems = []

    if not secret_key:
        problems.append(
            'SECRET_KEY is not set. Generate a long random value and inject it '
            'through the deployment environment.'
        )
    elif secret_key == DEFAULT_DEV_SECRET_KEY:
        problems.append(
            'SECRET_KEY is the development placeholder. Set a unique random '
            'value in the deployment environment.'
        )

    hosts = [h for h in (allowed_hosts or []) if h]
    if not hosts:
        problems.append('ALLOWED_HOSTS is empty. Set the production hostname(s).')
    elif '*' in hosts:
        problems.append(
            'ALLOWED_HOSTS contains "*" (host-header wildcard). List the explicit '
            'production hostname(s) instead.'
        )

    if cors_allow_all_origins:
        problems.append(
            'CORS_ALLOW_ALL_ORIGINS must be disabled in production. Set '
            'CORS_ALLOWED_ORIGINS / FRONTEND_URL instead.'
        )

    if not (redis_url or '').strip() and not allow_in_memory_channels:
        problems.append(
            'REDIS_URL is not set, so Django Channels would use the in-memory '
            'layer: WebSocket messages are not shared across workers and are '
            'lost on restart. Set REDIS_URL, or explicitly set '
            'SOULCARE_ALLOW_IN_MEMORY_CHANNELS=true if a single in-memory '
            'worker is an intentional choice.'
        )

    if 'sqlite' in (db_engine or ''):
        problems.append(
            'The production database is SQLite on the application filesystem. '
            'Configure DATABASE_URL (or DB_NAME + DB_USER + DB_PASSWORD with '
            'DB_ENGINE=postgresql) so user data survives redeploys.'
        )
    elif (db_password or '') == DEFAULT_DB_PASSWORD:
        problems.append(
            'The database password is the default development value. Set a real '
            'DB_PASSWORD (or use DATABASE_URL with its own password).'
        )

    if problems:
        raise ImproperlyConfigured(
            'Production configuration is unsafe:\n- ' + '\n- '.join(problems)
        )
