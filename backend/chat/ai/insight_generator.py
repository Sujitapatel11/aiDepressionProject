from chat.models import Insight
from django.utils import timezone


def create_insight_from_sentiment(journal, sentiment):
    """
    Convert a sentiment signal into a single, user-facing insight.
    This MUST be deterministic and non-repeating.
    """

    if sentiment == "negative":
        title = "Emotional load detected"
        message = (
            "Your recent journal entry shows signs of emotional strain. "
            "This doesn’t mean something is wrong — it may indicate that "
            "you’re carrying more mental load than usual."
        )
    else:
        title = "Neutral emotional state"
        message = (
            "Your recent journal entry reflects a stable emotional tone. "
            "This suggests balance rather than emotional overload."
        )

    Insight.objects.create(
        user=journal.user,
        title=title,
        message=message,
        source_window_start=journal.created_at,
        source_window_end=journal.created_at,
    )