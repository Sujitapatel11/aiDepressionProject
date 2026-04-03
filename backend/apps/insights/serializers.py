from rest_framework import serializers
from .models import Insight


class InsightSerializer(serializers.ModelSerializer):
    insight_id = serializers.IntegerField(source='id', read_only=True)
    journal_id = serializers.IntegerField(source='journal.id', read_only=True, allow_null=True)

    class Meta:
        model = Insight
        fields = [
            'insight_id', 'title', 'message', 'mood', 'sentiment_score',
            'keywords', 'emotion_tags', 'created_at', 'journal_id',
            'is_read', 'is_dismissed',
        ]
        read_only_fields = fields
