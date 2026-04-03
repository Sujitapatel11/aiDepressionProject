from rest_framework import serializers
from .models import JournalEntry


class JournalEntrySerializer(serializers.ModelSerializer):
    journal_id = serializers.IntegerField(source='id', read_only=True)

    class Meta:
        model = JournalEntry
        fields = ['journal_id', 'content', 'created_at', 'updated_at']
        read_only_fields = ['journal_id', 'created_at', 'updated_at']

    def validate_content(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Journal content cannot be empty.")
        return value.strip()
