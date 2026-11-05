from django.contrib import admin

from .models import MediaAsset


@admin.register(MediaAsset)
class MediaAssetAdmin(admin.ModelAdmin):
    list_display = ('id', 'kind', 'size_bytes', 'user', 'creator_post', 'community_post', 'created_at')
    list_filter = ('kind', 'created_at')
    search_fields = ('original_name', 'user__username', 'id')
    readonly_fields = ('id', 'file_ext', 'original_name', 'content_type', 'size_bytes', 'width', 'height', 'created_at')
    raw_id_fields = ('user', 'creator_post', 'community_post')
