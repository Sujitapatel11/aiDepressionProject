import uuid
from datetime import timedelta
from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils import timezone


def default_expiry():
    return timezone.now() + timedelta(days=7)


class UserProfile(models.Model):
    """
    Stores Big Five personality scores computed from journal entries.
    Used by the matching engine to rank peer suggestions by compatibility.
    Scores range 0.0–1.0.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")

    # Big Five (OCEAN)
    openness          = models.FloatField(default=0.5)
    conscientiousness = models.FloatField(default=0.5)
    extraversion      = models.FloatField(default=0.5)
    agreeableness     = models.FloatField(default=0.5)
    neuroticism       = models.FloatField(default=0.5)

    # Dominant emotion pattern from recent journals
    dominant_emotion  = models.CharField(max_length=32, default="neutral")

    updated_at = models.DateTimeField(auto_now=True)

    def personality_vector(self):
        return [self.openness, self.conscientiousness, self.extraversion,
                self.agreeableness, self.neuroticism]

    def __str__(self):
        return f"Profile({self.user.username})"


class SupportRequest(models.Model):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"

    STATUS_CHOICES = [
        (PENDING, "Pending"),
        (ACCEPTED, "Accepted"),
        (REJECTED, "Rejected"),
        (EXPIRED, "Expired"),
    ]

    request_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    from_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_support_requests")
    to_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="received_support_requests")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(default=default_expiry)

    class Meta:
        indexes = [
            models.Index(fields=["to_user", "status"]),
            models.Index(fields=["expires_at"]),
        ]

    def clean(self):
        if self.from_user_id == self.to_user_id:
            raise ValidationError("Cannot send support request to yourself.")

    def save(self, *args, **kwargs):
        if self.status == self.PENDING and self.expires_at and self.expires_at <= timezone.now():
            self.status = self.EXPIRED
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.from_user_id} → {self.to_user_id} ({self.status})"


class SupportConnection(models.Model):
    STATUS_ACTIVE = "active"
    STATUS_BLOCKED = "blocked"
    STATUS_DISCONNECTED = "disconnected"

    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_BLOCKED, "Blocked"),
        (STATUS_DISCONNECTED, "Disconnected"),
    ]

    connection_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    user_one = models.ForeignKey(User, on_delete=models.CASCADE, related_name="connections_as_one")
    user_two = models.ForeignKey(User, on_delete=models.CASCADE, related_name="connections_as_two")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    blocked_at = models.DateTimeField(null=True, blank=True)
    disconnected_at = models.DateTimeField(null=True, blank=True)
    blocked_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="blocked_connections"
    )
    alias_user_one = models.CharField(max_length=64)
    alias_user_two = models.CharField(max_length=64)

    class Meta:
        unique_together = ("user_one", "user_two")
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["user_one", "status"]),
            models.Index(fields=["user_two", "status"]),
        ]

    def clean(self):
        if self.user_one_id == self.user_two_id:
            raise ValidationError("Connection requires two different users.")

    def save(self, *args, **kwargs):
        if self.user_one_id and self.user_two_id:
            if self.user_one_id > self.user_two_id:
                self.user_one, self.user_two = self.user_two, self.user_one
                self.alias_user_one, self.alias_user_two = self.alias_user_two, self.alias_user_one
        super().save(*args, **kwargs)

    def get_peer(self, user):
        return self.user_two if self.user_one_id == user.id else self.user_one

    def get_alias_for(self, user):
        return self.alias_user_one if self.user_one_id == user.id else self.alias_user_two

    def __str__(self):
        return f"{self.connection_id} ({self.status})"
