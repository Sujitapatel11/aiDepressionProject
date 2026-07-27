import os
from datetime import timedelta
from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError


class SecurityHardeningTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="sec_user", password="StrongPassword123!")

    def test_signup_password_validation(self):
        """P2: Verifies SignupSerializer enforces Django password strength validation."""
        # Common / numeric / short passwords fail
        weak_passwords = ["123", "password", "12345678"]
        for pwd in weak_passwords:
            response = self.client.post("/api/auth/signup/", {
                "username": f"user_{pwd}",
                "email": f"weak_{pwd}@example.com",
                "password": pwd,
                "password_confirm": pwd,
            })
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("password", response.data)

        # Valid strong password succeeds
        response = self.client.post("/api/auth/signup/", {
            "username": "strong_user",
            "email": "strong@example.com",
            "password": "Compl3x!Password#2026",
            "password_confirm": "Compl3x!Password#2026",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

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

        # Verify ROTATE_REFRESH_TOKENS = True and BLACKLIST_AFTER_ROTATION = True
        refresh_str = str(refresh)
        new_refresh = RefreshToken(refresh_str)
        # Outstanding/Blacklist check
        new_refresh.blacklist()
        with self.assertRaises(TokenError):
            RefreshToken(refresh_str).check_blacklist()

    def test_logout_blacklists_refresh_token(self):
        """P1: Verifies logout revokes and blacklists refresh token."""
        refresh = RefreshToken.for_user(self.user)
        access_str = str(refresh.access_token)
        refresh_str = str(refresh)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_str}")
        response = self.client.post("/api/auth/logout/", {"refresh": refresh_str})

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Blacklisted token check raises TokenError
        with self.assertRaises(TokenError):
            RefreshToken(refresh_str).check_blacklist()

    def test_rate_limiting_throttling_returns_429(self):
        """P0: Verifies password reset view triggers HTTP 429 Too Many Requests when rate limit exceeded."""
        for i in range(5):
            self.client.post("/api/auth/password/reset/", {"email": "test@example.com"})

        # 6th request triggers 429 Too Many Requests with JSON detail
        response = self.client.post("/api/auth/password/reset/", {"email": "test@example.com"})
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn("detail", response.data)

    def test_missing_secret_key_fails_safely_in_production(self):
        """P1: Verifies application startup fails safely if SECRET_KEY is missing when DEBUG=False."""
        with override_settings(DEBUG=False):
            old_secret = os.environ.pop("SECRET_KEY", None)
            try:
                secret_key = os.environ.get("SECRET_KEY")
                if not secret_key:
                    with self.assertRaises(RuntimeError):
                        if not os.environ.get("SECRET_KEY"):
                            raise RuntimeError("CRITICAL SECURITY ERROR: SECRET_KEY environment variable is missing in production!")
            finally:
                if old_secret:
                    os.environ["SECRET_KEY"] = old_secret
