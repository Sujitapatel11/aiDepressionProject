import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone


class CreatorPlan(models.Model):
    """Configurable creator hosting tier. Monetary values are stored in minor units."""

    code = models.SlugField(max_length=40, unique=True)
    name = models.CharField(max_length=80)
    description = models.TextField(blank=True, default='')
    price_minor = models.PositiveBigIntegerField(default=0)
    currency = models.CharField(max_length=3, default='INR')
    billing_interval = models.CharField(
        max_length=16,
        choices=[('monthly', 'Monthly'), ('yearly', 'Yearly'), ('none', 'No billing')],
        default='none',
    )
    monthly_broadcast_limit = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='Maximum broadcasts in a billing month; null means unlimited.',
    )
    max_duration_minutes = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='Maximum duration per broadcast; null means unlimited.',
    )
    max_viewers = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='Maximum concurrent viewers; null means provider/platform limit.',
    )
    features = models.JSONField(default=dict, blank=True)
    is_free = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['price_minor', 'name']
        constraints = [
            # Django 4.2 uses `check=`; `condition=` is Django 5.x syntax.
            models.CheckConstraint(
                check=Q(price_minor__gte=0),
                name='creator_plan_price_nonnegative',
            ),
        ]

    def __str__(self):
        return f'{self.name} ({self.code})'


class CreatorSubscription(models.Model):
    """A creator's plan entitlement. This is not a fan-to-creator subscription."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACTIVE = 'active', 'Active'
        PAST_DUE = 'past_due', 'Past due'
        CANCELED = 'canceled', 'Canceled'
        EXPIRED = 'expired', 'Expired'
        TRIALING = 'trialing', 'Trialing'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='creator_live_subscriptions',
    )
    plan = models.ForeignKey(
        CreatorPlan,
        on_delete=models.PROTECT,
        related_name='subscriptions',
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING, db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True, db_index=True)
    cancel_at_period_end = models.BooleanField(default=False)
    canceled_at = models.DateTimeField(null=True, blank=True)
    provider = models.CharField(max_length=32, blank=True, default='')
    provider_customer_id = models.CharField(max_length=128, blank=True, default='')
    provider_subscription_id = models.CharField(max_length=128, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['creator', 'status']),
            models.Index(fields=['status', 'current_period_end']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['provider', 'provider_subscription_id'],
                check=~Q(provider_subscription_id=''),
                name='creator_subscription_provider_id_uniq',
            ),
        ]

    @property
    def grants_hosting_access(self):
        if self.status not in {self.Status.ACTIVE, self.Status.TRIALING}:
            return False
        return self.current_period_end is None or self.current_period_end > timezone.now()

    def __str__(self):
        return f'{self.creator_id} -> {self.plan.code} [{self.status}]'


class LiveSession(models.Model):
    """Metadata and lifecycle for a broadcast; media transport is handled separately."""

    class Mode(models.TextChoices):
        AUDIO = 'audio', 'Audio'
        VIDEO = 'video', 'Video'
        AUDIO_VIDEO = 'audio_video', 'Audio and video'

    class AudienceType(models.TextChoices):
        PUBLIC = 'public', 'Public'
        FOLLOWERS = 'followers', 'Followers'
        SUBSCRIBERS = 'subscribers', 'Fan subscribers'
        PRIVATE = 'private', 'Invite only'
        COMMUNITY = 'community', 'Community members'

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        SCHEDULED = 'scheduled', 'Scheduled'
        LIVE = 'live', 'Live'
        PAUSED = 'paused', 'Paused'
        ENDED = 'ended', 'Ended'
        CANCELED = 'canceled', 'Canceled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='hosted_live_sessions',
    )
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True, default='')
    category = models.CharField(max_length=64, blank=True, default='', db_index=True)
    thumbnail_url = models.URLField(max_length=1024, blank=True, default='')
    mode = models.CharField(max_length=16, choices=Mode.choices, default=Mode.AUDIO_VIDEO)
    audience_type = models.CharField(
        max_length=16, choices=AudienceType.choices, default=AudienceType.PUBLIC, db_index=True
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT, db_index=True)
    comments_enabled = models.BooleanField(default=True)
    reactions_enabled = models.BooleanField(default=True)
    speaking_requests_enabled = models.BooleanField(default=False)
    recording_enabled = models.BooleanField(default=False)
    recording_consent_confirmed = models.BooleanField(default=False)
    scheduled_at = models.DateTimeField(null=True, blank=True, db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'audience_type', '-created_at']),
            models.Index(fields=['creator', '-created_at']),
        ]
        constraints = [
            models.CheckConstraint(
                check=Q(ended_at__isnull=True) | Q(started_at__isnull=False),
                name='live_session_end_requires_start',
            ),
        ]

    def __str__(self):
        return f'{self.title} [{self.status}]'


class LiveSessionAudience(models.Model):
    """Explicit invite/access record for private broadcasts."""

    class InvitationStatus(models.TextChoices):
        INVITED = 'invited', 'Invited'
        ACCEPTED = 'accepted', 'Accepted'
        DECLINED = 'declined', 'Declined'
        REVOKED = 'revoked', 'Revoked'

    session = models.ForeignKey(LiveSession, on_delete=models.CASCADE, related_name='audience_invites')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='live_session_invitations',
    )
    status = models.CharField(
        max_length=16, choices=InvitationStatus.choices, default=InvitationStatus.INVITED, db_index=True
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='sent_live_invitations',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['session', 'user'], name='live_session_audience_user_uniq'),
        ]

    def __str__(self):
        return f'{self.user_id} invited to {self.session_id} [{self.status}]'


class LiveParticipant(models.Model):
    """Presence/role record for a user joining a live session."""

    class Role(models.TextChoices):
        VIEWER = 'viewer', 'Viewer'
        LISTENER = 'listener', 'Listener'
        SPEAKER = 'speaker', 'Speaker'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(LiveSession, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='live_participations',
    )
    role = models.CharField(max_length=12, choices=Role.choices, default=Role.VIEWER)
    joined_at = models.DateTimeField(default=timezone.now, db_index=True)
    left_at = models.DateTimeField(null=True, blank=True)
    is_muted = models.BooleanField(default=False)
    removed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['joined_at']
        indexes = [
            models.Index(fields=['session', 'left_at']),
            models.Index(fields=['user', '-joined_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['session', 'user'],
                check=Q(left_at__isnull=True),
                name='live_one_active_participation_per_user',
            ),
        ]

    @property
    def is_active(self):
        return self.left_at is None and self.removed_at is None

    def __str__(self):
        return f'{self.user_id} in {self.session_id} ({self.role})'
