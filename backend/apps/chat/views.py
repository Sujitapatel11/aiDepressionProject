from django.db.models import Q
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
    try:
        conn = SupportConnection.objects.get(
            connection_id=connection_id,
            status=SupportConnection.STATUS_ACTIVE,
        )
    except SupportConnection.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    user = request.user
    if user not in (conn.user_one, conn.user_two):
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    messages = Message.objects.filter(connection=conn).order_by("created_at")[:100]
    return Response(MessageSerializer(messages, many=True).data)
