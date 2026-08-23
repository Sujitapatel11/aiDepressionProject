from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.support.models import SupportConnection, UserProfile, ConnectionActivityQuiz
from apps.chat.models import Message
from apps.support.services.quiz_generator import FALLBACK_QUESTION_BANK, generate_activity_questions


class ConnectionLevelingAndActivityTests(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username="alice", password="password123")
        self.user2 = User.objects.create_user(username="bob", password="password123")

        self.profile1 = UserProfile.objects.create(
            user=self.user1,
            openness=0.8,
            conscientiousness=0.7,
            agreeableness=0.85,
            dominant_emotion="calm",
        )
        self.profile2 = UserProfile.objects.create(
            user=self.user2,
            openness=0.75,
            conscientiousness=0.8,
            agreeableness=0.9,
            dominant_emotion="calm",
        )

        self.conn = SupportConnection.objects.create(
            user_one=self.user1,
            user_two=self.user2,
            alias_user_one="Companion #0001",
            alias_user_two="Companion #0002",
            status=SupportConnection.STATUS_ACTIVE,
        )

        self.client1 = APIClient()
        self.client1.force_authenticate(user=self.user1)

        self.client2 = APIClient()
        self.client2.force_authenticate(user=self.user2)

    def test_activity_score_and_levels(self):
        # Level 1: 0 messages
        score_info = self.conn.calculate_activity_score()
        self.assertEqual(score_info["level"], 1)
        self.assertEqual(score_info["level_name"], "Seed Connection")
        self.assertIn("interest_tags", score_info["unlocked_features"])

        # Add 25 messages across 3 distinct days to reach Level 2 (25*1 + 3*10 + 2 = 57 -> Level 3)
        # Let's add 15 messages on 1 day: 15*1 + 10 = 25 -> Level 2
        now = timezone.now()
        for i in range(15):
            Message.objects.create(
                connection=self.conn,
                sender=self.user1,
                receiver=self.user2,
                content=f"Message {i}",
                created_at=now,
            )

        score_info = self.conn.calculate_activity_score()
        self.assertEqual(score_info["level"], 2)
        self.assertEqual(score_info["level_name"], "Growing Companion")
        self.assertIn("get_to_know_quiz", score_info["unlocked_features"])

        # Level 3: Score >= 50
        # Add 30 more messages across multiple days
        yesterday = now - timezone.timedelta(days=1)
        for i in range(30):
            Message.objects.create(
                connection=self.conn,
                sender=self.user2,
                receiver=self.user1,
                content=f"Reply {i}",
                created_at=yesterday,
            )

        score_info = self.conn.calculate_activity_score()
        self.assertGreaterEqual(score_info["level"], 3)
        self.assertIn("compatibility_summary", score_info["unlocked_features"])

        summary = self.conn.get_compatibility_summary(self.user1)
        self.assertIsNotNone(summary)
        self.assertTrue(len(summary) > 0)

    def test_consent_api(self):
        # Initial state: no consent
        resp = self.client1.get("/api/support/activity/consent/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(resp.data["has_consent"])

        # Update consent
        resp = self.client1.post("/api/support/activity/consent/", {"consent": True}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["has_consent"])

        self.profile1.refresh_from_db()
        self.assertTrue(self.profile1.has_activity_consent)

    def test_quiz_generation_and_fallback(self):
        # Give user consent
        self.profile1.has_activity_consent = True
        self.profile1.save()

        # Add 15 messages so connection reaches Level 2
        now = timezone.now()
        for i in range(15):
            Message.objects.create(
                connection=self.conn,
                sender=self.user1,
                receiver=self.user2,
                content=f"Message {i}",
                created_at=now,
            )

        # Generate activity quiz (uses safe fallback when HF API key not set)
        resp = self.client1.post(f"/api/support/connections/{self.conn.connection_id}/activity/generate/")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn("quiz_id", resp.data)
        self.assertEqual(len(resp.data["questions"]), 3)

        # Verify fallback questions are positive-only
        for q in resp.data["questions"]:
            self.assertIn("prompt", q)
            self.assertGreaterEqual(len(q["options"]), 3)

    def test_quiz_answering_flow_and_positive_only_validation(self):
        self.profile1.has_activity_consent = True
        self.profile1.save()
        self.profile2.has_activity_consent = True
        self.profile2.save()

        # Level 2 setup
        now = timezone.now()
        for i in range(15):
            Message.objects.create(
                connection=self.conn,
                sender=self.user1,
                receiver=self.user2,
                content=f"Message {i}",
                created_at=now,
            )

        gen_resp = self.client1.post(f"/api/support/connections/{self.conn.connection_id}/activity/generate/")
        quiz_id = gen_resp.data["quiz_id"]
        questions = gen_resp.data["questions"]

        # Attempt submitting invalid/negative free-text option (should be rejected)
        bad_sub = self.client1.post(
            f"/api/support/connections/{self.conn.connection_id}/activity/submit/",
            {"quiz_id": quiz_id, "answers": {"q1": "Bad Negative Free Text"}},
            format="json",
        )
        self.assertEqual(bad_sub.status_code, status.HTTP_400_BAD_REQUEST)

        # User 1 submits valid answers
        u1_answers = {q["id"]: q["options"][0] for q in questions}
        sub1 = self.client1.post(
            f"/api/support/connections/{self.conn.connection_id}/activity/submit/",
            {"quiz_id": quiz_id, "answers": u1_answers},
            format="json",
        )
        self.assertEqual(sub1.status_code, status.HTTP_200_OK)
        self.assertTrue(sub1.data["has_answered"])
        self.assertFalse(sub1.data["is_fully_completed"])

        # User 2 submits valid answers
        u2_answers = {q["id"]: q["options"][1] for q in questions}
        sub2 = self.client2.post(
            f"/api/support/connections/{self.conn.connection_id}/activity/submit/",
            {"quiz_id": quiz_id, "answers": u2_answers},
            format="json",
        )
        self.assertEqual(sub2.status_code, status.HTTP_200_OK)
        self.assertTrue(sub2.data["is_fully_completed"])
        self.assertIn("peer_answers", sub2.data)
