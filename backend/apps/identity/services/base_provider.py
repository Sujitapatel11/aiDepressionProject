from abc import ABC, abstractmethod
from typing import Dict, Any


class AbstractAvatarProvider(ABC):
    """
    Abstract Strategy Interface for Avatar Rendering Engines.
    All providers (DiceBear, AI, 3D/Cosmetics) implement this interface.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Unique identifier key for the provider strategy (e.g. 'dicebear', 'ai_sdxl')."""
        pass

    @abstractmethod
    def generate_avatar_url(
        self,
        style_preset: str,
        seed_key: str,
        identity_config: Dict[str, Any],
        version: str = "v7"
    ) -> str:
        """
        Dynamically constructs avatar URL from provider parameters.
        Must be pure and deterministic without causing side-effects.
        """
        pass

    @abstractmethod
    def get_supported_styles(self) -> list:
        """Returns list of available style presets for this provider."""
        pass
