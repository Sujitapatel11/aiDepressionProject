from django.contrib import admin
from .models import CommunityPost, PostReport, PostReaction


@admin.register(CommunityPost)
class CommunityPostAdmin(admin.ModelAdmin):
    list_display = ("author_alias", "content_preview", "report_count", "is_hidden", "has_crisis_resources", "created_at")
    list_filter = ("is_hidden", "has_crisis_resources", "created_at")
    search_fields = ("author_alias", "content")
    actions = ["unhide_posts", "hide_posts"]

    def content_preview(self, obj):
        return obj.content[:60] + "..." if len(obj.content) > 60 else obj.content
    content_preview.short_description = "Content"

    def unhide_posts(self, request, queryset):
        queryset.update(is_hidden=False)
        self.message_user(request, "Selected posts have been un-hidden.")
    unhide_posts.short_description = "Un-hide selected posts"

    def hide_posts(self, request, queryset):
        queryset.update(is_hidden=True)
        self.message_user(request, "Selected posts have been hidden.")
    hide_posts.short_description = "Hide selected posts"


@admin.register(PostReport)
class PostReportAdmin(admin.ModelAdmin):
    list_display = ("post", "reason", "reporter", "created_at")
    list_filter = ("reason", "created_at")
    search_fields = ("post__author_alias", "post__content", "details")


@admin.register(PostReaction)
class PostReactionAdmin(admin.ModelAdmin):
    list_display = ("post", "reaction_type", "user", "created_at")
    list_filter = ("reaction_type", "created_at")
