# chat/ai/prompts.py

"""
Prompt construction layer.

Input  : Abstracted signals (NOT journal text)
Output : Safe, reflective LLM prompt

NO diagnosis.
NO labels.
NO medical language.
"""

from typing import List, Dict


def build_insight_prompt(signals: List[Dict]) -> str:
    """
    Build a controlled prompt for the AI based on signals.

    signals example:
    [
        {
            "type": "mood_direction",
            "value": "downward",
            "confidence": 0.6
        }
    ]
    """

    if not signals:
        return BASELINE_PROMPT

    lines = [
        "The user has been journaling recently.",
        "Based on patterns (not diagnoses), here are gentle observations:",
    ]

    for signal in signals:
        line = _signal_to_text(signal)
        if line:
            lines.append(f"- {line}")

    lines.append("")
    lines.append(
        "Respond with a short, calm reflection.\n"
        "Do not label emotions.\n"
        "Do not suggest treatment.\n"
        "Do not sound authoritative.\n"
        "Do not ask too many questions.\n"
        "Offer at most one gentle reflective question."
    )

    return "\n".join(lines)


# -------------------------
# SIGNAL → LANGUAGE
# -------------------------

def _signal_to_text(signal: Dict) -> str | None:
    signal_type = signal.get("type")
    value = signal.get("value")
    confidence = signal.get("confidence", 0)

    # Ignore weak signals
    if confidence < 0.35:
        return None

    if signal_type == "mood_direction":
        if value == "downward":
            return (
                "Recent entries suggest a heavier or lower emotional tone at times."
            )
        elif value == "upward":
            return (
                "Recent entries suggest moments of lightness or relief."
            )
        elif value == "neutral":
            return (
                "Recent entries appear emotionally steady."
            )

    if signal_type == "consistency":
        if value == "high":
            return (
                "The user has been returning to reflection regularly."
            )
        elif value == "low":
            return (
                "Reflections have been more spaced out recently."
            )

    if signal_type == "emotional_variance":
        if value == "high":
            return (
                "Emotional expression varies noticeably across entries."
            )
        elif value == "low":
            return (
                "Emotional tone appears relatively consistent."
            )

    if signal_type == "social_reference":
        if value == "present":
            return (
                "The user references other people or relationships in their reflections."
            )
        elif value == "absent":
            return (
                "The user focuses mostly on internal experiences."
            )

    return None


# -------------------------
# FALLBACK PROMPT
# -------------------------

BASELINE_PROMPT = """
The user has written a personal reflection.

Respond as a calm, supportive presence.
Avoid conclusions.
Offer a gentle observation or question.
Keep it short and grounded.
"""