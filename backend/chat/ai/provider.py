# chat/ai/provider.py
# Controlled gateway to OpenAI / Gemini / Claude

import os
from typing import Optional


class AIProviderError(Exception):
    """Raised when AI provider fails safely."""
    pass


class BaseAIProvider:
    """
    Base interface for any AI provider.
    """

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 300,
    ) -> Optional[str]:
        raise NotImplementedError


class MockAIProvider(BaseAIProvider):
    """
    Safe default provider (NO external API).
    Used for development & testing.
    """

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 300,
    ) -> Optional[str]:
        return (
            "You’ve been expressing mixed emotions lately. "
            "Noticing these patterns is a meaningful step toward self-understanding. "
            "Try to be gentle with yourself."
        )


class DisabledAIProvider(BaseAIProvider):
    """
    Explicitly disabled AI (returns nothing).
    """

    def generate(self, system_prompt, user_prompt, max_tokens=300):
        return None


def get_ai_provider() -> BaseAIProvider:
    """
    Factory: decides which AI provider to use.
    """

    enabled = os.getenv("AI_ENABLED", "true").lower() == "true"

    if not enabled:
        return DisabledAIProvider()

    # 🔴 Later switch here:
    # return OpenAIProvider()
    # return GeminiProvider()
    # return ClaudeProvider()

    return MockAIProvider()