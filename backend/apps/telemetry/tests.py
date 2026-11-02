from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from .models import CrashReport, AnalyticsEvent, ClientLog, FeedbackItem

class TelemetrySubsystemTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="beta_tester_1", password="BetaPassword123!")

    def test_crash_report_ingestion(self):
        """Verify crash report ingestion endpoint stores stack traces and device info."""
        payload = {
            "stack_trace": "Traceback (most recent call last):\n  File 'main.dart', line 42 in main\nException: Test Crash",
            "severity": "fatal",
            "device_info": {"model": "Pixel 7", "os": "Android 14"},
            "os_version": "14.0",
            "app_version": "1.0.0+beta",
        }
        response = self.client.post("/api/telemetry/crash/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CrashReport.objects.count(), 1)
        
        crash = CrashReport.objects.first()
        self.assertEqual(crash.severity, "fatal")
        self.assertIn("Pixel 7", str(crash.device_info))

    def test_analytics_event_ingestion(self):
        """Verify analytics event tracking endpoint stores events for DAU/WAU and feature usage."""
        self.client.force_authenticate(user=self.user)
        payload = {
            "event_name": "journal_created",
            "session_id": "sess_abc123",
            "duration_seconds": 12.5,
            "metadata": {"mood_score": 8, "word_count": 45},
        }
        response = self.client.post("/api/telemetry/event/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(AnalyticsEvent.objects.count(), 1)

        event = AnalyticsEvent.objects.first()
        self.assertEqual(event.event_name, "journal_created")
        self.assertEqual(event.user, self.user)

    def test_client_log_ingestion(self):
        """Verify client logging endpoint stores error and performance messages."""
        payload = {
            "level": "error",
            "module": "network_client",
            "message": "HTTP 500 Connection Timeout on /api/insights/",
            "stack_trace": "SocketException: OS Error: Connection refused",
        }
        response = self.client.post("/api/telemetry/log/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ClientLog.objects.count(), 1)

    def test_in_app_feedback_submission(self):
        """Verify beta testers can submit bug reports and feature requests."""
        self.client.force_authenticate(user=self.user)
        payload = {
            "category": "bug_report",
            "title": "Chat notifications delayed by 2 seconds",
            "description": "When receiving a peer message, the notification badge arrives after 2s delay.",
            "device_info": {"model": "iPhone 15 Pro", "os": "iOS 17.5"},
            "app_version": "1.0.0+beta",
        }
        response = self.client.post("/api/feedback/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FeedbackItem.objects.count(), 1)

        feedback = FeedbackItem.objects.first()
        self.assertEqual(feedback.category, "bug_report")
        self.assertEqual(feedback.status, "open")

    def test_beta_admin_dashboard_stats(self):
        """Verify real-time beta dashboard API computes DAU, crash-free %, and feature counts."""
        # Create a session start event and crash report
        AnalyticsEvent.objects.create(user=self.user, event_name="session_start", session_id="sess_1")
        AnalyticsEvent.objects.create(user=self.user, event_name="journal_created", session_id="sess_1")
        CrashReport.objects.create(user=self.user, stack_trace="Fatal NullPointer", severity="fatal")

        self.user.is_staff = True
        self.user.save(update_fields=["is_staff"])
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/dashboard/beta/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertIn("beta_overview", data)
        self.assertEqual(data["beta_overview"]["dau"], 1)
        self.assertIn("crash_free_session_percent", data["beta_overview"])
        self.assertEqual(data["crash_metrics"]["fatal_crashes"], 1)
        self.assertIn("journal_created", data["feature_usage"])

    def test_beta_dashboard_rejects_anonymous_user(self):
        response = self.client.get("/api/dashboard/beta/")
        # DRF returns 401 when the configured authentication class provides a challenge.
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_feedback_list_rejects_non_staff_user(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/feedback/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_feedback_list_allows_staff_user(self):
        self.user.is_staff = True
        self.user.save(update_fields=["is_staff"])
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/feedback/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_analytics_batch_rejects_empty_list(self):
        response = self.client.post("/api/telemetry/event/", [], format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_analytics_batch_rejects_more_than_limit(self):
        payload = [{"event_name": "journal_created"} for _ in range(51)]
        response = self.client.post("/api/telemetry/event/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_analytics_batch_validates_all_before_saving(self):
        payload = [
            {"event_name": "journal_created", "session_id": "batch-1"},
            {"session_id": "batch-2"},
        ]
        response = self.client.post("/api/telemetry/event/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(AnalyticsEvent.objects.count(), 0)

