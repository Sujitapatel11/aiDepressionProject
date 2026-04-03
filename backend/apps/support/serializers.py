from django.contrib.auth.models import User
from rest_framework import serializers
from .models import SupportRequest, SupportConnection


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username']


class SupportRequestSerializer(serializers.ModelSerializer):
    from_user = UserSerializer(read_only=True)
    to_user = UserSerializer(read_only=True)

    class Meta:
        model = SupportRequest
        fields = ['id', 'request_id', 'from_user', 'to_user', 'status', 'created_at', 'expires_at']


class SupportConnectionSerializer(serializers.ModelSerializer):
    peer = serializers.SerializerMethodField()
    alias = serializers.SerializerMethodField()

    class Meta:
        model = SupportConnection
        fields = ['connection_id', 'peer', 'alias', 'status', 'created_at']

    def get_peer(self, obj):
        user = self.context['request'].user
        return UserSerializer(obj.get_peer(user)).data

    def get_alias(self, obj):
        user = self.context['request'].user
        return obj.get_alias_for(user)
