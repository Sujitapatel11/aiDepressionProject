import logging

from django.db.models import Count, Exists, OuterRef, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from config.throttles import (
    SoulTubeChatRateThrottle,
    SoulTubeCreateRateThrottle,
    SoulTubeJoinRateThrottle,
    SoulTubePlaybackRateThrottle,
)
from .models import (
    WatchRoom,
    WatchRoomChatMessage,
    WatchRoomParticipant,
    WatchRoomPlaybackState,
    WatchRoomQueueItem,
)
from .serializers import (
    WatchRoomChatMessageSerializer,
    WatchRoomDetailSerializer,
    WatchRoomParticipantSerializer,
    WatchRoomQueueItemSerializer,
    WatchRoomSummarySerializer,
)
from .services import (
    active_membership,
    add_queue_item,
    broadcast_room_event,
    can_manage_room,
    compact_queue,
    create_room,
    is_room_host,
    playback_snapshot,
    record_chat_message,
    room_is_open,
    set_playback,
    validate_room_video_asset,
)

logger = logging.getLogger(__name__)


class WatchRoomPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 50


def _not_found():
    return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)


def _room_or_404(code):
    return get_object_or_404(
        WatchRoom.objects.select_related('host', 'video_asset'),
        code=code.upper(),
    )


def _detail_response(room, request, status_code=status.HTTP_200_OK):
    return Response(
        WatchRoomDetailSerializer(room, context={'request': request}).data,
        status=status_code,
    )


def _queue_payload(room, request):
    items = room.queue_items.select_related('video_asset')
    context = {
        'request': request,
        'room_media_visible': bool(
            request.user.is_staff or active_membership(room, request.user)
        ),
    }
    return WatchRoomQueueItemSerializer(items, many=True, context=context).data


def _participants_payload(room, request):
    members = room.participants.filter(left_at__isnull=True).select_related('user')
    return WatchRoomParticipantSerializer(members, many=True, context={'request': request}).data


