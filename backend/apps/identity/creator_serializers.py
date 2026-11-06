import re
from decimal import Decimal
from urllib.parse import urlparse

from django.utils import timezone
from rest_framework import serializers

from .models import (
    CreatorPost,
    CreatorPostComment,
    CreatorProfile,
    CreatorWithdrawalRequest,
)


class CreatorPostWriteSerializer(serializers.ModelSerializer):
    hashtags = serializers.ListField(
        child=serializers.CharField(max_length=30), required=False, default=list, max_length=20
    )
    caption = serializers.CharField(required=False, allow_blank=True, max_length=5000)
    media_url = serializers.URLField(required=False, allow_blank=True, max_length=1024)

    class Meta:
        model = CreatorPost
        fields = ['content_type', 'caption', 'media_url', 'hashtags', 'category', 'status']

    def validate_hashtags(self, values):
        normalized = []
        for value in values:
            tag = value.strip().lstrip('#').lower()
            if not re.fullmatch(r'[a-z0-9_]{1,30}', tag):
                raise serializers.ValidationError('Hashtags may contain only letters, numbers, and underscores.')
            if tag not in normalized:
                normalized.append(tag)
        return normalized

    def validate_category(self, value):
        value = (value or '').strip().lower()
        if value and not re.fullmatch(r'[a-z0-9_-]{1,48}', value):
            raise serializers.ValidationError('Category may contain only letters, numbers, hyphens, and underscores.')
        return value

    def validate_media_url(self, value):
        if value and urlparse(value).scheme.lower() != 'https':
            raise serializers.ValidationError('Media URLs must use HTTPS.')
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        attached_ids = (request.data.get('media_asset_ids') if request else None) or []
        has_new_assets = bool(attached_ids)
        has_instance_assets = bool(self.instance and self.instance.media_assets.exists())
        current_type = attrs.get('content_type', getattr(self.instance, 'content_type', CreatorPost.ContentType.TEXT))
        current_media = attrs.get('media_url', getattr(self.instance, 'media_url', ''))
        caption = attrs.get('caption', getattr(self.instance, 'caption', ''))
        has_media = bool(current_media or has_new_assets or has_instance_assets)
        if current_type in {CreatorPost.ContentType.IMAGE, CreatorPost.ContentType.VIDEO} and not has_media:
            raise serializers.ValidationError(
                {'media_url': 'Image and video posts need an uploaded file or an HTTPS media URL.'})
        if current_type == CreatorPost.ContentType.TEXT and current_media:
            raise serializers.ValidationError({'media_url': 'Text posts cannot include a media URL.'})
        if not caption.strip() and not has_media:
            raise serializers.ValidationError({'caption': 'Add a caption or media URL.'})
        return attrs

    def create(self, validated_data):
        if validated_data.get('status') == CreatorPost.Status.PUBLISHED:
            validated_data['published_at'] = timezone.now()
        return super().create(validated_data)

    def update(self, instance, validated_data):
        next_status = validated_data.get('status', instance.status)
        if next_status == CreatorPost.Status.PUBLISHED and instance.published_at is None:
            validated_data['published_at'] = timezone.now()
        elif next_status == CreatorPost.Status.DRAFT:
            validated_data['published_at'] = None
        return super().update(instance, validated_data)


class CreatorPostSerializer(serializers.ModelSerializer):
    creator_username = serializers.CharField(source='creator.username', read_only=True)
    creator_display_name = serializers.CharField(source='creator.display_name', read_only=True)
    creator_avatar = serializers.CharField(source='creator.avatar', read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    shares_count = serializers.SerializerMethodField()
    views_count = serializers.SerializerMethodField()
    liked_by_me = serializers.SerializerMethodField()
    followed_by_me = serializers.SerializerMethodField()
    bookmarked_by_me = serializers.SerializerMethodField()
    media = serializers.SerializerMethodField()

    class Meta:
        model = CreatorPost
        fields = [
            'id', 'creator_username', 'creator_display_name', 'creator_avatar',
            'content_type', 'caption', 'media_url', 'hashtags', 'category',
            'status', 'published_at', 'created_at', 'updated_at',
            'likes_count', 'comments_count', 'shares_count', 'views_count', 'liked_by_me',
            'followed_by_me', 'bookmarked_by_me',
            'media',
        ]
        read_only_fields = fields

    def get_media(self, obj):
        from apps.mediahub.serializers import MediaAssetSerializer
        return MediaAssetSerializer(
            obj.media_assets.all(), many=True,
            context=self.context,
        ).data

    def get_liked_by_me(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        if hasattr(obj, 'liked_by_viewer'):
            return bool(obj.liked_by_viewer)
        return obj.likes.filter(user=request.user).exists()

    def get_followed_by_me(self, obj):
        from .models import CreatorFollow
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return bool(getattr(obj, 'followed_by_viewer', None)) or CreatorFollow.objects.filter(
            creator_id=obj.creator_id, follower=request.user
        ).exists()

    def get_bookmarked_by_me(self, obj):
        from .models import CreatorPostBookmark
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return bool(getattr(obj, 'bookmarked_by_viewer', None)) or CreatorPostBookmark.objects.filter(
            post_id=obj.pk, user=request.user
        ).exists()

    def get_likes_count(self, obj):
        return obj.likes_count if hasattr(obj, 'likes_count') else obj.likes.count()

    def get_comments_count(self, obj):
        return obj.comments_count if hasattr(obj, 'comments_count') else obj.comments.filter(is_hidden=False).count()

    def get_shares_count(self, obj):
        return obj.shares_count if hasattr(obj, 'shares_count') else obj.shares.count()

    def get_views_count(self, obj):
        return obj.views_count if hasattr(obj, 'views_count') else obj.views.count()


class CreatorCommentSerializer(serializers.ModelSerializer):
    author_label = serializers.SerializerMethodField()
    author_username = serializers.CharField(source='user.username', read_only=True)
    author_is_me = serializers.SerializerMethodField()

    class Meta:
        model = CreatorPostComment
        fields = ['id', 'author_label', 'author_username', 'author_is_me', 'body', 'created_at']
        read_only_fields = ['id', 'author_label', 'author_username', 'author_is_me', 'created_at']

    def get_author_label(self, obj):
        return 'Creator' if obj.user_id == obj.post.creator.user_id else 'SoulCare member'

    def get_author_is_me(self, obj):
        request = self.context.get('request')
        return bool(request and request.user.is_authenticated and obj.user_id == request.user.id)


class CreatorWithdrawalSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreatorWithdrawalRequest
        fields = ['id', 'request_key', 'amount', 'status', 'review_note', 'payment_reference', 'created_at', 'reviewed_at', 'paid_at']
        read_only_fields = ['id', 'status', 'review_note', 'payment_reference', 'created_at', 'reviewed_at', 'paid_at']


class CreatorWithdrawalCreateSerializer(serializers.Serializer):
    request_key = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))


class CreatorAdminProfileSerializer(serializers.ModelSerializer):
    post_count = serializers.SerializerMethodField()
    follower_count = serializers.SerializerMethodField()

    class Meta:
        model = CreatorProfile
        fields = ['id', 'username', 'display_name', 'is_active', 'monetization_status', 'created_at', 'post_count', 'follower_count']
        read_only_fields = fields

    def get_post_count(self, obj):
        return obj.post_count if hasattr(obj, 'post_count') else obj.posts.filter(deleted_at__isnull=True).count()

    def get_follower_count(self, obj):
        return obj.follower_count if hasattr(obj, 'follower_count') else obj.follows.count()