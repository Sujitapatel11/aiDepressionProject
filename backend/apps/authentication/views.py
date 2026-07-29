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


def _token_response(user):
    refresh = RefreshToken.for_user(user)
    return {
        "token": str(refresh.access_token),
        "refresh": str(refresh),
        "user_id": user.id,
        "username": user.username,
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


@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth_view(request):
    serializer = GoogleAuthSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    id_token_str = serializer.validated_data['id_token']
    client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
    id_info = None

    # Method 1: Try official google-auth library
    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
        id_info = google_id_token.verify_oauth2_token(
            id_token_str,
            google_requests.Request(),
            client_id if client_id else None,
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
        except Exception as err:
            return Response({"detail": f"Failed to verify Google token: {str(err)}"}, status=status.HTTP_400_BAD_REQUEST)

    if not id_info or not id_info.get("email"):
        return Response({"detail": "Invalid Google token or missing email claim."}, status=status.HTTP_400_BAD_REQUEST)

    email = id_info.get("email")
    name = id_info.get("name", email.split("@")[0])

    # 1. Check if user already exists with this email (Primary Identity)
    user = User.objects.filter(email__iexact=email).first()

    # 2. If user does not exist, create user with unique username
    if not user:
        base_username = email.split("@")[0].lower()
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=name
        )

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

