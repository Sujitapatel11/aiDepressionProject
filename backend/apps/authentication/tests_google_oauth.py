from unittest.mock import patch
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from apps.authentication.models import UserAuthProfile

GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com"


@override_settings(GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID)
class GoogleOAuthFlowTests(TestCase):
    def setUp(self):
        # The anonymous throttle (10/min) is shared across the whole test run;
        # reset it so these tests measure behaviour, not the rate limiter.
        cache.clear()
        self.client = APIClient()
        self.google_email = "user.soulcare@gmail.com"
        self.google_sub = "google_sub_123456789"
        self.google_name = "SoulCare User"
        self.google_picture = "https://lh3.googleusercontent.com/a/avatar_pic"

    def _mock_google_token_info(self, email=None, sub=None, name=None, picture=None, email_verified=True):
        return {
            "email": email or self.google_email,
            "sub": sub or self.google_sub,
            "name": name or self.google_name,
            "picture": picture or self.google_picture,
            "email_verified": email_verified,
            "aud": GOOGLE_CLIENT_ID,
            "iss": "https://accounts.google.com",
        }

    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_scenario_1_first_google_login_creates_account(self, mock_verify):
        """Scenario 1: First Google Login creates a new account and links UserAuthProfile."""
        mock_verify.return_value = self._mock_google_token_info()

        response = self.client.post('/api/auth/google/', {"id_token": "valid_mock_id_token"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)
        self.assertIn("user_id", response.data)

        # Verify exactly one user created
        users = User.objects.filter(email__iexact=self.google_email)
        self.assertEqual(users.count(), 1)

        user = users.first()
        self.assertEqual(response.data["user_id"], user.id)

        # Verify UserAuthProfile linked
        profile = UserAuthProfile.objects.get(user=user)
        self.assertEqual(profile.google_id, self.google_sub)
        self.assertEqual(profile.auth_provider, 'google')

    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_scenario_2_second_google_login_returns_same_account(self, mock_verify):
        """Scenario 2: Second Google Login using SAME Google account returns existing account (NO duplicate)."""
        mock_verify.return_value = self._mock_google_token_info()

        # First login
        res1 = self.client.post('/api/auth/google/', {"id_token": "valid_mock_id_token"})
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        user_id_1 = res1.data["user_id"]

        # Second login
        res2 = self.client.post('/api/auth/google/', {"id_token": "valid_mock_id_token"})
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        user_id_2 = res2.data["user_id"]

        # Must return the SAME user_id
        self.assertEqual(user_id_1, user_id_2)
        self.assertEqual(User.objects.filter(email__iexact=self.google_email).count(), 1)

    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_scenario_3_google_login_after_logout_returns_same_account(self, mock_verify):
        """Scenario 3: Google Login after logging out returns existing account."""
        mock_verify.return_value = self._mock_google_token_info()

        # Login 1
        res1 = self.client.post('/api/auth/google/', {"id_token": "valid_mock_id_token"})
        refresh_token = res1.data["refresh"]
        access_token = res1.data["token"]

        # Logout
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        res_logout = self.client.post('/api/auth/logout/', {"refresh": refresh_token})
        self.assertEqual(res_logout.status_code, status.HTTP_200_OK)

        # Login 2 after logout
        self.client.credentials()
        res2 = self.client.post('/api/auth/google/', {"id_token": "valid_mock_id_token"})
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res1.data["user_id"], res2.data["user_id"])
        self.assertEqual(User.objects.filter(email__iexact=self.google_email).count(), 1)

    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_scenario_4_manual_signup_then_google_login_links_account(self, mock_verify):
        """Scenario 4: Manual signup using email first, then Google Login links to existing user without duplicate."""
        # 1. Manual Signup first
        signup_res = self.client.post('/api/auth/signup/', {
            "username": "manual_user",
            "email": self.google_email,
            "password": "Password123!",
            "password_confirm": "Password123!"
        })
        self.assertEqual(signup_res.status_code, status.HTTP_201_CREATED)
        existing_user_id = signup_res.data["user_id"]

        # 2. Google Login with same email
        mock_verify.return_value = self._mock_google_token_info()
        google_res = self.client.post('/api/auth/google/', {"id_token": "valid_mock_id_token"})
        self.assertEqual(google_res.status_code, status.HTTP_200_OK)

        # 3. Verify Google login linked to existing user ID
        self.assertEqual(google_res.data["user_id"], existing_user_id)
        self.assertEqual(User.objects.filter(email__iexact=self.google_email).count(), 1)

        profile = UserAuthProfile.objects.get(user_id=existing_user_id)
        self.assertEqual(profile.google_id, self.google_sub)

    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_scenario_5_google_login_different_email_creates_new_account(self, mock_verify):
        """Scenario 5: Google Login using a different email creates a new account."""
        # User 1
        mock_verify.return_value = self._mock_google_token_info(email="user1@gmail.com", sub="sub_111")
        res1 = self.client.post('/api/auth/google/', {"id_token": "token1"})
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # User 2
        mock_verify.return_value = self._mock_google_token_info(email="user2@gmail.com", sub="sub_222")
        res2 = self.client.post('/api/auth/google/', {"id_token": "token2"})
        self.assertEqual(res2.status_code, status.HTTP_200_OK)

        self.assertNotEqual(res1.data["user_id"], res2.data["user_id"])
        self.assertEqual(User.objects.filter(email__iexact="user1@gmail.com").count(), 1)
        self.assertEqual(User.objects.filter(email__iexact="user2@gmail.com").count(), 1)


