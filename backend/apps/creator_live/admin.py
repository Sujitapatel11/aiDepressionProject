from django.contrib import admin

from .models import CreatorPlan, CreatorSubscription, LiveParticipant, LiveSession, LiveSessionAudience


@admin.register(CreatorPlan)
class CreatorPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'price_minor', 'currency', 'is_free', 'is_active')
    list_filter = ('is_free', 'is_active', 'billing_interval')
    search_fields = ('name', 'code')


@admin.register(CreatorSubscription)
class CreatorSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('creator', 'plan', 'status', 'current_period_end', 'created_at')
    list_filter = ('status', 'plan')
    search_fields = ('creator__username', 'provider_subscription_id')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(LiveSession)
class LiveSessionAdmin(admin.ModelAdmin):
    list_display = ('title', 'creator', 'mode', 'audience_type', 'status', 'scheduled_at', 'created_at')
    list_filter = ('status', 'mode', 'audience_type', 'recording_enabled')
    search_fields = ('title', 'creator__username')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(LiveSessionAudience)
class LiveSessionAudienceAdmin(admin.ModelAdmin):
    list_display = ('session', 'user', 'status', 'invited_by', 'created_at')
    list_filter = ('status',)
    search_fields = ('session__title', 'user__username')


@admin.register(LiveParticipant)
class LiveParticipantAdmin(admin.ModelAdmin):
    list_display = ('session', 'user', 'role', 'joined_at', 'left_at', 'is_muted')
    list_filter = ('role', 'is_muted')
    search_fields = ('session__title', 'user__username')
