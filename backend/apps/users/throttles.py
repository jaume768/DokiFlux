from rest_framework.throttling import AnonRateThrottle


class AnonAuthThrottle(AnonRateThrottle):
    """Rate limit for public auth endpoints (register, login, password reset)."""

    scope = "anon_auth"


class ResendEmailThrottle(AnonRateThrottle):
    """Stricter rate limit for resend-verification endpoint."""

    scope = "resend_email"


class TokenRefreshThrottle(AnonRateThrottle):
    """Rate limit refresh attempts by client IP."""

    scope = "token_refresh"
