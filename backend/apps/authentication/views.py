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

    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
        import os

        id_token_str = serializer.validated_data['id_token']
        client_id = os.environ.get("GOOGLE_CLIENT_ID", "")

        id_info = google_id_token.verify_oauth2_token(
            id_token_str,
            google_requests.Request(),
            client_id,
        )

        email = id_info.get("email")
        name = id_info.get("name", email.split("@")[0] if email else "user")

        if not email:
            return Response({"detail": "Google token missing email."}, status=status.HTTP_400_BAD_REQUEST)

        user, _ = User.objects.get_or_create(
            email=email,
            defaults={"username": email.split("@")[0], "first_name": name},
        )

        return Response(_token_response(user))

    except Exception as e:
        return Response({"detail": f"Invalid Google token: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


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
            logging.getLogger(__name__).warning("Password reset error: %s", e)
    return Response({"detail": "If that email exists, a reset link has been sent."})
