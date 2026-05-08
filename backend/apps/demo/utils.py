"""Anti-abuse helpers for demo mode: IP hashing, quota checks, client identity."""
import hashlib
import ipaddress
import logging
from datetime import timedelta

from django.conf import settings
from django.utils.timezone import now

logger = logging.getLogger(__name__)


# Demo tunables (override via settings if needed)
DEMO_INITIAL_CREDITS = getattr(settings, "DEMO_INITIAL_CREDITS", 2.0)  # EUR/USD units
DEMO_MAX_SESSIONS_PER_IP_24H = getattr(settings, "DEMO_MAX_SESSIONS_PER_IP_24H", 3)
DEMO_MAX_SESSIONS_PER_FP_24H = getattr(settings, "DEMO_MAX_SESSIONS_PER_FP_24H", 1)
DEMO_COOKIE_NAME = "demo_session"
DEMO_COOKIE_MAX_AGE = 60 * 60 * 24 * 30  # 30 days
DEMO_SIGNUP_BONUS_CREDITS = getattr(settings, "DEMO_SIGNUP_BONUS_CREDITS", 3.0)


def is_dev_mode() -> bool:
    """True when demo anti-abuse should be bypassed (defaults to DEBUG)."""
    configured = getattr(settings, "DEMO_DEV_MODE", None)
    if configured is None:
        return bool(settings.DEBUG)
    return bool(configured)


def _salt() -> bytes:
    raw = getattr(settings, "DEMO_IP_SALT", None) or settings.SECRET_KEY
    return (raw + "::demo").encode("utf-8")


def hash_ip(raw_ip: str) -> str:
    """SHA-256 hash of IP + server salt. Never store raw IPs."""
    if not raw_ip:
        raw_ip = "unknown"
    return hashlib.sha256(_salt() + raw_ip.encode("utf-8")).hexdigest()


def hash_fingerprint(raw_fp: str) -> str:
    if not raw_fp:
        return ""
    return hashlib.sha256(_salt() + raw_fp.encode("utf-8")).hexdigest()


def get_client_ip(request) -> str:
    """
    Extract client IP. Only trust X-Forwarded-For when behind a known proxy.
    In dev (DEBUG=True) we always use X-Forwarded-For / REMOTE_ADDR.
    """
    trusted = getattr(settings, "TRUSTED_PROXIES", [])
    remote_addr = request.META.get("REMOTE_ADDR", "")
    trust_forwarded = settings.DEBUG or _is_trusted_proxy(remote_addr, trusted)
    if trust_forwarded:
        xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
        if xff:
            return xff.split(",")[0].strip()
    return remote_addr or "unknown"


def _is_trusted_proxy(remote_addr: str, trusted: list[str]) -> bool:
    if not trusted or not remote_addr:
        return False
    if "*" in trusted:
        return True
    if remote_addr in trusted:
        return True
    try:
        remote_ip = ipaddress.ip_address(remote_addr)
    except ValueError:
        return False
    for item in trusted:
        try:
            if "/" in item and remote_ip in ipaddress.ip_network(item, strict=False):
                return True
        except ValueError:
            continue
    return False


def over_ip_quota(ip_hash: str) -> bool:
    if is_dev_mode():
        return False
    if DEMO_MAX_SESSIONS_PER_IP_24H <= 0:
        return False
    from .models import DemoSession
    since = now() - timedelta(hours=24)
    count = DemoSession.objects.filter(
        ip_hash=ip_hash, created_at__gte=since
    ).count()
    return count >= DEMO_MAX_SESSIONS_PER_IP_24H


def over_fingerprint_quota(fp_hash: str) -> bool:
    if is_dev_mode():
        return False
    if not fp_hash:
        return False
    from .models import DemoSession
    since = now() - timedelta(hours=24)
    count = DemoSession.objects.filter(
        fingerprint_hash=fp_hash, created_at__gte=since
    ).count()
    return count >= DEMO_MAX_SESSIONS_PER_FP_24H


def set_demo_cookie(response, session_id: str):
    """Attach the demo_session cookie to the response. httpOnly, SameSite=Lax."""
    response.set_cookie(
        DEMO_COOKIE_NAME,
        value=str(session_id),
        max_age=DEMO_COOKIE_MAX_AGE,
        path="/",
        secure=not settings.DEBUG,
        httponly=True,
        samesite="Lax",
    )


def clear_demo_cookie(response):
    response.delete_cookie(DEMO_COOKIE_NAME, path="/")
