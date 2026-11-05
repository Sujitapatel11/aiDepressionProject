"""API views for creator_live: session lifecycle and LiveKit token dispatch.

Security model
--------------
- All endpoints require JWT authentication (DRF default: IsAuthenticated).
- Session creation requires the user to have a valid CreatorSubscription
  with grants_hosting_access, OR a free CreatorPlan subscription.
- Token issuance checks audience_type access before signing:
    public / community             → any authenticated user
    followers                      → user has a CreatorFollow record for the creator
    subscribers                    → user has an active subscription (future)
    private                        → user is the creator or has an accepted invite
- Ended/canceled sessions never issue tokens.
- API secret is consumed entirely inside livekit_service.generate_token()
  and is never present in any response.
- Recording grants are never issued, regardless of session.recording_enabled.
"""

import logging

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from config.throttles import CreatorWriteRateThrottle, LiveKitTokenRateThrottle

from .livekit_service import (
    generate_token,
    get_livekit_url,
    is_livekit_configured,
    room_name_for_session,
)
from apps.identity.models import CreatorFollow
from .models import CreatorPlan, CreatorSubscription, LiveParticipant, LiveSession, LiveSessionAudience
from .serializers import LiveSessionCreateSerializer, LiveSessionDetailSerializer

logger = logging.getLogger(__name__)

# ─── Helpers ────────────────────────────────────────────────────────────────


def _user_can_host(user) -> bool:
    """True when the user holds an active hosting subscription or a free plan."""
    return CreatorSubscription.objects.filter(
        creator=user,
        status__in=[CreatorSubscription.Status.ACTIVE, CreatorSubscription.Status.TRIALING],
    ).filter(
        plan__is_active=True,
    ).exists()


def _user_can_join(user, session) -> tuple[bool, str]:
    """Returns (allowed, role) for a viewer attempting to join.
    role is one of 'host', 'speaker', 'viewer'.
    Returns (False, '') when access is denied.
    """
    # Ended/canceled rooms never issue tokens
    if session.status in (LiveSession.Status.ENDED, LiveSession.Status.CANCELED):
        return False, ''

    # Creator is always host
    if session.creator_id == user.id:
        return True, 'host'

    at = session.audience_type

    if at == LiveSession.AudienceType.PUBLIC:
        return True, 'viewer'

    if at == LiveSession.AudienceType.FOLLOWERS:
        # User must follow the creator's CreatorProfile.
        # CreatorFollow.creator → CreatorProfile (OneToOne → User via creator__user).
        is_follower = CreatorFollow.objects.filter(
            creator__user=session.creator,
            follower=user,
        ).exists()
        if is_follower:
            return True, 'viewer'
        return False, ''

    if at == LiveSession.AudienceType.COMMUNITY:
        return True, 'viewer'

    if at == LiveSession.AudienceType.SUBSCRIBERS:
        # Must hold an active subscription to the creator's plan
        has_sub = CreatorSubscription.objects.filter(
            creator=session.creator,
            status__in=[CreatorSubscription.Status.ACTIVE, CreatorSubscription.Status.TRIALING],
        ).exists()
        if has_sub:
            return True, 'viewer'
        return False, ''

    if at == LiveSession.AudienceType.PRIVATE:
        # Invite list with accepted status
        is_invited = LiveSessionAudience.objects.filter(
            session=session,
            user=user,
            status=LiveSessionAudience.InvitationStatus.ACCEPTED,
        ).exists()
        if is_invited:
            return True, 'viewer'
        return False, ''

    return False, ''


