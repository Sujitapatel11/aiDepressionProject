import hashlib
import uuid
from datetime import datetime, time, timedelta
from decimal import Decimal

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Case, Count, Exists, ExpressionWrapper, F, IntegerField, OuterRef, Q, Sum, Value, When
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from config.throttles import CreatorEngagementRateThrottle, CreatorWithdrawalRateThrottle, CreatorWriteRateThrottle
from apps.mediahub.services import attach_media_assets, delete_assets_of, replace_creator_post_assets
from .creator_services import creator_balances
from .creator_serializers import (
    CreatorAdminProfileSerializer,
    CreatorCommentSerializer,
    CreatorPostSerializer,
    CreatorPostWriteSerializer,
    CreatorWithdrawalCreateSerializer,
    CreatorWithdrawalSerializer,
)
from .models import (
    CreatorAdminAuditLog,
    CreatorFollow,
    CreatorLedgerEntry,
    CreatorPost,
    CreatorPostBookmark,
    CreatorPostComment,
    CreatorPostLike,
    CreatorPostShare,
    CreatorPostView,
    CreatorProfile,
    CreatorSecuritySignal,
    CreatorWithdrawalRequest,
    PublicProfile,
)


class CreatorPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 50


class CreatorHomeFeedPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


def _creator_for_user(user, require_active=True):
    filters = {'user': user}
    if require_active:
        filters['is_active'] = True
    return get_object_or_404(CreatorProfile, **filters)


def _published_posts(user=None):
    """Published, non-deleted posts from active creators, newest first.

    When a user is supplied, viewer-specific follow/bookmark state is attached
    as indexed EXISTS subqueries (no joins, no N+1 access from rows).
    """
    queryset = CreatorPost.objects.filter(
        status=CreatorPost.Status.PUBLISHED,
        deleted_at__isnull=True,
        published_at__lte=timezone.now(),
        creator__is_active=True,
    ).select_related('creator').order_by('-published_at', '-created_at').annotate(
        likes_count=Count('likes', distinct=True),
        comments_count=Count('comments', filter=Q(comments__is_hidden=False), distinct=True),
        shares_count=Count('shares', distinct=True),
        views_count=Count('views', distinct=True),
    )
    if user is not None and user.is_authenticated:
        queryset = queryset.annotate(
            followed_by_viewer=Exists(
                CreatorFollow.objects.filter(creator=OuterRef('creator_id'), follower=user)
            ),
            bookmarked_by_viewer=Exists(
                CreatorPostBookmark.objects.filter(post=OuterRef('pk'), user=user)
            ),
        )
    return queryset


def _engagement_ranked(queryset, window_days):
    """Rank recent posts by a recency-bounded engagement score.

    Score = likes + 2*comments + 3*shares over the last `window_days` days,
    computed in SQL so pagination stays database-level.
    """
    since = timezone.now() - timedelta(days=window_days)
    return queryset.filter(published_at__gte=since).annotate(
        engagement_score=ExpressionWrapper(
            F('likes_count') + F('comments_count') * Value(2) + F('shares_count') * Value(3),
            output_field=IntegerField(),
        )
    ).order_by('-engagement_score', '-published_at', '-created_at')


def _record_signal(*, creator, kind, actor=None, post=None, evidence=''):
    recent = CreatorSecuritySignal.objects.filter(
        creator=creator, kind=kind, actor=actor, post=post,
        created_at__gte=timezone.now() - timedelta(hours=24),
    ).first()
    if recent:
        return recent
    evidence_hash = hashlib.sha256(evidence.encode('utf-8')).hexdigest() if evidence else ''
    return CreatorSecuritySignal.objects.create(
        creator=creator, kind=kind, actor=actor, post=post, evidence_hash=evidence_hash,
    )


