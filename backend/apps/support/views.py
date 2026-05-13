from django.contrib.auth.models import User
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

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

    connected_ids = SupportConnection.objects.filter(
        Q(user_one=user) | Q(user_two=user),
        status=SupportConnection.STATUS_ACTIVE,
    ).values_list('user_one_id', 'user_two_id')

    excluded = {uid for pair in connected_ids for uid in pair}
    excluded.add(user.id)

    candidates = User.objects.exclude(id__in=excluded)

    if mode != "smart":
        return Response(UserSerializer(candidates, many=True).data)

    # ── Smart matching ──────────────────────────────────────────────────────
    # Get requester's personality vector
    try:
        my_profile = UserProfile.objects.get(user=user)
        my_vec = my_profile.personality_vector()
        has_my_profile = any(v != 0.5 for v in my_vec)
    except UserProfile.DoesNotExist:
        has_my_profile = False
        my_vec = [0.5, 0.5, 0.5, 0.5, 0.5]

    results = []
    for candidate in candidates:
        try:
            cp = UserProfile.objects.get(user=candidate)
            cv = cp.personality_vector()
            has_profile = any(v != 0.5 for v in cv)
        except UserProfile.DoesNotExist:
            cv = [0.5, 0.5, 0.5, 0.5, 0.5]
            has_profile = False

        if has_my_profile and has_profile:
            similarity = _cosine_similarity(my_vec, cv)
        else:
            similarity = 0.5  # neutral score when no data

        results.append({
            "id": candidate.id,
            "username": candidate.username,
            "match_score": round(similarity * 100),  # 0–100
            "has_profile": has_profile,
        })

    # Sort: users with profiles first, then by match score desc
    results.sort(key=lambda x: (-int(x["has_profile"]), -x["match_score"]))
    return Response(results)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def incoming_requests(request):
    reqs = SupportRequest.objects.filter(to_user=request.user, status=SupportRequest.PENDING)
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

    if SupportRequest.objects.filter(
        from_user=request.user, to_user=to_user, status=SupportRequest.PENDING
    ).exists():
        return Response({"detail": "Request already pending."}, status=status.HTTP_400_BAD_REQUEST)

    req = SupportRequest.objects.create(from_user=request.user, to_user=to_user)
    return Response(SupportRequestSerializer(req).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_request(request, request_id):
    try:
        req = SupportRequest.objects.get(id=request_id, to_user=request.user, status=SupportRequest.PENDING)
    except SupportRequest.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    req.status = SupportRequest.ACCEPTED
    req.responded_at = timezone.now()
    req.save()

    user_one = min(req.from_user, req.to_user, key=lambda u: u.id)
    user_two = max(req.from_user, req.to_user, key=lambda u: u.id)

    conn, _ = SupportConnection.objects.get_or_create(
        user_one=user_one,
        user_two=user_two,
        defaults={
            "alias_user_one": f"user_{user_one.id}",
            "alias_user_two": f"user_{user_two.id}",
        },
    )
    return Response(SupportConnectionSerializer(conn, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_request(request, request_id):
    try:
        req = SupportRequest.objects.get(id=request_id, to_user=request.user, status=SupportRequest.PENDING)
    except SupportRequest.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    req.status = SupportRequest.REJECTED
    req.responded_at = timezone.now()
    req.save()
    return Response({"detail": "Request rejected."})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def active_connections(request):
    user = request.user
    conns = SupportConnection.objects.filter(
        Q(user_one=user) | Q(user_two=user),
        status=SupportConnection.STATUS_ACTIVE,
    )
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
    reqs = SupportRequest.objects.filter(from_user=request.user, status=SupportRequest.PENDING)
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
