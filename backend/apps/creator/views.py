from decimal import Decimal, InvalidOperation
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from .models import CreatorProfile, CreatorPost, AdRevenueEvent, CreatorEarning, CreatorWithdrawal
from .serializers import CreatorProfileSerializer, CreatorPostSerializer, CreatorEarningSerializer, CreatorWithdrawalSerializer

def _profile(user):
    profile, _ = CreatorProfile.objects.get_or_create(user=user, defaults={"display_name": user.get_full_name().strip() or user.username})
    return profile

@api_view(["GET", "POST", "PATCH"])
@permission_classes([IsAuthenticated])
def creator_profile(request):
    profile = _profile(request.user)
    if request.method == "GET":
        return Response(CreatorProfileSerializer(profile).data)
    if not profile.is_enabled:
        return Response({"detail": "Creator account is disabled."}, status=403)
    serializer = CreatorProfileSerializer(profile, data=request.data, partial=request.method == "PATCH")
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=200 if request.method == "PATCH" else 201)
    return Response(serializer.errors, status=400)

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def creator_posts(request):
    profile = _profile(request.user)
    if request.method == "GET":
        return Response(CreatorPostSerializer(profile.posts.all(), many=True).data)
    if not profile.is_enabled:
        return Response({"detail": "Creator account is disabled."}, status=403)
    serializer = CreatorPostSerializer(data=request.data)
    if serializer.is_valid():
        post = serializer.save(creator=profile)
        return Response(CreatorPostSerializer(post).data, status=201)
    return Response(serializer.errors, status=400)

@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def creator_post_detail(request, post_id):
    post = get_object_or_404(CreatorPost, id=post_id, creator__user=request.user)
    if post.status != CreatorPost.Status.DRAFT:
        return Response({"detail": "Only drafts can be edited or deleted."}, status=400)
    if request.method == "DELETE":
        post.delete()
        return Response(status=204)
    serializer = CreatorPostSerializer(post, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def publish_creator_post(request, post_id):
    post = get_object_or_404(CreatorPost, id=post_id, creator__user=request.user)
    if not post.creator.is_enabled:
        return Response({"detail": "Creator account is disabled."}, status=403)
    if post.status != CreatorPost.Status.DRAFT:
        return Response({"detail": "Only drafts can be published."}, status=400)
    if not post.title.strip() or not post.body.strip():
        return Response({"detail": "A title and body are required."}, status=400)
    post.status = CreatorPost.Status.PUBLISHED
    post.published_at = timezone.now()
    post.save(update_fields=["status", "published_at", "updated_at"])
    return Response(CreatorPostSerializer(post).data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def public_creator_feed(request):
    posts = CreatorPost.objects.filter(status=CreatorPost.Status.PUBLISHED, creator__is_enabled=True).select_related("creator").order_by("-published_at")[:50]
    return Response([{**CreatorPostSerializer(p).data, "creator_name": p.creator.display_name} for p in posts])

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def creator_earnings(request):
    profile = _profile(request.user)
    entries = profile.earnings.select_related("post").all()
    by_currency = {}
    for row in entries.values("currency").annotate(total=Sum("creator_amount")):
        by_currency[row["currency"]] = str(row["total"])
    reserved = {}
    for row in profile.withdrawals.filter(status__in=[CreatorWithdrawal.Status.REQUESTED, CreatorWithdrawal.Status.APPROVED]).values("currency").annotate(total=Sum("amount")):
        reserved[row["currency"]] = str(row["total"])
    return Response({"lifetime_earnings_by_currency": by_currency, "reserved_withdrawals_by_currency": reserved, "ledger": CreatorEarningSerializer(entries[:100], many=True).data})

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def creator_withdrawals(request):
    profile = _profile(request.user)
    if request.method == "GET":
        return Response(CreatorWithdrawalSerializer(profile.withdrawals.all()[:100], many=True).data)
    serializer = CreatorWithdrawalSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    amount = serializer.validated_data["amount"]
    currency = serializer.validated_data.get("currency", "USD").upper()
    if len(currency) != 3:
        return Response({"currency": "Use a 3-letter currency code."}, status=400)
    with transaction.atomic():
        earned = profile.earnings.filter(currency=currency).aggregate(total=Sum("creator_amount"))["total"] or Decimal("0.00")
        reserved = profile.withdrawals.filter(status__in=[CreatorWithdrawal.Status.REQUESTED, CreatorWithdrawal.Status.APPROVED], currency=currency).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        available = earned - reserved
        if amount > available:
            return Response({"detail": "Insufficient available creator balance.", "available": str(available), "currency": currency}, status=400)
        withdrawal = serializer.save(creator=profile, currency=currency)
    return Response(CreatorWithdrawalSerializer(withdrawal).data, status=201)

@api_view(["POST"])
@permission_classes([IsAdminUser])
@transaction.atomic
def record_verified_ad_revenue(request):
    post = get_object_or_404(CreatorPost, id=request.data.get("post_id"), status=CreatorPost.Status.PUBLISHED)
    provider = str(request.data.get("provider", "")).strip()
    event_id = str(request.data.get("provider_event_id", "")).strip()
    currency = str(request.data.get("currency", "USD")).upper()
    try:
        gross = Decimal(str(request.data.get("gross_amount")))
    except (InvalidOperation, TypeError, ValueError):
        return Response({"gross_amount": "A valid decimal amount is required."}, status=400)
    if not provider or len(provider) > 40 or not event_id or len(event_id) > 160:
        return Response({"detail": "Valid provider and unique provider_event_id are required."}, status=400)
    if not gross.is_finite() or gross <= 0 or gross > Decimal("100000000.00") or len(currency) != 3 or not currency.isalpha():
        return Response({"detail": "Invalid amount or currency."}, status=400)
    event, created = AdRevenueEvent.objects.get_or_create(provider_event_id=event_id, defaults={"provider": provider, "post": post, "gross_amount": gross, "currency": currency, "occurred_at": timezone.now(), "verified": True})
    if not created:
        return Response({"detail": "Provider event already processed."}, status=409)
    earning = CreatorEarning.objects.create(creator=post.creator, post=post, revenue_event=event, gross_amount=gross, share_rate=Decimal("0.5000"), creator_amount=(gross * Decimal("0.50")).quantize(Decimal("0.01")), currency=currency)
    return Response(CreatorEarningSerializer(earning).data, status=201)

@api_view(["POST"])
@permission_classes([IsAdminUser])
@transaction.atomic
def review_creator_withdrawal(request, withdrawal_id):
    withdrawal = get_object_or_404(CreatorWithdrawal.objects.select_for_update(), id=withdrawal_id, status=CreatorWithdrawal.Status.REQUESTED)
    decision = request.data.get("decision")
    if decision not in ["approved", "rejected"]:
        return Response({"decision": "Choose approved or rejected."}, status=400)
    withdrawal.status = decision
    withdrawal.admin_note = str(request.data.get("admin_note", ""))[:500]
    withdrawal.reviewed_at = timezone.now()
    withdrawal.save(update_fields=["status", "admin_note", "reviewed_at"])
    return Response(CreatorWithdrawalSerializer(withdrawal).data)
