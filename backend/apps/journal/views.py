from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import JournalEntry
from .serializers import JournalEntrySerializer


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def journal_list_create(request):
    if request.method == 'GET':
        entries = JournalEntry.objects.filter(user=request.user, is_deleted=False)
        return Response(JournalEntrySerializer(entries, many=True).data)

    serializer = JournalEntrySerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    journal = serializer.save(user=request.user)

    # Trigger insight generation (fail-safe)
    try:
        from apps.insights.engine import create_insight_from_journal
        create_insight_from_journal(journal)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Insight generation failed: %s", e)

    return Response(JournalEntrySerializer(journal).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def journal_detail(request, journal_id):
    try:
        journal = JournalEntry.objects.get(id=journal_id, user=request.user, is_deleted=False)
    except JournalEntry.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(JournalEntrySerializer(journal).data)

    if request.method == 'PATCH':
        serializer = JournalEntrySerializer(journal, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    # DELETE — soft delete
    journal.is_deleted = True
    journal.save(update_fields=['is_deleted'])
    return Response(status=status.HTTP_204_NO_CONTENT)
