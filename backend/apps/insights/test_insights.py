from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.journal.models import JournalEntry
from apps.insights.models import Insight
from apps.insights.engine import (
    analyze_journal,
    create_insight_from_journal,
    _parse_json_insight,
    _extract_mood_prefix,
    _validate_journal_content,
)

User = get_user_model()


class InsightsEngineTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="password123")
        self.journal = JournalEntry.objects.create(
            user=self.user,
            content="[Feeling Happy] Today was quite overwhelming at work. I felt nervous about the presentation, but afterwards I felt a sense of relief and accomplishment."
        )

    def test_json_parsing_success(self):
        sample_raw = """
        Here is the insight:
        ```json
        {
            "title": "Navigating Workplace Pressure",
            "message": "It sounds like today brought a mix of nervousness and relief. Noticing how tension gave way to accomplishment highlights your inner resilience.",
            "mood": "mixed",
            "emotions": ["anxious", "hopeful"]
        }
        ```
        """
        parsed = _parse_json_insight(sample_raw)
        self.assertIsNotNone(parsed)
        self.assertEqual(parsed["title"], "Navigating Workplace Pressure")
        self.assertEqual(parsed["mood"], "mixed")
        self.assertIn("anxious", parsed["emotions"])

    def test_extract_mood_prefix(self):
        tag, free_text = _extract_mood_prefix("[Feeling Happy] Today was a good day.")
        self.assertEqual(tag, "happy")
        self.assertEqual(free_text, "Today was a good day.")

        tag_none, free_text_same = _extract_mood_prefix("Just a normal journal entry.")
        self.assertIsNone(tag_none)
        self.assertEqual(free_text_same, "Just a normal journal entry.")

    def test_validation_too_short_with_mood_tag(self):
        """A journal entry with only a mood tag or very few words is classified as 'too_short'."""
        result = analyze_journal("[Feeling Sad]")
        self.assertEqual(result["status"], "too_short")
        self.assertEqual(result["title"], "A Starting Reflection")
        self.assertIn("Try writing a bit more", result["message"])

        result2 = analyze_journal("[Feeling Angry] Feeling upset today.")
        self.assertEqual(result2["status"], "too_short")

    def test_validation_invalid_code_content(self):
        """Pasted code or technical syntax is classified as 'invalid'."""
        code_entry = """
        def analyze_journal(content):
            import requests
            resp = requests.post("https://api-inference.huggingface.co", json={"data": content})
            return resp.json()
        """
        result = analyze_journal(code_entry)
        self.assertEqual(result["status"], "invalid")
        self.assertEqual(result["title"], "Entry Content Note")
        self.assertIn("code, URLs, or system text", result["message"])

    def test_validation_invalid_url_content(self):
        """Entries containing primary URLs are classified as 'invalid'."""
        url_entry = "Check out this link: https://example.com/api/v1/resource?id=100&auth=token"
        result = analyze_journal(url_entry)
        self.assertEqual(result["status"], "invalid")

    def test_validation_sufficient_journaling_content(self):
        """Genuine journaling text is classified as 'sufficient'."""
        entry = "[Feeling Calm] I spent the morning walking through the park and listening to music. It really helped clear my mind after a busy week."
        status, free_text, tag = _validate_journal_content(entry)
        self.assertEqual(status, "sufficient")
        self.assertEqual(tag, "calm")

    @patch("apps.insights.engine.HF_API_KEY", "")
    def test_vader_fallback_when_no_api_key(self):
        """When HF_API_KEY is not configured, engine falls back to VADER."""
        result = analyze_journal(self.journal.content)
        self.assertEqual(result["status"], "sufficient")
        self.assertIn("mood", result)
        self.assertIn("sentiment_score", result)
        self.assertIn("title", result)
        self.assertIn("message", result)
        self.assertTrue(len(result["message"]) > 0)

    @patch("apps.insights.engine.HF_API_KEY", "mock-token-123")
    @patch("requests.post")
    def test_hf_llm_insight_generation_success(self, mock_post):
        """When HF API succeeds, engine returns generated LLM insight."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = [
            {
                "generated_text": '{\n"title": "Finding Relief After Stress", "message": "You pushed through a high-pressure moment and found a sense of peace on the other side.", "mood": "mixed", "emotions": ["anxious", "calm"]}'
            }
        ]
        mock_post.return_value = mock_resp

        result = analyze_journal(self.journal.content)
        self.assertEqual(result["status"], "sufficient")
        self.assertEqual(result["title"], "Finding Relief After Stress")
        self.assertEqual(result["mood"], "mixed")
        self.assertIn("calm", result["emotions"])

    @patch("apps.insights.engine.HF_API_KEY", "mock-token-123")
    @patch("requests.post")
    def test_vader_fallback_when_hf_api_fails(self, mock_post):
        """When HF API fails (e.g. timeout / HTTP 500), engine falls back to VADER cleanly."""
        mock_post.side_effect = Exception("HF API Timeout")

        result = analyze_journal(self.journal.content)
        self.assertEqual(result["status"], "sufficient")
        self.assertIn("mood", result)
        self.assertIn("sentiment_score", result)
        self.assertIn("title", result)
        self.assertIn("message", result)
        self.assertTrue(len(result["message"]) > 0)

    @patch("apps.insights.engine.HF_API_KEY", "")
    def test_create_insight_from_journal(self):
        """Test complete DB insight creation flow."""
        create_insight_from_journal(self.journal)
        insight = Insight.objects.get(journal=self.journal)
        self.assertEqual(insight.user, self.user)
        self.assertEqual(insight.status, "sufficient")
        self.assertTrue(len(insight.title) > 0)
        self.assertTrue(len(insight.message) > 0)

    @patch("apps.insights.engine.HF_API_KEY", "")
    def test_journal_analysis_without_mood_prefix(self):
        """Verify journal analysis works flawlessly for entries WITHOUT '[Feeling X]' prefix."""
        plain_text = "I went for a peaceful walk in the garden today. It really helped me clear my thoughts after a long busy week."
        status, free_text, extracted_mood = _validate_journal_content(plain_text)
        self.assertEqual(status, "sufficient")
        self.assertEqual(free_text, plain_text)
        self.assertIsNone(extracted_mood)

        result = analyze_journal(plain_text)
        self.assertEqual(result["status"], "sufficient")
        self.assertIn("mood", result)
        self.assertIn("title", result)
        self.assertIn("message", result)
        self.assertGreater(len(result["message"]), 0)

