"""R2 free-tier usage accounting.

Tracks the app's own projection of Cloudflare R2 consumption in the
database — one row per calendar month. Bytes-in-storage is computed live
from MediaAsset rows (the authoritative mirror of the bucket), while ops
counters increment on every upload PUT and authorized serve GET while R2
is active.

Ceilings are deliberately BELOW R2's free allowances (10 GB storage-month,
1M Class A writes, 10M Class B reads) so the app hard-blocks uploads before
any paid usage can be incurred, per the standing requirement.
"""

from django.conf import settings
from django.db import models

from apps.mediahub.models import R2UsageMonth
from apps.mediahub.storage import r2_enabled

# R2 free-tier allowances (documented), used only as the framing for defaults.
R2_FREE_STORAGE_GB = 10
R2_FREE_PUT_OPS = 1_000_000
R2_FREE_GET_OPS = 10_000_000


def month_key():
    from django.utils import timezone
    return timezone.now().strftime('%Y-%m')


def get_month_record():
    record, _ = R2UsageMonth.objects.get_or_create(month=month_key())
    return record


def _ceilings():
    """Configurable safety ceilings (env-overridable), all below free tier."""
    return {
        'storage_bytes': int(getattr(settings, 'R2_MAX_STORAGE_GB', 9) * 1024 * 1024 * 1024),
        'put_ops': int(getattr(settings, 'R2_MAX_PUT_OPS_MONTH', 800_000)),
        'get_ops': int(getattr(settings, 'R2_MAX_GET_OPS_MONTH', 8_000_000)),
        'storage_warn_gb': float(getattr(settings, 'R2_WARN_STORAGE_GB', 8)),
        'put_warn': int(getattr(settings, 'R2_WARN_PUT_OPS_MONTH', 600_000)),
        'get_warn': int(getattr(settings, 'R2_WARN_GET_OPS_MONTH', 6_000_000)),
    }


def storage_bytes_used():
    """Current total bytes stored (MediaAsset aggregate is the bucket mirror)."""
    from django.db.models import Sum
    from apps.mediahub.models import MediaAsset
    return MediaAsset.objects.aggregate(total=Sum('size_bytes'))['total'] or 0


def uploads_blocked(total_bytes_needed):
    """Hard block: True when this upload would cross a configured ceiling."""
    if not r2_enabled():
        return False
    caps = _ceilings()
    record = get_month_record()
    return (
        storage_bytes_used() + total_bytes_needed > caps['storage_bytes']
        or record.put_ops + 1 > caps['put_ops']
    )


def blocked_reason(total_bytes_needed):
    """Human-readable explanation for the block, with current numbers."""
    caps = _ceilings()
    record = get_month_record()
    used = storage_bytes_used()
    if used + total_bytes_needed > caps['storage_bytes']:
        return (f'Media storage is at capacity: {used/1024**3:.2f} GB used of a '
                f'{caps["storage_bytes"]/1024**3:.0f} GB safety ceiling. '
                f'Upload refused to stay within the free tier.')
    if record.put_ops + 1 > caps['put_ops']:
        return (f'Monthly upload-operation ceiling reached '
                f'({record.put_ops} of {caps["put_ops"]}). '
                f'Upload refused to stay within the free tier.')
    return 'Monthly usage ceiling reached; upload refused.'


def record_put(n=1):
    record = get_month_record()
    R2UsageMonth.objects.filter(pk=record.month).update(put_ops=models.F('put_ops') + n)


def record_get(n=1):
    if r2_enabled():
        record = get_month_record()
        R2UsageMonth.objects.filter(pk=record.month).update(get_ops=models.F('get_ops') + n)


def usage_snapshot():
    """Everything the staff usage endpoint and upload responses need..."""
    record = get_month_record()
    used = storage_bytes_used()
    caps = _ceilings()
    payload = {
        'storage_bytes': used,
        'put_ops': record.put_ops,
        'get_ops': record.get_ops,
        'month': record.month,
        'r2_active': r2_enabled(),
    }
    warnings = []
    if used > caps['storage_warn_gb'] * 1024**3:
        warnings.append(f'storage: {used/1024**3:.2f} GB exceeds the {caps["storage_warn_gb"]} GB warning level')
    if record.put_ops > caps['put_warn']:
        warnings.append(f'uploads: {record.put_ops} exceeds the {caps["put_warn"]} warning level')
    if record.get_ops > caps['get_warn']:
        warnings.append(f'serves: {record.get_ops} exceeds the {caps["get_warn"]} warning level')
    payload['warnings'] = warnings
    return payload
