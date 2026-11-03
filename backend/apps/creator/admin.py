from django.contrib import admin
from .models import CreatorProfile, CreatorPost, AdRevenueEvent, CreatorEarning, CreatorWithdrawal, CreatorSettlement, CreatorSettlementLine

@admin.register(CreatorProfile)
class CreatorProfileAdmin(admin.ModelAdmin):
    list_display = ("display_name", "user", "is_enabled", "created_at")
    list_filter = ("is_enabled",)
    search_fields = ("display_name", "user__username", "user__email")

@admin.register(CreatorPost)
class CreatorPostAdmin(admin.ModelAdmin):
    list_display = ("title", "creator", "status", "published_at")
    list_filter = ("status",)
    search_fields = ("title", "body", "creator__display_name")
    readonly_fields = ("created_at", "updated_at", "published_at")

@admin.register(AdRevenueEvent)
class AdRevenueEventAdmin(admin.ModelAdmin):
    list_display = ("provider", "provider_event_id", "post", "gross_amount", "currency", "verified", "created_at")
    list_filter = ("provider", "verified", "currency")
    search_fields = ("provider_event_id",)
    readonly_fields = ("provider_event_id", "post", "gross_amount", "currency", "occurred_at", "created_at")

@admin.register(CreatorEarning)
class CreatorEarningAdmin(admin.ModelAdmin):
    list_display = ("creator", "post", "gross_amount", "creator_amount", "currency", "created_at")
    readonly_fields = tuple(field.name for field in CreatorEarning._meta.fields)

@admin.register(CreatorWithdrawal)
class CreatorWithdrawalAdmin(admin.ModelAdmin):
    list_display = ("creator", "amount", "currency", "status", "created_at", "reviewed_at")
    list_filter = ("status", "currency")
    readonly_fields = ("creator", "amount", "currency", "created_at")


class CreatorSettlementLineInline(admin.TabularInline):
    model = CreatorSettlementLine
    extra = 0
    can_delete = False
    readonly_fields = ("earning", "amount", "created_at")


@admin.register(CreatorSettlement)
class CreatorSettlementAdmin(admin.ModelAdmin):
    list_display = ("creator", "currency", "period_start", "period_end", "total_amount", "status", "paid_at")
    list_filter = ("status", "currency", "period_start")
    search_fields = ("creator__display_name", "creator__user__username", "payout_reference")
    readonly_fields = ("creator", "currency", "period_start", "period_end", "total_amount", "created_at", "paid_at", "payout_reference")
    inlines = [CreatorSettlementLineInline]
