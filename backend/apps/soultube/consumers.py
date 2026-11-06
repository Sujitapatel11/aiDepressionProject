"""Real-time SoulTube room channel.

Authentication reuses the single-use WebSocket ticket issued by
`POST /api/chat/ws-ticket/`; every event re-checks active room membership.
"""

import asyncio
import json
import logging
import time

import redis.exceptions
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser

from .models import WatchRoom, WatchRoomPlaybackState
from .services import (
    active_membership,
    chat_message_payload,
    is_room_host,
    playback_snapshot,
    record_chat_message,
    room_group_name,
    room_is_open,
    set_playback,
)

logger = logging.getLogger(__name__)

CHAT_WINDOW_SECONDS = 10
CHAT_MAX_PER_WINDOW = 10


class WatchRoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get('user')
        if not user or isinstance(user, AnonymousUser):
            await self.close(code=4003)
            return

        self.user = user
        self.code = self.scope['url_route']['kwargs']['code'].upper()
        self.group_name = room_group_name(self.code)
        self._chat_times = []

        room = await self._room_for_member()
        if room is None:
            await self.close(code=4003)
            return

        try:
            await self.channel_layer.group_add(self.group_name, self.channel_name)
        except Exception as exc:
            logger.warning('SoulTube group_add failed: %s', exc)

        await self.accept()
        self.ping_task = asyncio.create_task(self.start_ping_loop())
        await self.send(text_data=json.dumps({
            'type': 'sync',
            'playback': await self._playback_snapshot(),
        }))

    async def disconnect(self, close_code):
        if getattr(self, 'ping_task', None):
            self.ping_task.cancel()
        if getattr(self, 'group_name', None):
            try:
                await self.channel_layer.group_discard(self.group_name, self.channel_name)
            except (redis.exceptions.TimeoutError, redis.exceptions.ConnectionError) as exc:
                logger.exception('Redis error during SoulTube disconnect: %s', exc)
            except Exception as exc:
                logger.exception('Unexpected SoulTube disconnect error: %s', exc)

    async def start_ping_loop(self):
        try:
            while True:
                await asyncio.sleep(20)
                await self.send(text_data=json.dumps({'type': 'ping'}))
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            logger.exception('SoulTube ping loop failed: %s', exc)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        msg_type = data.get('type', 'chat')

        if msg_type in ('ping', 'pong'):
            if msg_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
            return

        if msg_type == 'sync':
            await self.send(text_data=json.dumps({
                'type': 'sync',
                'playback': await self._playback_snapshot(),
            }))
            return

        if msg_type == 'chat':
            if not self._chat_rate_allowed():
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'detail': 'You are sending messages too quickly.',
                }))
                return
            payload, error = await self._save_chat(data.get('body'))
            if error:
                await self.send(text_data=json.dumps({'type': 'error', 'detail': error}))
                return
            await self._group_event('chat.message', {'message': payload})
            return

        if msg_type == 'playback':
            snapshot, error = await self._update_playback(
                data.get('is_playing'), data.get('position_seconds'),
            )
            if error:
                await self.send(text_data=json.dumps({'type': 'error', 'detail': error}))
                return
            await self._group_event('playback', {'playback': snapshot})
            return

        await self.send(text_data=json.dumps({'type': 'error', 'detail': 'Unknown event type.'}))

    async def soultube_event(self, event):
        await self.send(text_data=json.dumps({
            'type': event.get('event_type'),
            **(event.get('payload') or {}),
        }))
        if event.get('event_type') == 'room.closed':
            await self.close(code=4000)

    async def _group_event(self, event_type, payload):
        try:
            await self.channel_layer.group_send(self.group_name, {
                'type': 'soultube.event',
                'event_type': event_type,
                'payload': payload,
            })
        except Exception as exc:
            logger.warning('SoulTube group_send failed: %s', exc)

    def _chat_rate_allowed(self):
        now = time.monotonic()
        self._chat_times = [stamp for stamp in self._chat_times if now - stamp < CHAT_WINDOW_SECONDS]
        if len(self._chat_times) >= CHAT_MAX_PER_WINDOW:
            return False
        self._chat_times.append(now)
        return True

    @database_sync_to_async
    def _room_for_member(self):
        try:
            room = WatchRoom.objects.select_related('host').get(code=self.code)
        except WatchRoom.DoesNotExist:
            return None
        if not room_is_open(room):
            return None
        return room if active_membership(room, self.user) else None

    @database_sync_to_async
    def _playback_snapshot(self):
        room = WatchRoom.objects.filter(code=self.code).first()
        return playback_snapshot(room) if room else None

    @database_sync_to_async
    def _save_chat(self, body):
        room = WatchRoom.objects.select_related('host').filter(code=self.code).first()
        if not room or not room_is_open(room) or not active_membership(room, self.user):
            return None, 'You are no longer a participant in this room.'
        try:
            message = record_chat_message(room, self.user, body)
        except ValueError as exc:
            return None, str(exc)
        return chat_message_payload(message), None

    @database_sync_to_async
    def _update_playback(self, is_playing, position_seconds):
        room = WatchRoom.objects.select_related('host').filter(code=self.code).first()
        if not room or not room_is_open(room):
            return None, 'This room has ended.'
        if not active_membership(room, self.user):
            return None, 'You are no longer a participant in this room.'
        if not is_room_host(room, self.user):
            return None, 'Only the host can control playback.'
        if not room.video_asset_id:
            return None, 'Add a video before starting playback.'

        try:
            position = 0.0 if position_seconds is None else float(position_seconds)
            if position < 0:
                raise ValueError
        except (TypeError, ValueError):
            return None, 'Invalid playback position.'

        state, _ = WatchRoomPlaybackState.objects.get_or_create(room=room)
        set_playback(
            room,
            self.user,
            is_playing=state.is_playing if is_playing is None else bool(is_playing),
            position_seconds=state.position_seconds if position_seconds is None else position,
        )
        return playback_snapshot(room), None
