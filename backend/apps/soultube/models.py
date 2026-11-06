"""SoulTube synchronized watch-together rooms.

Design notes:
- Rooms are explicit user-created spaces with a host and active participants.
- Every server-side permission check is membership-based; the WebSocket
  consumer and REST views share the same rules.
- Playback state is stored with a server timestamp so clients can reconcile
  drift instead of trusting a peer's clock.
- Only user-owned uploaded video assets are playable. External embeds are not
  proxied, downloaded or redistributed by this app.
"""

import secrets
from datetime import timedelta

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone

ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
ROOM_CODE_LENGTH = 6
ROOM_LIFETIME_HOURS = 12


def default_room_expiry():
    return timezone.now() + timedelta(hours=ROOM_LIFETIME_HOURS)


def generate_room_code():
    return ''.join(secrets.choice(ROOM_CODE_ALPHABET) for _ in range(ROOM_CODE_LENGTH))


class WatchRoom(models.Model):
    class Visibility(models.TextChoices):
        PUBLIC = 'public', 'Public'
        PRIVATE = 'private', 'Private'

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        CLOSED = 'closed', 'Closed'

    code = models.CharField(max_length=8, unique=True, editable=False)
    name = models.CharField(max_length=120)
    host = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hosted_watch_rooms')
    visibility = models.CharField(max_length=10, choices=Visibility.choices, default=Visibility.PUBLIC)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    max_participants = models.PositiveSmallIntegerField(default=20)
    video_asset = models.ForeignKey(
        'mediahub.MediaAsset', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='watch_rooms',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(default=default_room_expiry, db_index=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'visibility', 'created_at'], name='soultube_room_list_idx'),
        ]

    def __str__(self):
        return f'{self.name} ({self.code})'

    @property
    def is_active(self):
        return self.status == self.Status.ACTIVE and self.expires_at > timezone.now()

    def close(self):
        self.status = self.Status.CLOSED
        self.closed_at = timezone.now()
        self.save(update_fields=['status', 'closed_at', 'updated_at'])


class WatchRoomParticipant(models.Model):
    class Role(models.TextChoices):
        HOST = 'host', 'Host'
        VIEWER = 'viewer', 'Viewer'

    room = models.ForeignKey(WatchRoom, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='watch_room_memberships')
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.VIEWER)
    joined_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True)
    left_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['joined_at']
        constraints = [
            models.UniqueConstraint(fields=['room', 'user'], name='uniq_watch_room_participant'),
        ]
        indexes = [
            models.Index(fields=['room', 'left_at'], name='soultube_room_member_idx'),
        ]

    def __str__(self):
        return f'{self.user_id} in {self.room_id}'


class WatchRoomQueueItem(models.Model):
    room = models.ForeignKey(WatchRoom, on_delete=models.CASCADE, related_name='queue_items')
    video_asset = models.ForeignKey(
        'mediahub.MediaAsset', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='watch_queue_items',
    )
    title = models.CharField(max_length=200, blank=True, default='')
    position = models.PositiveIntegerField(default=0)
    added_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['position', 'created_at']
        indexes = [
            models.Index(fields=['room', 'position'], name='soultube_queue_order_idx'),
        ]

    def __str__(self):
        return f'{self.title or self.video_asset_id} @ {self.position}'


class WatchRoomChatMessage(models.Model):
    room = models.ForeignKey(WatchRoom, on_delete=models.CASCADE, related_name='chat_messages')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='watch_room_messages')
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['room', 'created_at'], name='soultube_chat_room_idx'),
        ]

    def __str__(self):
        return f'{self.user_id}: {self.body[:40]}'


class WatchRoomPlaybackState(models.Model):
    room = models.OneToOneField(
        WatchRoom, on_delete=models.CASCADE, primary_key=True, related_name='playback',
    )
    is_playing = models.BooleanField(default=False)
    position_seconds = models.FloatField(default=0.0)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.room_id}: {self.position_seconds:.1f}s playing={self.is_playing}'

    def effective_position(self, now=None):
        """Position the host's clock implies right now, for client reconciliation."""
        now = now or timezone.now()
        position = max(0.0, float(self.position_seconds or 0.0))
        if self.is_playing:
            position += max(0.0, (now - self.updated_at).total_seconds())
        return position

    def snapshot(self):
        now = timezone.now()
        return {
            'is_playing': self.is_playing,
            'position_seconds': round(self.effective_position(now), 3),
            'updated_at': self.updated_at.isoformat(),
            'server_timestamp': now.isoformat(),
        }