def _date_range(request):
    start_text = request.query_params.get('start')
    end_text = request.query_params.get('end')
    start_date = parse_date(start_text) if start_text else None
    end_date = parse_date(end_text) if end_text else None
    if (start_text and not start_date) or (end_text and not end_date):
        return None, None, Response({'detail': 'Use ISO dates in YYYY-MM-DD format.'}, status=400)
    if start_date and end_date and end_date < start_date:
        return None, None, Response({'detail': 'The end date must not precede the start date.'}, status=400)
    if start_date and end_date and (end_date - start_date).days > 366:
        return None, None, Response({'detail': 'Date ranges are limited to 367 days.'}, status=400)
    start = timezone.make_aware(datetime.combine(start_date, time.min)) if start_date else None
    end = timezone.make_aware(datetime.combine(end_date + timedelta(days=1), time.min)) if end_date else None
    return start, end, None


def _within_range(queryset, field, start, end):
    if start:
        queryset = queryset.filter(**{f'{field}__gte': start})
    if end:
        queryset = queryset.filter(**{f'{field}__lt': end})
    return queryset


@api_view(['GET'])
@permission_classes([AllowAny])
def public_creator_feed(request):
    posts = _published_posts(request.user if request.user.is_authenticated else None)
    username = request.query_params.get('creator')
    if username:
        posts = posts.filter(creator__username__iexact=username)
    paginator = CreatorPagination()
    page = paginator.paginate_queryset(posts, request)
    return paginator.get_paginated_response(CreatorPostSerializer(page, many=True, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_creator_posts(request, username):
    profile = get_object_or_404(CreatorProfile, username__iexact=username, is_active=True)
    posts = _published_posts().filter(creator=profile)
    paginator = CreatorPagination()
    page = paginator.paginate_queryset(posts, request)
    return paginator.get_paginated_response(CreatorPostSerializer(page, many=True, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_creator_post_detail(request, post_id):
    post = get_object_or_404(
        _published_posts(request.user if request.user.is_authenticated else None), id=post_id
    )
    return Response(CreatorPostSerializer(post, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_creator_posts(request):
    creator = _creator_for_user(request.user, require_active=False)
    posts = CreatorPost.objects.filter(creator=creator, deleted_at__isnull=True).select_related('creator').order_by(
        '-published_at', '-created_at'
    ).annotate(
        likes_count=Count('likes', distinct=True),
        comments_count=Count('comments', filter=Q(comments__is_hidden=False), distinct=True),
        shares_count=Count('shares', distinct=True),
        views_count=Count('views', distinct=True),
    )
    paginator = CreatorPagination()
    page = paginator.paginate_queryset(posts, request)
    return paginator.get_paginated_response(CreatorPostSerializer(page, many=True, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def creator_feed_following(request):
    """Published posts from creators the requesting user follows (newest first)."""
    followed_creators = CreatorFollow.objects.filter(follower=request.user).values('creator')
    posts = _published_posts(request.user).filter(creator__in=followed_creators)
    paginator = CreatorPagination()
    page = paginator.paginate_queryset(posts, request)
    return paginator.get_paginated_response(CreatorPostSerializer(page, many=True, context={'request': request}).data)


FEED_TABS = ('for-you', 'following', 'trending', 'latest')


def _viewer_interests(user):
    """Lower-cased public interest labels of the viewer.

    Reads only PublicProfile.interests — user-editable public data. Personality
    scores and journal content are never consulted for feed ranking.
    """
    profile = getattr(user, 'public_profile', None)
    raw = profile.interests if profile else []
    if not isinstance(raw, list):
        return []
    return [str(item).strip().lower() for item in raw if str(item).strip()]


@api_view(['GET'])
@permission_classes([AllowAny])
def creator_home_feed(request, tab):
    """Paginated home feed for one tab: for-you, following, trending, latest."""
    if tab not in FEED_TABS:
        return Response({'detail': 'Unknown feed tab.'}, status=status.HTTP_404_NOT_FOUND)
    user = request.user if request.user.is_authenticated else None

    if tab == 'following':
        if not user:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
        posts = _published_posts(user).filter(
            creator__in=CreatorFollow.objects.filter(follower=user).values('creator')
        )
    elif tab == 'trending':
        posts = _engagement_ranked(_published_posts(user), window_days=14)
    elif tab == 'for-you':
        posts = _published_posts(user)
        interests = _viewer_interests(user) if user else []
        if interests:
            posts = posts.annotate(
                interest_match=Case(
                    When(category__in=interests, then=Value(1)),
                    default=Value(0),
                    output_field=IntegerField(),
                )
            ).annotate(
                engagement_score=ExpressionWrapper(
                    F('likes_count') + F('comments_count') * Value(2) + F('shares_count') * Value(3),
                    output_field=IntegerField(),
                )
            ).order_by('-interest_match', '-engagement_score', '-published_at', '-created_at')
        # Without interests: chronological discovery fallback (posts stay _published_posts-ordered).
    else:  # latest
        posts = _published_posts(user)

    paginator = CreatorHomeFeedPagination()
    page = paginator.paginate_queryset(posts, request)
    return paginator.get_paginated_response(CreatorPostSerializer(page, many=True, context={'request': request}).data)


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
@throttle_classes([CreatorEngagementRateThrottle])
def creator_post_bookmark(request, post_id):
    """Toggle the authenticated user's private bookmark on a published post."""
    post = get_object_or_404(_published_posts(), id=post_id)
    if request.method == 'DELETE':
        CreatorPostBookmark.objects.filter(post=post, user=request.user).delete()
        return Response({'bookmarked': False})
    _, created = CreatorPostBookmark.objects.get_or_create(post=post, user=request.user)
    return Response({'bookmarked': True, 'created': created}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_bookmarked_posts(request):
    """The requesting user's saved posts (published and not deleted). Bookmarks are private."""
    posts = _published_posts(request.user).filter(bookmarks__user=request.user)
    paginator = CreatorHomeFeedPagination()
    page = paginator.paginate_queryset(posts, request)
    return paginator.get_paginated_response(CreatorPostSerializer(page, many=True, context={'request': request}).data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@throttle_classes([CreatorWriteRateThrottle])
def delete_creator_comment(request, comment_id):
    """Author-initiated comment deletion. Moderators use the admin moderation endpoint."""
    comment = get_object_or_404(
        CreatorPostComment.objects.select_related('post__creator'), pk=comment_id
    )
    if comment.user_id != request.user.id:
        return Response({'detail': 'You can only delete your own comments.'}, status=status.HTTP_403_FORBIDDEN)
    comment.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([CreatorWriteRateThrottle])
def create_creator_post(request):
    creator = _creator_for_user(request.user)
    serializer = CreatorPostWriteSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    post = serializer.save(creator=creator)
    _attach_requested_assets(request, post)
    post = _published_posts().filter(id=post.id).first() or CreatorPost.objects.get(id=post.id)
    return Response(CreatorPostSerializer(post, context={'request': request}).data, status=status.HTTP_201_CREATED)


def _asset_ids_from_request(request):
    """Parse media_asset_ids; returns (list | None, error_response | None).
    None means the key was not supplied (no attachment intent)."""
    raw = request.data.get('media_asset_ids') if request else None
    if raw is None:
        return None, None
    if raw in ('', []):
        return [], None
    if not isinstance(raw, (list, tuple)):
        return None, Response({'media_asset_ids': ['Must be a list of upload asset IDs.']}, status=status.HTTP_400_BAD_REQUEST)
    ids = []
    for value in raw:
        try:
            ids.append(str(uuid.UUID(str(value))))
        except (ValueError, AttributeError, TypeError):
            return None, Response({'media_asset_ids': [f'"{value}" is not a valid asset ID.']}, status=status.HTTP_400_BAD_REQUEST)
    return ids, None


def _attach_requested_assets(request, post):
    ids, error = _asset_ids_from_request(request)
    if error:
        return error
    if ids is None:
        return None
    attach_media_assets(ids, request.user, creator_post=post)
    return None


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
@throttle_classes([CreatorWriteRateThrottle])
def edit_creator_post(request, post_id):
    creator = _creator_for_user(request.user)
    post = get_object_or_404(CreatorPost, id=post_id, creator=creator, deleted_at__isnull=True)
    serializer = CreatorPostWriteSerializer(post, data=request.data, partial=True, context={'request': request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    post = serializer.save()
    ids, error = _asset_ids_from_request(request)
    if error:
        return error
    if ids is not None:
        replace_creator_post_assets(post, ids, request.user)
    return Response(CreatorPostSerializer(post, context={'request': request}).data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@throttle_classes([CreatorWriteRateThrottle])
def delete_creator_post(request, post_id):
    creator = _creator_for_user(request.user, require_active=False)
    post = get_object_or_404(CreatorPost, id=post_id, creator=creator, deleted_at__isnull=True)
    post.deleted_at = timezone.now()
    post.status = CreatorPost.Status.DRAFT
    post.published_at = None
    post.save(update_fields=['deleted_at', 'status', 'published_at', 'updated_at'])
    # Deletion is terminal (no restore route): free the post's media files too.
    delete_assets_of(post.media_assets.all())
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([CreatorEngagementRateThrottle])
def record_creator_post_view(request, post_id):
    post = get_object_or_404(_published_posts(), id=post_id)
    if post.creator.user_id == request.user.id:
        _record_signal(creator=post.creator, post=post, actor=request.user, kind=CreatorSecuritySignal.Kind.SELF_ENGAGEMENT)
        return Response({'detail': 'Creator views are not counted.'}, status=status.HTTP_200_OK)
    _, created = CreatorPostView.objects.get_or_create(post=post, viewer=request.user)
    return Response({'recorded': created}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
@throttle_classes([CreatorEngagementRateThrottle])
def creator_post_like(request, post_id):
    post = get_object_or_404(_published_posts(), id=post_id)
    if post.creator.user_id == request.user.id:
        _record_signal(creator=post.creator, post=post, actor=request.user, kind=CreatorSecuritySignal.Kind.SELF_ENGAGEMENT)
        return Response({'detail': 'Creators cannot engage with their own post.'}, status=status.HTTP_400_BAD_REQUEST)
    if request.method == 'DELETE':
        CreatorPostLike.objects.filter(post=post, user=request.user).delete()
        return Response({'liked': False})
    _, created = CreatorPostLike.objects.get_or_create(post=post, user=request.user)
    return Response({'liked': True, 'created': created}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
@throttle_classes([CreatorEngagementRateThrottle])
def creator_post_comments(request, post_id):
    post = get_object_or_404(_published_posts(), id=post_id)
    if request.method == 'GET':
        comments = post.comments.filter(is_hidden=False).select_related('user').order_by('created_at')
        paginator = CreatorPagination()
        page = paginator.paginate_queryset(comments, request)
        return paginator.get_paginated_response(
            CreatorCommentSerializer(page, many=True, context={'request': request}).data
        )
    if not request.user.is_authenticated:
        return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
    if post.creator.user_id == request.user.id:
        _record_signal(creator=post.creator, post=post, actor=request.user, kind=CreatorSecuritySignal.Kind.SELF_ENGAGEMENT)
        return Response({'detail': 'Creators cannot comment on their own post.'}, status=status.HTTP_400_BAD_REQUEST)
    body = str(request.data.get('body', '')).strip()
    if not body or len(body) > 1000:
        return Response({'body': ['Comment must be between 1 and 1000 characters.']}, status=status.HTTP_400_BAD_REQUEST)
    duplicate = CreatorPostComment.objects.filter(
        post=post, user=request.user, body__iexact=body,
        created_at__gte=timezone.now() - timedelta(hours=24),
    ).exists()
    if duplicate:
        _record_signal(creator=post.creator, post=post, actor=request.user,
                       kind=CreatorSecuritySignal.Kind.DUPLICATE_COMMENT, evidence=body)
        return Response({'detail': 'Duplicate comments are not allowed.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    comment = CreatorPostComment.objects.create(post=post, user=request.user, body=body)
    return Response(CreatorCommentSerializer(comment).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([CreatorEngagementRateThrottle])
def creator_post_share(request, post_id):
    post = get_object_or_404(_published_posts(), id=post_id)
    if post.creator.user_id == request.user.id:
        _record_signal(creator=post.creator, post=post, actor=request.user, kind=CreatorSecuritySignal.Kind.SELF_ENGAGEMENT)
        return Response({'detail': 'Creator shares are not counted.'}, status=status.HTTP_400_BAD_REQUEST)
    _, created = CreatorPostShare.objects.get_or_create(post=post, user=request.user)
    return Response({'shared': True, 'created': created}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
@throttle_classes([CreatorEngagementRateThrottle])
def creator_follow(request, username):
    creator = get_object_or_404(CreatorProfile, username__iexact=username, is_active=True)
    if creator.user_id == request.user.id:
        _record_signal(creator=creator, actor=request.user, kind=CreatorSecuritySignal.Kind.SELF_ENGAGEMENT)
        return Response({'detail': 'Creators cannot follow themselves.'}, status=status.HTTP_400_BAD_REQUEST)
    if request.method == 'DELETE':
        CreatorFollow.objects.filter(creator=creator, follower=request.user).delete()
        return Response({'following': False})
    _, created = CreatorFollow.objects.get_or_create(creator=creator, follower=request.user)
    return Response({'following': True, 'created': created}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def creator_dashboard(request):
    creator = _creator_for_user(request.user, require_active=False)
    start, end, error = _date_range(request)
    if error:
        return error
    published = CreatorPost.objects.filter(creator=creator, status=CreatorPost.Status.PUBLISHED, deleted_at__isnull=True)
    ranged_posts = _within_range(published, 'published_at', start, end).order_by('-published_at', '-created_at')
    post_ids = ranged_posts.values('id')
    views = _within_range(CreatorPostView.objects.filter(post__in=post_ids), 'viewed_at', start, end).count()
    likes = _within_range(CreatorPostLike.objects.filter(post__in=post_ids), 'created_at', start, end).count()
    comments = _within_range(CreatorPostComment.objects.filter(post__in=post_ids, is_hidden=False), 'created_at', start, end).count()
    shares = _within_range(CreatorPostShare.objects.filter(post__in=post_ids), 'created_at', start, end).count()
    paginator = CreatorPagination()
    page = paginator.paginate_queryset(ranged_posts.select_related('creator').annotate(
        likes_count=Count('likes', distinct=True),
        comments_count=Count('comments', filter=Q(comments__is_hidden=False), distinct=True),
        shares_count=Count('shares', distinct=True),
        views_count=Count('views', distinct=True),
    ), request)
    return Response({
        'followers': creator.follows.count(),
        'total_posts': CreatorPost.objects.filter(creator=creator, deleted_at__isnull=True).count(),
        'published_posts': published.count(),
        'range': {'start': start.date().isoformat() if start else None,
                  'end': (end - timedelta(days=1)).date().isoformat() if end else None},
        'views': views, 'likes': likes, 'comments': comments, 'shares': shares,
        'engagements': likes + comments + shares,
        'post_analytics': CreatorPostSerializer(page, many=True, context={'request': request}).data,
        'earnings_available': False,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def creator_post_analytics(request, post_id):
    creator = _creator_for_user(request.user, require_active=False)
    post = get_object_or_404(CreatorPost, id=post_id, creator=creator, deleted_at__isnull=True)
    start, end, error = _date_range(request)
    if error:
        return error
    views = _within_range(post.views.all(), 'viewed_at', start, end).count()
    likes = _within_range(post.likes.all(), 'created_at', start, end).count()
    comments = _within_range(post.comments.filter(is_hidden=False), 'created_at', start, end).count()
    shares = _within_range(post.shares.all(), 'created_at', start, end).count()
    return Response({'post_id': str(post.id), 'views': views, 'likes': likes,
                     'comments': comments, 'shares': shares,
                     'engagements': likes + comments + shares})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def creator_earnings(request):
    creator = _creator_for_user(request.user, require_active=False)
    provider_configured = bool(settings.CREATOR_AD_REVENUE_PROVIDER_CONFIGURED)
    balances = creator_balances(creator) if provider_configured else {
        'pending': Decimal('0.00'), 'available': Decimal('0.00'), 'paid': Decimal('0.00'),
    }
    settlements = creator.monthly_settlements.all()[:24] if provider_configured else []
    return Response({
        'available': provider_configured,
        'unavailable_reason': '' if provider_configured else 'Verified advertising provider integration is not configured.',
        'currency': 'INR',
        'minimum_withdrawal': str(settings.CREATOR_MINIMUM_WITHDRAWAL),
        'balances': {key: str(value) for key, value in balances.items()},
        'settlements': [
            {'month': row.month.isoformat(), 'net_amount': str(row.net_amount),
             'creator_amount': str(row.creator_amount), 'platform_amount': str(row.platform_amount),
             'status': row.status, 'payment_reference': row.payment_reference}
            for row in settlements
        ],
        'withdrawals': CreatorWithdrawalSerializer(creator.withdrawals.all()[:25], many=True).data,
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([CreatorWithdrawalRateThrottle])
def creator_withdrawals(request):
    creator = _creator_for_user(request.user, require_active=False)
    if request.method == 'GET':
        return Response(CreatorWithdrawalSerializer(creator.withdrawals.all()[:50], many=True).data)
    if not settings.CREATOR_AD_REVENUE_PROVIDER_CONFIGURED:
        return Response({'detail': 'Withdrawals are unavailable until verified advertising revenue is integrated.'}, status=503)
    serializer = CreatorWithdrawalCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    amount = serializer.validated_data['amount']
    minimum = Decimal(str(settings.CREATOR_MINIMUM_WITHDRAWAL))
    if amount < minimum:
        return Response({'amount': [f'Minimum withdrawal is {minimum:.2f} INR.']}, status=status.HTTP_400_BAD_REQUEST)
    try:
        with transaction.atomic():
            CreatorProfile.objects.select_for_update().get(pk=creator.pk)
            key = serializer.validated_data['request_key']
            existing = CreatorWithdrawalRequest.objects.filter(creator=creator, request_key=key).first()
            if existing:
                return Response(CreatorWithdrawalSerializer(existing).data, status=status.HTTP_200_OK)
            balances = creator_balances(creator)
            if amount > balances['available']:
                return Response({'amount': ['Withdrawal exceeds your available balance.']}, status=status.HTTP_400_BAD_REQUEST)
            withdrawal = CreatorWithdrawalRequest.objects.create(creator=creator, request_key=key, amount=amount)
    except IntegrityError:
        existing = CreatorWithdrawalRequest.objects.filter(
            creator=creator, request_key=serializer.validated_data['request_key']
        ).first()
        if existing:
            return Response(CreatorWithdrawalSerializer(existing).data, status=status.HTTP_200_OK)
        raise
    return Response(CreatorWithdrawalSerializer(withdrawal).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_creator_profiles(request):
    queryset = CreatorProfile.objects.annotate(
        post_count=Count('posts', filter=Q(posts__deleted_at__isnull=True), distinct=True),
        follower_count=Count('follows', distinct=True),
    ).order_by('username')
    paginator = CreatorPagination()
    page = paginator.paginate_queryset(queryset, request)
    return paginator.get_paginated_response(CreatorAdminProfileSerializer(page, many=True).data)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def admin_update_creator_profile(request, profile_id):
    profile = get_object_or_404(CreatorProfile, pk=profile_id)
    if profile.user_id == request.user.id:
        return Response({'detail': 'Staff cannot review or restrict their own creator profile.'}, status=403)
    reason = str(request.data.get('reason', '')).strip()
    allowed = {'is_active', 'monetization_status'}
    if not reason:
        return Response({'reason': ['A review reason is required.']}, status=400)
    if not set(request.data.keys()).intersection(allowed) or set(request.data.keys()) - allowed - {'reason'}:
        return Response({'detail': 'Only is_active and monetization_status may be changed.'}, status=400)
    before = {'is_active': profile.is_active, 'monetization_status': profile.monetization_status}
    if 'is_active' in request.data:
        if not isinstance(request.data['is_active'], bool):
            return Response({'is_active': ['Expected a boolean.']}, status=400)
        profile.is_active = request.data['is_active']
    if 'monetization_status' in request.data:
        if request.data['monetization_status'] not in CreatorProfile.MonetizationStatus.values:
            return Response({'monetization_status': ['Invalid status.']}, status=400)
        if (
            request.data['monetization_status'] == CreatorProfile.MonetizationStatus.ELIGIBLE
            and not settings.CREATOR_AD_REVENUE_PROVIDER_CONFIGURED
        ):
            return Response(
                {'monetization_status': ['Eligibility is unavailable until verified advertising is integrated.']},
                status=409,
            )
        profile.monetization_status = request.data['monetization_status']
    with transaction.atomic():
        profile.save(update_fields=['is_active', 'monetization_status', 'updated_at'])
        CreatorAdminAuditLog.objects.create(
            actor=request.user, creator=profile, action='profile_update', target_type='creator_profile',
            target_id=str(profile.pk), reason=reason,
            metadata={'before': before, 'after': {'is_active': profile.is_active, 'monetization_status': profile.monetization_status}},
        )
    return Response(CreatorAdminProfileSerializer(profile).data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_creator_withdrawals(request):
    queryset = CreatorWithdrawalRequest.objects.select_related('creator', 'creator__user').order_by('-created_at')
    paginator = CreatorPagination()
    page = paginator.paginate_queryset(queryset, request)
    return paginator.get_paginated_response(CreatorWithdrawalSerializer(page, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_review_withdrawal(request, withdrawal_id):
    action = str(request.data.get('action', '')).strip()
    reason = str(request.data.get('reason', '')).strip()
    reference = str(request.data.get('payment_reference', '')).strip()
    if action not in {'approve', 'reject', 'paid'} or not reason:
        return Response({'detail': 'Valid action and review reason are required.'}, status=400)
    if action == 'paid' and not reference:
        return Response({'payment_reference': ['A payment reference is required.']}, status=400)
    with transaction.atomic():
        withdrawal = get_object_or_404(
            CreatorWithdrawalRequest.objects.select_for_update().select_related('creator'), pk=withdrawal_id
        )
        CreatorProfile.objects.select_for_update().get(pk=withdrawal.creator_id)
        if withdrawal.creator.user_id == request.user.id:
            return Response({'detail': 'Staff cannot approve or change their own withdrawal.'}, status=403)
        if action in {'approve', 'reject'} and withdrawal.status != CreatorWithdrawalRequest.Status.PENDING:
            return Response({'detail': 'Only pending withdrawals can be reviewed.'}, status=409)
        if action == 'paid' and withdrawal.status != CreatorWithdrawalRequest.Status.APPROVED:
            return Response({'detail': 'Only approved withdrawals can be marked paid.'}, status=409)
        if action == 'approve':
            eligible_total = CreatorLedgerEntry.objects.filter(
                creator=withdrawal.creator,
                eligible_at__lte=timezone.now(),
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            committed_elsewhere = CreatorWithdrawalRequest.objects.filter(
                creator=withdrawal.creator,
                status__in=[
                    CreatorWithdrawalRequest.Status.PENDING,
                    CreatorWithdrawalRequest.Status.APPROVED,
                    CreatorWithdrawalRequest.Status.PAID,
                ],
            ).exclude(pk=withdrawal.pk).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            if withdrawal.amount > eligible_total - committed_elsewhere:
                return Response({'detail': 'Available ledger balance no longer covers this withdrawal.'}, status=409)
            withdrawal.status = CreatorWithdrawalRequest.Status.APPROVED
        elif action == 'reject':
            withdrawal.status = CreatorWithdrawalRequest.Status.REJECTED
        else:
            withdrawal.status = CreatorWithdrawalRequest.Status.PAID
            withdrawal.payment_reference = reference[:160]
            withdrawal.paid_at = timezone.now()
        withdrawal.reviewed_by = request.user
        withdrawal.reviewed_at = timezone.now()
        withdrawal.review_note = reason[:500]
        withdrawal.save(update_fields=[
            'status', 'payment_reference', 'paid_at', 'reviewed_by', 'reviewed_at', 'review_note'
        ])
        CreatorAdminAuditLog.objects.create(
            actor=request.user, creator=withdrawal.creator, action=f'withdrawal_{action}',
            target_type='withdrawal', target_id=str(withdrawal.pk), reason=reason[:500],
            metadata={'amount': str(withdrawal.amount), 'payment_reference': reference[:160] if action == 'paid' else ''},
        )
    return Response(CreatorWithdrawalSerializer(withdrawal).data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_creator_signals(request):
    signals = CreatorSecuritySignal.objects.select_related('creator', 'actor', 'post').order_by('-created_at')
    paginator = CreatorPagination()
    page = paginator.paginate_queryset(signals, request)
    data = [{
        'id': signal.pk,
        'creator_username': signal.creator.username,
        'post_id': str(signal.post_id) if signal.post_id else None,
        'kind': signal.kind,
        'status': signal.status,
        'evidence_hash': signal.evidence_hash,
        'created_at': signal.created_at,
    } for signal in page]
    return paginator.get_paginated_response(data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_review_creator_signal(request, signal_id):
    signal = get_object_or_404(CreatorSecuritySignal, pk=signal_id)
    if signal.creator.user_id == request.user.id:
        return Response({'detail': 'Staff cannot review their own creator signal.'}, status=403)
    next_status = request.data.get('status')
    reason = str(request.data.get('reason', '')).strip()
    if next_status not in {CreatorSecuritySignal.Status.REVIEWED, CreatorSecuritySignal.Status.ACTIONED} or not reason:
        return Response({'detail': 'A review status and reason are required.'}, status=400)
    with transaction.atomic():
        signal.status = next_status
        signal.reviewed_by = request.user
        signal.reviewed_at = timezone.now()
        signal.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])
        CreatorAdminAuditLog.objects.create(
            actor=request.user, creator=signal.creator, action='security_signal_review',
            target_type='security_signal', target_id=str(signal.pk), reason=reason[:500],
            metadata={'status': next_status, 'kind': signal.kind},
        )
    return Response({'id': signal.pk, 'status': signal.status})


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def admin_moderate_creator_comment(request, comment_id):
    comment = get_object_or_404(CreatorPostComment.objects.select_related('post__creator'), pk=comment_id)
    creator = comment.post.creator
    if creator.user_id == request.user.id:
        return Response({'detail': 'Staff cannot moderate their own creator content.'}, status=403)
    hidden = request.data.get('is_hidden')
    reason = str(request.data.get('reason', '')).strip()
    if not isinstance(hidden, bool) or not reason:
        return Response({'detail': 'Boolean is_hidden and a reason are required.'}, status=400)
    with transaction.atomic():
        comment.is_hidden = hidden
        comment.moderated_by = request.user
        comment.moderated_at = timezone.now()
        comment.save(update_fields=['is_hidden', 'moderated_by', 'moderated_at'])
        CreatorAdminAuditLog.objects.create(
            actor=request.user, creator=creator, action='comment_moderation', target_type='comment',
            target_id=str(comment.pk), reason=reason[:500], metadata={'is_hidden': hidden},
        )
    return Response({'id': comment.pk, 'is_hidden': comment.is_hidden})
