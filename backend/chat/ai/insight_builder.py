# chat/ai/insight_builder.py

from datetime import timedelta
from django.utils import timezone

from chat.models import SignalSnapshot, Insight
from .prompts import build_insight_prompt
from .provider import get_ai_provider


# ----------------------------------
# MAIN ENTRY POINT
# ----------------------------------

def generate_insights_for_user(user):
    """
    Generate a single safe insight for the user
    based on recent signal snapshots.
    """

    now = timezone.now()
    window_start = now - timedelta(hours=24)

    signals = SignalSnapshot.objects.filter(
        user=user,
        generated_at__gte=window_start
    ).order_by("-generated_at")

    if not signals.exists():
        return None

    signal_payload = _prepare_signal_payload(signals)

    if not any(s["confidence"]>=0.4 for s in signal_payload):
        return None

    prompt = build_insight_prompt(signal_payload)

    provider = get_ai_provider()
    ai_text = provider.generate(prompt, max_tokens=200)

    if not ai_text:
        return None

    return Insight.objects.create(
        user=user,
        title=_generate_title(signal_payload),
        message=ai_text.strip(),
        source_window_start=window_start,
        source_window_end=now,
    )


# ----------------------------------
# SIGNAL SELECTION
# ----------------------------------

def _prepare_signal_payload(signals):
    """
    Reduce raw signals into a compact payload
    for prompt construction.
    """

    payload = []
    seen_types = set()

    for signal in signals:
        if signal.signal_type in seen_types:
            continue

        payload.append({
            "type": signal.signal_type,
            "value": signal.value,
            "confidence": signal.confidence,
        })

        seen_types.add(signal.signal_type)

        if len(payload) >= 4:
            break

    return payload


# ----------------------------------
# TITLE GENERATION
# ----------------------------------

def _generate_title(signal_payload):
    """
    Generate a neutral, non-alarming title.
    """

    types = {s["type"] for s in signal_payload}

    if "mood_direction" in types:
        return "A gentle reflection from recent journaling"

    if "consistency" in types:
        return "Noticing your reflection habits"

    return "A small moment of reflection"
def generate_rule_based_insight(user):
    from chat.models import JournalEntry, Insight
    from django.utils import timezone
    from datetime import timedelta

    journals = JournalEntry.objects.filter(
        user=user,
        is_deleted=False
    ).order_by("-created_at")

    if journals.count() < 2:
        return None

    now = timezone.now()

    return Insight.objects.get_or_create(
        user=user,
        title="A small pattern in your reflections",
        defaults={
            "message": (
                "You’ve been writing regularly. Even short reflections "
                "can help you notice patterns over time."
            ),
            "source_window_start": journals.last().created_at,
            "source_window_end": now,
        }
    )
def generate_guaranteed_insight(user):
    """
    This insight is ALWAYS created.
    It ensures Insights never feel empty.
    """

    from chat.models import JournalEntry, Insight
    from django.utils import timezone

    journals = JournalEntry.objects.filter(
        user=user,
        is_deleted=False
    ).order_by("-created_at")

    if not journals.exists():
        return None

    latest = journals.first()

    # Avoid duplicates for same journal
    exists = Insight.objects.filter(
        user=user,
        source_window_start=latest.created_at
    ).exists()

    if exists:
        return None

    return Insight.objects.create(
        user=user,
        title="A moment to pause and notice",
        message=(
            "You took time to write something down. "
            "Even brief reflection can help create space to breathe."
        ),
        source_window_start=latest.created_at,
        source_window_end=timezone.now(),
    )                           