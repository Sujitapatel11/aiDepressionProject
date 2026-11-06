"""Shared SoulTube domain helpers used by REST views and the WS consumer."""

import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from apps.mediahub.models import MediaAsset

from .models import (
    WatchRoom,
    WatchRoomChatMessage,
    WatchRoomParticipant,
    WatchRoomPlaybackState,
    WatchRoomQueueItem,
    generate_room_code,
)

logger = logging.getLogger(__name__)

MAX_CHAT_BODY = 500
MAX_POSITION_SECONDS = 24 * 60 * 60


def room_group_name(code):
    return f'soultube_{code}'


def broadcast_room_event(room, event_type, payload):
    """Best-effort fan-out; a Redis outage must not fail the REST write."""
    try:
        async_to_sync(get_channel_layer().group_send)(
            room_group_name(room.code),
            {'type': 'soultube.event', 'event_type': event_type, 'payload': payload},
        )
    except Exception:
        logger.exception('SoulTube broadcast failed for room %s', room.code)


def create_room(*, host, name, visibility, max_participants, video_asset=None, lifetime_hours=None):
    from datetime import timedelta

    if lifetime_hours is None:
        lifetime_hours = 12
    expires_at = timezone.now() + timedelta(hours=lifetime_hours)
    with transaction.atomic():
        code = generate_unique_room_code()
        room = WatchRoom.objects.create(
            code=code,
            name=name,
            host=host,
            visibility=visibility,
            max_participants=max_participants,
            video_asset=video_asset,
            expires_at=expires_at,
        )
        WatchRoomParticipant.objects.create(room=room, user=host, role=WatchRoomParticipant.Role.HOST)
        WatchRoomPlaybackState.objects.create(room=room)
    return room


def generate_unique_room_code():
    for _ in range(20):
        code = generate_room_code()
        if not WatchRoom.objects.filter(code=code).exists():
            return code
    raise RuntimeError('Could not allocate a unique room code.')


def active_membership(room, user):
    if not user or not getattr(user, 'is_authenticated', False):
        return None
    return WatchRoomParticipant.objects.filter(
        room=room, user=user, left_at__isnull=True,
    ).first()


def is_room_host(room, user):
    return bool(user and getattr(user, 'is_authenticated', False) and room.host_id == user.id)


def can_manage_room(room, user):
    return is_room_host(room, user) or bool(user and getattr(user, 'is_staff', False))


def room_is_open(room):
    return room.status == WatchRoom.Status.ACTIVE and room.expires_at > timezone.now()


def validate_room_video_asset(asset_id, user):
    """Only the uploader's own video assets may be played in a room.

    Raises ValueError with a safe message otherwise. External URLs are
    deliberately not accepted: SoulTube never proxies or redistributes
    third-party video.
    """
    if not asset_id:
        return None
    try:
        asset = MediaAsset.objects.get(id=asset_id)
    except (MediaAsset.DoesNotExist, ValueError, TypeError):
        raise ValueError('That media asset does not exist.')
    if asset.user_id != user.id:
        raise ValueError('You can only add videos you uploaded yourself.')
    if asset.kind != MediaAsset.Kind.VIDEO:
        raise ValueError('Only video uploads can be played in a watch room.')
    return asset


def add_queue_item(room, user, asset, title=''):
    current_max = room.queue_items.aggregate(max_position=Max('position'))['max_position']
    position = 0 if current_max is None else current_max + 1
    item = WatchRoomQueueItem.objects.create(
        room=room,
        video_asset=asset,
        title=(title or asset.original_name or 'Video')[:200],
        position=position,
        added_by=user,
    )
    return item


def compact_queue(room):
    items = list(room.queue_items.order_by('position', 'created_at'))
    for index, item in enumerate(items):
        if item.position != index:
            item.position = index
            item.save(update_fields=['position'])
    return items


def set_playback(room, user, *, is_playing, position_seconds):
    position_seconds = max(0.0, min(float(position_seconds or 0.0), MAX_POSITION_SECONDS))
    state, _ = WatchRoomPlaybackState.objects.get_or_create(room=room)
    state.is_playing = bool(is_playing)
    state.position_seconds = position_seconds
    state.updated_by = user
    state.save()
    return state


def playback_snapshot(room):
    state = getattr(room, 'playback', None)
    if state is None:
        state = WatchRoomPlaybackState.objects.filter(room=room).first()
    if state is None:
        now = timezone.now()
        return {
            'is_playing': False,
            'position_seconds': 0,
            'updated_at': None,
            'server_timestamp': now.isoformat(),
        }
    return state.snapshot()


def record_chat_message(room, user, body):
    body = (body or '').strip()
    if not body:
        raise ValueError('Message cannot be empty.')
    if len(body) > MAX_CHAT_BODY:
        raise ValueError(f'Messages are limited to {MAX_CHAT_BODY} characters.')
    return WatchRoomChatMessage.objects.create(room=room, user=user, body=body)


def chat_message_payload(message):
    return {
        'id': message.id,
        'user_id': message.user_id,
        'username': message.user.username if message.user_id else 'Member',
        'body': message.body,
        'created_at': message.created_at.isoformat(),
    }
