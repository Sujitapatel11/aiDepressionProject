"""Serializers for the creator_live API."""

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import CreatorPlan, CreatorSubscription, LiveParticipant, LiveSession, LiveSessionAudience

User = get_user_model()


class CreatorPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreatorPlan
        fields = [
            'id', 'code', 'name', 'description', 'price_minor', 'currency',
            'billing_interval', 'monthly_broadcast_limit', 'max_duration_minutes',
            'max_viewers', 'features', 'is_free',
        ]
        read_only_fields = fields


class LiveSessionCreateSerializer(serializers.ModelSerializer):
    """Used only for session creation (POST). Creator is injected from request.user."""

    class Meta:
        model = LiveSession
        fields = [
            'title', 'description', 'category', 'thumbnail_url',
            'mode', 'audience_type', 'scheduled_at',
            'comments_enabled', 'reactions_enabled', 'speaking_requests_enabled',
        ]

    def validate_title(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('Title is required.')
        return value.strip()


class LiveSessionDetailSerializer(serializers.ModelSerializer):
    """Read-side representation of a session."""

    creator_username = serializers.CharField(source='creator.username', read_only=True)
    participant_count = serializers.SerializerMethodField()
    livekit_url = serializers.SerializerMethodField()

    class Meta:
        model = LiveSession
        fields = [
            'id', 'creator_username', 'title', 'description', 'category',
            'thumbnail_url', 'mode', 'audience_type', 'status',
            'comments_enabled', 'reactions_enabled', 'speaking_requests_enabled',
            'recording_enabled', 'scheduled_at', 'started_at', 'ended_at',
            'created_at', 'updated_at', 'participant_count', 'livekit_url',
        ]
        read_only_fields = fields

    def get_participant_count(self, obj):
        return obj.participants.filter(left_at__isnull=True, removed_at__isnull=True).count()

    def get_livekit_url(self, obj):
        """Expose the server URL (not a secret) so clients know which LiveKit
        cluster to connect to. The token endpoint is separate."""
        from .livekit_service import get_livekit_url, is_livekit_configured
        if not is_livekit_configured():
            return None
        try:
            return get_livekit_url()
        except RuntimeError:
            return None


class LiveTokenResponseSerializer(serializers.Serializer):
    """Shape of the token endpoint response."""

    token = serializers.CharField(help_text='Signed LiveKit JWT for the requesting user.')
    room = serializers.CharField(help_text='LiveKit room name derived from the session.')
    livekit_url = serializers.CharField(help_text='LiveKit server WebSocket URL.')
    role = serializers.CharField(help_text='Participant role: host | speaker | viewer.')
    session_id = serializers.UUIDField()
    identity = serializers.CharField(help_text='LiveKit participant identity (user PK).')
