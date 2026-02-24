# chat/ai/rule_based_insights.py

"""
Rule-based insight generation.
NO AI.
NO diagnosis.
Pure pattern + language analysis.
"""

from django.utils import timezone
from chat.models import Insight
import hashlib

NEGATIVE_MARKERS = [
    "tired", "exhausted", "hopeless", "confused",
    "worst", "can't", "unable", "fail", "anxious",
    "overwhelmed", "stuck", "lost"
]

UNCERTAINTY_MARKERS = [
    "i don't know", "not sure", "maybe", "i think",
    "confused", "unsure"
]

EFFORT_MARKERS = [
    "trying", "working", "started", "continuing",
    "show up", "keep going", "writing"
]


def generate_rule_based_insight_text(journal_text: str) -> str:
    """
    Generate ONE analytical, human insight from journal text.
    Always returns text.
    """

    text = journal_text.lower()

    negative_score = sum(1 for w in NEGATIVE_MARKERS if w in text)
    uncertainty_score = sum(1 for w in UNCERTAINTY_MARKERS if w in text)
    effort_score = sum(1 for w in EFFORT_MARKERS if w in text)

    if negative_score >= 2 and effort_score >= 1:
        insight = (
            "Your writing shows emotional strain, but it also shows effort. "
            "That contrast suggests you are carrying difficulty while still "
            "choosing to engage rather than withdraw."
        )

    elif uncertainty_score >= 2:
        insight = (
            "There is a recurring uncertainty in how you describe your thoughts. "
            "Noticing this pattern can help you separate what you feel from what "
            "you are still figuring out."
        )

    elif negative_score >= 2:
        insight = (
            "The tone of this entry leans toward heaviness. "
            "Seeing that pattern written out can sometimes make it feel more "
            "manageable than when it stays unspoken."
        )

    elif effort_score >= 2:
        insight = (
            "This entry reflects consistency more than emotion. "
            "Regularly showing up like this often matters more than what is written."
        )

    else:
        insight = (
            "This entry appears balanced in tone. "
            "Even neutral reflections can help create continuity over time."
        )

    hash_suffix = hashlib.md5(journal_text.encode()).hexdigest()[:4]
    return f"{insight} ({hash_suffix})"


def create_insight_from_journal(journal):
    """
    SIDE EFFECT FUNCTION.
    Safe to fail.
    Creates ONE insight per journal.
    """

    text = generate_rule_based_insight_text(journal.content)

    Insight.objects.create(
        user=journal.user,
        title="Journal Insight",
        message=text,
        source_window_start=journal.created_at,
        source_window_end=journal.created_at,
        created_at=timezone.now()
    )