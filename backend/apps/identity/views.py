from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models import CosmeticItem
from .models import CosmeticItem, CreatorProfile
from .models import PublicProfile
from .serializers import UserIdentitySerializer, PublicIdentitySerializer, CosmeticItemSerializer
from .serializers import (
    CosmeticItemSerializer,
    CreatorProfileSerializer,
    PublicCreatorProfileSerializer,
    PublicIdentitySerializer,
    PublicProfileSerializer,
    PublicPublicProfileSerializer,
    UserIdentitySerializer,
)
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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def activate_creator_view(request):
    existing = CreatorProfile.objects.filter(user=request.user).first()
    if existing:
        return Response(CreatorProfileSerializer(existing).data, status=status.HTTP_200_OK)

    serializer = CreatorProfileSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    profile_data = dict(serializer.validated_data)
    profile_data.setdefault('display_name', request.user.username)
    if not profile_data.get('avatar'):
        profile_data['avatar'] = IdentityService.resolve_avatar_url(request.user)

    try:
        with transaction.atomic():
            profile = CreatorProfile.objects.create(user=request.user, **profile_data)
    except IntegrityError:
        existing = CreatorProfile.objects.filter(user=request.user).first()
        if existing:
            return Response(CreatorProfileSerializer(existing).data, status=status.HTTP_200_OK)
        return Response(
            {'username': ['This creator username is already taken.']},
            status=status.HTTP_409_CONFLICT,
        )

    return Response(CreatorProfileSerializer(profile).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def my_creator_profile_view(request):
    profile = get_object_or_404(CreatorProfile, user=request.user)
    if request.method == 'GET':
        return Response(CreatorProfileSerializer(profile).data)

    serializer = CreatorProfileSerializer(profile, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    try:
        serializer.save()
    except IntegrityError:
        return Response(
            {'username': ['This creator username is already taken.']},
            status=status.HTTP_409_CONFLICT,
        )
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_creator_profile_view(request, username):
    profile = CreatorProfile.objects.filter(username__iexact=username, is_active=True).first()
    if not profile:
        return Response({'detail': 'Creator not found.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(PublicCreatorProfileSerializer(profile).data)


# ── Public profiles (additive; existing identity endpoints are unchanged) ─────

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def my_public_profile_view(request):
    """
    GET  /api/identity/profile/  → own public profile (created on first access).
    PATCH /api/identity/profile/ → update display_name, bio, interests only.

    The profile always belongs to request.user; the user id is never taken
    from the payload or the URL, so a user cannot edit anyone else's profile.
    """
    profile, _ = PublicProfile.objects.get_or_create(user=request.user)

    if request.method == 'GET':
        return Response(PublicProfileSerializer(profile).data)

    serializer = PublicProfileSerializer(profile, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_profile_view(request, user_id):
    """
    GET /api/identity/profile/<user_id>/ → public allowlisted profile.

    Only active users with an existing PublicProfile are returned. The response
    never includes email, tokens, seed_key, identity_config, personality data
    or journal content (enforced by PublicPublicProfileSerializer).
    """
    profile = (
        PublicProfile.objects.select_related('user')
        .filter(user_id=user_id, user__is_active=True)
        .first()
    )
    if not profile:
        return Response({'detail': 'Profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(PublicPublicProfileSerializer(profile).data)
