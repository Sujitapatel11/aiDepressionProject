from django.utils import timezone
from chat.models import SignalSnapshot
from chat.ai.insight_generator import create_insight_from_sentiment
from chat.ai.keyword_bank import KEYWORDS


def extract_signals_from_journal(journal):

    """
    Rule-based sentiment extraction.
    MUST NEVER break journal saving.
    """

    try:
        text = (journal.content or "").lower()
        matched=[]
        for category, words in KEYWORDS.items():
            for word in words:
                if word in text:
                    matched.append((category, word))
        if not matched:
            return  # No signals found, skip saving snapshot
        # -----------------------------
        # 1. Simple negative lexicon
        # -----------------------------
        negative_words = [
            "awful", "bad", "tired", "exhausted", "hopeless",
            "confused", "anxious", "worried", "overwhelmed"
        ]

        score = 0
        for word in negative_words:
            if word in text:
                score -= 1

        # -----------------------------
        # 2. Sentiment label
        # -----------------------------
        if score < 0:
            sentiment = "negative"
        else:
            sentiment = "neutral"

        # -----------------------------
        # 3. REQUIRED timestamps
        # -----------------------------
        window_time = journal.created_at or timezone.now()

        # -----------------------------
        # 4. Save snapshot
        # -----------------------------
        SignalSnapshot.objects.create(
            user=journal.user,
            journal=journal,
            signal_type="sentiment",
            value=sentiment,
            confidence=min(abs(score) / 5, 1.0),
            window_start=window_time,
            window_end=window_time,
        )
        create_insight_from_sentiment(journal, sentiment)

    except Exception as e:
        print("Signal extraction failed:", e)