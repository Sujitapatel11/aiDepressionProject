from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from .models import UserIdentity, CosmeticItem, UserCosmeticInventory
from .services.registry import AvatarProviderRegistry
from .services.dicebear_provider import DiceBearProvider
from .services.identity_service import IdentityService


class SoulIdentitySubsystemTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="identity_tester",
            email="identity@example.com",
            password="StrongPassword123!"
        )

    def test_provider_registry(self):
        """Verifies AvatarProviderRegistry dynamically returns registered providers."""
        provider = AvatarProviderRegistry.get("dicebear")
        self.assertIsInstance(provider, DiceBearProvider)
        self.assertIn("bottts", provider.get_supported_styles())

        # Unknown provider falls back safely to DiceBear
        fallback_provider = AvatarProviderRegistry.get("non_existent_provider")
        self.assertEqual(fallback_provider.provider_name, "dicebear")

    def test_identity_service_url_resolution(self):
        """Verifies IdentityService constructs deterministic SVG URLs without storing static URLs in DB."""
        identity = IdentityService.get_or_create_identity(self.user)
        self.assertEqual(identity.user, self.user)
        self.assertEqual(identity.avatar_provider, "dicebear")

        avatar_url = IdentityService.resolve_avatar_url(self.user)
        self.assertTrue(avatar_url.startswith("https://api.dicebear.com/7.x/bottts/svg?"))
        self.assertIn("backgroundColor=transparent", avatar_url)

    def test_identity_service_public_facade(self):
        """Verifies get_public_identity produces complete public envelope hiding internal seeds."""
        public_data = IdentityService.get_public_identity(self.user)
        self.assertEqual(public_data["username"], "identity_tester")
        self.assertEqual(public_data["user_id"], self.user.id)
        self.assertIn("avatar_url", public_data)
        self.assertIn("badge", public_data)
        self.assertIn("aura", public_data)
        self.assertIn("theme", public_data)
        # seed_key must NOT be present in public identity payload
        self.assertNotIn("seed_key", public_data)

    def test_my_identity_api_endpoint(self):
        """Verifies GET and PATCH /api/identity/me/ REST endpoints."""
        self.client.force_authenticate(user=self.user)

        # GET
        res = self.client.get("/api/identity/me/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["style_preset"], "bottts")
        self.assertIn("avatar_url", res.data)
        self.assertNotIn("seed_key", res.data)  # Encapsulated

        # PATCH
        patch_res = self.client.patch("/api/identity/me/", {
            "style_preset": "adventurer",
            "identity_config": {"background_color": "EDE9FE"}
        }, format="json")
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data["style_preset"], "adventurer")
        self.assertTrue(patch_res.data["avatar_url"].startswith("https://api.dicebear.com/7.x/adventurer/svg?"))

    def test_public_identity_api_endpoint(self):
        """Verifies GET /api/identity/public/<user_id>/ returns public identity envelope."""
        res = self.client.get(f"/api/identity/public/{self.user.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["username"], "identity_tester")
        self.assertIn("avatar_url", res.data)
        self.assertNotIn("seed_key", res.data)
