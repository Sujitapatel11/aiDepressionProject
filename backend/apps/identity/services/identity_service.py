import hashlib
from typing import Dict, Any
from django.contrib.auth.models import User
from .registry import AvatarProviderRegistry


class IdentityService:
    """
    Unified Public Identity Facade.
    Aggregates user visual identity, cosmetics, aura, themes, and badges into a clean public representation.
    """

    @staticmethod
    def get_seed_for_user(user: User) -> str:
        """Generates a deterministic seed string for a user."""
        raw = f"soulcare_seed_{user.id}_{user.username}"
        return hashlib.sha256(raw.encode('utf-8')).hexdigest()[:16]

    @classmethod
    def get_or_create_identity(cls, user: User):
        """Fetches or initializes UserIdentity record for user."""
        from apps.identity.models import UserIdentity
        identity, created = UserIdentity.objects.get_or_create(
            user=user,
            defaults={
                "avatar_provider": "dicebear",
                "avatar_provider_version": "v7",
                "style_preset": "bottts",
                "seed_key": cls.get_seed_for_user(user),
                "config_version": 1,
                "identity_config": {
                    "background_color": "transparent",
                    "equipped_cosmetics": {
                        "aura": "none",
                        "badge": "soul_member",
                        "theme": "soft_lavender",
                        "companion": "none",
                        "frame": "default"
                    }
                }
            }
        )
        return identity

    @classmethod
    def resolve_avatar_url(cls, user: User) -> str:
        """
        Dynamically calculates the user's avatar URL without persisting cached URLs in DB.
        Fallback chain: UserIdentity -> UserAuthProfile.avatar_url -> Deterministic DiceBear fallback.
        """
        if not user or not getattr(user, 'is_authenticated', False):
            provider = AvatarProviderRegistry.get("dicebear")
            return provider.generate_avatar_url("bottts", "guest", {})

        # 1. Try UserIdentity model instance
        user_identity = None
        try:
            user_identity = getattr(user, 'user_identity', None)
        except Exception:
            pass

        if user_identity:
            provider = AvatarProviderRegistry.get(user_identity.avatar_provider)
            return provider.generate_avatar_url(
                style_preset=user_identity.style_preset,
                seed_key=user_identity.seed_key,
                identity_config=user_identity.identity_config or {},
                version=user_identity.avatar_provider_version
            )

        # 2. Try Google OAuth photo in UserAuthProfile if present
        try:
            auth_profile = getattr(user, 'auth_profile', None)
            if auth_profile and auth_profile.avatar_url:
                return auth_profile.avatar_url
        except Exception:
            pass

        # 3. Fallback to deterministic DiceBear SVG using username
        provider = AvatarProviderRegistry.get("dicebear")
        username = getattr(user, 'username', None) or f"user_{getattr(user, 'id', '0')}"
        return provider.generate_avatar_url("bottts", username, {})

    @classmethod
    def get_public_identity(cls, user: User) -> Dict[str, Any]:
        """
        Constructs full public identity payload matching Discord/Slack identity model.
        Returns: { user_id, username, avatar_url, badge, theme, aura, companion, frame, title }
        """
        user_identity = getattr(user, 'user_identity', None)
        if not user_identity and user and user.is_authenticated:
            try:
                user_identity = cls.get_or_create_identity(user)
            except Exception:
                pass

        config = (user_identity.identity_config if user_identity else {}) or {}
        equipped = config.get("equipped_cosmetics", {})

        return {
            "user_id": user.id if user else None,
            "username": user.username if user else "anonymous",
            "avatar_url": cls.resolve_avatar_url(user),
            "badge": equipped.get("badge", "soul_member"),
            "theme": equipped.get("theme", "soft_lavender"),
            "aura": equipped.get("aura", "none"),
            "companion": equipped.get("companion", "none"),
            "frame": equipped.get("frame", "default"),
            "title": equipped.get("title", "SoulCare Member"),
        }
