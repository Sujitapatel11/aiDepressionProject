import uuid
from datetime import date

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.contrib.auth.models import User
from django.db.models import F, Q
from django.db.models.functions import Lower
from django.utils import timezone


class UserIdentity(models.Model):
    """
    Stores user's visual identity parameters, avatar engine configuration, and cosmetics setup.
    Decoupled from User and UserProfile to ensure zero side-effects on peer matching.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='user_identity')
    avatar_provider = models.CharField(max_length=32, default='dicebear', db_index=True)
    avatar_provider_version = models.CharField(max_length=16, default='v7')
    style_preset = models.CharField(max_length=64, default='bottts')
    seed_key = models.CharField(max_length=255)
    config_version = models.PositiveIntegerField(default=1)
    identity_config = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'identity_useridentity'
        verbose_name = 'User Identity'
        verbose_name_plural = 'User Identities'

    def __str__(self):
        return f"UserIdentity({self.user.username}, provider={self.avatar_provider})"


class CosmeticItem(models.Model):
    """
    Catalog of unlockable accessories, aura effects, frames, themes, and companions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=128)
    category = models.CharField(max_length=32, db_index=True)  # 'headwear', 'aura', 'companion', 'frame', 'theme'
    layer_key = models.CharField(max_length=64)
    asset_uri = models.CharField(max_length=512)
    is_premium = models.BooleanField(default=False)
    required_achievement = models.CharField(max_length=64, null=True, blank=True)
    season_tag = models.CharField(max_length=32, null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'identity_cosmeticitem'
        verbose_name = 'Cosmetic Item'
        verbose_name_plural = 'Cosmetic Items'

    def __str__(self):
        return f"{self.name} [{self.category}]"


class UserCosmeticInventory(models.Model):
    """
    Tracks inventory of unlocked and equipped cosmetics for each user.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cosmetic_inventory')
    cosmetic_item = models.ForeignKey(CosmeticItem, on_delete=models.CASCADE, related_name='owners')
    is_equipped = models.BooleanField(default=False)
    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'identity_usercosmeticinventory'
        unique_together = ('user', 'cosmetic_item')
        verbose_name = 'User Cosmetic Inventory'
        verbose_name_plural = 'User Cosmetic Inventories'

    def __str__(self):
        status = "Equipped" if self.is_equipped else "Inventory"
        return f"{self.user.username} - {self.cosmetic_item.name} ({status})"


class PublicProfile(models.Model):
    """
    User-editable public profile fields. Authentication details and private
    personality/matching signals deliberately live in separate models.

    Ported from feat/authentication-user-profiles (remote commit 8b82e10) to
    this lineage unchanged.
    """
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="public_profile"
    )
    display_name = models.CharField(max_length=50, blank=True)
    bio = models.CharField(max_length=280, blank=True)
    interests = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "identity_publicprofile"

    def __str__(self):
        return f"PublicProfile({self.user.username})"


class CreatorProfile(models.Model):
    class MonetizationStatus(models.TextChoices):
        NOT_ELIGIBLE = 'not_eligible', 'Not eligible'
        PENDING_REVIEW = 'pending_review', 'Pending review'
        ELIGIBLE = 'eligible', 'Eligible'
        SUSPENDED = 'suspended', 'Suspended'

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='creator_profile',
    )
    username = models.CharField(max_length=30, db_index=True)
    display_name = models.CharField(max_length=80)
    bio = models.CharField(max_length=500, blank=True, default='')
    avatar = models.URLField(max_length=1024, blank=True, default='')
    cover_image = models.URLField(max_length=1024, blank=True, default='')
    is_active = models.BooleanField(default=True)
    monetization_status = models.CharField(
        max_length=20,
        choices=MonetizationStatus.choices,
        default=MonetizationStatus.NOT_ELIGIBLE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['username']
        constraints = [
            models.UniqueConstraint(
                Lower('username'),
                name='creator_profile_username_ci_uniq',
            ),
        ]

    def __str__(self):
        return f'{self.display_name} (@{self.username})'


class CreatorPost(models.Model):
    class ContentType(models.TextChoices):
        TEXT = 'text', 'Text'
        IMAGE = 'image', 'Image'
        VIDEO = 'video', 'Video'

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PUBLISHED = 'published', 'Published'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    creator = models.ForeignKey(CreatorProfile, on_delete=models.PROTECT, related_name='posts')
    content_type = models.CharField(max_length=8, choices=ContentType.choices, default=ContentType.TEXT)
    caption = models.TextField(blank=True, default='')
    media_url = models.URLField(max_length=1024, blank=True, default='')
    hashtags = models.JSONField(default=list, blank=True)
    category = models.CharField(max_length=48, blank=True, default='', db_index=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ['-published_at', '-created_at']
        indexes = [
            models.Index(fields=['creator', 'status', 'published_at']),
            models.Index(fields=['status', 'deleted_at', '-published_at']),
        ]

    def __str__(self):
        return f'{self.creator.username}: {self.content_type} [{self.status}]'


class CreatorFollow(models.Model):
    creator = models.ForeignKey(CreatorProfile, on_delete=models.CASCADE, related_name='follows')
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='creator_follows')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['creator', 'follower'], name='creator_follow_unique'),
        ]
        indexes = [models.Index(fields=['creator', '-created_at'])]


class CreatorPostView(models.Model):
    post = models.ForeignKey(CreatorPost, on_delete=models.CASCADE, related_name='views')
    viewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='creator_post_views')
    viewed_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['post', 'viewer'], name='creator_post_view_unique'),
        ]
        indexes = [models.Index(fields=['post', '-viewed_at'])]


class CreatorPostLike(models.Model):
    post = models.ForeignKey(CreatorPost, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='creator_post_likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['post', 'user'], name='creator_post_like_unique'),
        ]
        indexes = [models.Index(fields=['post', '-created_at'])]


class CreatorPostComment(models.Model):
    post = models.ForeignKey(CreatorPost, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='creator_post_comments')
    body = models.CharField(max_length=1000)
    is_hidden = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    moderated_at = models.DateTimeField(null=True, blank=True)
    moderated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='moderated_creator_comments'
    )

    class Meta:
        ordering = ['created_at']
        indexes = [models.Index(fields=['post', 'is_hidden', 'created_at'])]


class CreatorPostShare(models.Model):
    post = models.ForeignKey(CreatorPost, on_delete=models.CASCADE, related_name='shares')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='creator_post_shares')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['post', 'user'], name='creator_post_share_unique'),
        ]
        indexes = [models.Index(fields=['post', '-created_at'])]


class CreatorPostBookmark(models.Model):
    post = models.ForeignKey(CreatorPost, on_delete=models.CASCADE, related_name='bookmarks')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='creator_post_bookmarks')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['post', 'user'], name='creator_post_bookmark_unique'),
        ]
        indexes = [models.Index(fields=['user', '-created_at'])]

    def __str__(self):
        return f'{self.user.username} bookmarked {self.post_id}'


class CreatorSecuritySignal(models.Model):
    class Kind(models.TextChoices):
        SELF_ENGAGEMENT = 'self_engagement', 'Self engagement attempt'
        DUPLICATE_COMMENT = 'duplicate_comment', 'Duplicate comment attempt'
        RATE_LIMIT = 'rate_limit', 'Rate limit exceeded'
        CONTENT_REPORT = 'content_report', 'Content reported'

    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        REVIEWED = 'reviewed', 'Reviewed'
        ACTIONED = 'actioned', 'Actioned'

    creator = models.ForeignKey(CreatorProfile, on_delete=models.CASCADE, related_name='security_signals')
    post = models.ForeignKey(CreatorPost, on_delete=models.SET_NULL, null=True, blank=True, related_name='security_signals')
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='creator_security_signals')
    kind = models.CharField(max_length=24, choices=Kind.choices, db_index=True)
    evidence_hash = models.CharField(max_length=64, blank=True, default='')
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.OPEN, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_creator_signals'
    )

    class Meta:
        indexes = [models.Index(fields=['creator', 'status', '-created_at'])]


class ImmutableCreatorRecord(models.Model):
    class ImmutableQuerySet(models.QuerySet):
        def update(self, **kwargs):
            raise ValidationError('This financial record is immutable.')

        def delete(self):
            raise ValidationError('This financial record is immutable.')

        def bulk_create(self, objs, **kwargs):
            raise ValidationError('Bulk creation bypasses financial record validation.')

        def bulk_update(self, objs, fields, **kwargs):
            raise ValidationError('This financial record is immutable.')

    objects = models.Manager.from_queryset(ImmutableQuerySet)()

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if self.pk and type(self).objects.filter(pk=self.pk).exists():
            raise ValidationError('This financial record is immutable.')
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError('This financial record is immutable.')


class VerifiedAdEvent(ImmutableCreatorRecord):
    provider = models.CharField(max_length=40)
    provider_event_id = models.CharField(max_length=160)
    post = models.ForeignKey(CreatorPost, on_delete=models.PROTECT, related_name='verified_ad_events')
    net_amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')
    verified_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['provider', 'provider_event_id'], name='creator_ad_event_unique'),
            models.CheckConstraint(check=Q(net_amount__gt=0), name='creator_ad_event_amount_positive'),
        ]
        indexes = [models.Index(fields=['post', '-verified_at'])]


class CreatorRevenueAttribution(ImmutableCreatorRecord):
    ad_event = models.OneToOneField(VerifiedAdEvent, on_delete=models.PROTECT, related_name='attribution')
    creator = models.ForeignKey(CreatorProfile, on_delete=models.PROTECT, related_name='revenue_attributions')
    post = models.ForeignKey(CreatorPost, on_delete=models.PROTECT, related_name='revenue_attributions')
    net_amount = models.DecimalField(max_digits=14, decimal_places=2)
    creator_amount = models.DecimalField(max_digits=14, decimal_places=2)
    platform_amount = models.DecimalField(max_digits=14, decimal_places=2)
    share_rate = models.DecimalField(max_digits=5, decimal_places=4, default='0.5000')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=Q(net_amount=F('creator_amount') + F('platform_amount')),
                name='creator_attribution_shares_sum',
            ),
        ]


class CreatorLedgerEntry(ImmutableCreatorRecord):
    attribution = models.OneToOneField(CreatorRevenueAttribution, on_delete=models.PROTECT, related_name='ledger_entry')
    creator = models.ForeignKey(CreatorProfile, on_delete=models.PROTECT, related_name='ledger_entries')
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    eligible_at = models.DateTimeField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['creator', 'eligible_at'])]
        constraints = [models.CheckConstraint(check=Q(amount__gt=0), name='creator_ledger_amount_positive')]


class CreatorMonthlySettlement(ImmutableCreatorRecord):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PAID = 'paid', 'Paid'

    creator = models.ForeignKey(CreatorProfile, on_delete=models.PROTECT, related_name='monthly_settlements')
    month = models.DateField()
    net_amount = models.DecimalField(max_digits=14, decimal_places=2)
    creator_amount = models.DecimalField(max_digits=14, decimal_places=2)
    platform_amount = models.DecimalField(max_digits=14, decimal_places=2)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True)
    payment_reference = models.CharField(max_length=160, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-month']
        constraints = [
            models.UniqueConstraint(fields=['creator', 'month'], name='creator_monthly_settlement_unique'),
            models.CheckConstraint(
                check=Q(net_amount=F('creator_amount') + F('platform_amount')),
                name='creator_monthly_settlement_shares_sum',
            ),
        ]


class CreatorWithdrawalRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending review'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        PAID = 'paid', 'Paid'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    creator = models.ForeignKey(CreatorProfile, on_delete=models.PROTECT, related_name='withdrawals')
    request_key = models.UUIDField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True)
    review_note = models.CharField(max_length=500, blank=True, default='')
    reviewed_by = models.ForeignKey(
        User, on_delete=models.PROTECT, null=True, blank=True, related_name='reviewed_creator_withdrawals'
    )
    payment_reference = models.CharField(max_length=160, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['creator', 'request_key'], name='creator_withdrawal_idempotency_unique'),
            models.CheckConstraint(check=Q(amount__gt=0), name='creator_withdrawal_amount_positive'),
        ]
        indexes = [models.Index(fields=['status', '-created_at'])]


class CreatorAdminAuditLog(ImmutableCreatorRecord):
    actor = models.ForeignKey(User, on_delete=models.PROTECT, related_name='creator_admin_actions')
    creator = models.ForeignKey(CreatorProfile, on_delete=models.PROTECT, related_name='admin_audit_entries')
    action = models.CharField(max_length=40)
    target_type = models.CharField(max_length=40)
    target_id = models.CharField(max_length=64, blank=True, default='')
    reason = models.CharField(max_length=500)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
