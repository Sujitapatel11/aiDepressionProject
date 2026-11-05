import hashlib
from datetime import timedelta
from urllib.parse import quote

from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from django.contrib.auth.models import User
from django.test import TestCase, TransactionTestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

# pyrefly: ignore [missing-import]
from apps.support.models import SupportConnection
from .models import Message, WebSocketAuthTicket


class MessageHistoryTests(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username="user1", password="password123")
        self.user2 = User.objects.create_user(username="user2", password="password123")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user1)

        self.conn = SupportConnection.objects.create(
            user_one=self.user1,
            user_two=self.user2,
            alias_user_one="u1",
            alias_user_two="u2",
            status=SupportConnection.STATUS_ACTIVE,
        )

    def test_message_history_returns_active_messages(self):
        """Standard test: Verifies that active chat messages are returned in history."""
        Message.objects.create(
            connection=self.conn, sender=self.user1, receiver=self.user2, content="Hello there"
        )
        response = self.client.get(f"/api/chat/{self.conn.connection_id}/messages/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["content"], "Hello there")

    # TODO:
    # This test validates future soft-delete behavior.
    # It should become a production feature only after:
    # 1. DELETE message API exists.
    # 2. Frontend message delete UI exists.
    # 3. WebSocket synchronization is implemented (if required).
    def test_future_soft_delete_feature_excludes_deleted_messages(self):
        """
        FUTURE SOFT-DELETE FEATURE TEST:
        Validates readiness for future chat message deletion endpoints.
        If deleted_for_sender or deleted_for_receiver flags are set, those messages
        are excluded from history for that user.
        """
        field_names = [f.name for f in Message._meta.get_fields()]
        self.assertIn(
            "deleted_for_sender",
            field_names,
            "Message model is missing 'deleted_for_sender' field. If soft-delete schema was removed, update this test.",
        )
        self.assertIn(
            "deleted_for_receiver",
            field_names,
            "Message model is missing 'deleted_for_receiver' field. If soft-delete schema was removed, update this test.",
        )

        Message.objects.create(
            connection=self.conn, sender=self.user1, receiver=self.user2, content="Visible message"
        )
        Message.objects.create(
            connection=self.conn,
            sender=self.user1,
            receiver=self.user2,
            content="Sender deleted message",
            deleted_for_sender=True,
        )
        Message.objects.create(
            connection=self.conn,
            sender=self.user2,
            receiver=self.user1,
            content="Receiver deleted message",
            deleted_for_receiver=True,
        )

        response = self.client.get(f"/api/chat/{self.conn.connection_id}/messages/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        messages_data = response.data
        self.assertEqual(len(messages_data), 1)
        self.assertEqual(messages_data[0]["content"], "Visible message")


class WebSocketAuthTicketTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="ticket_user", password="password123")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_authenticated_endpoint_issues_hashed_short_lived_ticket(self):
        response = self.client.post("/api/chat/ws-ticket/")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        raw_ticket = response.data["ticket"]
        ticket = WebSocketAuthTicket.objects.get(user=self.user)
        self.assertEqual(ticket.token_hash, hashlib.sha256(raw_ticket.encode()).hexdigest())
        self.assertNotEqual(ticket.token_hash, raw_ticket)
        self.assertEqual(response.data["expires_in"], WebSocketAuthTicket.LIFETIME_SECONDS)
        self.assertLessEqual(
            (ticket.expires_at - ticket.created_at).total_seconds(),
            WebSocketAuthTicket.LIFETIME_SECONDS,
        )

    def test_ticket_endpoint_requires_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.post("/api/chat/ws-ticket/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_expired_ticket_is_rejected(self):
        raw_ticket, ticket = WebSocketAuthTicket.issue_for_user(self.user)
        WebSocketAuthTicket.objects.filter(pk=ticket.pk).update(
            expires_at=timezone.now() - timedelta(seconds=1)
        )

        self.assertIsNone(WebSocketAuthTicket.consume(raw_ticket))

    def test_ticket_cannot_be_replayed(self):
        raw_ticket, _ = WebSocketAuthTicket.issue_for_user(self.user)

        self.assertEqual(WebSocketAuthTicket.consume(raw_ticket), self.user)
        self.assertIsNone(WebSocketAuthTicket.consume(raw_ticket))

    def test_malformed_and_unknown_tickets_are_rejected(self):
        self.assertIsNone(WebSocketAuthTicket.consume(None))
        self.assertIsNone(WebSocketAuthTicket.consume("not a ticket"))
        self.assertIsNone(WebSocketAuthTicket.consume("a" * 129))
        self.assertIsNone(WebSocketAuthTicket.consume("A" * 43))

    def test_inactive_user_ticket_is_rejected(self):
        raw_ticket, _ = WebSocketAuthTicket.issue_for_user(self.user)
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

        self.assertIsNone(WebSocketAuthTicket.consume(raw_ticket))


@override_settings(
    CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
)
class WebSocketTicketConnectionTests(TransactionTestCase):
    def setUp(self):
        from config.asgi import application

        self.application = application
        self.user = User.objects.create_user(username="socket_user", password="password123")
        self.peer = User.objects.create_user(username="socket_peer", password="password123")
        self.connection = SupportConnection.objects.create(
            user_one=self.user,
            user_two=self.peer,
            alias_user_one="socket_user",
            alias_user_two="socket_peer",
            status=SupportConnection.STATUS_ACTIVE,
        )

    def test_single_use_ticket_authenticates_actual_asgi_connection(self):
        raw_ticket, _ = WebSocketAuthTicket.issue_for_user(self.user)
        communicator = WebsocketCommunicator(
            self.application,
            f"/ws/chat/{self.connection.connection_id}/?ticket={quote(raw_ticket)}",
            headers=[(b"origin", b"http://testserver")],
        )

        async def connect_and_disconnect():
            result = await communicator.connect()
            if result[0]:
                await communicator.disconnect()
            return result

        connected, connect_result = async_to_sync(connect_and_disconnect)()
        self.assertTrue(connected, f"ASGI connection was rejected: {connect_result!r}")

    def test_jwt_query_parameter_does_not_authenticate_connection(self):
        from rest_framework_simplejwt.tokens import AccessToken

        token = str(AccessToken.for_user(self.user))
        communicator = WebsocketCommunicator(
            self.application,
            f"/ws/chat/{self.connection.connection_id}/?token={quote(token)}",
            headers=[(b"origin", b"http://testserver")],
        )

        connected, _ = async_to_sync(communicator.connect)()
        self.assertFalse(connected)

