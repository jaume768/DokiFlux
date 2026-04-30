"""
Meta Conversions API (CAPI) integration.

Sends server-side events to Meta in parallel to the browser Pixel so we can
track registrations and demo starts even when iOS/adblockers block the Pixel.
Events are deduplicated by Meta when both sides share the same `event_id`.

Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
"""
from __future__ import annotations

import hashlib
import logging
import time
import uuid
from typing import Any

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

GRAPH_API_VERSION = "v21.0"
TIMEOUT_SECONDS = 5


def _hash(value: str | None) -> str | None:
    if not value:
        return None
    return hashlib.sha256(value.strip().lower().encode("utf-8")).hexdigest()


def _client_ip(request) -> str | None:
    if not request:
        return None
    fwd = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _user_agent(request) -> str | None:
    if not request:
        return None
    return request.META.get("HTTP_USER_AGENT")


def extract_meta_context(request) -> dict[str, Any]:
    """Extract Meta tracking context (event_id, fbp, fbc, ip, ua) from a DRF request.

    Frontend sends:
    - X-Meta-Event-Id: UUID generated client-side (for dedup with Pixel)
    - X-Meta-Fbp / X-Meta-Fbc: values of `_fbp` / `_fbc` cookies
    """
    headers = getattr(request, "headers", {}) if request else {}
    cookies = getattr(request, "COOKIES", {}) if request else {}
    return {
        "event_id": headers.get("X-Meta-Event-Id") or str(uuid.uuid4()),
        "fbp": headers.get("X-Meta-Fbp") or cookies.get("_fbp"),
        "fbc": headers.get("X-Meta-Fbc") or cookies.get("_fbc"),
        "ip": _client_ip(request),
        "ua": _user_agent(request),
    }


def send_event(
    event_name: str,
    *,
    event_id: str,
    email: str | None = None,
    external_id: str | None = None,
    fbp: str | None = None,
    fbc: str | None = None,
    ip: str | None = None,
    user_agent: str | None = None,
    custom_data: dict[str, Any] | None = None,
    event_source_url: str | None = None,
) -> bool:
    """Send a single event to Meta CAPI. Returns True on HTTP 200, False otherwise.

    Silently no-ops if META_PIXEL_ID or META_CAPI_TOKEN are not configured.
    Errors are logged but never raised — tracking must never break the request.
    """
    pixel_id = getattr(settings, "META_PIXEL_ID", "")
    token = getattr(settings, "META_CAPI_TOKEN", "")
    if not pixel_id or not token:
        logger.debug("Meta CAPI not configured — skipping event %s", event_name)
        return False

    user_data: dict[str, Any] = {}
    if email:
        user_data["em"] = [_hash(email)]
    if external_id:
        user_data["external_id"] = [_hash(external_id)]
    if fbp:
        user_data["fbp"] = fbp
    if fbc:
        user_data["fbc"] = fbc
    if ip:
        user_data["client_ip_address"] = ip
    if user_agent:
        user_data["client_user_agent"] = user_agent

    event: dict[str, Any] = {
        "event_name": event_name,
        "event_time": int(time.time()),
        "event_id": event_id,
        "action_source": "website",
        "user_data": user_data,
    }
    if event_source_url:
        event["event_source_url"] = event_source_url
    if custom_data:
        event["custom_data"] = custom_data

    payload: dict[str, Any] = {"data": [event], "access_token": token}
    test_code = getattr(settings, "META_CAPI_TEST_EVENT_CODE", "")
    if test_code:
        payload["test_event_code"] = test_code

    url = f"https://graph.facebook.com/{GRAPH_API_VERSION}/{pixel_id}/events"
    try:
        resp = requests.post(url, json=payload, timeout=TIMEOUT_SECONDS)
        if resp.status_code != 200:
            logger.warning(
                "Meta CAPI %s failed [%s]: %s", event_name, resp.status_code, resp.text[:300]
            )
            return False
        return True
    except requests.RequestException:
        logger.exception("Meta CAPI %s request error", event_name)
        return False


def track_from_request(
    request,
    event_name: str,
    *,
    email: str | None = None,
    external_id: str | None = None,
    custom_data: dict[str, Any] | None = None,
) -> bool:
    """Convenience: extract context from request + send event in one call."""
    ctx = extract_meta_context(request)
    referer = request.META.get("HTTP_REFERER") if request else None
    return send_event(
        event_name,
        event_id=ctx["event_id"],
        email=email,
        external_id=external_id,
        fbp=ctx["fbp"],
        fbc=ctx["fbc"],
        ip=ctx["ip"],
        user_agent=ctx["ua"],
        custom_data=custom_data,
        event_source_url=referer,
    )
