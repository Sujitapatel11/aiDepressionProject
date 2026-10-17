import time
import os
import re
from django.http import JsonResponse
from django.db import connection
from django.conf import settings
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

_START_TIME = time.time()


def _sanitize_error_message(message: str) -> str:
    """
    Remove passwords, tokens, URLs, and sensitive credentials from error messages.
    """
    # Strip credentials in database/HTTP URLs (e.g. postgresql://user:password@host...)
    msg = re.sub(r'([a-zA-Z0-9+.-]+://[^:]+:)([^@]+)(@)', r'\1*****\3', message)
    # Strip inline key/value assignments for sensitive credentials (e.g. password=..., secret: ...)
    msg = re.sub(r'((?:password|secret|token|api_key)\s*[:=]\s*)([\'"][^\'"]*[\'"]|[^\s,;]+)', r'\1*****', msg, flags=re.IGNORECASE)
    return msg



@api_view(['GET'])
@permission_classes([AllowAny])
@throttle_classes([])
def db_health_check(request):
    """
    Temporary database diagnostic endpoint for verifying connection & migrations.
    Runs SELECT 1 and User.objects.count().
    Never leaks passwords, tokens, or credentials.
    """
    try:
        # Step 1: Run trivial query to verify TCP connectivity and database responsiveness
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            cursor.fetchone()

        # Step 2: Query User table to verify migrations and schema presence
        user_count = User.objects.count()

        db_engine = settings.DATABASES["default"].get("ENGINE", "").split(".")[-1]
        raw_host = settings.DATABASES["default"].get("HOST", "")

        return Response({
            "status": "healthy",
            "select_1": "ok",
            "user_count": user_count,
            "database": {
                "engine": db_engine,
                "host": raw_host,
            }
        }, status=status.HTTP_200_OK)

    except Exception as exc:
        sanitized_msg = _sanitize_error_message(str(exc))
        return Response({
            "status": "error",
            "error_class": exc.__class__.__name__,
            "error_message": sanitized_msg,
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def health_check(request):
    """
    Staging & Production Health Check Endpoint
    Returns system status, database connectivity, memory usage, uptime.
    """
    db_status = "healthy"
    db_latency_ms = 0.0
    try:
        start_db = time.time()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            cursor.fetchone()
        db_latency_ms = round((time.time() - start_db) * 1000, 2)
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    rss_mb = 0.0
    vsz_mb = 0.0
    cpu_pct = 0.0
    try:
        import psutil
        process = psutil.Process(os.getpid())
        memory_info = process.memory_info()
        rss_mb = round(memory_info.rss / (1024 * 1024), 2)
        vsz_mb = round(memory_info.vsz / (1024 * 1024), 2)
        cpu_pct = process.cpu_percent(interval=None)
    except Exception:
        pass

    data = {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "environment": "staging" if not settings.DEBUG else "development",
        "debug": settings.DEBUG,
        "database": {
            "status": db_status,
            "latency_ms": db_latency_ms,
            "engine": settings.DATABASES["default"]["ENGINE"].split(".")[-1],
        },
        "system": {
            "uptime_seconds": round(time.time() - _START_TIME, 2),
            "memory_rss_mb": rss_mb,
            "memory_vsz_mb": vsz_mb,
            "cpu_percent": cpu_pct,
        },
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    status_code = 200 if data["status"] == "healthy" else 503
    return JsonResponse(data, status=status_code)