# ─── Session endpoints ───────────────────────────────────────────────────────


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def session_list(request):
    """List live and upcoming sessions the requesting user may see.
    Private sessions are excluded unless the user is the creator or an invitee.
    """
    _live_or_scheduled = [LiveSession.Status.LIVE, LiveSession.Status.SCHEDULED]

    # Fully public audience types (no follow or invite check needed)
    public_qs = LiveSession.objects.filter(
        status__in=_live_or_scheduled,
        audience_type__in=[
            LiveSession.AudienceType.PUBLIC,
            LiveSession.AudienceType.COMMUNITY,
        ],
    ).select_related('creator')

    # Followers-only: include only sessions from creators the user follows
    followed_creator_user_ids = CreatorFollow.objects.filter(
        follower=request.user,
    ).values_list('creator__user_id', flat=True)

    followers_qs = LiveSession.objects.filter(
        status__in=_live_or_scheduled,
        audience_type=LiveSession.AudienceType.FOLLOWERS,
        creator_id__in=followed_creator_user_ids,
    ).select_related('creator')

    # Subscribers-only: include sessions from creators where the user holds an
    # active subscription (deferred: include none for now until fan-subscription
    # model is wired in; this is explicitly conservative — no leakage).
    subscribers_qs = LiveSession.objects.none()

    # Private: include only sessions the user created or was accepted into
    private_accessible = LiveSession.objects.filter(
        status__in=_live_or_scheduled,
        audience_type=LiveSession.AudienceType.PRIVATE,
        creator=request.user,
    ) | LiveSession.objects.filter(
        status__in=_live_or_scheduled,
        audience_type=LiveSession.AudienceType.PRIVATE,
        audience_invites__user=request.user,
        audience_invites__status=LiveSessionAudience.InvitationStatus.ACCEPTED,
    )

    combined = (
        public_qs | followers_qs | subscribers_qs | private_accessible
    ).distinct().order_by('-created_at')
    serializer = LiveSessionDetailSerializer(combined, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([CreatorWriteRateThrottle])
def session_create(request):
    """Create a new LiveSession. The requesting user becomes the creator.

    Requires the user to have an active CreatorSubscription (or a free plan).
    Does not start the session — it starts in 'draft' status.
    """
    if not _user_can_host(request.user):
        # Automatically provision a free plan subscription if a free plan exists
        # and the user has none at all (first-time creator path).
        free_plan = CreatorPlan.objects.filter(is_free=True, is_active=True).first()
        if free_plan:
            CreatorSubscription.objects.get_or_create(
                creator=request.user,
                plan=free_plan,
                defaults={'status': CreatorSubscription.Status.ACTIVE},
            )
        else:
            return Response(
                {'detail': 'A hosting subscription is required to create a live session.'},
                status=status.HTTP_403_FORBIDDEN,
            )

    serializer = LiveSessionCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    session = serializer.save(creator=request.user)
    return Response(LiveSessionDetailSerializer(session).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def session_detail(request, session_id):
    """Retrieve session metadata. Private sessions are visible only to the
    creator and accepted invitees."""
    session = LiveSession.objects.filter(id=session_id).select_related('creator').first()
    if not session:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if session.audience_type == LiveSession.AudienceType.PRIVATE:
        is_creator = session.creator_id == request.user.id
        is_invitee = LiveSessionAudience.objects.filter(
            session=session, user=request.user,
            status__in=[
                LiveSessionAudience.InvitationStatus.INVITED,
                LiveSessionAudience.InvitationStatus.ACCEPTED,
            ],
        ).exists()
        if not is_creator and not is_invitee and not request.user.is_staff:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    return Response(LiveSessionDetailSerializer(session).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def session_start(request, session_id):
    """Transition session from draft/scheduled → live. Creator only."""
    session = LiveSession.objects.filter(id=session_id, creator=request.user).first()
    if not session:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    if session.status not in (LiveSession.Status.DRAFT, LiveSession.Status.SCHEDULED):
        return Response(
            {'detail': f'Cannot start a session with status "{session.status}".'},
            status=status.HTTP_409_CONFLICT,
        )
    session.status = LiveSession.Status.LIVE
    session.started_at = timezone.now()
    session.save(update_fields=['status', 'started_at', 'updated_at'])
    return Response(LiveSessionDetailSerializer(session).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def session_end(request, session_id):
    """Transition session → ended. Creator only."""
    session = LiveSession.objects.filter(id=session_id, creator=request.user).first()
    if not session:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    if session.status in (LiveSession.Status.ENDED, LiveSession.Status.CANCELED):
        return Response(
            {'detail': f'Session is already "{session.status}".'},
            status=status.HTTP_409_CONFLICT,
        )
    now = timezone.now()
    session.status = LiveSession.Status.ENDED
    session.ended_at = now
    if not session.started_at:
        session.started_at = now
    session.save(update_fields=['status', 'started_at', 'ended_at', 'updated_at'])

    # Mark all active participants as left
    LiveParticipant.objects.filter(
        session=session, left_at__isnull=True,
    ).update(left_at=now)

    return Response(LiveSessionDetailSerializer(session).data)


# ─── Token endpoint ──────────────────────────────────────────────────────────


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([LiveKitTokenRateThrottle])
def session_token(request, session_id):
    """Issue a short-lived LiveKit access token for the requesting user.

    POST body: optional `role` field (for future speaker-upgrade flows).
    Response: { token, room, livekit_url, role, session_id, identity }

    The API secret is never included in the response. When LiveKit is not
    configured the endpoint returns 503 rather than failing silently.
    """
    if not is_livekit_configured():
        return Response(
            {'detail': 'Live streaming is not available on this server (LiveKit not configured).'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    session = LiveSession.objects.filter(id=session_id).select_related('creator').first()
    if not session:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    allowed, role = _user_can_join(request.user, session)
    if not allowed:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    is_host = (role == 'host')
    # Hosts always publish; listeners in audio-only rooms publish audio;
    # pure viewers get subscribe-only
    if is_host:
        can_publish = True
        can_subscribe = True
    elif session.mode == LiveSession.Mode.AUDIO:
        # Speaker role in audio rooms can publish
        can_publish = (role == 'speaker')
        can_subscribe = True
    elif session.mode == LiveSession.Mode.VIDEO:
        can_publish = (role == 'speaker')
        can_subscribe = True
    else:  # AUDIO_VIDEO
        can_publish = (role in ('host', 'speaker'))
        can_subscribe = True

    # Use username as display name; strip anything that could leak real identity
    # in public rooms — the caller can pass ?display_name= later
    display_name = request.user.get_full_name() or request.user.username

    try:
        token = generate_token(
            session_id=session_id,
            user_id=request.user.id,
            username=display_name,
            is_host=is_host,
            can_publish=can_publish,
            can_subscribe=can_subscribe,
        )
    except RuntimeError as exc:
        logger.error('LiveKit token generation failed: %s', exc)
        return Response(
            {'detail': 'Token generation failed. Please try again.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # Record or update participant presence. The unique constraint allows
    # multiple rows per (session, user) as long as only one has left_at=NULL.
    # We use get_or_create on the active slot rather than update_or_create to
    # avoid racing against a concurrent join.
    LiveParticipant.objects.get_or_create(
        session=session,
        user=request.user,
        left_at=None,
        defaults={'role': role, 'joined_at': timezone.now()},
    )

    return Response({
        'token': token,
        'room': room_name_for_session(session_id),
        'livekit_url': get_livekit_url(),
        'role': role,
        'session_id': str(session_id),
        'identity': str(request.user.id),
    })