def _require_member(room, request):
    membership = active_membership(room, request.user)
    if not membership:
        return None, Response(
            {'detail': 'Join this room before using it.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    return membership, None


def _require_host(room, request):
    if not can_manage_room(room, request.user):
        return Response(
            {'detail': 'Only the host can control this room.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    return None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def room_list(request):
    """Public active rooms, or the rooms the viewer has joined with ?mine=1."""
    rooms = WatchRoom.objects.filter(
        status=WatchRoom.Status.ACTIVE,
        expires_at__gt=timezone.now(),
    ).select_related('host').annotate(
        active_participant_count=Count(
            'participants', filter=Q(participants__left_at__isnull=True), distinct=True,
        ),
        joined_by_viewer=Exists(
            WatchRoomParticipant.objects.filter(
                room=OuterRef('pk'), user=request.user, left_at__isnull=True,
            )
        ),
    )
    if request.query_params.get('mine') in ('1', 'true', 'yes'):
        rooms = rooms.filter(joined_by_viewer=True)
    else:
        rooms = rooms.filter(visibility=WatchRoom.Visibility.PUBLIC)
    rooms = rooms.order_by('-created_at')

    paginator = WatchRoomPagination()
    page = paginator.paginate_queryset(rooms, request)
    serializer = WatchRoomSummarySerializer(page, many=True, context={'request': request})
    return paginator.get_paginated_response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([SoulTubeCreateRateThrottle])
def room_create(request):
    name = str(request.data.get('name', '')).strip()
    if len(name) < 3 or len(name) > 120:
        return Response({'name': ['Room names must be 3–120 characters.']},
                        status=status.HTTP_400_BAD_REQUEST)
    visibility = request.data.get('visibility', WatchRoom.Visibility.PUBLIC)
    if visibility not in WatchRoom.Visibility.values:
        return Response({'visibility': ['Choose public or private.']},
                        status=status.HTTP_400_BAD_REQUEST)
    try:
        max_participants = int(request.data.get('max_participants', 20))
    except (TypeError, ValueError):
        return Response({'max_participants': ['Must be a number.']},
                        status=status.HTTP_400_BAD_REQUEST)
    if not 2 <= max_participants <= 50:
        return Response({'max_participants': ['Choose between 2 and 50 participants.']},
                        status=status.HTTP_400_BAD_REQUEST)
    try:
        lifetime_hours = int(request.data.get('lifetime_hours', 12))
    except (TypeError, ValueError):
        return Response({'lifetime_hours': ['Must be a number.']},
                        status=status.HTTP_400_BAD_REQUEST)
    if not 1 <= lifetime_hours <= 24:
        return Response({'lifetime_hours': ['Rooms can stay open for 1–24 hours.']},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        video_asset = validate_room_video_asset(request.data.get('video_asset_id'), request.user)
    except ValueError as exc:
        return Response({'video_asset_id': [str(exc)]}, status=status.HTTP_400_BAD_REQUEST)

    room = create_room(
        host=request.user,
        name=name,
        visibility=visibility,
        max_participants=max_participants,
        video_asset=video_asset,
        lifetime_hours=lifetime_hours,
    )
    return _detail_response(room, request, status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def room_detail(request, code):
    room = _room_or_404(code)
    membership = active_membership(room, request.user)
    if room.visibility == WatchRoom.Visibility.PRIVATE and not membership and not request.user.is_staff:
        return _not_found()
    if not room_is_open(room) and not membership and not request.user.is_staff:
        return _not_found()
    return _detail_response(room, request)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([SoulTubeJoinRateThrottle])
def room_join(request, code):
    room = _room_or_404(code)
    if not room_is_open(room):
        return Response({'detail': 'This room has ended.'}, status=status.HTTP_409_CONFLICT)

    membership = active_membership(room, request.user)
    if membership:
        membership.save(update_fields=['last_seen_at'])
        return _detail_response(room, request)

    active_count = room.participants.filter(left_at__isnull=True).count()
    if active_count >= room.max_participants:
        return Response({'detail': 'This room is full.'}, status=status.HTTP_409_CONFLICT)

    membership, created = WatchRoomParticipant.objects.get_or_create(
        room=room,
        user=request.user,
        defaults={'role': WatchRoomParticipant.Role.VIEWER},
    )
    if not created and membership.left_at is not None:
        # Rejoining reuses the unique (room, user) row instead of violating it.
        membership.left_at = None
        membership.save(update_fields=['left_at', 'last_seen_at'])
    broadcast_room_event(room, 'participants', {
        'participants': _participants_payload(room, request),
    })
    return _detail_response(room, request)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def room_leave(request, code):
    room = _room_or_404(code)
    membership, error = _require_member(room, request)
    if error:
        return error
    if is_room_host(room, request.user):
        return Response({'detail': 'The host must close the room instead of leaving it.'},
                        status=status.HTTP_400_BAD_REQUEST)
    membership.left_at = timezone.now()
    membership.save(update_fields=['left_at', 'last_seen_at'])
    broadcast_room_event(room, 'participants', {
        'participants': _participants_payload(room, request),
    })
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def room_close(request, code):
    room = _room_or_404(code)
    error = _require_host(room, request)
    if error:
        return error
    if room_is_open(room):
        room.close()
        broadcast_room_event(room, 'room.closed', {'code': room.code})
    return _detail_response(room, request)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([SoulTubeChatRateThrottle])
def room_messages(request, code):
    room = _room_or_404(code)
    _, error = _require_member(room, request)
    if error:
        return error

    if request.method == 'GET':
        messages = room.chat_messages.select_related('user').order_by('-created_at')[:100]
        messages = list(reversed(messages))
        return Response(WatchRoomChatMessageSerializer(
            messages, many=True, context={'request': request},
        ).data)

    try:
        message = record_chat_message(room, request.user, request.data.get('body'))
    except ValueError as exc:
        return Response({'body': [str(exc)]}, status=status.HTTP_400_BAD_REQUEST)

    payload = WatchRoomChatMessageSerializer(message, context={'request': request}).data
    broadcast_room_event(room, 'chat.message', {'message': payload})
    return Response(payload, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def room_queue_add(request, code):
    room = _room_or_404(code)
    error = _require_host(room, request)
    if error:
        return error
    if not room_is_open(room):
        return Response({'detail': 'This room has ended.'}, status=status.HTTP_409_CONFLICT)

    try:
        asset = validate_room_video_asset(request.data.get('video_asset_id'), request.user)
    except ValueError as exc:
        return Response({'video_asset_id': [str(exc)]}, status=status.HTTP_400_BAD_REQUEST)
    if asset is None:
        return Response({'video_asset_id': ['Choose a video to add.']},
                        status=status.HTTP_400_BAD_REQUEST)

    item = add_queue_item(room, request.user, asset, str(request.data.get('title', '')))
    broadcast_room_event(room, 'queue.updated', {'queue': _queue_payload(room, request)})
    return Response(
        WatchRoomQueueItemSerializer(item, context={'request': request}).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def room_queue_remove(request, code, item_id):
    room = _room_or_404(code)
    error = _require_host(room, request)
    if error:
        return error
    item = get_object_or_404(WatchRoomQueueItem, id=item_id, room=room)
    item.delete()
    compact_queue(room)
    broadcast_room_event(room, 'queue.updated', {'queue': _queue_payload(room, request)})
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def room_queue_play(request, code, item_id):
    room = _room_or_404(code)
    error = _require_host(room, request)
    if error:
        return error
    item = get_object_or_404(WatchRoomQueueItem, id=item_id, room=room)
    room.video_asset = item.video_asset
    room.save(update_fields=['video_asset', 'updated_at'])
    item.delete()
    compact_queue(room)
    set_playback(room, request.user, is_playing=False, position_seconds=0)
    broadcast_room_event(room, 'room.video', {
        'video': _detail_response(room, request).data.get('video'),
        'playback': playback_snapshot(room),
        'queue': _queue_payload(room, request),
    })
    return _detail_response(room, request)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def room_queue_reorder(request, code):
    room = _room_or_404(code)
    error = _require_host(room, request)
    if error:
        return error
    ordered_ids = request.data.get('item_ids')
    if not isinstance(ordered_ids, list) or not ordered_ids:
        return Response({'item_ids': ['Provide the ordered queue item IDs.']},
                        status=status.HTTP_400_BAD_REQUEST)

    # JSON clients send integers while model IDs are compared as strings.
    ordered_ids = [str(item_id) for item_id in ordered_ids]
    items = {str(item.id): item for item in room.queue_items.all()}
    if len(ordered_ids) != len(items) or set(ordered_ids) != set(items):
        return Response({'item_ids': ['Include every queue item exactly once.']},
                        status=status.HTTP_400_BAD_REQUEST)
    for index, item_id in enumerate(ordered_ids):
        item = items[str(item_id)]
        if item.position != index:
            item.position = index
            item.save(update_fields=['position'])
    compact_queue(room)
    broadcast_room_event(room, 'queue.updated', {'queue': _queue_payload(room, request)})
    return Response({'queue': _queue_payload(room, request)})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
@throttle_classes([SoulTubePlaybackRateThrottle])
def room_playback(request, code):
    room = _room_or_404(code)
    error = _require_host(room, request)
    if error:
        return error
    if not room_is_open(room):
        return Response({'detail': 'This room has ended.'}, status=status.HTTP_409_CONFLICT)
    if not room.video_asset_id:
        return Response({'detail': 'Add a video before starting playback.'},
                        status=status.HTTP_400_BAD_REQUEST)

    is_playing = request.data.get('is_playing')
    position = request.data.get('position_seconds')
    if is_playing is None and position is None:
        return Response({'detail': 'Provide is_playing or position_seconds.'},
                        status=status.HTTP_400_BAD_REQUEST)
    try:
        if position is not None:
            position = float(position)
            if position < 0:
                raise ValueError
    except (TypeError, ValueError):
        return Response({'position_seconds': ['Must be a non-negative number.']},
                        status=status.HTTP_400_BAD_REQUEST)

    state, _ = WatchRoomPlaybackState.objects.get_or_create(room=room)
    set_playback(
        room,
        request.user,
        is_playing=state.is_playing if is_playing is None else bool(is_playing),
        position_seconds=state.position_seconds if position is None else position,
    )
    snapshot = playback_snapshot(room)
    broadcast_room_event(room, 'playback', {'playback': snapshot})
    return Response(snapshot)
