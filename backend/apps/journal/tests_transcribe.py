from unittest.mock import patch, MagicMock
from django.contrib.auth.models import User
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient


class TranscribeAudioTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="voice_user", password="Password123!")
        self.client.force_authenticate(user=self.user)

    def test_unauthenticated_user_rejected(self):
        self.client.logout()
        response = self.client.post("/api/journal/transcribe/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_missing_audio_file_returns_400(self):
        response = self.client.post("/api/journal/transcribe/", {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    @patch("apps.journal.views.requests.post")
    @patch("os.environ.get")
    def test_successful_transcription(self, mock_env, mock_post):
        def env_side_effect(key, default=""):
            if key == "HF_API_KEY":
                return "mock_hf_token"
            return default
        mock_env.side_effect = env_side_effect

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"text": "आज मौसम बहुत अच्छा है और मैं खुश हूँ।"}
        mock_post.return_value = mock_resp

        audio_file = SimpleUploadedFile("speech.webm", b"dummy audio content", content_type="audio/webm")
        response = self.client.post(
            "/api/journal/transcribe/",
            {"audio": audio_file, "language": "hi"},
            format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["text"], "आज मौसम बहुत अच्छा है और मैं खुश हूँ।")
        self.assertEqual(response.data["language"], "hi")

    @patch("os.environ.get")
    def test_missing_hf_api_key_graceful_response(self, mock_env):
        mock_env.return_value = ""
        audio_file = SimpleUploadedFile("speech.webm", b"dummy audio content", content_type="audio/webm")
        response = self.client.post(
            "/api/journal/transcribe/",
            {"audio": audio_file},
            format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("HuggingFace API key", response.data["detail"])
