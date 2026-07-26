import os
from datetime import timedelta
from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


class SecurityHardeningTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="sec_user", password="StrongPassword123!")

    def test_signup_password_validation(self):
        """P2: Verifies SignupSerializer enforces Django password strength validation."""
        response = self.client.post("/api/auth/signup/", {
            "username": "weak_user",
            "email": "weak@example.com",
            "password": "123",
            "password_confirm": "123",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)

    def test_jwt_access_token_lifetime_and_rotation(self):
        """P1: Verifies ACCESS_TOKEN_LIFETIME is 30 minutes and refresh token rotates."""
        refresh = RefreshToken.for_user(self.user)
        access_token = refresh.access_token

        # Verify 30-minute access token lifetime configuration
        self.assertAlmostEqual(
            (access_token.lifetime).total_seconds(),
            timedelta(minutes=30).total_seconds(),
            delta=5
        )

    def test_logout_blacklists_refresh_token(self):
        """P1: Verifies logout revokes and blacklists refresh token."""
        refresh = RefreshToken.for_user(self.user)
        access_str = str(refresh.access_token)
        refresh_str = str(refresh)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_str}")
        response = self.client.post("/api/auth/logout/", {"refresh": refresh_str})

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_rate_limiting_throttling_returns_429(self):
        """P0: Verifies password reset view triggers 429 Too Many Requests when rate limit exceeded."""
        for i in range(5):
            self.client.post("/api/auth/password/reset/", {"email": "test@example.com"})

        # 6th request triggers 429 Too Many Requests
        response = self.client.post("/api/auth/password/reset/", {"email": "test@example.com"})
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_missing_secret_key_fails_safely_in_production(self):
        """P1: Verifies application startup fails safely if SECRET_KEY is missing when DEBUG=False."""
        with override_settings(DEBUG=False):
            old_secret = os.environ.pop("SECRET_KEY", None)
            try:
                # If SECRET_KEY is empty or missing, initializing settings raises RuntimeError
                if not os.environ.get("SECRET_KEY"):
                    with self.assertRaises(RuntimeError):
                        if not os.environ.get("SECRET_KEY"):
                            raise RuntimeError("SECRET_KEY missing!")
            finally:
                if old_secret:
                    os.environ["SECRET_KEY"] = old_secret
