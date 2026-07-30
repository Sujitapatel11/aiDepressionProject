from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .models import JournalEntry
from .serializers import JournalEntrySerializer


class JournalPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def journal_list_create(request):
    if request.method == 'GET':
        entries = JournalEntry.objects.filter(user=request.user, is_deleted=False).order_by('-created_at')
        paginator = JournalPagination()
        page = paginator.paginate_queryset(entries, request)
        if page is not None:
            serializer = JournalEntrySerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        return Response(JournalEntrySerializer(entries, many=True).data)

    import time
    import uuid
    import logging
    logger = logging.getLogger(__name__)

    req_id = uuid.uuid4().hex[:8]
    t_start = time.perf_counter()

    serializer = JournalEntrySerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    t_save_start = time.perf_counter()
    journal = serializer.save(user=request.user)
    t_save_ms = (time.perf_counter() - t_save_start) * 1000
    logger.info("[PERF_AUDIT][%s] Stage: Save Journal | Duration: %.2f ms", req_id, t_save_ms)

    # Trigger insight generation (fail-safe)
    t_insight_start = time.perf_counter()
    try:
        from apps.insights.engine import create_insight_from_journal
        create_insight_from_journal(journal, request_id=req_id)
    except Exception as e:
        logger.warning("[PERF_AUDIT][%s] Stage: Create Insight | Status: Exception | ExceptionType: %s", req_id, type(e).__name__)
    t_insight_ms = (time.perf_counter() - t_insight_start) * 1000
    logger.info("[PERF_AUDIT][%s] Stage: Create Insight Total | Duration: %.2f ms", req_id, t_insight_ms)

    t_total_ms = (time.perf_counter() - t_start) * 1000
    logger.info("[PERF_AUDIT][%s] Stage: Total Response Time | Duration: %.2f ms", req_id, t_total_ms)

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
