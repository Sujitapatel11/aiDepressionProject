from django.utils import timezone
from rest_framework import serializers

from apps.mediahub.models import MediaAsset
from apps.mediahub.signing import media_preview_url


def is_publicly_visible(asset):
    """True only when the asset's parent surface is publicly readable.

    Used to decide whether an unchanged CDN URL may be exposed. Drafts,
    private journal media, hidden community posts, orphan uploads and
    watch-room-only videos are never treated as public.
    """
    if asset.visibility == MediaAsset.Visibility.PRIVATE or asset.journal_entry_id:
        return False
    if asset.creator_post_id:
        post = asset.creator_post
        return bool(
            not post.deleted_at
            and post.status == 'published'
            and post.published_at
            and post.published_at <= timezone.now()
        )
    if asset.community_post_id:
        return not asset.community_post.is_hidden
    return False


class MediaAssetSerializer(serializers.ModelSerializer):
    # Stable, permission-checked delivery path (or direct Cloudinary CDN URL
    # for public Cloudinary assets).
    url = serializers.SerializerMethodField()
    # Legacy alias kept for older clients/composer previews. For published
    # assets this equals `url` — it never contains an expiring token.
    preview_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    responsive_urls = serializers.SerializerMethodField()
    is_public = serializers.SerializerMethodField()
    content_type = serializers.CharField(read_only=True)

    class Meta:
        model = MediaAsset
        fields = [
            'id', 'kind', 'url', 'preview_url', 'thumbnail_url', 'responsive_urls',
            'width', 'height', 'duration', 'size_bytes', 'original_name',
            'content_type', 'storage_provider', 'visibility', 'is_public',
        ]
        read_only_fields = fields

    def _is_public(self, obj):
        override = self.context.get('media_public_override')
        if override is not None:
            return bool(override) and obj.visibility != MediaAsset.Visibility.PRIVATE and not obj.journal_entry_id
        return is_publicly_visible(obj)

    def get_is_public(self, obj):
        return self._is_public(obj)

    def get_url(self, obj):
        # Private journal media must always flow through permission-checked serve.
        if obj.visibility == MediaAsset.Visibility.PRIVATE:
            return f'/api/media/serve/{obj.id}/'
        if (
            obj.storage_provider == MediaAsset.StorageProvider.CLOUDINARY
            and obj.secure_url
            and self._is_public(obj)
        ):
            return obj.secure_url
        # Stable API path for every storage backend. The view permission-checks
        # and (for R2) redirects to a short-lived presigned object URL.
        return f'/api/media/serve/{obj.id}/'

    def get_preview_url(self, obj):
        if self._is_public(obj):
            # Published/visible media must not depend on a token that expires
            # while a cached feed still references it.
            return self.get_url(obj)
        if obj.storage_provider == MediaAsset.StorageProvider.CLOUDINARY and (obj.thumbnail_url or obj.secure_url):
            # Owner-scoped previews still go through the signed serve route so
            # a draft's CDN URL is never handed to an unauthenticated viewer.
            return media_preview_url(obj, obj.user_id) if obj.user_id is not None else None
        if obj.user_id is not None:
            return media_preview_url(obj, obj.user_id)
        return None

    def get_thumbnail_url(self, obj):
        if not self._is_public(obj):
            return None
        if obj.thumbnail_url:
            return obj.thumbnail_url
        if obj.secure_url:
            return obj.secure_url
        return None

    def get_responsive_urls(self, obj):
        if (
            self._is_public(obj)
            and obj.storage_provider == MediaAsset.StorageProvider.CLOUDINARY
            and obj.cloudinary_public_id
        ):
            from apps.mediahub.cloudinary_service import build_cloudinary_urls
            from django.conf import settings
            cloud_name = getattr(settings, 'CLOUDINARY_CLOUD_NAME', '')
            res_type = 'video' if obj.kind == MediaAsset.Kind.VIDEO else 'image'
            return build_cloudinary_urls(cloud_name, obj.cloudinary_public_id, res_type, obj.file_ext)
        return {}
