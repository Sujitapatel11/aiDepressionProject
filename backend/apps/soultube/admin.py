from django.contrib import admin

from .models import (
    WatchRoom,
    WatchRoomChatMessage,
    WatchRoomParticipant,
    WatchRoomPlaybackState,
    WatchRoomQueueItem,
)


@admin.register(WatchRoom)
class WatchRoomAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'host', 'visibility', 'status', 'created_at', 'expires_at')
    list_filter = ('status', 'visibility')
    search_fields = ('code', 'name', 'host__username')
    readonly_fields = ('code', 'created_at', 'updated_at')


@admin.register(WatchRoomParticipant)
class WatchRoomParticipantAdmin(admin.ModelAdmin):
    list_display = ('room', 'user', 'role', 'joined_at', 'left_at')
    list_filter = ('role',)
    search_fields = ('room__code', 'user__username')


@admin.register(WatchRoomQueueItem)
class WatchRoomQueueItemAdmin(admin.ModelAdmin):
    list_display = ('room', 'title', 'position', 'video_asset', 'added_by', 'created_at')


@admin.register(WatchRoomChatMessage)
class WatchRoomChatMessageAdmin(admin.ModelAdmin):
    list_display = ('room', 'user', 'body', 'created_at')
    search_fields = ('room__code', 'user__username', 'body')


@admin.register(WatchRoomPlaybackState)
class WatchRoomPlaybackStateAdmin(admin.ModelAdmin):
    list_display = ('room', 'is_playing', 'position_seconds', 'updated_by', 'updated_at')
