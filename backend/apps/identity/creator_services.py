from datetime import datetime, time, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import Sum
from django.utils import timezone

from .models import (
    CreatorLedgerEntry,
    CreatorMonthlySettlement,
    CreatorPost,
    CreatorRevenueAttribution,
    CreatorWithdrawalRequest,
    VerifiedAdEvent,
)

CENT = Decimal('0.01')
CREATOR_SHARE_RATE = Decimal('0.50')


def record_verified_ad_event(*, post, provider, provider_event_id, net_amount, verified_at, signature_verified):
    """Called only by a provider adapter after cryptographic signature verification."""
    if not signature_verified:
        raise ValidationError('The advertising event was not verified.')
    if post.status != CreatorPost.Status.PUBLISHED or post.deleted_at or not post.creator.is_active:
        raise ValidationError('Advertising revenue is not eligible for this post.')

    net_amount = Decimal(str(net_amount)).quantize(CENT, rounding=ROUND_HALF_UP)
    if net_amount <= 0:
        raise ValidationError('Net advertising revenue must be positive.')

    creator_amount = (net_amount * CREATOR_SHARE_RATE).quantize(CENT, rounding=ROUND_HALF_UP)
    platform_amount = net_amount - creator_amount
    try:
        with transaction.atomic():
            event = VerifiedAdEvent.objects.create(
                provider=provider,
                provider_event_id=provider_event_id,
                post=post,
                net_amount=net_amount,
                verified_at=verified_at,
            )
            attribution = CreatorRevenueAttribution.objects.create(
                ad_event=event,
                creator=post.creator,
                post=post,
                net_amount=net_amount,
                creator_amount=creator_amount,
                platform_amount=platform_amount,
                share_rate=CREATOR_SHARE_RATE,
            )
            return CreatorLedgerEntry.objects.create(
                attribution=attribution,
                creator=post.creator,
                amount=creator_amount,
                eligible_at=timezone.now() + timedelta(days=settings.CREATOR_EARNING_HOLD_DAYS),
            )
    except IntegrityError:
        existing = CreatorLedgerEntry.objects.filter(
            attribution__ad_event__provider=provider,
            attribution__ad_event__provider_event_id=provider_event_id,
        ).first()
        if existing:
            return existing
        raise


def create_monthly_settlement(creator, month_start):
    """Create a statement from actual verified attribution records; never invent revenue."""
    if month_start.day != 1:
        raise ValidationError('Settlement month must be the first day of a month.')
    next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
    start = timezone.make_aware(datetime.combine(month_start, time.min))
    end = timezone.make_aware(datetime.combine(next_month, time.min))
    totals = CreatorRevenueAttribution.objects.filter(
        creator=creator,
        ad_event__verified_at__gte=start,
        ad_event__verified_at__lt=end,
    ).aggregate(
        net_amount=Sum('net_amount'),
        creator_amount=Sum('creator_amount'),
        platform_amount=Sum('platform_amount'),
    )
    if not totals['net_amount']:
        return None
    settlement, _ = CreatorMonthlySettlement.objects.get_or_create(
        creator=creator,
        month=month_start,
        defaults={
            'net_amount': totals['net_amount'],
            'creator_amount': totals['creator_amount'],
            'platform_amount': totals['platform_amount'],
        },
    )
    return settlement


def creator_balances(creator):
    now = timezone.now()
    ledger = CreatorLedgerEntry.objects.filter(creator=creator)
    pending = ledger.filter(eligible_at__gt=now).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    eligible = ledger.filter(eligible_at__lte=now).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    paid = CreatorWithdrawalRequest.objects.filter(
        creator=creator,
        status=CreatorWithdrawalRequest.Status.PAID,
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    reserved = CreatorWithdrawalRequest.objects.filter(
        creator=creator,
        status__in=[CreatorWithdrawalRequest.Status.PENDING, CreatorWithdrawalRequest.Status.APPROVED],
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    available = max(Decimal('0.00'), eligible - paid - reserved)
    return {
        'pending': pending,
        'available': available,
        'paid': paid,
    }