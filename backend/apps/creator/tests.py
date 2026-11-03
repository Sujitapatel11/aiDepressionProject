from decimal import Decimal
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from .models import CreatorPost, CreatorProfile, CreatorEarning, AdRevenueEvent

class CreatorPlatformTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="creator", password="test-pass-123")
        self.other = User.objects.create_user(username="other", password="test-pass-123")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_create_edit_publish_and_feed(self):
        response = self.client.post("/api/creator/posts/", {"title": "Hello", "body": "My first post"}, format="json")
        self.assertEqual(response.status_code, 201)
        post_id = response.data["id"]
        self.assertEqual(response.data["status"], "draft")
        response = self.client.post(f"/api/creator/posts/{post_id}/publish/", {}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "published")
        feed = self.client.get("/api/creator/feed/")
        self.assertEqual(feed.status_code, 200)
        self.assertEqual(len(feed.data), 1)

    def test_creator_cannot_access_another_creators_draft(self):
        profile = CreatorProfile.objects.create(user=self.other, display_name="Other")
        post = CreatorPost.objects.create(creator=profile, title="Private", body="Draft")
        response = self.client.patch(f"/api/creator/posts/{post.id}/", {"title": "Hijack"}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_only_drafts_can_be_edited_after_publish(self):
        response = self.client.post("/api/creator/posts/", {"title": "Hello", "body": "Body"}, format="json")
        post_id = response.data["id"]
        self.client.post(f"/api/creator/posts/{post_id}/publish/", {}, format="json")
        response = self.client.patch(f"/api/creator/posts/{post_id}/", {"title": "Changed"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_revenue_event_is_idempotent_and_creator_gets_half(self):
        response = self.client.post("/api/creator/posts/", {"title": "Post", "body": "Content"}, format="json")
        post_id = response.data["id"]
        self.client.post(f"/api/creator/posts/{post_id}/publish/", {}, format="json")
        admin = User.objects.create_superuser(username="admin", email="admin@example.com", password="test-pass-123")
        admin_client = APIClient()
        admin_client.force_authenticate(admin)
        payload = {"post_id": post_id, "provider": "test-network", "provider_event_id": "event-1", "gross_amount": "10.00", "currency": "USD"}
        first = admin_client.post("/api/creator/internal/ad-revenue/", payload, format="json")
        self.assertEqual(first.status_code, 201)
        self.assertEqual(first.data["creator_amount"], "5.00")
        duplicate = admin_client.post("/api/creator/internal/ad-revenue/", payload, format="json")
        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(CreatorEarning.objects.count(), 1)

    def test_withdrawal_cannot_exceed_balance(self):
        response = self.client.post("/api/creator/withdrawals/", {"amount": "1.00", "currency": "USD"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_anonymous_user_cannot_access_creator_api(self):
        anon = APIClient()
        response = anon.get("/api/creator/profile/")
        self.assertEqual(response.status_code, 401)
