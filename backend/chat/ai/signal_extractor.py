# chat/ai/signal_extractor.py

from datetime import timedelta
from django.utils import timezone
from chat.models import SignalSnapshot


NEGATIVE_WORDS = {
    "tired", "exhausted", "sad", "hopeless", "alone",
    "empty", "anxious", "stressed", "overwhelmed"
}

POSITIVE_WORDS = {
    "calm", "grateful", "better", "relieved",
    "hopeful", "peaceful"
}


def extract_signals_from_journal(journal):
    """
    RULE-BASED SIGNAL EXTRACTION
    - No diagnosis
    - No AI
    - No storage of raw text
    - Deterministic & auditable
    """

    text = journal.content.lower()
    created_at = journal.created_at

    negative_hits = len(NEGATIVE_WORDS.intersection(text.split()))
    positive_hits = len(POSITIVE_WORDS.intersection(text.split()))

    # --- Signal 1: Mood Direction ---
    if negative_hits > positive_hits:
        mood = "downward"
        confidence = min(0.9, 0.4 + negative_hits * 0.1)
    elif positive_hits > negative_hits:
        mood = "upward"
        confidence = min(0.9, 0.4 + positive_hits * 0.1)
    else:
        mood = "neutral"
        confidence = 0.3

    SignalSnapshot.objects.create(
        user=journal.user,
        signal_type="mood_direction",
        value_type="enum",
        value=mood,
        confidence=confidence,
        window_start=created_at - timedelta(hours=12),
        window_end=created_at,
    )

    # --- Signal 2: Expression Intensity ---
    intensity = min(1.0, (negative_hits + positive_hits) / 6)

    SignalSnapshot.objects.create(
        user=journal.user,
        signal_type="expression_intensity",
        value_type="int",
        value=str(int(intensity * 10)),  # stored as string
        confidence=0.5,
        window_start=created_at - timedelta(hours=12),
        window_end=created_at,
    )