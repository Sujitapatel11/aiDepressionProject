from rest_framework import serializers
from .models import CommunityPost, PostReport, PostReaction


class CommunityPostSerializer(serializers.ModelSerializer):
    reaction_counts = serializers.SerializerMethodField()
    user_reactions = serializers.SerializerMethodField()
    user_has_reported = serializers.SerializerMethodField()

    class Meta:
        model = CommunityPost
        fields = [
            "id",
            "content",
            "author_alias",
            "has_crisis_resources",
            "crisis_resource_note",
            "created_at",
            "reaction_counts",
            "user_reactions",
            "user_has_reported",
        ]
        read_only_fields = fields

    def get_reaction_counts(self, obj):
        counts = {
            "here_for_you": 0,
            "sending_strength": 0,
            "listening": 0,
        }
        for r in obj.reactions.all():
            if r.reaction_type in counts:
                counts[r.reaction_type] += 1
        return counts

    def get_user_reactions(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return []
        return [
            r.reaction_type
            for r in obj.reactions.all()
            if r.user_id == request.user.id
        ]

    def get_user_has_reported(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return any(r.reporter_id == request.user.id for r in obj.reports.all())


class PostReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostReport
        fields = ["reason", "details"]

    def validate_reason(self, value):
        valid_choices = [c[0] for c in PostReport.REASON_CHOICES]
        if value not in valid_choices:
            raise serializers.ValidationError("Invalid report reason category.")
        return value
