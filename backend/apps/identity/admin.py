from django.contrib import admin

from .models import (
    CreatorAdminAuditLog,
    CreatorFollow,
    CreatorLedgerEntry,
    CreatorMonthlySettlement,
    CreatorPost,
    CreatorPostComment,
    CreatorPostLike,
    CreatorPostShare,
    CreatorPostView,
    CreatorProfile,
    CreatorRevenueAttribution,
    CreatorSecuritySignal,
    CreatorWithdrawalRequest,
    VerifiedAdEvent,
)


class ReadOnlyCreatorAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(CreatorProfile)
class CreatorProfileAdmin(ReadOnlyCreatorAdmin):
    list_display = ('username', 'display_name', 'is_active', 'monetization_status', 'created_at')
    list_filter = ('is_active', 'monetization_status')
    search_fields = ('username', 'display_name')


@admin.register(CreatorPost)
class CreatorPostAdmin(ReadOnlyCreatorAdmin):
    list_display = ('id', 'creator', 'content_type', 'category', 'status', 'published_at', 'deleted_at')
    list_filter = ('content_type', 'status', 'category')
    search_fields = ('creator__username', 'caption')


@admin.register(CreatorPostComment)
class CreatorPostCommentAdmin(ReadOnlyCreatorAdmin):
    list_display = ('id', 'post', 'user', 'is_hidden', 'created_at', 'moderated_at')
    list_filter = ('is_hidden', 'created_at')


@admin.register(CreatorSecuritySignal)
class CreatorSecuritySignalAdmin(ReadOnlyCreatorAdmin):
    list_display = ('id', 'creator', 'kind', 'status', 'created_at', 'reviewed_at')
    list_filter = ('kind', 'status', 'created_at')
    search_fields = ('creator__username', 'evidence_hash')


@admin.register(CreatorWithdrawalRequest)
class CreatorWithdrawalRequestAdmin(ReadOnlyCreatorAdmin):
    list_display = ('id', 'creator', 'amount', 'status', 'created_at', 'reviewed_at', 'paid_at')
    list_filter = ('status', 'created_at')
    search_fields = ('creator__username', 'payment_reference')


@admin.register(CreatorAdminAuditLog)
class CreatorAdminAuditLogAdmin(ReadOnlyCreatorAdmin):
    list_display = ('id', 'actor', 'creator', 'action', 'target_type', 'created_at')
    list_filter = ('action', 'target_type', 'created_at')
    search_fields = ('creator__username', 'actor__username', 'reason')


@admin.register(VerifiedAdEvent)
class VerifiedAdEventAdmin(ReadOnlyCreatorAdmin):
    list_display = ('provider', 'provider_event_id', 'post', 'net_amount', 'currency', 'verified_at')
    list_filter = ('provider', 'currency', 'verified_at')


@admin.register(CreatorRevenueAttribution)
class CreatorRevenueAttributionAdmin(ReadOnlyCreatorAdmin):
    list_display = ('creator', 'post', 'net_amount', 'creator_amount', 'platform_amount', 'created_at')


@admin.register(CreatorLedgerEntry)
class CreatorLedgerEntryAdmin(ReadOnlyCreatorAdmin):
    list_display = ('creator', 'amount', 'eligible_at', 'created_at')
    list_filter = ('eligible_at', 'created_at')


@admin.register(CreatorMonthlySettlement)
class CreatorMonthlySettlementAdmin(ReadOnlyCreatorAdmin):
    list_display = ('creator', 'month', 'net_amount', 'creator_amount', 'platform_amount', 'status', 'paid_at')
    list_filter = ('status', 'month')


admin.site.register(CreatorFollow, ReadOnlyCreatorAdmin)
admin.site.register(CreatorPostView, ReadOnlyCreatorAdmin)
admin.site.register(CreatorPostLike, ReadOnlyCreatorAdmin)
admin.site.register(CreatorPostShare, ReadOnlyCreatorAdmin)