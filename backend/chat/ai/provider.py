import os
from typing import Optional
from openai import OpenAI


class AIProviderError(Exception):
    pass


class AIProvider:
    def __init__(self):
        self.enabled = os.getenv("AI_ENABLED", "false").lower() == "true"
        self.client = None

        if self.enabled:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise AIProviderError("OPENAI_API_KEY missing")

            self.client = OpenAI(api_key=api_key)

    def generate(self, prompt: str, max_tokens: int = 250) -> Optional[str]:
        if not self.enabled or not self.client:
            return None

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a gentle, non-diagnostic mental wellness assistant."},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=max_tokens,
                temperature=0.6,
            )

            return response.choices[0].message.content

        except Exception as e:
            # FAIL SILENTLY — app must not crash
            return None


_provider = None

def get_ai_provider():
    global _provider
    if _provider is None:
        _provider = AIProvider()
    return _provider