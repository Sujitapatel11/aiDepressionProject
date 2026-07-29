from datetime import timedelta
from rest_framework import serializers
from .models import SleepEntry


class SleepEntrySerializer(serializers.ModelSerializer):
    formatted_duration = serializers.SerializerMethodField()

    class Meta:
        model = SleepEntry
        fields = [
            'id',
            'user',
            'sleep_date',
            'bedtime',
            'wake_time',
            'total_sleep_hours',
            'formatted_duration',
            'sleep_quality',
            'sleep_notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'total_sleep_hours', 'created_at', 'updated_at']

    def get_formatted_duration(self, obj):
        hours = int(obj.total_sleep_hours)
        minutes = int(round((obj.total_sleep_hours - hours) * 60))
        if minutes == 60:
            hours += 1
            minutes = 0
        if hours > 0 and minutes > 0:
            return f"{hours}h {minutes}m"
        elif hours > 0:
            return f"{hours}h"
        else:
            return f"{minutes}m"

    def validate(self, attrs):
        bedtime = attrs.get('bedtime') or (self.instance.bedtime if self.instance else None)
        wake_time = attrs.get('wake_time') or (self.instance.wake_time if self.instance else None)

        if bedtime and wake_time:
            # Handle crossing midnight: if wake_time <= bedtime, assume wake is next day
            diff = wake_time - bedtime
            if diff.total_seconds() <= 0:
                diff += timedelta(days=1)

            total_hours = diff.total_seconds() / 3600.0

            # Reasonable Validation (Minimum 30 minutes, Maximum 16 hours)
            if total_hours < 0.5:
                raise serializers.ValidationError({"detail": "Sleep duration must be at least 30 minutes."})
            if total_hours > 16.0:
                raise serializers.ValidationError({"detail": "Sleep duration cannot exceed 16 hours."})

            attrs['total_sleep_hours'] = round(total_hours, 2)

        return attrs
