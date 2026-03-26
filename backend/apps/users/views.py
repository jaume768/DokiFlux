import logging
import random

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    SetUsernameSerializer,
    VerifyEmailSerializer,
    ResendVerificationSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    GoogleAuthSerializer,
    UserSerializer,
    UpdateProfileSerializer,
)
from .models import EmailVerificationToken, PasswordResetToken
from .services.email import email_service
from .services.tokens import create_email_verification_token, create_password_reset_token
from .validators import validate_username, RESERVED_USERNAMES

logger = logging.getLogger(__name__)
User = get_user_model()


def _get_tokens_for_user(user):
    """Generate JWT access + refresh tokens for a user."""
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


class RegisterView(APIView):
    """POST /api/auth/register/ — Register with email + password."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]
        full_name = serializer.validated_data["full_name"]

        # Validate password strength
        try:
            validate_password(password)
        except DjangoValidationError as e:
            return Response(
                {"password": e.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        auto_verify = getattr(settings, "AUTO_VERIFY_EMAIL", False)

        user = User.objects.create_user(
            email=email,
            password=password,
            full_name=full_name,
            is_email_verified=auto_verify,
        )

        if auto_verify:
            # DEV: auto-verified, return JWT immediately
            tokens = _get_tokens_for_user(user)
            return Response(
                {
                    "tokens": tokens,
                    "user": UserSerializer(user).data,
                },
                status=status.HTTP_201_CREATED,
            )
        else:
            # PROD: send verification email
            token_obj = create_email_verification_token(user)
            email_service.send_verification_email(user, token_obj.token)
            return Response(
                {
                    "message": "Cuenta creada. Revisa tu email para verificar tu cuenta.",
                    "user": UserSerializer(user).data,
                },
                status=status.HTTP_201_CREATED,
            )


class LoginView(APIView):
    """POST /api/auth/login/ — Login with email or username + password, returns JWT."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        identifier = serializer.validated_data["identifier"].strip()
        password = serializer.validated_data["password"]

        # Detect whether identifier is an email or username
        if "@" in identifier:
            lookup = {"email": identifier.lower()}
        else:
            lookup = {"username__iexact": identifier}

        try:
            user = User.objects.get(**lookup)
        except User.DoesNotExist:
            return Response(
                {"error": "Credenciales inválidas."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.check_password(password):
            return Response(
                {"error": "Credenciales inválidas."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_email_verified:
            return Response(
                {"error": "Email no verificado. Revisa tu bandeja de entrada."},
                status=status.HTTP_403_FORBIDDEN,
            )

        tokens = _get_tokens_for_user(user)
        return Response({
            "tokens": tokens,
            "user": UserSerializer(user).data,
        })


class VerifyEmailView(APIView):
    """POST /api/auth/verify-email/ — Verify email with token."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token_uuid = serializer.validated_data["token"]

        try:
            token_obj = EmailVerificationToken.objects.select_related("user").get(
                token=token_uuid
            )
        except EmailVerificationToken.DoesNotExist:
            return Response(
                {"error": "Token inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not token_obj.is_valid:
            return Response(
                {"error": "Token expirado o ya utilizado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Mark token as used and verify user
        token_obj.used = True
        token_obj.save(update_fields=["used"])

        user = token_obj.user
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified"])

        tokens = _get_tokens_for_user(user)
        return Response({
            "tokens": tokens,
            "user": UserSerializer(user).data,
        })


class ResendVerificationView(APIView):
    """POST /api/auth/resend-verification/ — Resend verification email."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].lower().strip()

        # Always return success to avoid user enumeration
        try:
            user = User.objects.get(email=email, is_email_verified=False)
            token_obj = create_email_verification_token(user)
            email_service.send_verification_email(user, token_obj.token)
        except User.DoesNotExist:
            pass

        return Response({"message": "Si el email existe, se ha enviado un nuevo enlace de verificación."})


class PasswordResetRequestView(APIView):
    """POST /api/auth/password-reset/ — Request password reset email."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].lower().strip()

        # Always return success to avoid user enumeration
        try:
            user = User.objects.get(email=email)
            token_obj = create_password_reset_token(user)
            email_service.send_password_reset_email(user, token_obj.token)
        except User.DoesNotExist:
            pass

        return Response({"message": "Si el email existe, se ha enviado un enlace para restablecer la contraseña."})


class PasswordResetConfirmView(APIView):
    """POST /api/auth/password-reset-confirm/ — Confirm password reset with token."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token_uuid = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]

        try:
            token_obj = PasswordResetToken.objects.select_related("user").get(
                token=token_uuid
            )
        except PasswordResetToken.DoesNotExist:
            return Response(
                {"error": "Token inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not token_obj.is_valid:
            return Response(
                {"error": "Token expirado o ya utilizado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate new password strength
        try:
            validate_password(new_password)
        except DjangoValidationError as e:
            return Response(
                {"new_password": e.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Reset password
        token_obj.used = True
        token_obj.save(update_fields=["used"])

        user = token_obj.user
        user.set_password(new_password)
        user.save(update_fields=["password"])

        return Response({"message": "Contraseña actualizada correctamente."})


class MeView(APIView):
    """
    GET /api/auth/me/ — Get current user profile.
    PATCH /api/auth/me/ — Update profile (full_name only).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UpdateProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class SetUsernameView(APIView):
    """POST /api/auth/set-username/ — Set username (only if not already set)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        if user.username is not None:
            return Response(
                {"error": "El username ya está configurado."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = SetUsernameSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user.username = serializer.validated_data["username"]
        user.save(update_fields=["username"])

        return Response(UserSerializer(user).data)


class CheckUsernameView(APIView):
    """GET /api/auth/check-username/{username}/ — Check username availability."""

    permission_classes = [AllowAny]

    def get(self, request, username):
        username = username.lower().strip()

        # Validate format
        try:
            validate_username(username)
        except DjangoValidationError as e:
            return Response(
                {"available": False, "error": e.message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check availability
        is_taken = User.objects.filter(username=username).exists()

        if is_taken:
            # Generate suggestion
            suggestion = f"{username}{random.randint(10, 999)}"
            while User.objects.filter(username=suggestion).exists() or suggestion in RESERVED_USERNAMES:
                suggestion = f"{username}{random.randint(10, 9999)}"
            return Response({"available": False, "suggestion": suggestion})

        return Response({"available": True})


class GoogleAuthView(APIView):
    """POST /api/auth/google/ — Authenticate with Google id_token."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        id_token_str = serializer.validated_data["id_token"]

        # Verify the Google id_token
        try:
            from google.oauth2 import id_token
            from google.auth.transport import requests as google_requests

            idinfo = id_token.verify_oauth2_token(
                id_token_str,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
        except ValueError:
            return Response(
                {"error": "Token de Google inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = idinfo.get("email", "").lower().strip()
        full_name = idinfo.get("name", "")

        if not email:
            return Response(
                {"error": "No se pudo obtener el email de Google."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get or create user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "full_name": full_name,
                "is_email_verified": True,
                "auth_provider": "google",
            },
        )

        if not created:
            # Existing user logging in via Google — ensure verified
            if not user.is_email_verified:
                user.is_email_verified = True
                user.save(update_fields=["is_email_verified"])

        tokens = _get_tokens_for_user(user)
        return Response({
            "tokens": tokens,
            "user": UserSerializer(user).data,
            "created": created,
        })
