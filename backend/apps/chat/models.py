import hashlib
import re
import secrets
import uuid
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

from apps.support.models import SupportConnection


class WebSocketAuthTicket(models.Model):
    LIFETIME_SECONDS = 30

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="websocket_auth_tickets",
    )
    token_hash = models.CharField(max_length=64, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    consumed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["expires_at"], name="chat_ws_ticket_exp_idx"),
        ]

    @staticmethod
    def _hash_token(raw_ticket):
        return hashlib.sha256(raw_ticket.encode("utf-8")).hexdigest()

    @classmethod
    def issue_for_user(cls, user):
        raw_ticket = secrets.token_urlsafe(32)
        ticket = cls.objects.create(
            user=user,
            token_hash=cls._hash_token(raw_ticket),
            expires_at=timezone.now() + timedelta(seconds=cls.LIFETIME_SECONDS),
        )
        return raw_ticket, ticket

    @classmethod
    def consume(cls, raw_ticket):
        if not isinstance(raw_ticket, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", raw_ticket):
            return None

        token_hash = cls._hash_token(raw_ticket)
        consumed_at = timezone.now()
        updated = cls.objects.filter(
            token_hash=token_hash,
            consumed_at__isnull=True,
            expires_at__gt=consumed_at,
        ).update(consumed_at=consumed_at)
        if updated != 1:
            return None

        try:
            user = cls.objects.select_related("user").get(token_hash=token_hash).user
            return user if user.is_active else None
        except cls.DoesNotExist:
            return None


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
