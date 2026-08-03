import os
import time
import requests
import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .models import JournalEntry
from .serializers import JournalEntrySerializer

logger = logging.getLogger(__name__)



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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def transcribe_audio_view(request):
    """
    POST /api/journal/transcribe/
    Accepts audio file upload and optional language hint ('hi', 'en', 'ne', 'auto').
    Forwards audio to HuggingFace Whisper API and returns transcribed text.
    """
    if 'audio' not in request.FILES:
        return Response({"detail": "No audio file provided."}, status=status.HTTP_400_BAD_REQUEST)

    audio_file = request.FILES['audio']
    language = request.data.get('language', 'auto')

    hf_key = os.environ.get("HF_API_KEY", "")
    whisper_model = os.environ.get("WHISPER_MODEL", "openai/whisper-large-v3-turbo")

    if not hf_key:
        return Response(
            {"detail": "HuggingFace API key is not configured on the server. Please type your entry manually."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    try:
        audio_bytes = audio_file.read()
        content_type = audio_file.content_type or 'audio/webm'

        url = f"https://router.huggingface.co/hf-inference/models/{whisper_model}"
        headers = {
            "Authorization": f"Bearer {hf_key}",
            "Content-Type": content_type,
            "x-wait-for-model": "true",
        }

        try:
            resp = requests.post(url, headers=headers, data=audio_bytes, timeout=25)
        except requests.exceptions.RequestException:
            # Fallback to legacy endpoint if router fails DNS
            legacy_url = f"https://api-inference.huggingface.co/models/{whisper_model}"
            resp = requests.post(legacy_url, headers=headers, data=audio_bytes, timeout=25)

        if resp.status_code == 503:
            time.sleep(3)
            resp = requests.post(url, headers=headers, data=audio_bytes, timeout=25)

        if resp.status_code == 200:
            data = resp.json()
            text = ""
            if isinstance(data, dict):
                text = data.get("text", "").strip()
            elif isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
                text = data[0].get("text", "").strip()

            return Response({"text": text, "language": language})
        elif resp.status_code == 403:
            logger.warning("HF Whisper API 403: %s", resp.text[:200])
            return Response(
                {"detail": "HuggingFace API key lacks 'Inference Provider' permissions. Enable this in HuggingFace Token Settings or type manually."},
                status=status.HTTP_403_FORBIDDEN
            )
        else:
            logger.warning("HF Whisper transcription failed [%d]: %s", resp.status_code, resp.text[:200])
            return Response(
                {"detail": "Audio transcription service is currently unavailable. Please type your entry manually."},
                status=status.HTTP_502_BAD_GATEWAY
            )

    except requests.exceptions.Timeout:
        logger.warning("HF Whisper API timed out for audio transcription.")
        return Response(
            {"detail": "Transcription request timed out. Please try a shorter recording or type manually."},
            status=status.HTTP_504_GATEWAY_TIMEOUT
        )
    except Exception as e:
        logger.exception("Error in audio transcription view: %s", e)
        return Response(
            {"detail": "Could not process audio recording. Please type your entry manually."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

