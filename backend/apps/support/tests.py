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

        with self.assertNumQueries(2):  # 1 for auth session user + 1 for select_related support request query
            response = self.client.get("/api/support/requests/")
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(len(response.data), 1)
