from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Insight
from .serializers import InsightSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def insight_list(request):
    insights = Insight.objects.filter(user=request.user, is_dismissed=False)
    # Mark all as read on fetch
    insights.filter(is_read=False).update(is_read=True)
    return Response(InsightSerializer(insights, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def dismiss_insight(request, insight_id):
    try:
        insight = Insight.objects.get(id=insight_id, user=request.user)
    except Insight.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    insight.is_dismissed = True
    insight.is_read = True
    insight.save(update_fields=['is_dismissed', 'is_read'])
    return Response({"detail": "Insight dismissed."})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_for_journal(request, journal_id):
    """Manually (re)generate insight for a specific journal entry."""
    from apps.journal.models import JournalEntry
    from .engine import analyze_journal

    try:
        journal = JournalEntry.objects.get(id=journal_id, user=request.user, is_deleted=False)
    except JournalEntry.DoesNotExist:
        return Response({"detail": "Journal not found."}, status=status.HTTP_404_NOT_FOUND)

    # Delete existing insight so we regenerate fresh
    Insight.objects.filter(journal=journal).delete()

    result = analyze_journal(journal.content)
    insight = Insight.objects.create(
        user=request.user,
        journal=journal,
        title=result["title"],
        message=result["message"],
        mood=result["mood"],
        sentiment_score=result["sentiment_score"],
        emotion_tags=result["emotions"],
        keywords=result["keywords"],
        source_window_start=journal.created_at,
        source_window_end=journal.created_at,
    )
    return Response(InsightSerializer(insight).data, status=status.HTTP_201_CREATED)
