from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.exceptions import ValidationError
import uuid
from datetime import timedelta


# ===========================
# SUPPORT REQUEST
# ===========================

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

    from_user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="sent_support_requests"
    )
    to_user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="received_support_requests"
    )

    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default=PENDING, db_index=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()

    class Meta:
        indexes = [
            models.Index(fields=["to_user", "status"]),
            models.Index(fields=["expires_at"]),
        ]

    def clean(self):
        if self.from_user_id == self.to_user_id:
            raise ValidationError("Cannot send support request to yourself.")

    def save(self, *args, **kwargs):
        if self.expires_at <= timezone.now() and self.status == self.PENDING:
            self.status = self.EXPIRED
        super().save(*args, **kwargs)

    def is_active(self) -> bool:
        return self.status == self.PENDING and self.expires_at > timezone.now()

    def __str__(self):
        return f"{self.from_user_id} → {self.to_user_id} ({self.status})"


# ===========================
# SUPPORT CONNECTION
# ===========================

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

    user_one = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="connections_as_one"
    )
    user_two = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="connections_as_two"
    )

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE, db_index=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    blocked_at = models.DateTimeField(null=True, blank=True)
    disconnected_at = models.DateTimeField(null=True, blank=True)

    blocked_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="blocked_connections",
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

        # Normalize ordering BEFORE save
        if self.user_one_id > self.user_two_id:
            self.user_one, self.user_two = self.user_two, self.user_one
            self.alias_user_one, self.alias_user_two = (
                self.alias_user_two,
                self.alias_user_one,
            )

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.connection_id} ({self.status})"


# ===========================
# MESSAGE
# ===========================

class Message(models.Model):
    message_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    connection = models.ForeignKey(
        SupportConnection, on_delete=models.CASCADE, related_name="messages"
    )

    # sender NULL = system / safety message
    sender = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sent_support_messages",
    )
    receiver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="received_support_messages",
    )

    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    deleted_for_sender = models.BooleanField(default=False)
    deleted_for_receiver = models.BooleanField(default=False)

    auto_delete_at = models.DateTimeField(null=True, blank=True)

    moderation_status = models.CharField(
        max_length=32, default="clean", db_index=True
    )

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["connection", "created_at"]),
            models.Index(fields=["auto_delete_at"]),
        ]

    def clean(self):
        users = {self.connection.user_one_id, self.connection.user_two_id}
        if self.sender_id and self.sender_id not in users:
            raise ValidationError("Sender not part of connection.")
        if self.receiver_id not in users:
            raise ValidationError("Receiver not part of connection.")
        if self.sender_id == self.receiver_id:
            raise ValidationError("Sender and receiver cannot be same.")

    def is_visible_to_sender(self):
        return (
            not self.deleted_for_sender
            and (not self.auto_delete_at or self.auto_delete_at > timezone.now())
        )

    def is_visible_to_receiver(self):
        return (
            not self.deleted_for_receiver
            and (not self.auto_delete_at or self.auto_delete_at > timezone.now())
        )

    def __str__(self):
        return f"[{self.connection_id}] msg {self.message_id}"


# ===========================
# TYPING INDICATOR
# ===========================

class TypingIndicator(models.Model):
    connection = models.ForeignKey(
        SupportConnection, on_delete=models.CASCADE, related_name="typing_indicators"
    )
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    is_typing = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("connection", "sender")
        indexes = [
            models.Index(fields=["updated_at"]),
        ]

    def is_expired(self) -> bool:
        return self.updated_at < timezone.now() - timedelta(seconds=10)
class JournalEntry(models.Model):
    user=models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="journals"
    )
    content=models.TextField()
    created_at=models.DateTimeField(auto_now_add=True)
    is_deleted=models.BooleanField(default=False)

    class Meta:
        ordering=["-created_at"]
    def __str__(self):
        return f"Journal({self.user.username}, {self.created_at})"

# SIGNALS (ADD THIS HERE)
#=========================
class SignalSnapshot(models.Model):
    """
    Internal, non-user-facing signals derived from journaling.
    This model NEVER stores raw journal text.
    """

    SIGNAL_TYPES = [
        ("mood_direction", "Mood Direction"),
        ("emotional_variance", "Emotional Variance"),
        ("expression_intensity", "Expression Intensity"),
        ("consistency", "Consistency"),
        ("social_reference", "Social Reference"),
    ]

    VALUE_TYPES = [
        ("enum", "Enum"),
        ("int", "Integer"),
        ("bool", "Boolean"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="signal_snapshots"
    )

    signal_type = models.CharField(
        max_length=50,
        choices=SIGNAL_TYPES
    )

    value_type = models.CharField(
        max_length=10,
        choices=VALUE_TYPES
    )

    value = models.CharField(
        max_length=50
    )

    confidence = models.FloatField(
        default=0.0
    )

    window_start = models.DateTimeField()
    window_end = models.DateTimeField()

    generated_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        indexes = [
            models.Index(fields=["user", "signal_type"]),
            models.Index(fields=["generated_at"]),
        ]
        ordering = ["-generated_at"]

    def __str__(self):
        return f"{self.user.username} | {self.signal_type} | {self.value}"
#class Insight(models.Model):
class Insight(models.Model):
    """
    User-facing, safe, non-diagnostic insight.
    Derived from signals, NEVER directly from journal text.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="insights"
    )

    title = models.CharField(
        max_length=100
    )

    message = models.TextField()

    source_window_start = models.DateTimeField()
    source_window_end = models.DateTimeField()

    is_read = models.BooleanField(default=False)
    is_dismissed = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["is_dismissed"]),
        ]

    def __str__(self):
        return f"{self.user.username} | {self.title}"