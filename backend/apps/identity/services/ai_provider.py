from typing import Dict, Any, List
from .base_provider import AbstractAvatarProvider


class AIAvatarProvider(AbstractAvatarProvider):
    """
    AI Avatar Strategy Plugin Stub (Extensibility placeholder).
    Constructs URLs pointing to CDN-hosted AI generated images.
    """

    @property
    def provider_name(self) -> str:
        return "ai_sdxl"

    def get_supported_styles(self) -> List[str]:
        return ["cyberpunk", "ethereal", "anime", "photorealistic", "abstract"]

    def generate_avatar_url(
        self,
        style_preset: str,
        seed_key: str,
        identity_config: Dict[str, Any],
        version: str = "v1"
    ) -> str:
        cdn_path = identity_config.get("cdn_uri")
        if cdn_path:
            return cdn_path
        return f"https://cdn.soulcare.app/avatars/ai/{seed_key}_{style_preset}.png"
