import uuid
from decimal import Decimal
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

class CreatorProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="creator_profile")
    display_name = models.CharField(max_length=80)
    bio = models.CharField(max_length=500, blank=True, default="")
    is_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class CreatorPost(models.Model):
    class Format(models.TextChoices):
        MICRO_POST = "micro-post", "Micro post"
        STORY = "story", "Story"
        POEM = "poem", "Poem"
        JOURNAL_PIECE = "journal-piece", "Journal-inspired"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    creator = models.ForeignKey(CreatorProfile, on_delete=models.CASCADE, related_name="posts")
    title = models.CharField(max_length=160)
    body = models.TextField(max_length=20000)
    format = models.CharField(max_length=20, choices=Format.choices, default=Format.MICRO_POST)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ["-published_at", "-created_at"]
        indexes = [models.Index(fields=["status", "-published_at"], name="creator_post_status_pub_idx")]

class AdRevenueEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.CharField(max_length=40)
    provider_event_id = models.CharField(max_length=160, unique=True)
    post = models.ForeignKey(CreatorPost, on_delete=models.PROTECT, related_name="ad_revenue_events")
    gross_amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    currency = models.CharField(max_length=3, default="USD")
    occurred_at = models.DateTimeField()
    verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class CreatorEarning(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    creator = models.ForeignKey(CreatorProfile, on_delete=models.PROTECT, related_name="earnings")
    post = models.ForeignKey(CreatorPost, on_delete=models.PROTECT, related_name="earnings")
    revenue_event = models.OneToOneField(AdRevenueEvent, on_delete=models.PROTECT, related_name="earning")
    gross_amount = models.DecimalField(max_digits=12, decimal_places=2)
    share_rate = models.DecimalField(max_digits=5, decimal_places=4, default=Decimal("0.5000"))
    creator_amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3)
    created_at = models.DateTimeField(auto_now_add=True)
    def save(self, *args, **kwargs):
        if self.pk and CreatorEarning.objects.filter(pk=self.pk).exists():
            raise ValueError("Creator earning ledger entries are immutable.")
        super().save(*args, **kwargs)

class CreatorWithdrawal(models.Model):
    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    creator = models.ForeignKey(CreatorProfile, on_delete=models.PROTECT, related_name="withdrawals")
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("1.00"))])
    currency = models.CharField(max_length=3, default="USD")
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.REQUESTED, db_index=True)
    admin_note = models.CharField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    class Meta:
        ordering = ["-created_at"]


class CreatorSettlement(models.Model):
    class Status(models.TextChoices):
        PREPARED = "prepared", "Prepared"
        PAID = "paid", "Paid"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    creator = models.ForeignKey(CreatorProfile, on_delete=models.PROTECT, related_name="settlements")
    currency = models.CharField(max_length=3)
    period_start = models.DateField()
    period_end = models.DateField()
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PREPARED, db_index=True)
    payout_reference = models.CharField(max_length=160, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-period_start", "creator_id", "currency"]
        constraints = [
            models.UniqueConstraint(fields=["creator", "currency", "period_start"], name="uniq_creator_month_settlement"),
        ]


class CreatorSettlementLine(models.Model):
    settlement = models.ForeignKey(CreatorSettlement, on_delete=models.PROTECT, related_name="lines")
    earning = models.OneToOneField(CreatorEarning, on_delete=models.PROTECT, related_name="settlement_line")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
