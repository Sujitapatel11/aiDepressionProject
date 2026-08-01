import os
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.forms import PasswordResetForm
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from config.throttles import PasswordResetRateThrottle
from .serializers import SignupSerializer, LoginSerializer, GoogleAuthSerializer, PasswordResetSerializer
from .models import UserAuthProfile


def _token_response(user):
    refresh = RefreshToken.for_user(user)
    from apps.identity.services.identity_service import IdentityService
    avatar_url = IdentityService.resolve_avatar_url(user)
    return {
        "token": str(refresh.access_token),
        "refresh": str(refresh),
        "user_id": user.id,
        "username": user.username,
        "avatar_url": avatar_url,
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def signup_view(request):
    serializer = SignupSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    user = serializer.save()
    return Response(_token_response(user), status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    login_input = serializer.validated_data['username']
    password = serializer.validated_data['password']

    # Try direct username authentication
    user = authenticate(request, username=login_input, password=password)

    # Fallback: if input looks like email, lookup by email address
    if not user:
        user_by_email = User.objects.filter(email__iexact=login_input).first()
        if user_by_email:
            user = authenticate(request, username=user_by_email.username, password=password)

    if not user:
        return Response({"detail": "Invalid email/username or password."}, status=status.HTTP_400_BAD_REQUEST)

    return Response(_token_response(user))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        refresh_token = request.data.get("refresh")
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
    except Exception:
        pass
    return Response({"detail": "Logged out."})


from django.db import transaction

@api_view(['POST'])
@permission_classes([AllowAny])
@transaction.atomic
def google_auth_view(request):
    serializer = GoogleAuthSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    id_token_str = serializer.validated_data['id_token']
    client_id = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
    id_info = None

    # Method 1: Try official google-auth library
    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
        id_info = google_id_token.verify_oauth2_token(
            id_token_str,
            google_requests.Request(),
            audience=client_id if client_id else None,
        )
    except Exception:
        # Method 2: Fallback to Google TokenInfo API Endpoint over HTTPS
        try:
            import urllib.request
            import json
            url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token_str}"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status == 200:
                    id_info = json.loads(resp.read().decode('utf-8'))
                    if client_id and id_info.get("aud") != client_id:
                        return Response({"detail": "Google token audience mismatch."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as err:
            return Response({"detail": f"Failed to verify Google token: {str(err)}"}, status=status.HTTP_400_BAD_REQUEST)

    if not id_info:
        return Response({"detail": "Invalid Google token."}, status=status.HTTP_400_BAD_REQUEST)

    email = id_info.get("email", "").strip().lower()
    if not email:
        return Response({"detail": "Missing email claim in Google token."}, status=status.HTTP_400_BAD_REQUEST)

    if id_info.get("email_verified") is False or id_info.get("email_verified") == "false":
        return Response({"detail": "Google email address is unverified."}, status=status.HTTP_400_BAD_REQUEST)

    google_id = id_info.get("sub")
    name = id_info.get("name") or email.split("@")[0]
    picture = id_info.get("picture", "")

    # 1. Lookup by linked google_id in UserAuthProfile
    user = None
    if google_id:
        auth_profile = UserAuthProfile.objects.filter(google_id=google_id).select_related('user').first()
        if auth_profile:
            user = auth_profile.user

    # 2. If not found by google_id, lookup by normalized email
    if not user:
        user = User.objects.filter(email__iexact=email).first()

    # 3. If user still does not exist, create new account under atomic transaction
    if not user:
        import re
        base_username = email.split("@")[0].lower()
        base_username = re.sub(r'[^a-zA-Z0-9_]', '', base_username) or "user"
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        name_parts = name.split() if name else []
        first_name = name_parts[0] if name_parts else ""
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=first_name[:30],
            last_name=last_name[:150],
        )

    # 4. Attach or update UserAuthProfile cleanly
    auth_profile, _ = UserAuthProfile.objects.get_or_create(user=user)
    if google_id and auth_profile.google_id != google_id:
        auth_profile.google_id = google_id
    if auth_profile.auth_provider != 'google':
        auth_profile.auth_provider = 'google'
    if picture and auth_profile.avatar_url != picture:
        auth_profile.avatar_url = picture
    auth_profile.save()

    return Response(_token_response(user))


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetRateThrottle])
def password_reset_view(request):
    serializer = PasswordResetSerializer(data=request.data)
    if serializer.is_valid():
        try:
            from django.contrib.auth.forms import PasswordResetForm
            form = PasswordResetForm(data={"email": serializer.validated_data["email"]})
            if form.is_valid():
                form.save(
                    request=request,
                    use_https=False,
                    email_template_name='registration/password_reset_email.html',
                    domain_override='127.0.0.1:8000',
                )
        except Exception as e:
            import logging
    return Response({"detail": "If that email exists, a reset link has been sent."})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """
    GET /api/auth/me/
    Returns the authenticated user's non-sensitive profile fields.
    Email is always read live from request.user — never from a cache or token claim.
    """
    user = request.user
    return Response({
        "user_id":  user.id,
        "username": user.username,
        "email":    user.email,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm_api(request):
    uidb64 = request.data.get('uid')
    token = request.data.get('token')
    new_password = request.data.get('new_password')
    confirm_password = request.data.get('confirm_password')

    if not uidb64 or not token or not new_password:
        return Response({"detail": "Missing required fields."}, status=status.HTTP_400_BAD_REQUEST)

    if new_password != confirm_password:
        return Response({"detail": "Passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        from django.utils.http import urlsafe_base64_decode
        from django.contrib.auth.tokens import default_token_generator
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError
        from django.contrib.auth.models import User

        uid = urlsafe_base64_decode(uidb64).decode()
        user = User.objects.get(pk=uid)

        if not default_token_generator.check_token(user, token):
            return Response({"detail": "Invalid or expired reset token."}, status=status.HTTP_400_BAD_REQUEST)

        validate_password(new_password, user=user)

        user.set_password(new_password)
        user.save()
        return Response({"detail": "Password has been reset successfully. You may now sign in."})

    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({"detail": "Invalid reset link or user ID."}, status=status.HTTP_400_BAD_REQUEST)
    except DjangoValidationError as e:
        return Response({"detail": " ".join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

