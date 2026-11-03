from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from django.contrib.auth.tokens import default_token_generator


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    PASSWORD_RESET_TIMEOUT=60 * 60 * 24,
)
class LogoutAndPasswordResetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="soulcare-user",
            email="user@example.com",
            password="OldStrongPassword!482",
        )

    def test_logout_blacklists_refresh_token_for_authenticated_owner(self):
        refresh = RefreshToken.for_user(self.user)
        self.client.force_authenticate(self.user)

        response = self.client.post(
            "/api/auth/logout/",
            {"refresh": str(refresh)},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            BlacklistedToken.objects.filter(token__jti=refresh["jti"]).exists()
        )

    def test_logout_rejects_refresh_token_from_another_user(self):
        other = User.objects.create_user(
            username="another-user",
            email="another@example.com",
            password="OtherStrongPassword!482",
        )
        refresh = RefreshToken.for_user(other)
        self.client.force_authenticate(self.user)

        response = self.client.post(
            "/api/auth/logout/",
            {"refresh": str(refresh)},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(
            BlacklistedToken.objects.filter(token__jti=refresh["jti"]).exists()
        )

    def test_logout_requires_refresh_token(self):
        self.client.force_authenticate(self.user)
        response = self.client.post("/api/auth/logout/", {}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_password_reset_confirm_changes_password_and_revokes_sessions(self):
        refresh = RefreshToken.for_user(self.user)
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)

        response = self.client.post(
            "/api/auth/password/reset/confirm/",
            {
                "uid": uid,
                "token": token,
                "new_password": "NewStrongPassword!937",
                "confirm_password": "NewStrongPassword!937",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewStrongPassword!937"))
        self.assertTrue(
            BlacklistedToken.objects.filter(token__jti=refresh["jti"]).exists()
        )

    def test_password_reset_confirm_rejects_reused_token(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)
        payload = {
            "uid": uid,
            "token": token,
            "new_password": "NewStrongPassword!937",
            "confirm_password": "NewStrongPassword!937",
        }

        first = self.client.post(
            "/api/auth/password/reset/confirm/", payload, format="json"
        )
        second = self.client.post(
            "/api/auth/password/reset/confirm/", payload, format="json"
        )

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 400)

    def test_password_reset_confirm_rejects_mismatched_passwords(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)
        response = self.client.post(
            "/api/auth/password/reset/confirm/",
            {
                "uid": uid,
                "token": token,
                "new_password": "NewStrongPassword!937",
                "confirm_password": "DifferentStrongPassword!937",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
