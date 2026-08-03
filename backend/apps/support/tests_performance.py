from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.support.models import SupportConnection, UserProfile
from apps.journal.models import JournalEntry
from apps.insights.models import Insight
from apps.chat.models import Message


class PerformanceRegressionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(username="user1", password="Password123!")
        self.user2 = User.objects.create_user(username="user2", password="Password123!")
        self.user3 = User.objects.create_user(username="user3", password="Password123!")

        # Create user profiles
        UserProfile.objects.create(user=self.user1, openness=0.8, extraversion=0.7)
        UserProfile.objects.create(user=self.user2, openness=0.6, extraversion=0.5)
        UserProfile.objects.create(user=self.user3, openness=0.4, extraversion=0.3)

        self.client.force_authenticate(user=self.user1)

    def test_available_users_query_count_is_constant_3(self):
        """P0: Verifies available_users bulk fetches profiles in constant 3 SQL queries regardless of user count."""
        with self.assertNumQueries(3):
            response = self.client.get("/api/support/users/?mode=smart")
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_insights_list_select_related_query_count_is_2(self):
        """P1: Verifies insight_list executes exactly 2 SQL queries (1 update + 1 select with select_related)."""
        j = JournalEntry.objects.create(user=self.user1, content="Content")
        from django.utils import timezone
        now = timezone.now()
        Insight.objects.create(
            user=self.user1, journal=j, title="Insight Title", message="Msg",
            source_window_start=now, source_window_end=now
        )

        with self.assertNumQueries(2):
            response = self.client.get("/api/insights/")
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_message_history_select_related_query_count_is_2(self):
        """P1: Verifies message_history executes exactly 2 SQL queries with select_related('sender')."""
        conn = SupportConnection.objects.create(
            user_one=self.user1,
            user_two=self.user2,
            alias_user_one="user_1",
            alias_user_two="user_2",
            status=SupportConnection.STATUS_ACTIVE,
        )
        Message.objects.create(connection=conn, sender=self.user1, receiver=self.user2, content="Hello")
        Message.objects.create(connection=conn, sender=self.user2, receiver=self.user1, content="Hi")

        with self.assertNumQueries(2):
            response = self.client.get(f"/api/chat/{conn.connection_id}/messages/")
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_journal_list_pagination(self):
        """P1: Verifies journal list endpoint returns DRF paginated structure."""
        for i in range(25):
            JournalEntry.objects.create(user=self.user1, content=f"Content {i}")

        response = self.client.get("/api/journal/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertIn("count", response.data)
        self.assertEqual(response.data["count"], 25)
        self.assertEqual(len(response.data["results"]), 20)  # Default page size
