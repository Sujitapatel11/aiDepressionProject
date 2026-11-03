from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.support.models import SupportConnection
from .models import Message, WebSocketAuthTicket
from .serializers import MessageSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def message_history(request, connection_id):
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
    return Response(MessageSerializer(messages, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def websocket_ticket(request):
    if not request.user.is_active:
        return Response({"detail": "Authentication required."}, status=status.HTTP_403_FORBIDDEN)

    raw_ticket, _ = WebSocketAuthTicket.issue_for_user(request.user)
    return Response(
        {"ticket": raw_ticket, "expires_in": WebSocketAuthTicket.LIFETIME_SECONDS},
        status=status.HTTP_201_CREATED,
    )
