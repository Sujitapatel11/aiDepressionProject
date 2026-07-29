from django.contrib import admin
from .models import SleepEntry


@admin.register(SleepEntry)
class SleepEntryAdmin(admin.ModelAdmin):
    list_display = ['user', 'sleep_date', 'total_sleep_hours', 'sleep_quality', 'bedtime', 'wake_time', 'created_at']
    list_filter = ['sleep_quality', 'sleep_date']
    search_fields = ['user__username', 'sleep_notes']
    ordering = ['-sleep_date']
