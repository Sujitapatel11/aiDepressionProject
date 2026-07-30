from rest_framework import serializers
from .models import UserIdentity, CosmeticItem, UserCosmeticInventory
from .services.identity_service import IdentityService
from .services.registry import AvatarProviderRegistry


class UserIdentitySerializer(serializers.ModelSerializer):
    """
    Serializer for identity customization studio.
    Exposes avatar_url, style_preset, and identity_config while ENCAPSULATING seed_key.
    """
    avatar_url = serializers.SerializerMethodField()
    available_styles = serializers.SerializerMethodField()

    class Meta:
        model = UserIdentity
        fields = [
            'avatar_provider',
            'avatar_provider_version',
            'style_preset',
            'config_version',
            'identity_config',
            'avatar_url',
            'available_styles',
            'updated_at',
        ]
        read_only_fields = ['config_version', 'updated_at']

    def get_avatar_url(self, obj) -> str:
        return IdentityService.resolve_avatar_url(obj.user)

    def get_available_styles(self, obj) -> list:
        provider = AvatarProviderRegistry.get(obj.avatar_provider)
        return provider.get_supported_styles()


class PublicIdentitySerializer(serializers.Serializer):
    """
    Public identity payload for chat, peer lists, and headers.
    """
    user_id = serializers.IntegerField()
    username = serializers.CharField()
    avatar_url = serializers.CharField()
    badge = serializers.CharField()
    theme = serializers.CharField()
    aura = serializers.CharField()
    companion = serializers.CharField()
    frame = serializers.CharField()
    title = serializers.CharField()


class CosmeticItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CosmeticItem
        fields = [
            'id',
            'name',
            'category',
            'layer_key',
            'asset_uri',
            'is_premium',
            'required_achievement',
            'season_tag',
        ]
