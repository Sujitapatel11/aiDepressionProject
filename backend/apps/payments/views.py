from datetime import timedelta

from django.db import transaction as db_transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import PaymentTransaction, SubscriptionPlan, UserSubscription
from .providers import (
    PaymentProviderError, initiate_esewa, initiate_khalti,
    verify_esewa, verify_khalti,
)


@api_view(["GET"])
@permission_classes([AllowAny])
def list_plans(request):
    plans = SubscriptionPlan.objects.filter(active=True).order_by("currency", "amount_minor")
    return Response([{
        "code": p.code, "name": p.name, "description": p.description,
        "currency": p.currency, "amount_minor": p.amount_minor,
        "interval": p.interval,
    } for p in plans])


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_checkout(request):
    plan_code = str(request.data.get("plan_code", "")).strip()
    provider = str(request.data.get("provider", "")).strip().lower()
    currency = str(request.data.get("currency", "")).strip().upper()
    idempotency_key = str(request.headers.get("Idempotency-Key", "")).strip()

    if provider not in (PaymentTransaction.Provider.ESEWA, PaymentTransaction.Provider.KHALTI):
        return Response({"detail": "Unsupported payment provider."}, status=status.HTTP_400_BAD_REQUEST)
    if not idempotency_key or len(idempotency_key) > 80:
        return Response({"detail": "A unique Idempotency-Key header is required."}, status=status.HTTP_400_BAD_REQUEST)

    plan = get_object_or_404(SubscriptionPlan, code=plan_code, currency=currency, active=True)
    if provider in (PaymentTransaction.Provider.ESEWA, PaymentTransaction.Provider.KHALTI) and currency != "NPR":
        return Response({"detail": "This Nepal gateway currently supports NPR plans only."}, status=status.HTTP_400_BAD_REQUEST)

    existing = PaymentTransaction.objects.filter(idempotency_key=idempotency_key).first()
    if existing:
        if (
            existing.user_id != request.user.id
            or existing.plan_id != plan.id
            or existing.provider != provider
            or existing.currency != currency
        ):
            return Response({"detail": "Idempotency key was already used for a different checkout."}, status=status.HTTP_409_CONFLICT)
        return Response({"transaction_id": str(existing.id), "status": existing.status, "checkout_url": existing.checkout_url, "provider_payload": existing.provider_payload})

    payment = PaymentTransaction.objects.create(
        user=request.user, plan=plan, provider=provider,
        amount_minor=plan.amount_minor, currency=plan.currency,
        idempotency_key=idempotency_key,
    )
    try:
        result = initiate_esewa(payment) if provider == PaymentTransaction.Provider.ESEWA else initiate_khalti(payment, request.data.get("customer_info"))
    except PaymentProviderError as exc:
        payment.status = PaymentTransaction.Status.FAILED
        payment.failure_reason = str(exc)[:255]
        payment.save(update_fields=["status", "failure_reason", "updated_at"])
        return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception:
        payment.status = PaymentTransaction.Status.FAILED
        payment.failure_reason = "Payment provider request failed."
        payment.save(update_fields=["status", "failure_reason", "updated_at"])
        return Response({"detail": "Payment provider request failed. Please retry with a new idempotency key."}, status=status.HTTP_502_BAD_GATEWAY)

    payment.status = PaymentTransaction.Status.INITIATED
    payment.checkout_url = result["checkout_url"]
    payment.provider_reference = result["reference"]
    payment.provider_payload = result["payload"]
    payment.save(update_fields=["status", "checkout_url", "provider_reference", "provider_payload", "updated_at"])
    return Response({
        "transaction_id": str(payment.id),
        "status": payment.status,
        "checkout_url": payment.checkout_url,
        "provider_payload": payment.provider_payload if provider == PaymentTransaction.Provider.ESEWA else {},
    }, status=status.HTTP_201_CREATED)


def _activate_subscription(payment):
    if payment.status == PaymentTransaction.Status.PAID:
        return
    if payment.status not in (PaymentTransaction.Status.INITIATED, PaymentTransaction.Status.PENDING):
        raise PaymentProviderError("Transaction is not payable.")
    now = timezone.now()
    with db_transaction.atomic():
        locked = PaymentTransaction.objects.select_for_update().get(pk=payment.pk)
        if locked.status == PaymentTransaction.Status.PAID:
            return
        locked.status = PaymentTransaction.Status.PAID
        locked.paid_at = now
        locked.save(update_fields=["status", "paid_at", "updated_at"])
        current = UserSubscription.objects.filter(user=locked.user, active=True, ends_at__gt=now).order_by("-ends_at").first()
        starts_at = current.ends_at if current else now
        UserSubscription.objects.filter(user=locked.user, active=True).update(active=False)
        duration = timedelta(days=365 if locked.plan.interval == "year" else 30)
        UserSubscription.objects.create(
            user=locked.user, plan=locked.plan, payment=locked,
            starts_at=starts_at, ends_at=starts_at + duration, active=True,
        )


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def esewa_return(request):
    encoded = request.query_params.get("data") or request.data.get("data")
    if not encoded:
        return Response({"detail": "Missing eSewa response data."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        import base64, json
        try:
            payload = json.loads(base64.b64decode(encoded, validate=True).decode("utf-8"))
        except Exception as exc:
            raise PaymentProviderError("Invalid eSewa callback payload.") from exc
        payment = get_object_or_404(PaymentTransaction, id=payload.get("transaction_uuid"), provider=PaymentTransaction.Provider.ESEWA)
        verified = verify_esewa(encoded, payment)
        if verified.get("status") != "COMPLETE":
            return Response({"detail": "eSewa did not confirm payment.", "status": verified.get("status")}, status=status.HTTP_402_PAYMENT_REQUIRED)
        _activate_subscription(payment)
        return Response({"status": "paid", "transaction_id": str(payment.id)})
    except PaymentProviderError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def khalti_return(request):
    pidx = request.query_params.get("pidx") or request.data.get("pidx")
    if not pidx:
        return Response({"detail": "Missing Khalti payment reference."}, status=status.HTTP_400_BAD_REQUEST)
    payment = get_object_or_404(PaymentTransaction, provider=PaymentTransaction.Provider.KHALTI, provider_reference=pidx)
    try:
        verified = verify_khalti(pidx, payment)
        _activate_subscription(payment)
        return Response({"status": "paid", "transaction_id": str(payment.id), "provider_status": verified.get("status")})
    except PaymentProviderError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_402_PAYMENT_REQUIRED)
