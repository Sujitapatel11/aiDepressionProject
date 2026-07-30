from typing import Dict, Optional
from .base_provider import AbstractAvatarProvider
from .dicebear_provider import DiceBearProvider
from .ai_provider import AIAvatarProvider


class AvatarProviderRegistry:
    """
    Dynamic Provider Strategy Registry (Open/Closed Principle).
    Allows plugging new rendering engines without modifying caller logic.
    """
    _registry: Dict[str, AbstractAvatarProvider] = {}

    @classmethod
    def register(cls, provider: AbstractAvatarProvider) -> None:
        cls._registry[provider.provider_name.lower()] = provider

    @classmethod
    def get(cls, provider_name: str) -> AbstractAvatarProvider:
        name = (provider_name or "").lower()
        if name in cls._registry:
            return cls._registry[name]
        # Fallback to default DiceBear provider
        return cls._registry.get("dicebear", DiceBearProvider())

    @classmethod
    def list_providers(cls) -> list:
        return list(cls._registry.keys())


def bootstrap_providers():
    """Bootstraps default avatar provider plugins."""
    AvatarProviderRegistry.register(DiceBearProvider())
    AvatarProviderRegistry.register(AIAvatarProvider())


# Ensure providers are bootstrapped on import
bootstrap_providers()
