from rest_framework import serializers
from .models import Message


class MessageSerializer(serializers.ModelSerializer):
    message_id = serializers.UUIDField(read_only=True)
    sender_id = serializers.IntegerField(source='sender.id', read_only=True, allow_null=True)

    class Meta:
        model = Message
        fields = ['message_id', 'sender_id', 'content', 'created_at']
        read_only_fields = fields
