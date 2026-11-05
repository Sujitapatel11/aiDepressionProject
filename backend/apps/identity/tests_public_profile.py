"""PublicProfile API tests: ownership, validation, public allowlist privacy.

Endpoints under test (additive; existing /api/identity/me/ and
/api/identity/public/<id>/ behaviour is covered by tests_auth_hardening.py):
- GET/PATCH /api/identity/profile/
- GET       /api/identity/profile/<user_id>/
"""
from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.identity.models import PublicProfile


def _auth(client, user):
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")


class MyPublicProfileTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="profile_owner",
            email="profile_owner@example.com",
            password="Str0ng!Passw0rd#2026",
        )

    def test_requires_authentication(self):
        self.assertEqual(self.client.get("/api/identity/profile/").status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.patch("/api/identity/profile/", {}, format="json").status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_creates_missing_profile(self):
        self.assertEqual(PublicProfile.objects.filter(user=self.user).count(), 0)
        _auth(self.client, self.user)
        resp = self.client.get("/api/identity/profile/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(PublicProfile.objects.filter(user=self.user).count(), 1)
        self.assertEqual(resp.data["user_id"], self.user.id)
        self.assertEqual(resp.data["username"], "profile_owner")
        self.assertEqual(resp.data["display_name"], "")
        self.assertEqual(resp.data["bio"], "")
        self.assertEqual(resp.data["interests"], [])

    def test_owner_can_update_allowed_fields(self):
        _auth(self.client, self.user)
        resp = self.client.patch(
            "/api/identity/profile/",
            {
                "display_name": "Soul Seeker",
                "bio": "Here for quiet reflections.",
                "interests": ["Music", "Nature", "Reading"],
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        profile = PublicProfile.objects.get(user=self.user)
        self.assertEqual(profile.display_name, "Soul Seeker")
        self.assertEqual(profile.bio, "Here for quiet reflections.")
        self.assertEqual(profile.interests, ["Music", "Nature", "Reading"])

    def test_read_only_fields_cannot_be_changed(self):
        other = User.objects.create_user(username="someone_else", password="Str0ng!Passw0rd#2026")
        _auth(self.client, self.user)
        resp = self.client.patch(
            "/api/identity/profile/",
            {"user_id": other.id, "username": "hacked", "display_name": "Mine"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        profile = PublicProfile.objects.get(user=self.user)
        self.assertEqual(profile.user_id, self.user.id)
        self.assertEqual(self.user.username, "profile_owner")
        self.assertEqual(PublicProfile.objects.filter(user=other).count(), 0)

    def test_bio_length_limit_enforced(self):
        _auth(self.client, self.user)
        resp = self.client.patch("/api/identity/profile/", {"bio": "x" * 281}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("bio", resp.data)

    def test_display_name_length_limit_enforced(self):
        _auth(self.client, self.user)
        resp = self.client.patch("/api/identity/profile/", {"display_name": "x" * 51}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("display_name", resp.data)

    def test_interests_must_be_a_list(self):
        _auth(self.client, self.user)
        resp = self.client.patch("/api/identity/profile/", {"interests": "Music, Nature"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("interests", resp.data)

    def test_interests_reject_non_string_items(self):
        _auth(self.client, self.user)
        resp = self.client.patch("/api/identity/profile/", {"interests": ["Music", 42]}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("interests", resp.data)

    def test_interests_item_length_and_count_limits(self):
        _auth(self.client, self.user)
        too_long = self.client.patch(
            "/api/identity/profile/", {"interests": ["x" * 31]}, format="json"
        )
        self.assertEqual(too_long.status_code, status.HTTP_400_BAD_REQUEST)
        too_many = self.client.patch(
            "/api/identity/profile/", {"interests": [f"tag{i}" for i in range(11)]}, format="json"
        )
        self.assertEqual(too_many.status_code, status.HTTP_400_BAD_REQUEST)

    def test_interests_are_trimmed_and_deduplicated(self):
        _auth(self.client, self.user)
        resp = self.client.patch(
            "/api/identity/profile/",
            {"interests": ["  Music  ", "music", "Nature ", "Nature"]},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        profile = PublicProfile.objects.get(user=self.user)
        self.assertEqual(profile.interests, ["Music", "Nature"])

    def test_empty_interest_rejected(self):
        _auth(self.client, self.user)
        resp = self.client.patch("/api/identity/profile/", {"interests": ["  "]}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class PublicProfileRetrievalTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="public_person",
            email="private_email@example.com",
            password="Str0ng!Passw0rd#2026",
        )
        PublicProfile.objects.create(
            user=self.user,
            display_name="Public Person",
            bio="Hi there.",
            interests=["Music"],
        )

    def test_anonymous_can_read_public_profile(self):
        resp = self.client.get(f"/api/identity/profile/{self.user.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["display_name"], "Public Person")
        self.assertEqual(resp.data["username"], "public_person")
        self.assertEqual(resp.data["interests"], ["Music"])

    def test_public_payload_is_allowlisted_and_private_fields_absent(self):
        resp = self.client.get(f"/api/identity/profile/{self.user.id}/")
        self.assertEqual(
            sorted(resp.data.keys()),
            sorted([
                "user_id", "username", "display_name", "bio", "interests",
                "avatar_url", "created_at", "updated_at",
            ]),
        )
        body = resp.content.decode()
        for forbidden in (
            "private_email@example.com", "password", "seed_key", "identity_config",
        ):
            self.assertNotIn(forbidden, body)

    def test_missing_profile_returns_404(self):
        resp = self.client.get("/api/identity/profile/999999/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_without_profile_returns_404(self):
        bare = User.objects.create_user(username="no_profile_user", password="Str0ng!Passw0rd#2026")
        resp = self.client.get(f"/api/identity/profile/{bare.id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_inactive_user_profile_not_public(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        resp = self.client.get(f"/api/identity/profile/{self.user.id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
