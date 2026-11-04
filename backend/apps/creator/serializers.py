from decimal import Decimal
from rest_framework import serializers
from .models import CreatorProfile, CreatorPost, CreatorWithdrawal, CreatorEarning

class CreatorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreatorProfile
        fields = ["id", "display_name", "bio", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

class CreatorPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreatorPost
        fields = ["id", "title", "body", "format", "status", "published_at", "created_at", "updated_at"]
        read_only_fields = ["id", "status", "published_at", "created_at", "updated_at"]
    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Title cannot be empty.")
        return value
    def validate_body(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Post body cannot be empty.")
        return value

class CreatorWithdrawalSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreatorWithdrawal
        fields = ["id", "amount", "currency", "status", "admin_note", "created_at", "reviewed_at"]
        read_only_fields = ["id", "status", "admin_note", "created_at", "reviewed_at"]
    def validate_amount(self, value):
        if value <= Decimal("0"):
            raise serializers.ValidationError("Withdrawal amount must be greater than zero.")
        return value

class CreatorEarningSerializer(serializers.ModelSerializer):
    post_title = serializers.CharField(source="post.title", read_only=True)
    class Meta:
        model = CreatorEarning
        fields = ["id", "post", "post_title", "gross_amount", "share_rate", "creator_amount", "currency", "created_at"]
        read_only_fields = fields