class GoogleOAuthHardeningTests(TestCase):
    """The endpoint must fail closed — these are the paths the old fallback skipped."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()

    @override_settings(GOOGLE_CLIENT_ID="")
    def test_unconfigured_server_refuses_sign_in(self):
        """No client id configured => 503, never an unverified accept."""
        res = self.client.post("/api/auth/google/", {"id_token": "anything"})
        self.assertEqual(res.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(User.objects.count(), 0)

    @override_settings(GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID)
    @patch("google.oauth2.id_token.verify_oauth2_token", side_effect=ValueError("wrong audience"))
    def test_invalid_token_is_401(self, _mock):
        """Signature/audience/expiry failures must not create a user."""
        res = self.client.post("/api/auth/google/", {"id_token": "forged"})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(User.objects.count(), 0)
        # The internal reason must not leak to the client.
        self.assertNotIn("audience", str(res.data).lower())

    @override_settings(GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID)
    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_audience_is_always_checked(self, mock_verify):
        """verify_oauth2_token must receive the configured client id as audience."""
        mock_verify.return_value = {
            "email": "a@example.com", "sub": "s1", "email_verified": True,
            "iss": "https://accounts.google.com", "aud": GOOGLE_CLIENT_ID,
        }
        self.client.post("/api/auth/google/", {"id_token": "tok"})
        self.assertEqual(mock_verify.call_args.kwargs.get("audience"), GOOGLE_CLIENT_ID)

    @override_settings(GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID)
    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_unexpected_issuer_is_rejected(self, mock_verify):
        mock_verify.return_value = {
            "email": "a@example.com", "sub": "s1", "email_verified": True,
            "iss": "https://evil.example.com", "aud": GOOGLE_CLIENT_ID,
        }
        res = self.client.post("/api/auth/google/", {"id_token": "tok"})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(User.objects.count(), 0)

    @override_settings(GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID)
    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_unverified_email_is_rejected(self, mock_verify):
        mock_verify.return_value = {
            "email": "a@example.com", "sub": "s1", "email_verified": False,
            "iss": "https://accounts.google.com", "aud": GOOGLE_CLIENT_ID,
        }
        res = self.client.post("/api/auth/google/", {"id_token": "tok"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 0)

    @override_settings(GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID)
    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_email_linked_to_another_google_account_is_rejected(self, mock_verify):
        """Pre-account-hijacking guard: never rebind an existing google_id."""
        user = User.objects.create_user(username="victim", email="victim@example.com")
        UserAuthProfile.objects.create(user=user, google_id="original-sub", auth_provider="google")

        mock_verify.return_value = {
            "email": "victim@example.com", "sub": "attacker-sub", "email_verified": True,
            "iss": "https://accounts.google.com", "aud": GOOGLE_CLIENT_ID,
        }
        res = self.client.post("/api/auth/google/", {"id_token": "tok"})

        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(
            UserAuthProfile.objects.get(user=user).google_id, "original-sub"
        )

    @override_settings(GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID)
    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_deactivated_account_cannot_sign_in(self, mock_verify):
        User.objects.create_user(
            username="banned", email="banned@example.com", is_active=False
        )
        mock_verify.return_value = {
            "email": "banned@example.com", "sub": "s1", "email_verified": True,
            "iss": "https://accounts.google.com", "aud": GOOGLE_CLIENT_ID,
        }
        res = self.client.post("/api/auth/google/", {"id_token": "tok"})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertNotIn("token", res.data)
