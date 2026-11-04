from django.contrib import admin

from .models import PaymentTransaction, SubscriptionPlan, UserSubscription


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "currency", "amount_minor", "interval", "active")
    list_filter = ("currency", "interval", "active")
    search_fields = ("code", "name")


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "provider", "amount_minor", "currency", "status", "created_at")
    list_filter = ("provider", "status", "currency")
    search_fields = ("id", "provider_reference", "user__username", "user__email")
    readonly_fields = ("id", "created_at", "updated_at", "paid_at", "provider_payload")


@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = ("user", "plan", "starts_at", "ends_at", "active")
    list_filter = ("active", "plan__currency")
