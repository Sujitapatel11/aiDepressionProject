import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class SubscriptionPlan(models.Model):
    code = models.SlugField(max_length=40, unique=True)
    name = models.CharField(max_length=80)
    description = models.TextField(blank=True)
    currency = models.CharField(max_length=3)
    amount_minor = models.PositiveBigIntegerField(help_text="Amount in the currency's minor unit (e.g. paisa/cents).")
    interval = models.CharField(max_length=10, choices=[("month", "Monthly"), ("year", "Yearly")], default="month")
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["currency", "amount_minor"]

    def __str__(self):
        return f"{self.name} - {self.currency} {self.amount_minor}"


class PaymentTransaction(models.Model):
    class Provider(models.TextChoices):
        ESEWA = "esewa", "eSewa"
        KHALTI = "khalti", "Khalti"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        INITIATED = "initiated", "Initiated"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="payment_transactions")
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name="transactions")
    provider = models.CharField(max_length=12, choices=Provider.choices)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True)
    amount_minor = models.PositiveBigIntegerField()
    currency = models.CharField(max_length=3)
    idempotency_key = models.CharField(max_length=80, unique=True)
    provider_reference = models.CharField(max_length=120, blank=True, db_index=True)
    checkout_url = models.URLField(blank=True)
    provider_payload = models.JSONField(default=dict, blank=True)
    failure_reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "status", "-created_at"])]

    def __str__(self):
        return f"{self.provider}:{self.id}:{self.status}"


class UserSubscription(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="subscriptions")
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT)
    payment = models.OneToOneField(PaymentTransaction, on_delete=models.PROTECT, related_name="subscription")
    starts_at = models.DateTimeField(default=timezone.now)
    ends_at = models.DateTimeField()
    active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-ends_at"]

    def __str__(self):
        return f"{self.user_id}:{self.plan.code}:{self.active}"
