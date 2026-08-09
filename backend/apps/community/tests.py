from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

from .models import CommunityPost, PostReport, PostReaction


class CommunitySafetyTests(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username="user1", password="password123")
        self.user2 = User.objects.create_user(username="user2", password="password123")
        self.user3 = User.objects.create_user(username="user3", password="password123")
        self.user4 = User.objects.create_user(username="user4", password="password123")

        self.client = APIClient()
        self.client.force_authenticate(user=self.user1)

    def test_create_anonymous_post(self):
        url = "/api/community/posts/create/"
        data = {"content": "Writing a gentle reflection today."}
        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data)
        self.assertIn("author_alias", response.data)
        self.assertNotIn("user", response.data)
        self.assertNotIn("user_id", response.data)
        self.assertFalse(response.data["author_alias"].startswith("Companion #"))
        self.assertFalse(response.data["has_crisis_resources"])

    def test_crisis_keyword_detection_attaches_helplines(self):
        url = "/api/community/posts/create/"
        data = {"content": "Feeling completely hopeless and want to end my life."}
        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["has_crisis_resources"])
        self.assertIn("Tele-MANAS", response.data["crisis_resource_note"])
        self.assertIn("1166", response.data["crisis_resource_note"])
        self.assertIn("Vandrevala", response.data["crisis_resource_note"])

    def test_report_and_auto_hide_threshold(self):
        # Create a post first
        post = CommunityPost.objects.create(
            user=self.user1,
            content="Testing safety moderation auto-hide.",
            author_alias="Quiet Leaf #1234"
        )
        report_url = f"/api/community/posts/{post.id}/report/"

        # Report 1 (User 1)
        res1 = self.client.post(report_url, {"reason": "spam"}, format="json")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertFalse(res1.data["is_hidden"])

        # Report 2 (User 2)
        client2 = APIClient()
        client2.force_authenticate(user=self.user2)
        res2 = client2.post(report_url, {"reason": "harassment"}, format="json")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertFalse(res2.data["is_hidden"])

        # Report 3 (User 3) -> Reaches threshold 3 -> Auto-hides
        client3 = APIClient()
        client3.force_authenticate(user=self.user3)
        res3 = client3.post(report_url, {"reason": "self_harm"}, format="json")
        self.assertEqual(res3.status_code, status.HTTP_200_OK)
        self.assertTrue(res3.data["is_hidden"])

        # Verify hidden post is excluded from public feed list
        feed_res = self.client.get("/api/community/posts/")
        post_ids = [p["id"] for p in feed_res.data]
        self.assertNotIn(str(post.id), post_ids)

    def test_toggle_supportive_reactions(self):
        post = CommunityPost.objects.create(
            user=self.user2,
            content="Sharing a quiet moment.",
            author_alias="Gentle Stream #5678"
        )
        react_url = f"/api/community/posts/{post.id}/react/"

        # Toggle reaction ON
        res1 = self.client.post(react_url, {"reaction_type": "here_for_you"}, format="json")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertEqual(res1.data["action"], "added")
        self.assertEqual(res1.data["post"]["reaction_counts"]["here_for_you"], 1)

        # Toggle reaction OFF
        res2 = self.client.post(react_url, {"reaction_type": "here_for_you"}, format="json")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data["action"], "removed")
        self.assertEqual(res2.data["post"]["reaction_counts"]["here_for_you"], 0)
