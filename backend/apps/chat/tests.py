from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

# pyrefly: ignore [missing-import]
from apps.support.models import SupportConnection
from .models import Message


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

