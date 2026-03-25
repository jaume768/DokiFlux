from django.contrib.auth import get_user_model
from rest_framework import serializers

from .validators import validate_username

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user profile (GET /api/auth/me/)."""

    has_completed_onboarding = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "username", "full_name",
            "is_email_verified", "auth_provider", "date_joined",
            "has_completed_onboarding",
        ]
        read_only_fields = [
            "id", "email", "is_email_verified", "auth_provider",
            "date_joined", "has_completed_onboarding",
        ]


class RegisterSerializer(serializers.Serializer):
    """Serializer for POST /api/auth/register/."""

    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    full_name = serializers.CharField(max_length=150)

    def validate_email(self, value):
        email = value.lower().strip()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("Ya existe una cuenta con este email.")
        return email


class LoginSerializer(serializers.Serializer):
    """Serializer for POST /api/auth/login/."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class SetUsernameSerializer(serializers.Serializer):
    """Serializer for POST /api/auth/set-username/."""

    username = serializers.CharField(max_length=30)

    def validate_username(self, value):
        value = value.lower().strip()
        validate_username(value)
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Este username ya está en uso.")
        return value


class CheckUsernameSerializer(serializers.Serializer):
    """Serializer for GET /api/auth/check-username/{username}/."""

    username = serializers.CharField(max_length=30)


class VerifyEmailSerializer(serializers.Serializer):
    """Serializer for POST /api/auth/verify-email/."""

    token = serializers.UUIDField()


class ResendVerificationSerializer(serializers.Serializer):
    """Serializer for POST /api/auth/resend-verification/."""

    email = serializers.EmailField()


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for POST /api/auth/password-reset/."""

    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for POST /api/auth/password-reset-confirm/."""

    token = serializers.UUIDField()
    new_password = serializers.CharField(min_length=8, write_only=True)


class GoogleAuthSerializer(serializers.Serializer):
    """Serializer for POST /api/auth/google/."""

    id_token = serializers.CharField()


class UpdateProfileSerializer(serializers.ModelSerializer):
    """Serializer for PATCH /api/auth/me/."""

    class Meta:
        model = User
        fields = ["full_name"]
