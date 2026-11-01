import logging
import re

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.forms import PasswordResetForm
from django.conf import settings
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from config.throttles import PasswordResetRateThrottle
from .serializers import SignupSerializer, LoginSerializer, GoogleAuthSerializer, PasswordResetSerializer, PasswordResetConfirmSerializer
from .models import UserAuthProfile

logger = logging.getLogger(__name__)

# Both spellings are emitted by Google depending on the endpoint.
GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


def _token_response(user):
    refresh = RefreshToken.for_user(user)
    # pyrefly: ignore [missing-import]
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
    """
    POST /api/auth/google/  {"id_token": "<Google ID token>"}

    Exchanges a Google Identity Services credential for a SoulCare JWT pair.

    Verification is delegated to google-auth (`verify_oauth2_token`), which checks
    the signature against Google's public keys, `exp`, `iat`, `iss` and — crucially
    — `aud`. The audience check is mandatory: without it any Google project could
    mint a token for any user of this app.

    There is no fallback path. An earlier version fell back to Google's tokeninfo
    endpoint and skipped the audience check entirely when GOOGLE_CLIENT_ID was
    unset, which made the endpoint accept tokens minted for other applications.
    """
    client_id = getattr(settings, "GOOGLE_CLIENT_ID", "") or ""
    if not client_id:
        logger.error("GOOGLE_CLIENT_ID is not configured; refusing Google sign-in.")
        return Response(
            {"detail": "Google Sign-In is not configured on this server."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    serializer = GoogleAuthSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    id_token_str = serializer.validated_data["id_token"]

    try:
        id_info = google_id_token.verify_oauth2_token(
            id_token_str,
            google_requests.Request(),
            audience=client_id,
        )
    except ValueError as exc:
        # Invalid signature, expired, wrong audience, wrong issuer, malformed.
        # Deliberately vague to the client; the reason is logged.
        logger.warning("Google token rejected: %s", exc)
        return Response(
            {"detail": "Invalid Google sign-in token. Please try again."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if id_info.get("iss") not in GOOGLE_ISSUERS:
        logger.warning("Google token had unexpected issuer: %s", id_info.get("iss"))
        return Response(
            {"detail": "Invalid Google sign-in token. Please try again."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    email = (id_info.get("email") or "").strip().lower()
    if not email:
        return Response(
            {"detail": "This Google account has no email address."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Google returns a bool for this in the verified payload; the string form only
    # appears on the legacy tokeninfo endpoint we no longer use.
    if id_info.get("email_verified") is not True:
        return Response(
            {"detail": "Your Google email address is not verified."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    google_id = id_info.get("sub")
    if not google_id:
        return Response(
            {"detail": "Invalid Google sign-in token. Please try again."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    name = id_info.get("name") or email.split("@")[0]
    picture = id_info.get("picture") or ""

    # 1. Preferred lookup: the stable Google subject id.
    user = None
    linked = UserAuthProfile.objects.select_related("user").filter(google_id=google_id).first()
    if linked:
        user = linked.user

    # 2. Fall back to the verified email address.
    if user is None:
        user = User.objects.filter(email__iexact=email).first()
        if user is not None:
            existing = UserAuthProfile.objects.filter(user=user).first()
            if existing and existing.google_id and existing.google_id != google_id:
                # This account is already bound to a different Google identity.
                # Linking now would hand the account to whoever controls this one.
                logger.warning(
                    "Google sign-in conflict: email %s is linked to a different google_id", email
                )
                return Response(
                    {"detail": "This email is already linked to a different Google account."},
                    status=status.HTTP_409_CONFLICT,
                )

    # 3. Otherwise create the account.
    if user is None:
        user = User.objects.create_user(
            username=_unique_username_from_email(email),
            email=email,
            first_name=name.split(" ")[0][:30],
            last_name=" ".join(name.split(" ")[1:])[:150],
        )

    if not user.is_active:
        return Response(
            {"detail": "This account has been deactivated."},
            status=status.HTTP_403_FORBIDDEN,
        )

    auth_profile, _ = UserAuthProfile.objects.get_or_create(user=user)
    auth_profile.google_id = google_id
    auth_profile.auth_provider = "google"
    if picture:
        auth_profile.avatar_url = picture
    auth_profile.save()

    return Response(_token_response(user))


def _unique_username_from_email(email: str) -> str:
    """Derive a stable, collision-free username from an email local-part."""
    base = re.sub(r"[^a-zA-Z0-9_]", "", email.split("@")[0].lower()) or "user"
    base = base[:140]
    username = base
    suffix = 1
    while User.objects.filter(username=username).exists():
        username = f"{base}{suffix}"
        suffix += 1
    return username


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetRateThrottle])
def password_reset_view(request):
    serializer = PasswordResetSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data["email"].strip().lower()
        try:
            from django.contrib.auth.forms import PasswordResetForm
            from django.contrib.auth import get_user_model
            import logging
            logger = logging.getLogger(__name__)

            User = get_user_model()
            matching_users = list(User.objects.filter(email__iexact=email, is_active=True))
            if not matching_users:
                logger.warning("Password reset requested for non-existent or inactive email: %s", email)
            else:
                form = PasswordResetForm(data={"email": email})
                if form.is_valid():
                    domain = request.get_host() if hasattr(request, 'get_host') else '127.0.0.1:8000'
                    is_secure = request.is_secure() if hasattr(request, 'is_secure') else False
                    form.save(
                        use_https=is_secure,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        domain_override=domain,
                        email_template_name='registration/password_reset_email.txt',
                        html_email_template_name='registration/password_reset_email.html',
                        subject_template_name='registration/password_reset_subject.txt',
                    )
                    logger.info("Password reset email sent to %s", email)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.exception("Password reset email error: %s", e)
            if settings.DEBUG:
                return Response(
                    {"detail": f"SMTP Error: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
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
    serializer = PasswordResetConfirmSerializer(data=request.data)
    if not serializer.is_valid():
        errors = serializer.errors
        if 'confirm_password' in errors:
            detail = errors['confirm_password'][0] if isinstance(errors['confirm_password'], list) else str(errors['confirm_password'])
        elif 'non_field_errors' in errors:
            detail = errors['non_field_errors'][0] if isinstance(errors['non_field_errors'], list) else str(errors['non_field_errors'])
        else:
            detail = "Missing required fields."
        return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)

    uid_raw = serializer.validated_data['uid'].strip().strip('/')
    token = serializer.validated_data['token'].strip().strip('/')
    new_password = serializer.validated_data['new_password']

    try:
        from django.utils.http import urlsafe_base64_decode
        from django.contrib.auth.tokens import default_token_generator
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError
        from django.contrib.auth.models import User

        user = None
        # 1. Try urlsafe_base64_decode
        try:
            uid_decoded = urlsafe_base64_decode(uid_raw).decode('utf-8')
            user = User.objects.get(pk=uid_decoded)
        except Exception:
            # 2. Fallback to raw numeric PK if base64 decoding fails or user not found
            if uid_raw.isdigit():
                try:
                    user = User.objects.get(pk=int(uid_raw))
                except User.DoesNotExist:
                    pass

        if not user:
            return Response({"detail": "Invalid reset link or user ID."}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({"detail": "Invalid or expired reset token."}, status=status.HTTP_400_BAD_REQUEST)

        validate_password(new_password, user=user)

        user.set_password(new_password)
        user.save()
        return Response({"detail": "Password has been reset successfully. You may now sign in."})

    except DjangoValidationError as e:
        return Response({"detail": " ".join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception:
        return Response({"detail": "Invalid reset link or user ID."}, status=status.HTTP_400_BAD_REQUEST)


