from rest_framework import serializers
from .models import CrashReport, AnalyticsEvent, ClientLog, FeedbackItem

class CrashReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = CrashReport
        fields = [
            'report_id', 'user', 'stack_trace', 'device_info',
            'os_version', 'app_version', 'severity', 'created_at'
        ]
        read_only_fields = ['report_id', 'user', 'created_at']


class AnalyticsEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsEvent
        fields = [
            'event_id', 'user', 'event_name', 'session_id',
            'duration_seconds', 'metadata', 'created_at'
        ]
        read_only_fields = ['event_id', 'user', 'created_at']


class ClientLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientLog
        fields = [
            'log_id', 'user', 'level', 'module',
            'message', 'stack_trace', 'created_at'
        ]
        read_only_fields = ['log_id', 'user', 'created_at']


class FeedbackItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedbackItem
        fields = [
            'feedback_id', 'user', 'category', 'title',
            'description', 'device_info', 'app_version',
            'screenshot_base64', 'status', 'created_at'
        ]
        read_only_fields = ['feedback_id', 'user', 'created_at']
