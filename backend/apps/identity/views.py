from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models import CosmeticItem
from .serializers import UserIdentitySerializer, PublicIdentitySerializer, CosmeticItemSerializer
from .services.identity_service import IdentityService
from .services.registry import AvatarProviderRegistry


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def my_identity_view(request):
    """
    GET: Retrieves current user's identity config & avatar_url.
    PATCH: Updates style_preset, avatar_provider, background_color, or identity_config.
    """
    user = request.user
    identity = IdentityService.get_or_create_identity(user)

    if request.method == 'GET':
        serializer = UserIdentitySerializer(identity)
        return Response(serializer.data)

    elif request.method == 'PATCH':
        data = request.data
        if 'style_preset' in data:
            identity.style_preset = data['style_preset']
        if 'avatar_provider' in data:
            if data['avatar_provider'] in AvatarProviderRegistry.list_providers():
                identity.avatar_provider = data['avatar_provider']

        if 'identity_config' in data and isinstance(data['identity_config'], dict):
            current_config = identity.identity_config or {}
            current_config.update(data['identity_config'])
            identity.identity_config = current_config

        identity.save()
        serializer = UserIdentitySerializer(identity)
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_identity_view(request, user_id):
    """
    GET: Returns public identity payload for any user_id (avatar_url, badge, aura, theme).
    """
    user = User.objects.filter(id=user_id, is_active=True).first()
    if not user:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    payload = IdentityService.get_public_identity(user)
    serializer = PublicIdentitySerializer(payload)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def available_cosmetics_view(request):
    """
    GET: Catalog of available cosmetic items.
    """
    items = CosmeticItem.objects.all().order_by('category', 'name')
    serializer = CosmeticItemSerializer(items, many=True)
    return Response(serializer.data)
