"""Endpoint-level tests for the public health probes (config.health_view)."""
import calendar
import time
from datetime import datetime
from unittest import mock

from django.core.cache import cache
from django.test import TestCase


class HealthEndpointTests(TestCase):
    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_health_check_body_is_minimal(self):
        resp = self.client.get("/api/health/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(sorted(data.keys()), ["status", "timestamp"])
        self.assertEqual(data["status"], "healthy")
        # Meaningful timestamp format validation: strict UTC ISO pattern.
        self.assertIsInstance(data["timestamp"], str)
        parsed = datetime.strptime(data["timestamp"], "%Y-%m-%dT%H:%M:%SZ")
        utc_epoch = calendar.timegm(parsed.timetuple())  # parsed is UTC ("Z" suffix)
        self.assertLessEqual(abs(time.time() - utc_epoch), 60)  # reflects the current UTC minute
        body = resp.content.decode()
        self.assertNotIn("debug", body)
        self.assertNotIn("psutil", body)
        self.assertNotIn("memory", body)

    def test_health_alias_same_contract(self):
        resp = self.client.get("/health/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(sorted(resp.json().keys()), ["status", "timestamp"])

    def test_db_health_minimal_no_user_count(self):
        resp = self.client.get("/api/health/db/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(sorted(data.keys()), ["select_1", "status"])
        self.assertNotIn("user_count", data)

    def test_rate_limit_returns_429_after_burst(self):
        from config.health_view import HEALTH_RATE_LIMIT_PER_MINUTE

        for _ in range(HEALTH_RATE_LIMIT_PER_MINUTE):
            resp = self.client.get("/api/health/")
            if resp.status_code != 200:
                self.fail("Rate limiter engaged before the advertised budget was consumed")
        # The (LIMIT + 1)-th call must be throttled.
        self.assertEqual(self.client.get("/api/health/").status_code, 429)

    def test_db_health_failure_returns_no_error_text(self):
        with mock.patch(
            "django.db.connection.cursor",
            side_effect=Exception("FATAL: password=TOPSECRET role unavailable"),
        ):
            resp = self.client.get("/api/health/db/")
            self.assertEqual(resp.status_code, 503)
            self.assertEqual(resp.json().get("status"), "unhealthy")
            body = resp.content.decode()
            self.assertNotIn("TOPSECRET", body)
            self.assertNotIn("role unavailable", body)
            self.assertNotIn("error_message", body)

    def test_degraded_health_returns_no_error_text(self):
        with mock.patch(
            "django.db.connection.cursor",
            side_effect=ConnectionError("secret-host internal"),
        ):
            resp = self.client.get("/api/health/")
            self.assertEqual(resp.status_code, 503)
            self.assertEqual(resp.json()["status"], "degraded")
            self.assertNotIn("secret-host", resp.content.decode())
