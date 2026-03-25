import logging

from django.conf import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending transactional emails via Brevo (Sendinblue)."""

    def __init__(self):
        self._client = None

    def _get_client(self):
        """Lazy-initialize the Brevo API client."""
        if self._client is None and settings.BREVO_API_KEY:
            import sib_api_v3_sdk

            configuration = sib_api_v3_sdk.Configuration()
            configuration.api_key["api-key"] = settings.BREVO_API_KEY
            self._client = sib_api_v3_sdk.TransactionalEmailsApi(
                sib_api_v3_sdk.ApiClient(configuration)
            )
        return self._client

    def send_verification_email(self, user, token):
        """Send email verification link to user."""
        if settings.AUTO_VERIFY_EMAIL:
            logger.info(
                "[DEV] Auto-verify active — skipping verification email for %s (token: %s)",
                user.email,
                token,
            )
            return

        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"

        self._send_email(
            to_email=user.email,
            to_name=user.full_name or user.email,
            subject="Verifica tu cuenta en Dokiflux",
            html_content=(
                f"<h2>¡Bienvenido a Dokiflux!</h2>"
                f"<p>Haz clic en el siguiente enlace para verificar tu email:</p>"
                f'<p><a href="{verification_url}">Verificar mi cuenta</a></p>'
                f"<p>Este enlace expira en 24 horas.</p>"
                f"<p>Si no creaste esta cuenta, ignora este email.</p>"
            ),
        )

    def send_password_reset_email(self, user, token):
        """Send password reset link to user."""
        if settings.AUTO_VERIFY_EMAIL:
            logger.info(
                "[DEV] Auto-verify active — skipping password reset email for %s (token: %s)",
                user.email,
                token,
            )
            return

        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"

        self._send_email(
            to_email=user.email,
            to_name=user.full_name or user.email,
            subject="Restablece tu contraseña en Dokiflux",
            html_content=(
                f"<h2>Restablecer contraseña</h2>"
                f"<p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>"
                f'<p><a href="{reset_url}">Restablecer contraseña</a></p>'
                f"<p>Este enlace expira en 1 hora.</p>"
                f"<p>Si no solicitaste este cambio, ignora este email.</p>"
            ),
        )

    def _send_email(self, to_email, to_name, subject, html_content):
        """Send an email using the Brevo API."""
        client = self._get_client()
        if client is None:
            logger.warning("Brevo API key not configured — email not sent to %s", to_email)
            return

        import sib_api_v3_sdk

        send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
            to=[{"email": to_email, "name": to_name}],
            sender={"email": settings.BREVO_SENDER_EMAIL, "name": settings.BREVO_SENDER_NAME},
            subject=subject,
            html_content=html_content,
        )

        try:
            client.send_transac_email(send_smtp_email)
            logger.info("Email sent to %s: %s", to_email, subject)
        except Exception:
            logger.exception("Failed to send email to %s", to_email)
            raise


email_service = EmailService()
