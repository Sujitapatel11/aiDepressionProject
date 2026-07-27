import uuid
from django.db import models
from django.contrib.auth.models import User

class CrashReport(models.Model):
    SEVERITY_FATAL = "fatal"
    SEVERITY_NON_FATAL = "non_fatal"
    SEVERITY_CHOICES = [
        (SEVERITY_FATAL, "Fatal Crash"),
        (SEVERITY_NON_FATAL, "Non-Fatal Exception"),
    ]

    report_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="crash_reports")
    stack_trace = models.TextField()
    device_info = models.JSONField(default=dict, blank=True)
    os_version = models.CharField(max_length=64, blank=True, default="")
    app_version = models.CharField(max_length=32, blank=True, default="1.0.0+staging")
    severity = models.CharField(max_length=16, choices=SEVERITY_CHOICES, default=SEVERITY_FATAL, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["severity", "created_at"]),
        ]

    def __str__(self):
        return f"CrashReport({self.report_id}, {self.severity}, {self.created_at.strftime('%Y-%m-%d %H:%M')})"


class AnalyticsEvent(models.Model):
    event_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="analytics_events")
    event_name = models.CharField(max_length=64, db_index=True)
    session_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    duration_seconds = models.FloatField(default=0.0)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["event_name", "created_at"]),
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self):
        return f"AnalyticsEvent({self.event_name}, {self.user.username if self.user else 'Anon'})"


class ClientLog(models.Model):
    LEVEL_INFO = "info"
    LEVEL_WARNING = "warning"
    LEVEL_ERROR = "error"
    LEVEL_CHOICES = [
        (LEVEL_INFO, "Info"),
        (LEVEL_WARNING, "Warning"),
        (LEVEL_ERROR, "Error"),
    ]

    log_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="client_logs")
    level = models.CharField(max_length=16, choices=LEVEL_CHOICES, default=LEVEL_INFO, db_index=True)
    module = models.CharField(max_length=64, blank=True, default="")
    message = models.TextField()
    stack_trace = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"ClientLog({self.level.upper()}, {self.module})"


class FeedbackItem(models.Model):
    CATEGORY_BUG = "bug_report"
    CATEGORY_SUGGESTION = "suggestion"
    CATEGORY_FEATURE = "feature_request"
    CATEGORY_CHOICES = [
        (CATEGORY_BUG, "Bug Report"),
        (CATEGORY_SUGGESTION, "Suggestion"),
        (CATEGORY_FEATURE, "Feature Request"),
    ]

    STATUS_OPEN = "open"
    STATUS_IN_REVIEW = "in_review"
    STATUS_RESOLVED = "resolved"
    STATUS_CHOICES = [
        (STATUS_OPEN, "Open"),
        (STATUS_IN_REVIEW, "In Review"),
        (STATUS_RESOLVED, "Resolved"),
    ]

    feedback_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="feedback_submissions")
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES, default=CATEGORY_BUG, db_index=True)
    title = models.CharField(max_length=128)
    description = models.TextField()
    device_info = models.JSONField(default=dict, blank=True)
    app_version = models.CharField(max_length=32, blank=True, default="1.0.0+beta")
    screenshot_base64 = models.TextField(blank=True, default="")
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_OPEN, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["category", "status"]),
        ]

    def __str__(self):
        return f"FeedbackItem({self.category}, '{self.title}', {self.status})"
