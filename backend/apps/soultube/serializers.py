from rest_framework import serializers

from apps.mediahub.serializers import MediaAssetSerializer

from .models import (
    WatchRoom,
    WatchRoomChatMessage,
    WatchRoomParticipant,
    WatchRoomPlaybackState,
    WatchRoomQueueItem,
)


def _request_user(serializer):
    request = serializer.context.get('request')
    return getattr(request, 'user', None)


def _room_media_context(serializer):
    """Serialization context for video assets owned by the room host.

    Room videos are never public: <video> cannot send an Authorization header,
    so participants must receive the owner-signed preview URL instead of the
    bare stable URL. Actual delivery is still checked against active room
    membership by /api/media/serve/.
    """
    return {**serializer.context, 'media_public_override': False}


def _may_play_room_media(room, serializer):
    """Only active participants (or staff) receive a playable signed URL.

    Public room detail is readable before joining, but the signed preview URL
    is a bearer capability, so it must not be handed to non-members.
    """
    from .services import active_membership

    cached = serializer.context.get('room_media_visible')
    if cached is not None:
        return bool(cached)
    user = _request_user(serializer)
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    return bool(getattr(user, 'is_staff', False) or active_membership(room, user))


class WatchRoomParticipantSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    is_me = serializers.SerializerMethodField()

    class Meta:
        model = WatchRoomParticipant
        fields = ['id', 'user_id', 'username', 'role', 'joined_at', 'is_me']
        read_only_fields = fields

    def get_is_me(self, obj):
        user = _request_user(self)
        return bool(user and user.is_authenticated and obj.user_id == user.id)


class WatchRoomPlaybackSerializer(serializers.ModelSerializer):
    position_seconds = serializers.SerializerMethodField()
    server_timestamp = serializers.SerializerMethodField()

    class Meta:
        model = WatchRoomPlaybackState
        fields = ['is_playing', 'position_seconds', 'updated_at', 'server_timestamp']
        read_only_fields = fields

    def get_position_seconds(self, obj):
        return round(obj.effective_position(), 3)

    def get_server_timestamp(self, obj):
        from django.utils import timezone
        return timezone.now().isoformat()


class WatchRoomQueueItemSerializer(serializers.ModelSerializer):
    video = serializers.SerializerMethodField()

    class Meta:
        model = WatchRoomQueueItem
        fields = ['id', 'title', 'position', 'created_at', 'video']
        read_only_fields = fields

    def get_video(self, obj):
        if not obj.video_asset_id or not _may_play_room_media(obj.room, self):
            return None
        context = _room_media_context(self)
        return MediaAssetSerializer(obj.video_asset, context=context).data


class WatchRoomChatMessageSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = WatchRoomChatMessage
        fields = ['id', 'user_id', 'username', 'body', 'created_at', 'is_mine']
        read_only_fields = fields

    def get_is_mine(self, obj):
        user = _request_user(self)
        return bool(user and user.is_authenticated and obj.user_id == user.id)


class WatchRoomSummarySerializer(serializers.ModelSerializer):
    host_username = serializers.CharField(source='host.username', read_only=True)
    participant_count = serializers.SerializerMethodField()
    is_host = serializers.SerializerMethodField()
    joined = serializers.SerializerMethodField()

    class Meta:
        model = WatchRoom
        fields = [
            'code', 'name', 'visibility', 'status', 'host_username',
            'participant_count', 'max_participants', 'is_host', 'joined',
            'created_at', 'expires_at',
        ]
        read_only_fields = fields

    def get_participant_count(self, obj):
        annotated = getattr(obj, 'active_participant_count', None)
        if annotated is not None:
            return annotated
        return obj.participants.filter(left_at__isnull=True).count()

    def get_is_host(self, obj):
        user = _request_user(self)
        return bool(user and user.is_authenticated and obj.host_id == user.id)

    def get_joined(self, obj):
        annotated = getattr(obj, 'joined_by_viewer', None)
        if annotated is not None:
            return bool(annotated)
        user = _request_user(self)
        if not user or not user.is_authenticated:
            return False
        members = getattr(obj, 'active_memberships', None)
        if members is not None:
            return any(member.user_id == user.id for member in members)
        return obj.participants.filter(user=user, left_at__isnull=True).exists()


class WatchRoomDetailSerializer(WatchRoomSummarySerializer):
    participants = serializers.SerializerMethodField()
    queue = serializers.SerializerMethodField()
    playback = serializers.SerializerMethodField()
    video = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(read_only=True)

    class Meta(WatchRoomSummarySerializer.Meta):
        fields = WatchRoomSummarySerializer.Meta.fields + [
            'participants', 'queue', 'playback', 'video', 'is_active',
        ]
        read_only_fields = fields

    def get_participants(self, obj):
        members = obj.participants.filter(left_at__isnull=True).select_related('user')
        return WatchRoomParticipantSerializer(members, many=True, context=self.context).data

    def get_queue(self, obj):
        items = obj.queue_items.select_related('video_asset')
        context = {
            **self.context,
            'room_media_visible': _may_play_room_media(obj, self),
        }
        return WatchRoomQueueItemSerializer(items, many=True, context=context).data

    def get_playback(self, obj):
        state = getattr(obj, 'playback', None)
        if state is None:
            return {
                'is_playing': False,
                'position_seconds': 0,
                'updated_at': None,
                'server_timestamp': None,
            }
        return WatchRoomPlaybackSerializer(state, context=self.context).data

    def get_video(self, obj):
        if not obj.video_asset_id or not _may_play_room_media(obj, self):
            return None
        context = _room_media_context(self)
        return MediaAssetSerializer(obj.video_asset, context=context).data
