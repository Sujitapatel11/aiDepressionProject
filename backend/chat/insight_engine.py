# chat/insight_engine.py

from .models import JournalEntry, Insight

def generate_insights_for_user(user):
    journals = JournalEntry.objects.filter(
        user=user,
        is_deleted=False
    ).order_by("created_at")

    if not journals.exists():
        return

    journal_count = journals.count()

    if journal_count >= 2:
        Insight.objects.get_or_create(
            user=user,
            title="You’ve been reflecting consistently",
            defaults={
                "message": (
                    "You’ve written multiple journal entries. "
                    "Consistency in reflection can help build awareness over time."
                )
            }
        )

    latest = journals.last()
    Insight.objects.get_or_create(
        user=user,
        title="A recent reflection stands out",
        defaults={
            "message": (
                f"You shared a thought on {latest.created_at.strftime('%B %d')}. "
                "Noticing patterns over time can be grounding."
            )
        }
    )