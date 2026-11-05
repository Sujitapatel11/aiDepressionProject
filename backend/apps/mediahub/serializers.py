from rest_framework import serializers

from apps.mediahub.models import MediaAsset
from apps.mediahub.signing import media_preview_url


class MediaAssetSerializer(serializers.ModelSerializer):
    # Relative serve path or direct secure Cloudinary delivery.
    url = serializers.SerializerMethodField()
    # Signed, owner-scoped access for composer preview when the asset is not
    # (yet) publicly visible. Public posts only ever need `url`.
    preview_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    responsive_urls = serializers.SerializerMethodField()

    class Meta:
        model = MediaAsset
        fields = [
            'id', 'kind', 'url', 'preview_url', 'thumbnail_url', 'responsive_urls',
            'width', 'height', 'duration', 'size_bytes', 'original_name',
            'storage_provider', 'visibility'
        ]
        read_only_fields = fields

    def get_url(self, obj):
        # Private journal media must always flow through permission-checked serve
        if obj.visibility == MediaAsset.Visibility.PRIVATE:
            return f'/api/media/serve/{obj.id}/'
        if obj.storage_provider == MediaAsset.StorageProvider.CLOUDINARY and obj.secure_url:
            return obj.secure_url
        return f'/api/media/serve/{obj.id}/'

    def get_preview_url(self, obj):
        if obj.visibility == MediaAsset.Visibility.PRIVATE:
            if obj.user_id is not None:
                return media_preview_url(obj, obj.user_id)
            return None
        if obj.storage_provider == MediaAsset.StorageProvider.CLOUDINARY and (obj.thumbnail_url or obj.secure_url):
            return obj.thumbnail_url or obj.secure_url
        if obj.user_id is not None:
            return media_preview_url(obj, obj.user_id)
        return None

    def get_thumbnail_url(self, obj):
        if obj.thumbnail_url:
            return obj.thumbnail_url
        if obj.secure_url:
            return obj.secure_url
        return None

    def get_responsive_urls(self, obj):
        if obj.storage_provider == MediaAsset.StorageProvider.CLOUDINARY and obj.cloudinary_public_id:
            from apps.mediahub.cloudinary_service import build_cloudinary_urls
            from django.conf import settings
            cloud_name = getattr(settings, 'CLOUDINARY_CLOUD_NAME', '')
            res_type = 'video' if obj.kind == MediaAsset.Kind.VIDEO else 'image'
            return build_cloudinary_urls(cloud_name, obj.cloudinary_public_id, res_type, obj.file_ext)
        return {}
