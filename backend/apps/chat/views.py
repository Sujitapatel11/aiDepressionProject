from django.db.models import Q
import logging
import time

logger = logging.getLogger(__name__)
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.support.models import SupportConnection
from .models import Message
from .serializers import MessageSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def message_history(request, connection_id):
    request_started = time.monotonic()
    try:
        conn = SupportConnection.objects.select_related('user_one', 'user_two').get(
            connection_id=connection_id,
            status=SupportConnection.STATUS_ACTIVE,
        )
    except SupportConnection.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    user = request.user
    if user not in (conn.user_one, conn.user_two):
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    messages = Message.objects.filter(connection=conn).exclude(
        Q(sender=user, deleted_for_sender=True) | Q(receiver=user, deleted_for_receiver=True)
    ).select_related('sender').order_by("created_at")[:100]
    query_started = time.monotonic()
    serialized = MessageSerializer(messages, many=True).data
    logger.info(
        "chat.database.message_history query_and_serialize_ms=%.2f total_ms=%.2f count=%d",
        (time.monotonic() - query_started) * 1000,
        (time.monotonic() - request_started) * 1000,
        len(serialized),
    )
    return Response(serialized)
