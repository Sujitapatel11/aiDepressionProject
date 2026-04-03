import uuid
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

from apps.support.models import SupportConnection


class Message(models.Model):
    message_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    connection = models.ForeignKey(SupportConnection, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="sent_messages"
    )
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name="received_messages")
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_for_sender = models.BooleanField(default=False)
    deleted_for_receiver = models.BooleanField(default=False)
    auto_delete_at = models.DateTimeField(null=True, blank=True)
    moderation_status = models.CharField(max_length=32, default="clean", db_index=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["connection", "created_at"]),
        ]

    def __str__(self):
        return f"[{self.connection_id}] msg {self.message_id}"


class TypingIndicator(models.Model):
    connection = models.ForeignKey(SupportConnection, on_delete=models.CASCADE, related_name="typing_indicators")
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    is_typing = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("connection", "sender")

    def is_expired(self) -> bool:
        return self.updated_at < timezone.now() - timedelta(seconds=10)
