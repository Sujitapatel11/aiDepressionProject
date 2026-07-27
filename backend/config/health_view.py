import time
import os
from django.http import JsonResponse
from django.db import connection
from django.conf import settings

_START_TIME = time.time()

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
