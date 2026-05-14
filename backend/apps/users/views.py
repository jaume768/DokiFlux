import logging
import random

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Sum, F
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

try:
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests
except ImportError:
    google_id_token = None
    google_requests = None

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
from .throttles import AnonAuthThrottle, ResendEmailThrottle, TokenRefreshThrottle
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


def _set_auth_cookies(response, tokens: dict) -> None:
    """Set JWT tokens as httpOnly Secure SameSite=Lax cookies."""
    secure = not settings.DEBUG
    response.set_cookie(
        "access_token",
        tokens["access"],
        httponly=True,
        samesite="Lax",
        secure=secure,
        max_age=86400,  # 1 day — matches ACCESS_TOKEN_LIFETIME
        path="/",
    )
    response.set_cookie(
        "refresh_token",
        tokens["refresh"],
        httponly=True,
        samesite="Lax",
        secure=secure,
        max_age=1209600,  # 14 days — matches REFRESH_TOKEN_LIFETIME
        path="/",
    )


def _clear_auth_cookies(response) -> None:
    """Clear both auth cookies."""
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


class LogoutView(APIView):
    """POST /api/auth/logout/ — Blacklist the refresh token and clear auth cookies."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = (
            request.data.get("refresh")
            or request.COOKIES.get("refresh_token")
        )
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except TokenError:
                pass
        response = Response(status=status.HTTP_204_NO_CONTENT)
        _clear_auth_cookies(response)
        return response


class CookieTokenRefreshView(APIView):
    """POST /api/auth/token/refresh/ — Rotate refresh token from httpOnly cookie."""

    permission_classes = [AllowAny]
    throttle_classes = [TokenRefreshThrottle]

    def post(self, request):
        refresh_token_str = request.COOKIES.get("refresh_token")
        if not refresh_token_str:
            return Response(
                {"error": "Refresh token cookie not found."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        try:
            old_token = RefreshToken(refresh_token_str)
            access = str(old_token.access_token)
            old_token.blacklist()
            new_refresh = RefreshToken.for_user(
                User.objects.get(id=old_token["user_id"])
            )
            tokens = {"access": access, "refresh": str(new_refresh)}
        except (TokenError, User.DoesNotExist):
            response = Response(
                {"error": "Invalid or expired refresh token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            _clear_auth_cookies(response)
            return response
        response = Response({"detail": "Token refreshed."})
        _set_auth_cookies(response, tokens)
        return response


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfTokenView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"detail": "CSRF cookie set."})


class RegisterView(APIView):
    """POST /api/auth/register/ — Register with email + password."""

    permission_classes = [AllowAny]
    throttle_classes = [AnonAuthThrottle]

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

        # Meta Ads: track registration (server-side, deduplicated by Pixel via event_id)
        try:
            from apps.marketing.meta_capi import track_from_request

            track_from_request(
                request,
                "CompleteRegistration",
                email=user.email,
                external_id=str(user.id),
                custom_data={"method": "email"},
            )
        except Exception:
            logger.exception("Meta CAPI tracking failed for register %s", user.id)

        if auto_verify:
            # DEV: auto-verified, set cookies and return user
            tokens = _get_tokens_for_user(user)
            response = Response(
                {"user": UserSerializer(user).data},
                status=status.HTTP_201_CREATED,
            )
            _set_auth_cookies(response, tokens)
            return response
        else:
            # PROD: send verification email
            token_obj = create_email_verification_token(user)
            email_sent = True
            try:
                email_service.send_verification_email(user, token_obj.token)
            except Exception:
                logger.exception("Could not send verification email to %s", user.email)
                email_sent = False

            return Response(
                {
                    "message": "Cuenta creada. Revisa tu email para verificar tu cuenta."
                    if email_sent
                    else "Cuenta creada, pero no se pudo enviar el email de verificación. Usa 'Reenviar verificación'.",
                    "email_sent": email_sent,
                    "user": UserSerializer(user).data,
                },
                status=status.HTTP_201_CREATED,
            )


class LoginView(APIView):
    """POST /api/auth/login/ — Login with email or username + password, returns JWT."""

    permission_classes = [AllowAny]
    throttle_classes = [AnonAuthThrottle]

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
        response = Response({"user": UserSerializer(user).data})
        _set_auth_cookies(response, tokens)
        return response


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
        response = Response({"user": UserSerializer(user).data})
        _set_auth_cookies(response, tokens)
        return response


class ResendVerificationView(APIView):
    """POST /api/auth/resend-verification/ — Resend verification email."""

    permission_classes = [AllowAny]
    throttle_classes = [ResendEmailThrottle]

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
    throttle_classes = [AnonAuthThrottle]

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
    throttle_classes = [AnonAuthThrottle]

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
            # Generate suggestion (max 20 attempts to avoid infinite loop)
            suggestion = f"{username}{random.randint(10, 999)}"
            max_attempts = 20
            attempt = 0
            while (
                attempt < max_attempts
                and (User.objects.filter(username=suggestion).exists() or suggestion in RESERVED_USERNAMES)
            ):
                suggestion = f"{username}{random.randint(10, 9999)}"
                attempt += 1
            return Response({"available": False, "suggestion": suggestion})

        return Response({"available": True})


class GoogleAuthView(APIView):
    """POST /api/auth/google/ — Authenticate with Google OAuth authorization code."""

    permission_classes = [AllowAny]
    throttle_classes = [AnonAuthThrottle]

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code = serializer.validated_data["code"]
        redirect_uri = serializer.validated_data["redirect_uri"]

        # Exchange the authorization code for tokens
        import httpx

        try:
            token_response = httpx.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
                timeout=10,
            )
            token_data = token_response.json()
        except Exception:
            return Response(
                {"error": "Error al comunicarse con Google."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        access_token = token_data.get("access_token")
        if not access_token:
            logger.warning("Google token exchange failed: %s", token_data)
            return Response(
                {"error": "No se pudo obtener el token de Google."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Use the access_token to get user info from Google's userinfo endpoint
        # This is secure because it's a direct server-to-server HTTPS call.
        try:
            userinfo_response = httpx.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10,
            )
            if userinfo_response.status_code != 200:
                logger.warning("Google userinfo request failed: %s", userinfo_response.text)
                return Response(
                    {"error": "Token de Google inválido."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            idinfo = userinfo_response.json()
        except Exception:
            return Response(
                {"error": "Error al obtener información del usuario de Google."},
                status=status.HTTP_502_BAD_GATEWAY,
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
        else:
            # Meta Ads: track registration via Google
            try:
                from apps.marketing.meta_capi import track_from_request

                track_from_request(
                    request,
                    "CompleteRegistration",
                    email=user.email,
                    external_id=str(user.id),
                    custom_data={"method": "google"},
                )
            except Exception:
                logger.exception("Meta CAPI tracking failed for google-register %s", user.id)

        tokens = _get_tokens_for_user(user)
        response = Response({"user": UserSerializer(user).data, "created": created})
        _set_auth_cookies(response, tokens)
        return response


class ProfileStatsView(APIView):
    """GET /api/auth/profile-stats/ — Aggregated usage statistics for the current user."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.projects.models import Project
        from apps.generation.models import Generation
        from apps.billing.models import CreditGrant

        user = request.user

        total_projects = Project.objects.filter(user=user).count()

        gen_qs = Generation.objects.filter(user=user, status="completed")
        gen_agg = gen_qs.aggregate(
            total_generations=Count("id"),
            total_cost=Sum("cost"),
            total_input_tokens=Sum("input_tokens"),
            total_output_tokens=Sum("output_tokens"),
        )

        favorite_model = (
            gen_qs.values("model")
            .annotate(count=Count("id"))
            .order_by("-count")
            .values_list("model", flat=True)
            .first()
        )

        credits_granted = CreditGrant.objects.filter(user=user).aggregate(
            total=Sum("original_amount")
        )["total"] or 0

        total_tokens = (gen_agg["total_input_tokens"] or 0) + (gen_agg["total_output_tokens"] or 0)
        plan = getattr(user, "plan", None)

        return Response({
            "date_joined": user.date_joined.isoformat(),
            "full_name": user.full_name,
            "auth_provider": user.auth_provider,
            "total_projects": total_projects,
            "total_generations": gen_agg["total_generations"] or 0,
            "total_cost_spent": str(gen_agg["total_cost"] or 0),
            "total_tokens_used": total_tokens,
            "favorite_model": favorite_model or "",
            "credits_granted": str(credits_granted),
            "cancel_at_period_end": plan.cancel_at_period_end if plan else False,
            "cancel_at": plan.cancel_at.isoformat() if (plan and plan.cancel_at) else None,
        })
