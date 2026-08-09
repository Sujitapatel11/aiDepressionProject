from datetime import timedelta
from django.contrib.auth.models import User
from django.db import transaction, IntegrityError
from django.db.models import Q, Max, Subquery, OuterRef
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.chat.models import Message
from .models import SupportRequest, SupportConnection, UserProfile
from .serializers import UserSerializer, SupportRequestSerializer, SupportConnectionSerializer


def _cosine_similarity(a: list, b: list) -> float:
    """Cosine similarity between two equal-length vectors."""
    try:
        import math
        dot = sum(x * y for x, y in zip(a, b))
        mag_a = math.sqrt(sum(x ** 2 for x in a))
        mag_b = math.sqrt(sum(x ** 2 for x in b))
        if mag_a == 0 or mag_b == 0:
            return 0.0
        return round(dot / (mag_a * mag_b), 4)
    except Exception:
        return 0.0


def _derive_interest_tags(cp):
    """
    Derive 2-4 colorful icon interest/habit tags based on Big Five scores & dominant emotion.
    Reuses journal analysis signals without modifying matching scoring.
    """
    if not cp:
        return ["🌸 Kind Listener", "🛡️ Safe Companion", "💬 Peer Support"]

    tags = []
    # Openness (Intellectual & Creative curiosity)
    if cp.openness >= 0.6:
        tags.append("🎨 Creative")
        tags.append("📚 Reader")
    elif cp.openness <= 0.4:
        tags.append("🌱 Grounded")

    # Conscientiousness (Organization & Habits)
    if cp.conscientiousness >= 0.6:
        tags.append("🎯 Focused")
        tags.append("🌅 Early Riser")
    elif cp.conscientiousness <= 0.4:
        tags.append("🌊 Easygoing")

    # Extraversion (Social & Energy)
    if cp.extraversion >= 0.6:
        tags.append("🏃 Active")
        tags.append("⚡ Energetic")
    elif cp.extraversion <= 0.4:
        tags.append("🌙 Night Owl")

    # Agreeableness (Empathy & Support)
    if cp.agreeableness >= 0.55:
        tags.append("🌸 Kind Listener")
        tags.append("💖 Empathetic")

    # Neuroticism / Dominant Emotion
    if cp.neuroticism <= 0.45 or cp.dominant_emotion in ["calm", "hopeful"]:
        tags.append("🧘 Mindful")

    if not tags:
        tags = ["🌸 Kind Listener", "🛡️ Safe Companion", "💬 Peer Support"]

    # Deduplicate and return top 3-4 tags
    unique_tags = list(dict.fromkeys(tags))
    return unique_tags[:4]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def available_users(request):
    """
    Smart matching: returns users ranked by Big Five personality compatibility.
    Falls back to alphabetical if no personality data exists.
    Query params:
      ?mode=smart   (default) — ranked by cosine similarity of Big Five vectors
      ?mode=all     — unranked list (original behaviour)
    """
    user = request.user
    mode = request.query_params.get("mode", "smart")

    connected_q = Q(user_one=user) | Q(user_two=user)
    active_or_blocked = SupportConnection.objects.filter(
        connected_q, status__in=[SupportConnection.STATUS_ACTIVE, SupportConnection.STATUS_BLOCKED]
    )
    pending_reqs = SupportRequest.objects.filter(
        Q(from_user=user) | Q(to_user=user), status=SupportRequest.PENDING
    )

    candidates = User.objects.filter(is_active=True).exclude(
        Q(id=user.id) |
        Q(id__in=Subquery(active_or_blocked.values('user_one_id'))) |
        Q(id__in=Subquery(active_or_blocked.values('user_two_id'))) |
        Q(id__in=Subquery(pending_reqs.values('from_user_id'))) |
        Q(id__in=Subquery(pending_reqs.values('to_user_id')))
    ).select_related('user_identity', 'auth_profile')

    from .serializers import UserSerializer, SupportRequestSerializer, SupportConnectionSerializer, AnonymousUserSerializer

    if mode != "smart":
        return Response(AnonymousUserSerializer(candidates, many=True).data)

    # ── Smart matching ──────────────────────────────────────────────────────
    try:
        my_profile = UserProfile.objects.get(user=user)
        my_vec = my_profile.personality_vector()
        has_my_profile = any(v != 0.5 for v in my_vec)
    except UserProfile.DoesNotExist:
        has_my_profile = False
        my_vec = [0.5, 0.5, 0.5, 0.5, 0.5]

    candidate_profiles = {
        p.user_id: p for p in UserProfile.objects.filter(user__in=candidates)
    }

    from apps.identity.services.identity_service import IdentityService
    seven_days_ago = timezone.now() - timedelta(days=7)
    results = []
    for candidate in candidates:
        cp = candidate_profiles.get(candidate.id)
        if cp:
            cv = cp.personality_vector()
            has_profile = any(v != 0.5 for v in cv)
        else:
            cv = [0.5, 0.5, 0.5, 0.5, 0.5]
            has_profile = False

        if has_my_profile and has_profile:
            similarity = _cosine_similarity(my_vec, cv)
        else:
            similarity = 0.5  # neutral score when no data

        if has_profile:
            tier = 1
        elif candidate.date_joined and candidate.date_joined >= seven_days_ago:
            tier = 2
        else:
            tier = 3

        avatar_url = None
        try:
            avatar_url = IdentityService.resolve_avatar_url(candidate)
        except Exception:
            pass

        interest_tags = _derive_interest_tags(cp)

        results.append({
            "id": candidate.id,
            "username": f"Companion #{candidate.id:04d}",
            "display_name": f"Companion #{candidate.id:04d}",
            "avatar_url": avatar_url,
            "match_score": round(similarity * 100),  # 0–100
            "has_profile": has_profile,
            "my_profile_ready": has_my_profile,
            "interest_tags": interest_tags,
            "_tier": tier,
            "_last_login": candidate.last_login.timestamp() if candidate.last_login else 0.0,
        })

    # Sort: Tier 1 (profiled) -> Tier 2 (new <= 7d) -> Tier 3 (older unprofiled), then match score desc, then recent activity desc
    results.sort(key=lambda x: (x["_tier"], -x["match_score"], -x["_last_login"]))
    for item in results:
        item.pop("_tier", None)
        item.pop("_last_login", None)
    return Response(results)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def incoming_requests(request):
    reqs = SupportRequest.objects.filter(
        to_user=request.user, status=SupportRequest.PENDING
    ).select_related('from_user', 'to_user')
    return Response(SupportRequestSerializer(reqs, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_request(request, user_id):
    if user_id == request.user.id:
        return Response({"detail": "Cannot send request to yourself."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        to_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    # Prevent requests if an active or blocked connection already exists
    if SupportConnection.objects.filter(
        Q(user_one=request.user, user_two=to_user) | Q(user_one=to_user, user_two=request.user),
        status__in=[SupportConnection.STATUS_ACTIVE, SupportConnection.STATUS_BLOCKED]
    ).exists():
        return Response({"detail": "Cannot send request to this user."}, status=status.HTTP_400_BAD_REQUEST)

    # Prevent duplicate pending requests in either direction
    if SupportRequest.objects.filter(
        Q(from_user=request.user, to_user=to_user) | Q(from_user=to_user, to_user=request.user),
        status=SupportRequest.PENDING
    ).exists():
        return Response({"detail": "Request already pending."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        req = SupportRequest.objects.create(from_user=request.user, to_user=to_user)
        return Response(SupportRequestSerializer(req).data, status=status.HTTP_201_CREATED)
    except IntegrityError:
        return Response({"detail": "Request already pending."}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def accept_request(request, request_id):
    try:
        req = SupportRequest.objects.select_for_update().get(
            id=request_id, to_user=request.user, status=SupportRequest.PENDING
        )
    except SupportRequest.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    req.status = SupportRequest.ACCEPTED
    req.responded_at = timezone.now()
    req.save()

    user_one = min(req.from_user, req.to_user, key=lambda u: u.id)
    user_two = max(req.from_user, req.to_user, key=lambda u: u.id)

    try:
        conn, _ = SupportConnection.objects.get_or_create(
            user_one=user_one,
            user_two=user_two,
            defaults={
                "alias_user_one": f"user_{user_one.id}",
                "alias_user_two": f"user_{user_two.id}",
            },
        )
        return Response(SupportConnectionSerializer(conn, context={'request': request}).data)
    except IntegrityError:
        return Response({"detail": "Connection creation failed."}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def reject_request(request, request_id):
    try:
        req = SupportRequest.objects.select_for_update().get(
            id=request_id, to_user=request.user, status=SupportRequest.PENDING
        )
    except SupportRequest.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    req.status = SupportRequest.REJECTED
    req.responded_at = timezone.now()
    req.save()
    return Response({"detail": "Request rejected."})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_request(request, request_id):
    try:
        req = SupportRequest.objects.get(
            id=request_id, from_user=request.user, status=SupportRequest.PENDING
        )
    except SupportRequest.DoesNotExist:
        return Response({"detail": "Pending request not found."}, status=status.HTTP_404_NOT_FOUND)

    req.delete()
    return Response({"detail": "Request cancelled successfully."})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def active_connections(request):
    user = request.user
    latest_msg = Message.objects.filter(connection=OuterRef('pk')).order_by('-created_at')

    conns = SupportConnection.objects.filter(
        Q(user_one=user) | Q(user_two=user),
        status=SupportConnection.STATUS_ACTIVE,
    ).annotate(
        latest_activity=Coalesce(Max('messages__created_at'), 'created_at'),
        last_message_content=Subquery(latest_msg.values('content')[:1]),
        last_message_created_at=Subquery(latest_msg.values('created_at')[:1]),
        last_message_sender_id=Subquery(latest_msg.values('sender_id')[:1]),
    ).order_by('-latest_activity', '-created_at').select_related('user_one', 'user_two')

    return Response(SupportConnectionSerializer(conns, many=True, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def block_connection(request, connection_id):
    try:
        conn = SupportConnection.objects.get(
            connection_id=connection_id,
            status=SupportConnection.STATUS_ACTIVE,
        )
    except SupportConnection.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.user not in (conn.user_one, conn.user_two):
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    conn.status = SupportConnection.STATUS_BLOCKED
    conn.blocked_by = request.user
    conn.blocked_at = timezone.now()
    conn.save()
    return Response({"detail": "User blocked."})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def disconnect_connection(request, connection_id):
    try:
        conn = SupportConnection.objects.get(
            connection_id=connection_id,
            status=SupportConnection.STATUS_ACTIVE,
        )
    except SupportConnection.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.user not in (conn.user_one, conn.user_two):
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    conn.status = SupportConnection.STATUS_DISCONNECTED
    conn.disconnected_at = timezone.now()
    conn.save()
    return Response({"detail": "Disconnected."})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sent_requests(request):
    reqs = SupportRequest.objects.filter(
        from_user=request.user, status=SupportRequest.PENDING
    ).select_related('from_user', 'to_user')
    return Response(SupportRequestSerializer(reqs, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_personality(request):
    """Return the current user's Big Five personality profile."""
    try:
        profile = UserProfile.objects.get(user=request.user)
        return Response({
            "openness":          profile.openness,
            "conscientiousness": profile.conscientiousness,
            "extraversion":      profile.extraversion,
            "agreeableness":     profile.agreeableness,
            "neuroticism":       profile.neuroticism,
            "dominant_emotion":  profile.dominant_emotion,
            "updated_at":        profile.updated_at,
            "has_data": any(v != 0.5 for v in profile.personality_vector()),
        })
    except UserProfile.DoesNotExist:
        return Response({
            "openness": 0.5, "conscientiousness": 0.5, "extraversion": 0.5,
            "agreeableness": 0.5, "neuroticism": 0.5, "dominant_emotion": "neutral",
            "updated_at": None, "has_data": False,
        })
