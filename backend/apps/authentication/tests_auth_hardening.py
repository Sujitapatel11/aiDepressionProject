"""Authentication hardening + public identity privacy regression tests.

Covers the behaviors fixed in the auth audit pass:
- Failed login returns 401 (not 400) with a generic, enumeration-safe message.
- Email login continues to work; inactive accounts are rejected.
- Logout requires a valid, owned refresh token, blacklists it, and reports failures.
- Password reset never reveals SMTP/provider internals.
- The public identity payload never exposes private account fields.
"""
from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from apps.identity.models import UserIdentity


class LoginContractTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.password = "Str0ng!Passw0rd#2026"
        self.user = User.objects.create_user(
            username="login_contract_user",
            email="login_contract@example.com",
            password=self.password,
        )

    def test_username_login_returns_tokens(self):
        resp = self.client.post(
            "/api/auth/login/",
            {"username": "login_contract_user", "password": self.password},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data.get("token"))
        self.assertTrue(resp.data.get("refresh"))
        self.assertEqual(resp.data.get("user_id"), self.user.id)
        self.assertNotIn("password", resp.data)

    def test_email_login_returns_tokens(self):
        resp = self.client.post(
            "/api/auth/login/",
            {"username": "login_contract@example.com", "password": self.password},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data.get("user_id"), self.user.id)

    def test_wrong_password_returns_401_generic(self):
        resp = self.client.post(
            "/api/auth/login/",
            {"username": "login_contract_user", "password": "wrong-password"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(resp.data.get("detail"), "Invalid email/username or password.")

    def test_unknown_account_returns_same_401_as_wrong_password(self):
        resp = self.client.post(
            "/api/auth/login/",
            {"username": "no_such_account_xyz", "password": "whatever123"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(resp.data.get("detail"), "Invalid email/username or password.")

    def test_inactive_account_cannot_log_in(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        resp = self.client.post(
            "/api/auth/login/",
            {"username": "login_contract_user", "password": self.password},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn("token", resp.data)

    def test_missing_fields_rejected_with_400(self):
        resp = self.client.post("/api/auth/login/", {"username": "x"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", resp.data)


class LogoutHardeningTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(username="logout_owner", password="Str0ng!Passw0rd#2026")
        self.other = User.objects.create_user(username="logout_other", password="Str0ng!Passw0rd#2026")

    def _authenticate(self, user=None):
        refresh = RefreshToken.for_user(user or self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        return refresh

    def test_logout_requires_authentication(self):
        resp = self.client.post("/api/auth/logout/", {"refresh": "anything"})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_without_refresh_is_rejected(self):
        self._authenticate()
        resp = self.client.post("/api/auth/logout/", {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", resp.data)

    def test_logout_with_garbage_refresh_is_rejected(self):
        self._authenticate()
        resp = self.client.post("/api/auth/logout/", {"refresh": "not-a-token"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_logout_blacklists_own_refresh_token(self):
        refresh = self._authenticate()
        refresh_str = str(refresh)
        resp = self.client.post("/api/auth/logout/", {"refresh": refresh_str}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        with self.assertRaises(TokenError):
            RefreshToken(refresh_str).check_blacklist()

    def test_logout_cannot_revoke_another_users_refresh_token(self):
        self._authenticate()
        victim_refresh = str(RefreshToken.for_user(self.other))
        resp = self.client.post("/api/auth/logout/", {"refresh": victim_refresh}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        # The victim's token must remain usable (not blacklisted).
        RefreshToken(victim_refresh).check_blacklist()

    def test_reusing_revoked_refresh_token_fails(self):
        refresh = self._authenticate()
        refresh_str = str(refresh)
        self.client.post("/api/auth/logout/", {"refresh": refresh_str}, format="json")
        again = self.client.post("/api/auth/logout/", {"refresh": refresh_str}, format="json")
        self.assertEqual(again.status_code, status.HTTP_400_BAD_REQUEST)


class PasswordResetHardeningTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="reset_user", email="reset_user@example.com", password="Str0ng!Passw0rd#2026"
        )

    def test_known_and_unknown_email_get_identical_response(self):
        known = self.client.post("/api/auth/password/reset/", {"email": "reset_user@example.com"})
        unknown = self.client.post("/api/auth/password/reset/", {"email": "nobody_here@example.com"})
        self.assertEqual(known.status_code, status.HTTP_200_OK)
        self.assertEqual(unknown.status_code, status.HTTP_200_OK)
        self.assertEqual(known.data, unknown.data)

    def test_invalid_token_rejected(self):
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes

        resp = self.client.post(
            "/api/auth/password/reset/confirm/",
            {
                "uid": urlsafe_base64_encode(force_bytes(self.user.pk)),
                "token": "invalid-token",
                "new_password": "N3w!Str0ngPass#2026",
                "confirm_password": "N3w!Str0ngPass#2026",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", resp.data)

    def test_weak_new_password_rejected(self):
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes

        resp = self.client.post(
            "/api/auth/password/reset/confirm/",
            {
                "uid": urlsafe_base64_encode(force_bytes(self.user.pk)),
                "token": default_token_generator.make_token(self.user),
                "new_password": "123",
                "confirm_password": "123",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_valid_reset_sets_password_and_invalidates_token(self):
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes

        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)
        resp = self.client.post(
            "/api/auth/password/reset/confirm/",
            {
                "uid": uid,
                "token": token,
                "new_password": "N3w!Str0ngPass#2026",
                "confirm_password": "N3w!Str0ngPass#2026",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("N3w!Str0ngPass#2026"))
        # The old token is invalidated by the password change (token embeds the hash).
        self.assertFalse(default_token_generator.check_token(self.user, token))

    def test_raw_numeric_uid_is_rejected(self):
        from django.contrib.auth.tokens import default_token_generator

        resp = self.client.post(
            "/api/auth/password/reset/confirm/",
            {
                "uid": str(self.user.pk),
                "token": default_token_generator.make_token(self.user),
                "new_password": "N3w!Str0ngPass#2026",
                "confirm_password": "N3w!Str0ngPass#2026",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        # Password must be unchanged.
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("Str0ng!Passw0rd#2026"))

    def test_invalid_encoded_uid_is_rejected(self):
        from django.contrib.auth.tokens import default_token_generator

        resp = self.client.post(
            "/api/auth/password/reset/confirm/",
            {
                "uid": "!!!not-base64!!!",
                "token": default_token_generator.make_token(self.user),
                "new_password": "N3w!Str0ngPass#2026",
                "confirm_password": "N3w!Str0ngPass#2026",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_old_password_fails_after_successful_reset(self):
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes

        resp = self.client.post(
            "/api/auth/password/reset/confirm/",
            {
                "uid": urlsafe_base64_encode(force_bytes(self.user.pk)),
                "token": default_token_generator.make_token(self.user),
                "new_password": "N3w!Str0ngPass#2026",
                "confirm_password": "N3w!Str0ngPass#2026",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        login_old = self.client.post(
            "/api/auth/login/",
            {"username": "reset_user", "password": "Str0ng!Passw0rd#2026"},
            format="json",
        )
        self.assertEqual(login_old.status_code, status.HTTP_401_UNAUTHORIZED)
        login_new = self.client.post(
            "/api/auth/login/",
            {"username": "reset_user", "password": "N3w!Str0ngPass#2026"},
            format="json",
        )
        self.assertEqual(login_new.status_code, status.HTTP_200_OK)

    def test_email_send_failure_does_not_leak_internals(self):
        from unittest import mock

        with mock.patch(
            "django.contrib.auth.forms.PasswordResetForm.save",
            side_effect=Exception("SMTP auth failed: user=secret password=hunter2"),
        ):
            resp = self.client.post("/api/auth/password/reset/", {"email": "reset_user@example.com"})
        self.assertEqual(resp.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        body = resp.content.decode()
        self.assertNotIn("hunter2", body)
        self.assertNotIn("SMTP", body)
        self.assertNotIn("secret", body)


class MeEndpointTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="me_endpoint_user", email="me_endpoint@example.com", password="Str0ng!Passw0rd#2026"
        )

    def test_me_requires_auth(self):
        self.assertEqual(self.client.get("/api/auth/me/").status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_own_account_fields_only(self):
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        resp = self.client.get("/api/auth/me/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["user_id"], self.user.id)
        self.assertEqual(resp.data["email"], "me_endpoint@example.com")
        self.assertNotIn("password", resp.data)


class PublicIdentityPrivacyTests(TestCase):
    """The only public profile-like payload today is /api/identity/public/<id>/.

    KNOWN RESIDUAL RISK (flagged in the audit report, needs approval):
    `avatar_url` is a DiceBear URL whose `?seed=` parameter embeds the stored
    seed used to render the avatar image. Removing it changes every user's
    rendered avatar, so it is preserved here; the private `seed_key` and
    `identity_config` fields themselves are never serialized.
    """

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="public_identity_user",
            email="must_not_leak@example.com",
            password="Str0ng!Passw0rd#2026",
        )
        UserIdentity.objects.create(user=self.user, seed_key="SECRET-AVATAR-SEED")

    def test_public_payload_excludes_private_fields(self):
        resp = self.client.get(f"/api/identity/public/{self.user.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        body = resp.content.decode()
        for forbidden in ("must_not_leak@example.com", "password"):
            self.assertNotIn(forbidden, body)
        # Private model fields must not be serialized as JSON keys.
        self.assertNotIn('"seed_key"', body)
        self.assertNotIn('"identity_config"', body)

    def test_public_payload_fields_are_allowlisted(self):
        resp = self.client.get(f"/api/identity/public/{self.user.id}/")
        self.assertEqual(
            sorted(resp.data.keys()),
            sorted(["user_id", "username", "avatar_url", "badge", "theme", "aura", "companion", "frame", "title"]),
        )

    def test_public_identity_unknown_user_404(self):
        resp = self.client.get("/api/identity/public/999999/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_own_identity_requires_auth(self):
        self.assertEqual(self.client.get("/api/identity/me/").status_code, status.HTTP_401_UNAUTHORIZED)

    def test_own_identity_payload_never_contains_email(self):
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        resp = self.client.get("/api/identity/me/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        body = resp.content.decode()
        self.assertNotIn("must_not_leak@example.com", body)
        self.assertNotIn('"seed_key"', body)
