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
from .serializers import UserSerializer, SupportRequestSerializer, SupportConnectionSerializer, ActivityConsentSerializer


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
        Q(from_user=user) | Q(to_user=user), status=SupportRequest.PENDING,
        expires_at__gt=timezone.now(),
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
        to_user=request.user, status=SupportRequest.PENDING,
        expires_at__gt=timezone.now(),
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

    now = timezone.now()
    try:
        with transaction.atomic():
            # Free the unconditional unique slot (from_user, to_user, status) held
            # by an expired "pending" row for this pair (either direction). The
            # pending uniqueness constraint is unconditioned, so a stale row would
            # otherwise block any insert with IntegrityError.
            SupportRequest.objects.filter(
                Q(from_user=request.user, to_user=to_user) | Q(from_user=to_user, to_user=request.user),
                status=SupportRequest.PENDING,
                expires_at__lte=now,
            ).update(status=SupportRequest.EXPIRED)

            # Prevent duplicate non-expired pending requests in either direction.
            # select_for_update() is unnecessary: the row being checked does not
            # exist yet; the unique constraint serializes concurrent senders.
            if SupportRequest.objects.filter(
                Q(from_user=request.user, to_user=to_user) | Q(from_user=to_user, to_user=request.user),
                status=SupportRequest.PENDING,
                expires_at__gt=now,
            ).exists():
                return Response({"detail": "Request already pending."}, status=status.HTTP_400_BAD_REQUEST)

            req = SupportRequest.objects.create(from_user=request.user, to_user=to_user)
    except IntegrityError:
        # The atomic block rolled back and exited, so the transaction is closed
        # and no further DB access happens before the response below.
        return Response({"detail": "Request already pending."}, status=status.HTTP_400_BAD_REQUEST)

    return Response(SupportRequestSerializer(req).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def accept_request(request, request_id):
    try:
        req = SupportRequest.objects.select_for_update().get(
            id=request_id, to_user=request.user, status=SupportRequest.PENDING,
            expires_at__gt=timezone.now(),
        )
    except SupportRequest.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    # BLOCKED invariant, checked before ANY state mutation: accepting a request
    # must never undo a block, and no other path creates or reactivates
    # connections (verified: accept_request is the sole production creation site).
    if SupportConnection.objects.filter(
        Q(user_one=req.from_user_id, user_two=req.to_user_id)
        | Q(user_one=req.to_user_id, user_two=req.from_user_id),
        status=SupportConnection.STATUS_BLOCKED,
    ).exists():
        return Response({"detail": "Connection is blocked."}, status=status.HTTP_400_BAD_REQUEST)

    # The pending-uniqueness constraint is unconditioned on
    # (from_user, to_user, status), so only one ACCEPTED row may exist per pair.
    # A re-accept after disconnect would collide with the superseded ACCEPTED
    # row; close it as EXPIRED — the SupportConnection row itself remains the
    # source of truth for the active relationship.
    SupportRequest.objects.filter(
        Q(from_user=req.from_user_id, to_user=req.to_user_id)
        | Q(from_user=req.to_user_id, to_user=req.from_user_id),
        status=SupportRequest.ACCEPTED,
    ).exclude(pk=req.pk).update(status=SupportRequest.EXPIRED)

    req.status = SupportRequest.ACCEPTED
    req.responded_at = timezone.now()
    req.save()

    user_one = min(req.from_user, req.to_user, key=lambda u: u.id)
    user_two = max(req.from_user, req.to_user, key=lambda u: u.id)

    try:
        conn, created = SupportConnection.objects.get_or_create(
            user_one=user_one,
            user_two=user_two,
            defaults={
                "alias_user_one": f"user_{user_one.id}",
                "alias_user_two": f"user_{user_two.id}",
            },
        )
        if not created and conn.status == SupportConnection.STATUS_DISCONNECTED:
            # Both participants re-confirmed by accepting the new request;
            # restore the previously disconnected session. STATUS_BLOCKED can
            # never reach here: it is pre-empted above and send_request refuses
            # blocked pairs, so no save() happens on a blocked connection.
            conn.status = SupportConnection.STATUS_ACTIVE
            conn.disconnected_at = None
            conn.save(update_fields=["status", "disconnected_at"])
        return Response(SupportConnectionSerializer(conn, context={'request': request}).data)
    except IntegrityError:
        return Response({"detail": "Connection creation failed."}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def reject_request(request, request_id):
    try:
        req = SupportRequest.objects.select_for_update().get(
            id=request_id, to_user=request.user, status=SupportRequest.PENDING,
            expires_at__gt=timezone.now(),
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
        from_user=request.user, status=SupportRequest.PENDING,
        expires_at__gt=timezone.now(),
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
            "has_activity_consent": profile.has_activity_consent,
        })
    except UserProfile.DoesNotExist:
        return Response({
            "openness": 0.5, "conscientiousness": 0.5, "extraversion": 0.5,
            "agreeableness": 0.5, "neuroticism": 0.5, "dominant_emotion": "neutral",
            "updated_at": None, "has_data": False,
            "has_activity_consent": False,
        })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def activity_consent(request):
    """
    GET: Retrieve user's explicit consent state for AI personalized activities.
    POST: Update consent state ({"consent": true/false}).
    """
    profile, _ = UserProfile.objects.get_or_create(user=request.user)

    if request.method == 'POST':
        serializer = ActivityConsentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        if "consent" in request.data:
            consent = serializer.validated_data["consent"]
            profile.has_activity_consent = bool(consent)
            profile.activity_consent_at = timezone.now() if consent else None
            profile.save()

    return Response({
        "has_consent": profile.has_activity_consent,
        "consented_at": profile.activity_consent_at,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def connection_activity_status(request, connection_id):
    """
    Fetch activity status, active quiz, user completion, and comparison results for a connection.
    Enforces active mutual connection check.
    """
    try:
        conn = SupportConnection.objects.get(
            connection_id=connection_id,
            status=SupportConnection.STATUS_ACTIVE,
        )
    except SupportConnection.DoesNotExist:
        return Response({"detail": "Active connection not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.user not in (conn.user_one, conn.user_two):
        return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    level_info = conn.calculate_activity_score()
    unlocked = level_info["level"] >= 2

    # Fetch latest quiz
    from .models import ConnectionActivityQuiz
    quiz = ConnectionActivityQuiz.objects.filter(connection=conn).first()

    quiz_data = None
    if quiz:
        user_is_one = request.user.id == conn.user_one_id
        my_answers = quiz.user_one_answers if user_is_one else quiz.user_two_answers
        peer_answers = quiz.user_two_answers if user_is_one else quiz.user_one_answers

        quiz_data = {
            "quiz_id": str(quiz.quiz_id),
            "status": quiz.status,
            "questions": quiz.questions,
            "has_answered": quiz.is_completed_by(request.user),
            "is_fully_completed": quiz.is_fully_completed(),
            "my_answers": my_answers,
            "peer_answers": peer_answers if quiz.is_fully_completed() else {},
            "created_at": quiz.created_at,
        }

    return Response({
        "connection_id": str(conn.connection_id),
        "level_info": level_info,
        "unlocked": unlocked,
        "has_user_consent": profile.has_activity_consent,
        "quiz": quiz_data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_connection_activity(request, connection_id):
    """
    Generates a new AI positive-only guessing quiz for the connection pair.
    Requires Level >= 2 and user consent.
    """
    try:
        conn = SupportConnection.objects.get(
            connection_id=connection_id,
            status=SupportConnection.STATUS_ACTIVE,
        )
    except SupportConnection.DoesNotExist:
        return Response({"detail": "Active connection not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.user not in (conn.user_one, conn.user_two):
        return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if not profile.has_activity_consent:
        return Response(
            {"detail": "Explicit consent is required to generate personalized connection activities."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    level_info = conn.calculate_activity_score()
    if level_info["level"] < 2:
        return Response(
            {"detail": "Connection must reach Level 2 (Growing Companion) to unlock activities."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    from .services.quiz_generator import generate_activity_questions
    from .models import ConnectionActivityQuiz

    questions = generate_activity_questions(conn)

    quiz = ConnectionActivityQuiz.objects.create(
        connection=conn,
        creator=request.user,
        questions=questions,
    )

    return Response({
        "quiz_id": str(quiz.quiz_id),
        "status": quiz.status,
        "questions": quiz.questions,
        "has_answered": False,
        "is_fully_completed": False,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_connection_activity(request, connection_id):
    """
    Submits user guesses for an active quiz.
    Strictly validates that options chosen match pre-written positive choices.
    """
    try:
        conn = SupportConnection.objects.get(
            connection_id=connection_id,
            status=SupportConnection.STATUS_ACTIVE,
        )
    except SupportConnection.DoesNotExist:
        return Response({"detail": "Active connection not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.user not in (conn.user_one, conn.user_two):
        return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

    from .models import ConnectionActivityQuiz
    quiz_id = request.data.get("quiz_id")
    answers = request.data.get("answers", {})  # dict of {q_id: option_str}

    if not quiz_id or not isinstance(answers, dict):
        return Response({"detail": "Invalid submission format."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        quiz = ConnectionActivityQuiz.objects.get(quiz_id=quiz_id, connection=conn)
    except ConnectionActivityQuiz.DoesNotExist:
        return Response({"detail": "Quiz session not found."}, status=status.HTTP_404_NOT_FOUND)

    # Validate answers against pre-written options strictly (no free-text, positive-only)
    valid_q_map = {q["id"]: q["options"] for q in quiz.questions}
    sanitized_answers = {}

    for q_id, selected_opt in answers.items():
        if q_id in valid_q_map and selected_opt in valid_q_map[q_id]:
            sanitized_answers[q_id] = selected_opt

    if len(sanitized_answers) == 0:
        return Response({"detail": "Please select valid options."}, status=status.HTTP_400_BAD_REQUEST)

    user_is_one = request.user.id == conn.user_one_id
    if user_is_one:
        quiz.user_one_answers = sanitized_answers
        quiz.user_one_completed_at = timezone.now()
    else:
        quiz.user_two_answers = sanitized_answers
        quiz.user_two_completed_at = timezone.now()

    if quiz.is_fully_completed():
        quiz.status = ConnectionActivityQuiz.STATUS_COMPLETED

    quiz.save()

    return Response({
        "quiz_id": str(quiz.quiz_id),
        "status": quiz.status,
        "has_answered": True,
        "is_fully_completed": quiz.is_fully_completed(),
        "my_answers": sanitized_answers,
        "peer_answers": (quiz.user_two_answers if user_is_one else quiz.user_one_answers) if quiz.is_fully_completed() else {},
    })
