from django.utils import timezone

from apps.users.models import EmailVerificationToken, PasswordResetToken


def create_email_verification_token(user):
    """Create a new email verification token for the user."""
    # Invalidate any existing unused tokens
    EmailVerificationToken.objects.filter(user=user, used=False).update(used=True)

    token = EmailVerificationToken.objects.create(
        user=user,
        expires_at=timezone.now() + timezone.timedelta(hours=24),
    )
    return token


def create_password_reset_token(user):
    """Create a new password reset token for the user."""
    # Invalidate any existing unused tokens
    PasswordResetToken.objects.filter(user=user, used=False).update(used=True)

    token = PasswordResetToken.objects.create(
        user=user,
        expires_at=timezone.now() + timezone.timedelta(hours=1),
    )
    return token
