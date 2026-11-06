import uuid

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction

from apps.mediahub.services import MediaAttachmentError, attach_media_assets_strict
from config.throttles import CommunityPostRateThrottle
from apps.insights.engine import detect_crisis_keywords
from .models import CommunityPost, PostReport, PostReaction, generate_anonymous_alias
from .serializers import CommunityPostSerializer, PostReportSerializer


from rest_framework.pagination import PageNumberPagination


class CommunityPostPagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 50


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_posts(request):
    """
    List active, non-hidden public community posts (paginated).
    """
    posts = (
        CommunityPost.objects.filter(is_hidden=False)
        .prefetch_related("reactions", "reports", "media_assets")
        .order_by("-created_at")
    )
    paginator = CommunityPostPagination()
    page = paginator.paginate_queryset(posts, request)
    if page is not None:
        serializer = CommunityPostSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)

    serializer = CommunityPostSerializer(posts, many=True, context={"request": request})
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([CommunityPostRateThrottle])
def create_post(request):
    """
    Create an anonymous community journal post.
    - Uses fully separate, unlinkable random handle per post.
    - Applies rate limiting (10 posts/day).
    - Runs crisis keyword detection & attaches India/Nepal helplines if detected.
    """
    content = str(request.data.get("content", "")).strip()
    if not content:
        return Response({"detail": "Post content cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)
    if len(content) > 2000:
        return Response({"detail": "Post content is too long (max 2000 characters)."}, status=status.HTTP_400_BAD_REQUEST)

    raw_assets = request.data.get("media_asset_ids")
    if raw_assets in (None, ""):
        asset_ids = None
    elif isinstance(raw_assets, (list, tuple)):
        asset_ids = []
        for value in raw_assets:
            try:
                asset_ids.append(str(uuid.UUID(str(value))))
            except (ValueError, AttributeError, TypeError):
                return Response({"media_asset_ids": [f'"{value}" is not a valid asset ID.']},
                                status=status.HTTP_400_BAD_REQUEST)
    else:
        return Response({"media_asset_ids": ["Must be a list of upload asset IDs."]},
                        status=status.HTTP_400_BAD_REQUEST)
    if asset_ids and len(asset_ids) > settings.MEDIA_MAX_FILES_PER_UPLOAD:
        return Response({"media_asset_ids": [f"At most {settings.MEDIA_MAX_FILES_PER_UPLOAD} media per post."]},
                        status=status.HTTP_400_BAD_REQUEST)

    has_crisis, crisis_note = detect_crisis_keywords(content)

    post = CommunityPost.objects.create(
        user=request.user,
        content=content,
        author_alias=generate_anonymous_alias(),
        has_crisis_resources=has_crisis,
        crisis_resource_note=crisis_note if has_crisis else "",
    )

    if asset_ids:
        try:
            attach_media_assets_strict(asset_ids, request.user, community_post=post)
        except MediaAttachmentError as exc:
            post.delete()
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)

    serializer = CommunityPostSerializer(post, context={"request": request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def report_post(request, post_id):
    """
    Report a community post with a reason category.
    Auto-hides post once it reaches 3 reports pending admin review.
    """
    post = get_object_or_404(CommunityPost, id=post_id)

    serializer = PostReportSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    reason = serializer.validated_data.get("reason", "other")
    details = serializer.validated_data.get("details", "")

    report, created = PostReport.objects.get_or_create(
        post=post,
        reporter=request.user,
        defaults={"reason": reason, "details": details},
    )

    if not created:
        return Response({"detail": "You have already reported this post."}, status=status.HTTP_400_BAD_REQUEST)

    post.report_count = PostReport.objects.filter(post=post).count()
    post.save(update_fields=["report_count"])

    # Mandatory Safety Primitive: Auto-hide post if report count >= 3
    post.check_and_auto_hide(threshold=3)

    return Response({
        "detail": "Thank you. Post has been reported for safety review.",
        "is_hidden": post.is_hidden,
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def react_to_post(request, post_id):
    """
    Toggle a supportive reaction (here_for_you, sending_strength, listening).
    """
    post = get_object_or_404(CommunityPost, id=post_id, is_hidden=False)
    reaction_type = str(request.data.get("reaction_type", "")).strip()

    valid_types = [c[0] for c in PostReaction.REACTION_CHOICES]
    if reaction_type not in valid_types:
        return Response({"detail": f"Invalid reaction_type. Choose from: {valid_types}"}, status=status.HTTP_400_BAD_REQUEST)

    existing = PostReaction.objects.filter(post=post, user=request.user, reaction_type=reaction_type)
    if existing.exists():
        existing.delete()
        action = "removed"
    else:
        PostReaction.objects.create(post=post, user=request.user, reaction_type=reaction_type)
        action = "added"

    # Return refreshed post data
    updated_post = CommunityPost.objects.prefetch_related("reactions", "reports").get(id=post.id)
    serializer = CommunityPostSerializer(updated_post, context={"request": request})
    return Response({"action": action, "post": serializer.data})
