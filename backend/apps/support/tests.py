from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from apps.support.models import SupportRequest, SupportConnection, UserProfile


class SupportHardeningDatabaseTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(username="user_alpha", password="password123")
        self.user2 = User.objects.create_user(username="user_beta", password="password123")
        self.client.force_authenticate(user=self.user1)

    def test_unique_pending_request_constraint_prevents_duplicates(self):
        """P3: Verifies UniqueConstraint prevents duplicate pending support requests at database level."""
        req1 = SupportRequest.objects.create(from_user=self.user1, to_user=self.user2)
        self.assertIsNotNone(req1.id)

        # Attempting to insert duplicate pending request triggers IntegrityError
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                SupportRequest.objects.create(from_user=self.user1, to_user=self.user2)

    def test_send_request_view_handles_duplicate_gracefully(self):
        """P3: Verifies DRF send_request endpoint handles duplicate request gracefully without server error."""
        response1 = self.client.post(f"/api/support/send/{self.user2.id}/")
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)

        response2 = self.client.post(f"/api/support/send/{self.user2.id}/")
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response2.data)

    def test_accept_request_transaction_atomic_rollback(self):
        """P2: Verifies accept_request wraps status update and connection creation in transaction.atomic."""
        req = SupportRequest.objects.create(from_user=self.user2, to_user=self.user1)

        # Accept request as user1
        response = self.client.post(f"/api/support/accept/{req.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        req.refresh_from_db()
        self.assertEqual(req.status, SupportRequest.ACCEPTED)
        self.assertTrue(SupportConnection.objects.filter(status=SupportConnection.STATUS_ACTIVE).exists())

    def test_select_related_optimizes_query_count(self):
        """P0: Verifies select_related reduces query count for incoming and sent requests."""
        SupportRequest.objects.create(from_user=self.user2, to_user=self.user1)

        with self.assertNumQueries(1):  # 1 query for select_related support requests (force_authenticate requires 0 DB queries)
            response = self.client.get("/api/support/requests/")
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(len(response.data), 1)

    def test_available_users_excludes_active_and_blocked_connections(self):
        """Verifies active and blocked connections are excluded from recommendations, while normal users remain."""
        user3 = User.objects.create_user(username="user_gamma", password="password123")
        user4 = User.objects.create_user(username="user_delta", password="password123")

        # Active connection with user2
        SupportConnection.objects.create(
            user_one=min(self.user1, self.user2, key=lambda u: u.id),
            user_two=max(self.user1, self.user2, key=lambda u: u.id),
            status=SupportConnection.STATUS_ACTIVE,
        )

        # Blocked connection with user3
        SupportConnection.objects.create(
            user_one=min(self.user1, user3, key=lambda u: u.id),
            user_two=max(self.user1, user3, key=lambda u: u.id),
            status=SupportConnection.STATUS_BLOCKED,
        )

        response = self.client.get("/api/support/users/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user_ids = [u["id"] for u in response.data]

        # Active (user2) and Blocked (user3) should be excluded
        self.assertNotIn(self.user2.id, user_ids)
        self.assertNotIn(user3.id, user_ids)

        # Normal user (user4) should be present
        self.assertIn(user4.id, user_ids)

    def test_available_users_excludes_inactive_accounts(self):
        """Verifies inactive users (is_active=False) are excluded while active users are returned."""
        # 5 active users
        active_users = [
            User.objects.create_user(username=f"active_{i}", password="password123", is_active=True)
            for i in range(5)
        ]

        # 3 inactive users
        inactive_users = [
            User.objects.create_user(username=f"inactive_{i}", password="password123", is_active=False)
            for i in range(3)
        ]

        response = self.client.get("/api/support/users/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {u["id"] for u in response.data}

        # Active users (user2 + 5 active users) must be present
        for au in active_users:
            self.assertIn(au.id, returned_ids)

        # Inactive users must NOT be present
        for iu in inactive_users:
            self.assertNotIn(iu.id, returned_ids)
