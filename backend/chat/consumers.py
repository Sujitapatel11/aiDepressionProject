"""
WebSocket consumer for real-time support chat
STRICT: permission-checked, connection-based only
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from django.contrib.auth.models import AnonymousUser

from .models import SupportConnection, Message


class SupportChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for 1-to-1 SupportConnection chat
    """

    async def connect(self):
        # Reject unauthenticated users
        if self.scope["user"] is None or isinstance(self.scope["user"], AnonymousUser):
            await self.close()
            return

        self.user = self.scope["user"]
        self.connection_id = self.scope["url_route"]["kwargs"]["connection_id"]
        self.group_name = f"support_{self.connection_id}"

        # Permission check
        allowed = await self.user_has_access()
        if not allowed:
            await self.close()
            return

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        message_text = data.get("message", "").strip()
        if not message_text:
            return

        # Save message
        msg = await self.save_message(message_text)

        if not msg:
            return

        # Broadcast
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "support.chat.message",
                "message": msg.content,
                "sender_id": self.user.id,
                "timestamp": msg.created_at.isoformat(),
            }
        )

    async def support_chat_message(self, event):
        await self.send(text_data=json.dumps({
            "message": event["message"],
            "sender_id": event["sender_id"],
            "timestamp": event["timestamp"],
        }))

    # ===========================
    # DATABASE METHODS
    # ===========================

    @database_sync_to_async
    def user_has_access(self) -> bool:
        try:
            conn = SupportConnection.objects.get(
                connection_id=self.connection_id,
                status=SupportConnection.STATUS_ACTIVE
            )
            return self.user in (conn.user_one, conn.user_two)
        except SupportConnection.DoesNotExist:
            return False

    @database_sync_to_async
    def save_message(self, text: str):
        try:
            conn = SupportConnection.objects.get(
                connection_id=self.connection_id,
                status=SupportConnection.STATUS_ACTIVE
            )

            receiver = conn.user_two if self.user == conn.user_one else conn.user_one

            return Message.objects.create(
                connection=conn,
                sender=self.user,
                receiver=receiver,
                content=text,
                created_at=timezone.now()
            )

        except SupportConnection.DoesNotExist:
            return None
