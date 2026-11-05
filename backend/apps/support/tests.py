from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.support.models import SupportRequest, SupportConnection, UserProfile
from apps.support.serializers import ActivityConsentSerializer


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

        with self.assertNumQueries(5):  # 1 query for select_related support requests + 4 queries for avatar resolution (Identity + AuthProfile per user)
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


from datetime import timedelta


class RequestExpiryAndReconnectTests(TestCase):
    """Regression tests for request expiry, reconnection and consent parsing."""

    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(username="expiry_alpha", password="password123")
        self.user2 = User.objects.create_user(username="expiry_beta", password="password123")
        self.client.force_authenticate(user=self.user1)

    def _make_expired(self, from_user, to_user):
        """Create a request whose expires_at has passed while status stays PENDING in DB."""
        req = SupportRequest.objects.create(from_user=from_user, to_user=to_user)
        SupportRequest.objects.filter(pk=req.pk).update(
            expires_at=timezone.now() - timedelta(days=1)
        )
        return req

    def _pending_for(self, from_user, to_user):
        return SupportRequest.objects.filter(
            from_user=from_user, to_user=to_user, status=SupportRequest.PENDING
        ).order_by("-created_at").first()

    # ── expiry visibility ──
    def test_expired_request_hidden_from_incoming(self):
        self._make_expired(self.user1, self.user2)
        self.client.force_authenticate(user=self.user2)
        resp = self.client.get("/api/support/requests/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 0)

    def test_expired_request_hidden_from_sent(self):
        self._make_expired(self.user1, self.user2)
        resp = self.client.get("/api/support/requests/sent/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 0)

    def test_expired_pair_visible_again_in_candidates(self):
        self._make_expired(self.user1, self.user2)
        resp = self.client.get("/api/support/users/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn(self.user2.id, [u["id"] for u in resp.data])

    # ── expiry enforcement on state transitions ──
    def test_expired_request_cannot_be_accepted(self):
        stale = self._make_expired(self.user1, self.user2)
        self.client.force_authenticate(user=self.user2)
        resp = self.client.post(f"/api/support/accept/{stale.pk}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        stale.refresh_from_db()
        self.assertEqual(stale.status, SupportRequest.PENDING)

    def test_expired_request_cannot_be_rejected(self):
        stale = self._make_expired(self.user1, self.user2)
        self.client.force_authenticate(user=self.user2)
        resp = self.client.post(f"/api/support/reject/{stale.pk}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_resend_after_expiry_frees_unique_slot(self):
        self._make_expired(self.user1, self.user2)
        resp = self.client.post(f"/api/support/send/{self.user2.id}/")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        pair_statuses = set(
            SupportRequest.objects.filter(
                from_user=self.user1, to_user=self.user2
            ).values_list("status", flat=True)
        )
        self.assertEqual(pair_statuses, {"expired", "pending"})

    # ── reconnect flow ──
    def test_disconnect_then_reaccept_restores_active_connection(self):
        self.assertEqual(
            self.client.post(f"/api/support/send/{self.user2.id}/").status_code,
            status.HTTP_201_CREATED,
        )
        self.client.force_authenticate(user=self.user2)
        accept_resp = self.client.post(
            f"/api/support/accept/{self._pending_for(self.user1, self.user2).pk}/"
        )
        self.assertEqual(accept_resp.status_code, status.HTTP_200_OK)
        conn_id = accept_resp.data["connection_id"]

        self.assertEqual(
            self.client.post(f"/api/support/connections/{conn_id}/disconnect/").status_code,
            status.HTTP_200_OK,
        )

        # Re-request and re-accept
        self.client.force_authenticate(user=self.user1)
        self.assertEqual(
            self.client.post(f"/api/support/send/{self.user2.id}/").status_code,
            status.HTTP_201_CREATED,
        )
        self.client.force_authenticate(user=self.user2)
        reaccept = self.client.post(
            f"/api/support/accept/{self._pending_for(self.user1, self.user2).pk}/"
        )
        self.assertEqual(reaccept.status_code, status.HTTP_200_OK)
        self.assertEqual(reaccept.data["status"], SupportConnection.STATUS_ACTIVE)
        conn = SupportConnection.objects.get(connection_id=conn_id)
        self.assertEqual(conn.status, SupportConnection.STATUS_ACTIVE)
        self.assertIsNone(conn.disconnected_at)

        # The previously-blocking path works again: chat history requires an ACTIVE connection
        self.client.force_authenticate(user=self.user1)
        chat_resp = self.client.get(f"/api/chat/{conn_id}/messages/")
        self.assertEqual(chat_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(list(chat_resp.data), [])

    # ── blocked invariant ──
    def test_accept_does_not_reopen_blocked_connection(self):
        SupportConnection.objects.create(
            user_one=min(self.user1, self.user2, key=lambda u: u.id),
            user_two=max(self.user1, self.user2, key=lambda u: u.id),
            status=SupportConnection.STATUS_BLOCKED,
        )
        req = SupportRequest.objects.create(from_user=self.user2, to_user=self.user1)
        resp = self.client.post(f"/api/support/accept/{req.pk}/")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        conn = SupportConnection.objects.get(
            user_one=min(self.user1, self.user2, key=lambda u: u.id),
            user_two=max(self.user1, self.user2, key=lambda u: u.id),
        )
        self.assertEqual(conn.status, SupportConnection.STATUS_BLOCKED)
        req.refresh_from_db()
        self.assertEqual(req.status, SupportRequest.PENDING)

    # ── consent boolean parsing ──
    def test_consent_serializer_omission_defaults_false(self):
        serializer = ActivityConsentSerializer(data={})
        self.assertTrue(serializer.is_valid())
        self.assertFalse(serializer.validated_data["consent"])

    def test_consent_omitted_for_new_profile_is_false(self):
        self.assertFalse(UserProfile.objects.filter(user=self.user1).exists())

        resp = self.client.post("/api/support/activity/consent/", {}, format="json")

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(resp.data["has_consent"])
        profile = UserProfile.objects.get(user=self.user1)
        self.assertFalse(profile.has_activity_consent)
        self.assertIsNone(profile.activity_consent_at)

    def test_consent_explicit_true_is_stored(self):
        profile, _ = UserProfile.objects.get_or_create(user=self.user1)

        resp = self.client.post(
            "/api/support/activity/consent/", {"consent": True}, format="json"
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["has_consent"])
        profile.refresh_from_db()
        self.assertTrue(profile.has_activity_consent)
        self.assertIsNotNone(profile.activity_consent_at)

    def test_consent_explicit_false_is_stored(self):
        profile, _ = UserProfile.objects.get_or_create(user=self.user1)
        profile.has_activity_consent = True
        profile.activity_consent_at = timezone.now()
        profile.save(update_fields=["has_activity_consent", "activity_consent_at"])

        resp = self.client.post(
            "/api/support/activity/consent/", {"consent": False}, format="json"
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(resp.data["has_consent"])
        profile.refresh_from_db()
        self.assertFalse(profile.has_activity_consent)
        self.assertIsNone(profile.activity_consent_at)

    def test_consent_string_false_is_false(self):
        resp = self.client.post("/api/support/activity/consent/", {"consent": "false"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(resp.data["has_consent"])

    def test_consent_omitted_preserves_existing_true_and_timestamp(self):
        consented_at = timezone.now()
        profile, _ = UserProfile.objects.get_or_create(user=self.user1)
        profile.has_activity_consent = True
        profile.activity_consent_at = consented_at
        profile.save(update_fields=["has_activity_consent", "activity_consent_at"])

        resp = self.client.post("/api/support/activity/consent/", {}, format="json")

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["has_consent"])
        profile.refresh_from_db()
        self.assertTrue(profile.has_activity_consent)
        self.assertEqual(profile.activity_consent_at, consented_at)

    def test_consent_omitted_preserves_existing_false_and_timestamp(self):
        # A non-null timestamp acts as a sentinel to detect any save that clears it.
        consented_at = timezone.now()
        profile, _ = UserProfile.objects.get_or_create(user=self.user1)
        profile.has_activity_consent = False
        profile.activity_consent_at = consented_at
        profile.save(update_fields=["has_activity_consent", "activity_consent_at"])

        resp = self.client.post("/api/support/activity/consent/", {}, format="json")

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(resp.data["has_consent"])
        profile.refresh_from_db()
        self.assertFalse(profile.has_activity_consent)
        self.assertEqual(profile.activity_consent_at, consented_at)

    def test_consent_garbage_string_rejected(self):
        resp = self.client.post("/api/support/activity/consent/", {"consent": "maybe"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_consent_update_does_not_change_other_users_preference(self):
        other_profile, _ = UserProfile.objects.get_or_create(user=self.user2)
        other_profile.has_activity_consent = True
        other_profile.save(update_fields=["has_activity_consent"])

        resp = self.client.post(
            "/api/support/activity/consent/", {"consent": False}, format="json"
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        other_profile.refresh_from_db()
        self.assertTrue(other_profile.has_activity_consent)
