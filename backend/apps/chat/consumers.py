import asyncio
import json
import logging
import redis.exceptions
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone


from apps.support.models import SupportConnection
from .models import Message

logger = logging.getLogger(__name__)


class SupportChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        user = self.scope.get("user")
        if not user or isinstance(user, AnonymousUser):
            await self.close(code=4003)
            return

        self.user = user
        self.connection_id = self.scope["url_route"]["kwargs"]["connection_id"]
        self.group_name = f"chat_{self.connection_id}"

        if not await self.user_has_access():
            await self.close(code=4003)
            return

        try:
            await self.channel_layer.group_add(self.group_name, self.channel_name)
        except (redis.exceptions.TimeoutError, redis.exceptions.ConnectionError) as e:
            logger.error(f"Redis error during connect group_add: {e}")
            await self.accept()
            await self.send(text_data=json.dumps({
                "type": "error",
                "detail": "temporary connection issue, please retry"
            }))
            await self.close(code=4000)
            return

        await self.accept()
        self.ping_task = asyncio.create_task(self.start_ping_loop())

    async def disconnect(self, close_code):
        if hasattr(self, 'ping_task') and self.ping_task:
            self.ping_task.cancel()
        if hasattr(self, 'group_name'):
            try:
                await self.channel_layer.group_discard(self.group_name, self.channel_name)
            except (redis.exceptions.TimeoutError, redis.exceptions.ConnectionError) as e:
                logger.error(f"Redis error during disconnect group_discard: {e}")

    async def start_ping_loop(self):
        try:
            while True:
                await asyncio.sleep(20)
                await self.send(text_data=json.dumps({"type": "ping"}))
        except asyncio.CancelledError:
            pass
        except Exception:
            pass

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        msg_type = data.get("type", "message")

        if msg_type in ("ping", "pong"):
            return

        if msg_type == "typing":
            try:
                await self.channel_layer.group_send(self.group_name, {
                    "type": "chat.typing",
                    "sender_id": self.user.id,
                    "is_typing": bool(data.get("is_typing", False)),
                })
            except (redis.exceptions.TimeoutError, redis.exceptions.ConnectionError) as e:
                logger.error(f"Redis error during typing group_send: {e}")
                await self.send(text_data=json.dumps({
                    "type": "error",
                    "detail": "temporary connection issue, please retry"
                }))
            return

        content = data.get("message", "").strip()
        if not content:
            return

        msg = await self.save_message(content)
        if not msg:
            return

        try:
            await self.channel_layer.group_send(self.group_name, {
                "type": "chat.message",
                "message_id": str(msg.message_id),
                "message": msg.content,
                "sender_id": self.user.id,
                "timestamp": msg.created_at.isoformat(),
            })
        except (redis.exceptions.TimeoutError, redis.exceptions.ConnectionError) as e:
            logger.error(f"Redis error during message group_send: {e}")
            await self.send(text_data=json.dumps({
                "type": "error",
                "detail": "temporary connection issue, please retry"
            }))

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "type": "message",
            "message_id": event["message_id"],
            "message": event["message"],
            "sender_id": event["sender_id"],
            "timestamp": event["timestamp"],
        }))

    async def chat_typing(self, event):
        await self.send(text_data=json.dumps({
            "type": "typing",
            "sender_id": event["sender_id"],
            "is_typing": event["is_typing"],
        }))

    @database_sync_to_async
    def user_has_access(self):
        try:
            conn = SupportConnection.objects.get(
                connection_id=self.connection_id,
                status=SupportConnection.STATUS_ACTIVE,
            )
            return self.user.id in (conn.user_one_id, conn.user_two_id)
        except SupportConnection.DoesNotExist:
            return False

    @database_sync_to_async
    def save_message(self, content):
        try:
            conn = SupportConnection.objects.get(
                connection_id=self.connection_id,
                status=SupportConnection.STATUS_ACTIVE,
            )
            receiver = conn.user_two if self.user.id == conn.user_one_id else conn.user_one
            return Message.objects.create(
                connection=conn,
                sender=self.user,
                receiver=receiver,
                content=content,
            )
        except SupportConnection.DoesNotExist:
            return None
