from unittest.mock import patch
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.authentication.models import UserAuthProfile


class GoogleOAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_google_auth_new_user_creation(self, mock_verify):
        """Verifies a new user account and UserAuthProfile are created from valid Google ID token."""
        mock_verify.return_value = {
            "sub": "google-user-12345",
            "email": "newgoogleuser@example.com",
            "name": "Jane Doe",
            "picture": "https://example.com/jane.jpg",
            "email_verified": True,
        }

        response = self.client.post("/api/auth/google/", {"id_token": "valid.mock.token"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("user_id", response.data)
        self.assertEqual(response.data["username"], "newgoogleuser")

        # Verify database objects
        user = User.objects.get(email="newgoogleuser@example.com")
        self.assertEqual(user.first_name, "Jane")
        self.assertEqual(user.last_name, "Doe")

        auth_profile = UserAuthProfile.objects.get(user=user)
        self.assertEqual(auth_profile.google_id, "google-user-12345")
        self.assertEqual(auth_profile.auth_provider, "google")
        self.assertEqual(auth_profile.avatar_url, "https://example.com/jane.jpg")

    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_google_auth_existing_email_account_linking(self, mock_verify):
        """Verifies an existing email/password account is linked to Google ID upon Google login."""
        existing_user = User.objects.create_user(
            username="existing_account",
            email="existing@example.com",
            password="StrongPassword123!"
        )

        mock_verify.return_value = {
            "sub": "google-user-67890",
            "email": "existing@example.com",
            "name": "Existing User",
            "picture": "https://example.com/existing.jpg",
            "email_verified": True,
        }

        response = self.client.post("/api/auth/google/", {"id_token": "valid.mock.token"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user_id"], existing_user.id)
        self.assertEqual(response.data["username"], "existing_account")

        # Verify linking
        auth_profile = UserAuthProfile.objects.get(user=existing_user)
        self.assertEqual(auth_profile.google_id, "google-user-67890")
        self.assertEqual(auth_profile.auth_provider, "google")

    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_google_auth_subsequent_login(self, mock_verify):
        """Verifies logging in multiple times via Google returns the same user without creating duplicates."""
        mock_verify.return_value = {
            "sub": "google-user-subsequent",
            "email": "repeat@example.com",
            "name": "Repeat User",
            "email_verified": True,
        }

        resp1 = self.client.post("/api/auth/google/", {"id_token": "token1"})
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)

        resp2 = self.client.post("/api/auth/google/", {"id_token": "token2"})
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)

        self.assertEqual(resp1.data["user_id"], resp2.data["user_id"])
        self.assertEqual(User.objects.filter(email="repeat@example.com").count(), 1)

    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_google_auth_invalid_token_rejection(self, mock_verify):
        """Verifies invalid or forged tokens return HTTP 400 Bad Request."""
        mock_verify.side_effect = ValueError("Invalid token signature")

        response = self.client.post("/api/auth/google/", {"id_token": "invalid.token"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_google_auth_missing_email_claim(self, mock_verify):
        """Verifies tokens missing email claim return HTTP 400 Bad Request."""
        mock_verify.return_value = {
            "sub": "no-email-user",
            "name": "No Email",
        }

        response = self.client.post("/api/auth/google/", {"id_token": "token.no.email"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)
