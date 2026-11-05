from rest_framework import serializers
from .models import UserIdentity, CosmeticItem, UserCosmeticInventory
from .models import CreatorProfile, UserIdentity, CosmeticItem, UserCosmeticInventory
from .models import PublicProfile
from .services.identity_service import IdentityService
from .services.registry import AvatarProviderRegistry

# Bounds for the public interests list. Keep these in one place so the API and
# tests agree.
MAX_INTERESTS = 10
MAX_INTEREST_LENGTH = 30


class PublicProfileSerializer(serializers.ModelSerializer):
    """Owner-editable public profile.

    Read-only: identity fields that belong to the User row and the resolved
    avatar URL. Writable: display_name, bio, interests only. Email, password,
    seed_key and identity_config are never part of this serializer.
    """
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = PublicProfile
        fields = [
            "user_id",
            "username",
            "display_name",
            "bio",
            "interests",
            "avatar_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "user_id",
            "username",
            "avatar_url",
            "created_at",
            "updated_at",
        ]

    def get_avatar_url(self, obj) -> str:
        return IdentityService.resolve_avatar_url(obj.user)

    def validate_display_name(self, value):
        return (value or "").strip()

    def validate_bio(self, value):
        return (value or "").strip()

    def validate_interests(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Interests must be a list of strings.")
        if len(value) > MAX_INTERESTS:
            raise serializers.ValidationError(
                f"Select at most {MAX_INTERESTS} interests."
            )
        cleaned = []
        seen = set()
        for item in value:
            if not isinstance(item, str):
                raise serializers.ValidationError("Each interest must be a string.")
            text = item.strip()
            if not text:
                raise serializers.ValidationError("Interests cannot be empty.")
            if len(text) > MAX_INTEREST_LENGTH:
                raise serializers.ValidationError(
                    f"Each interest must be {MAX_INTEREST_LENGTH} characters or fewer."
                )
            key = text.casefold()
            if key in seen:
                continue  # de-duplicate, keep first occurrence order
            seen.add(key)
            cleaned.append(text)
        return cleaned


class PublicPublicProfileSerializer(serializers.ModelSerializer):
    """Strict allowlist for anonymous public profile responses.

    Intentionally separate from PublicProfileSerializer so a future private
    field addition cannot accidentally leak through the public endpoint.
    """
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = PublicProfile
        fields = [
            "user_id",
            "username",
            "display_name",
            "bio",
            "interests",
            "avatar_url",
            "created_at",
            "updated_at",
        ]

    def get_avatar_url(self, obj) -> str:
        return IdentityService.resolve_avatar_url(obj.user)


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


class CreatorProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(max_length=30)

    class Meta:
        model = CreatorProfile
        fields = [
            'username',
            'display_name',
            'bio',
            'avatar',
            'cover_image',
            'is_active',
            'monetization_status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'is_active',
            'monetization_status',
            'created_at',
            'updated_at',
        ]

    def validate_username(self, value):
        username = value.strip().lower()
        if not serializers.RegexField(regex=r'^[a-z0-9_]{3,30}$').run_validation(username):
            raise serializers.ValidationError('Use 3-30 letters, numbers, or underscores.')

        matches = CreatorProfile.objects.filter(username__iexact=username)
        if self.instance:
            matches = matches.exclude(pk=self.instance.pk)
        if matches.exists():
            raise serializers.ValidationError('This creator username is already taken.')
        return username


class PublicCreatorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreatorProfile
        fields = ['username', 'display_name', 'bio', 'avatar', 'cover_image', 'created_at']
