from django.contrib.auth.models import User
from rest_framework import serializers
from .models import SupportRequest, SupportConnection


class UserSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'avatar_url']

    def get_avatar_url(self, obj):
        from apps.identity.services.identity_service import IdentityService
        return IdentityService.resolve_avatar_url(obj)


class AnonymousUserSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'display_name', 'avatar_url']

    def get_username(self, obj):
        return f"Companion #{obj.id:04d}"

    def get_display_name(self, obj):
        return f"Companion #{obj.id:04d}"

    def get_avatar_url(self, obj):
        from apps.identity.services.identity_service import IdentityService
        return IdentityService.resolve_avatar_url(obj)


class ActivityConsentSerializer(serializers.Serializer):
    """Strict boolean parsing - the string "false" must not become True."""
    consent = serializers.BooleanField(default=False)


class SupportRequestSerializer(serializers.ModelSerializer):
    from_user = AnonymousUserSerializer(read_only=True)
    to_user = AnonymousUserSerializer(read_only=True)

    class Meta:
        model = SupportRequest
        fields = ['id', 'request_id', 'from_user', 'to_user', 'status', 'created_at', 'expires_at']


class SupportConnectionSerializer(serializers.ModelSerializer):
    peer = serializers.SerializerMethodField()
    alias = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    level_info = serializers.SerializerMethodField()
    interest_tags = serializers.SerializerMethodField()
    compatibility_summary = serializers.SerializerMethodField()

    class Meta:
        model = SupportConnection
        fields = [
            'connection_id', 'peer', 'alias', 'status', 'created_at',
            'last_message', 'level_info', 'interest_tags', 'compatibility_summary'
        ]

    def get_peer(self, obj):
        user = self.context['request'].user
        return UserSerializer(obj.get_peer(user)).data

    def get_alias(self, obj):
        user = self.context['request'].user
        return obj.get_alias_for(user)

    def get_level_info(self, obj):
        return obj.calculate_activity_score()

    def get_interest_tags(self, obj):
        from .models import UserProfile
        from .views import _derive_interest_tags
        user = self.context['request'].user
        peer = obj.get_peer(user)
        try:
            cp = UserProfile.objects.get(user=peer)
            return _derive_interest_tags(cp)
        except UserProfile.DoesNotExist:
            return ["🌸 Kind Listener", "🛡️ Safe Companion", "💬 Peer Support"]

    def get_compatibility_summary(self, obj):
        user = self.context['request'].user
        return obj.get_compatibility_summary(user)

    def get_last_message(self, obj):
        content = getattr(obj, 'last_message_content', None)
        if content is not None:
            created_at = getattr(obj, 'last_message_created_at', None)
            sender_id = getattr(obj, 'last_message_sender_id', None)
            return {
                'content': content,
                'sender_id': sender_id,
                'created_at': created_at.isoformat() if created_at else None,
            }
        msg = obj.messages.order_by('-created_at').first()
        if not msg:
            return None
        return {
            'content': msg.content,
            'sender_id': msg.sender_id,
            'created_at': msg.created_at.isoformat(),
        }
