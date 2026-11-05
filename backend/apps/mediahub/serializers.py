from rest_framework import serializers

from apps.mediahub.models import MediaAsset
from apps.mediahub.signing import media_preview_url


class MediaAssetSerializer(serializers.ModelSerializer):
    # Relative serve path; the frontend resolves it through getApiUrl so it
    # works unchanged behind the Vite proxy and against the production backend.
    url = serializers.SerializerMethodField()
    # Signed, owner-scoped access for composer preview when the asset is not
    # (yet) publicly visible. Public posts only ever need `url`.
    preview_url = serializers.SerializerMethodField()

    class Meta:
        model = MediaAsset
        fields = ['id', 'kind', 'url', 'preview_url', 'width', 'height', 'size_bytes', 'original_name']
        read_only_fields = fields

    def get_url(self, obj):
        return f'/api/media/serve/{obj.id}/'

    def get_preview_url(self, obj):
        if obj.user_id is not None:
            return media_preview_url(obj, obj.user_id)
        return None
