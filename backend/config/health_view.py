import logging
import re
import time
from functools import wraps

from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse

logger = logging.getLogger(__name__)

# Public machine-probe budget per counting point.
#
# Rate-limit implementation notes (read before changing this):
# - Uses the default Django cache backend. config/settings.py defines no
#   CACHES setting, so the backend is Django's default LocMemCache: the
#   limit is PER-PROCESS, NOT global. Today the Procfile/nixpacks start
#   command runs a single Daphne process, so per-process == global. If the
#   backend deployment ever gains multiple workers, the effective ceiling
#   becomes (worker count x HEALTH_RATE_LIMIT_PER_MINUTE) per REMOTE_ADDR —
#   this is intentional and documented, do not describe it as a global limit.
# - Counting is atomic per cache backend: cache.add() (no-op if the key
#   exists) followed by cache.incr() (LocMemCache increments under an
#   internal lock; redis INCR is atomic). A get()+set() pair would NOT be
#   atomic and is deliberately not used. If the 61s key expires between
#   add() and incr() (unlikely), incr() raises ValueError, which is handled
#   by re-adding a fresh bucket.
# - Keyed on REMOTE_ADDR only. Behind a single reverse proxy (Render) the
#   bucket is shared by all clients of that proxy, which is acceptable for a
#   diagnostics-only endpoint; X-Forwarded-For is deliberately ignored
#   because it is client-spoofable.
# - These endpoints stay public (no authentication) because uptime monitors
#   depend on unauthenticated HTTP status probes (see docs/API.md,
#   STAGING_DEPLOYMENT_REPORT.md).
HEALTH_RATE_LIMIT_PER_MINUTE = 60


def _register_probe_hit(view_key: str, request) -> bool:
    """Atomically bump the window-scoped probe counter. Returns False if over limit."""
    ident = request.META.get("REMOTE_ADDR", "") or "unknown"
    window_start = int(time.time() // 60)
    bucket = f"health_rl:{view_key}:{ident}:{window_start}"
    cache.add(bucket, 0, 61)  # no-op when the key already exists; atomic
    try:
        count = cache.incr(bucket)  # atomic increment
    except ValueError:
        # Key raced to expiry between add() and incr(): start a fresh window.
        cache.add(bucket, 1, 61)
        count = 1
    return count <= HEALTH_RATE_LIMIT_PER_MINUTE


def _rate_limited_json_response(view_key: str):
    """Fixed-window, per-REMOTE_ADDR rate limiter for the public health probes."""
    def decorator(view):
        @wraps(view)
        def wrapped(request, *args, **kwargs):
            if not _register_probe_hit(view_key, request):
                return JsonResponse({"detail": "Too many requests."}, status=429)
            return view(request, *args, **kwargs)
        return wrapped
    return decorator


def _sanitize_error_message(message: str) -> str:
    """
    Remove passwords, tokens, URLs, and sensitive credentials from error messages.
    Used for server-side log messages only; these never reach API responses.
    """
    # Strip credentials in database/HTTP URLs (e.g. postgresql://user:password@host...)
    msg = re.sub(r'([a-zA-Z0-9+.-]+://[^:]+:)([^@]+)(@)', r'\1*****\3', message)
    # Strip inline key/value assignments for sensitive credentials (e.g. password=..., secret: ...)
    msg = re.sub(r'((?:password|secret|token|api_key)\s*[:=]\s*)([\'"][^\'"]*[\'"]|[^\s,;]+)', r'\1*****', msg, flags=re.IGNORECASE)
    return msg


@_rate_limited_json_response("db_health")
def db_health_check(request):
    """
    Public database liveness probe.

    Minimal status-only body - never counts, identifiers, engine names, or
    error text. Full diagnostic details go to server-side logs only. Kept
    public for uptime monitoring; HTTP status is the contract
    (200 healthy / 503 unhealthy / 429 throttled).
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            cursor.fetchone()
    except Exception as exc:
        logger.warning("DB health probe failed: %s", _sanitize_error_message(str(exc)))
        return JsonResponse({"status": "unhealthy"}, status=503)

    return JsonResponse({
        "status": "healthy",
        "select_1": "ok",
    })


@_rate_limited_json_response("health")
def health_check(request):
    """
    Public uptime probe, served at /api/health/ and /health/.

    HTTP status is the monitoring contract (200 healthy / 503 degraded).
    Body is minimal by design: status and timestamp only - no debug flag,
    DB engine or latency, error text, uptime, or process memory/CPU metrics.
    """
    db_healthy = True
    try:
        start_db = time.time()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            cursor.fetchone()
    except Exception as exc:
        db_healthy = False
        logger.warning("Health probe database check failed: %s", _sanitize_error_message(str(exc)))

    data = {
        "status": "healthy" if db_healthy else "degraded",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    return JsonResponse(data, status=200 if db_healthy else 503)
