from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import SupportRequest, SupportConnection
from apps.journal.models import JournalEntry
from apps.insights.models import Insight


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_view(request):
    user = request.user

    pending_requests_count = SupportRequest.objects.filter(
        to_user=user, status=SupportRequest.PENDING
    ).count()

    active_connections_count = SupportConnection.objects.filter(
        Q(user_one=user) | Q(user_two=user),
        status=SupportConnection.STATUS_ACTIVE,
    ).count()

    journals = JournalEntry.objects.filter(user=user, is_deleted=False)
    journal_count = journals.count()

    latest = journals.first()
    latest_journal_preview = None
    if latest:
        latest_journal_preview = {
            "content": latest.content[:200],
            "created_at": latest.created_at,
        }

    unread_insights_count = Insight.objects.filter(
        user=user, is_read=False, is_dismissed=False
    ).count()

    return Response({
        "pending_requests_count": pending_requests_count,
        "active_connections_count": active_connections_count,
        "journal_count": journal_count,
        "latest_journal_preview": latest_journal_preview,
        "unread_insights_count": unread_insights_count,
    })
