from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

class PasswordResetConfirmTestCase(TestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="resetuser",
            email="resetuser@example.com",
            password="OldPassword123!"
        )
        self.uid_b64 = urlsafe_base64_encode(force_bytes(self.user.pk))
        self.token = default_token_generator.make_token(self.user)

    def test_successful_password_reset_confirm_with_b64_uid(self):
        payload = {
            "uid": self.uid_b64,
            "token": self.token,
            "new_password": "NewStrongPassword123!",
            "confirm_password": "NewStrongPassword123!"
        }
        response = self.client.post("/api/auth/password/reset/confirm/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify password changed
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewStrongPassword123!"))

    def test_successful_password_reset_confirm_with_raw_uid(self):
        payload = {
            "uid": str(self.user.pk),  # raw integer string e.g. "1"
            "token": self.token,
            "new_password": "NewStrongPassword123!",
            "confirm_password": "NewStrongPassword123!"
        }
        response = self.client.post("/api/auth/password/reset/confirm/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify password changed
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewStrongPassword123!"))

    def test_successful_reset_with_trailing_slashes(self):
        payload = {
            "uid": f"{self.uid_b64}/",
            "token": f"{self.token}/",
            "new_password": "NewStrongPassword123!",
            "confirm_password": "NewStrongPassword123!"
        }
        response = self.client.post("/api/auth/password/reset/confirm/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_mismatched_passwords(self):
        payload = {
            "uid": self.uid_b64,
            "token": self.token,
            "new_password": "NewStrongPassword123!",
            "confirm_password": "DifferentPassword123!"
        }
        response = self.client.post("/api/auth/password/reset/confirm/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get("detail"), "Passwords do not match.")

    def test_invalid_token(self):
        payload = {
            "uid": self.uid_b64,
            "token": "invalid-token-123",
            "new_password": "NewStrongPassword123!",
            "confirm_password": "NewStrongPassword123!"
        }
        response = self.client.post("/api/auth/password/reset/confirm/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get("detail"), "Invalid or expired reset token.")

    def test_weak_password(self):
        payload = {
            "uid": self.uid_b64,
            "token": self.token,
            "new_password": "123",
            "confirm_password": "123"
        }
        response = self.client.post("/api/auth/password/reset/confirm/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("too short", response.data.get("detail"))
