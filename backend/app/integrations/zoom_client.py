"""Minimal Zoom Server-to-Server OAuth client.

Free Zoom plans support creating meetings and (most) event webhooks. The
participant Report API requires a paid plan, so get_participants_report
degrades gracefully (returns None) instead of raising.

All credentials are read from settings (env). When they are unset, the client
raises ZoomNotConfigured so callers can return a clear 503 instead of crashing.
"""
import base64
import hashlib
import hmac
import time
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger("zoom")

OAUTH_URL = "https://zoom.us/oauth/token"
API_BASE = "https://api.zoom.us/v2"

_token_cache: dict = {"access_token": None, "expires_at": 0.0}


class ZoomNotConfigured(RuntimeError):
    pass


class ZoomError(RuntimeError):
    pass


def is_configured() -> bool:
    return bool(settings.ZOOM_ACCOUNT_ID and settings.ZOOM_CLIENT_ID and settings.ZOOM_CLIENT_SECRET)


async def _get_access_token() -> str:
    if not is_configured():
        raise ZoomNotConfigured("Zoom credentials are not configured")

    now = time.time()
    if _token_cache["access_token"] and _token_cache["expires_at"] - 60 > now:
        return _token_cache["access_token"]

    basic = base64.b64encode(
        f"{settings.ZOOM_CLIENT_ID}:{settings.ZOOM_CLIENT_SECRET}".encode()
    ).decode()
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            OAUTH_URL,
            headers={"Authorization": f"Basic {basic}"},
            params={
                "grant_type": "account_credentials",
                "account_id": settings.ZOOM_ACCOUNT_ID,
            },
        )
    if resp.status_code != 200:
        raise ZoomError(f"Zoom token request failed: {resp.status_code} {resp.text}")
    data = resp.json()
    _token_cache["access_token"] = data["access_token"]
    _token_cache["expires_at"] = now + float(data.get("expires_in", 3600))
    return _token_cache["access_token"]


async def create_meeting(topic: str, start_time: str, duration_minutes: int,
                         agenda: str | None = None, timezone_name: str = "UTC",
                         host: str | None = None, invitee_emails: list[str] | None = None) -> dict:
    """Create a scheduled meeting hosted by `host` (a Zoom user id/email; falls back
    to ZOOM_HOST_USER or "me"). start_time is a local wall-clock time (no offset)
    interpreted in timezone_name. invitee_emails are added as Zoom meeting invitees.
    Returns the Zoom meeting object."""
    token = await _get_access_token()
    settings_obj = {
        "join_before_host": True,
        "waiting_room": False,
        "approval_type": 2,
    }
    if invitee_emails:
        # dedupe, drop blanks, preserve order
        seen, clean = set(), []
        for e in invitee_emails:
            if e and e not in seen:
                seen.add(e)
                clean.append({"email": e})
        settings_obj["meeting_invitees"] = clean
    body = {
        "topic": topic,
        "type": 2,  # scheduled
        "start_time": start_time,
        "duration": duration_minutes,
        "timezone": timezone_name,
        "agenda": agenda or "",
        "settings": settings_obj,
    }
    host = host or settings.ZOOM_HOST_USER or "me"

    async def _post(host_id: str):
        async with httpx.AsyncClient(timeout=20) as client:
            return await client.post(
                f"{API_BASE}/users/{host_id}/meetings",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json=body,
            )

    resp = await _post(host)
    # Free plan / user not on the Zoom account → host as the account owner instead
    # of failing the whole request.
    if resp.status_code == 404 and host != "me":
        logger.warning("Zoom host '%s' not found; falling back to account owner", host)
        resp = await _post("me")

    if resp.status_code not in (200, 201):
        raise ZoomError(f"Zoom create meeting failed: {resp.status_code} {resp.text}")
    return resp.json()


async def get_participants_report(zoom_meeting_id: str) -> list[dict] | None:
    """Past-meeting participant report. Paid-plan only — returns None on free
    plans (or any failure) so the caller can fall back to webhook data."""
    try:
        token = await _get_access_token()
    except ZoomNotConfigured:
        return None
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(
            f"{API_BASE}/report/meetings/{zoom_meeting_id}/participants",
            headers={"Authorization": f"Bearer {token}"},
            params={"page_size": 300},
        )
    if resp.status_code != 200:
        logger.warning("Zoom participant report unavailable (%s): %s", resp.status_code, resp.text[:200])
        return None
    return resp.json().get("participants", [])


# ── Webhook helpers ────────────────────────────────────────────

def verify_webhook_signature(raw_body: bytes, signature: str | None, timestamp: str | None) -> bool:
    """Validate Zoom's x-zm-signature header. If no secret token is configured,
    skip verification (return True) so local/dev setups still work."""
    if not settings.ZOOM_WEBHOOK_SECRET_TOKEN:
        return True
    if not signature or not timestamp:
        return False
    message = f"v0:{timestamp}:{raw_body.decode('utf-8')}"
    digest = hmac.new(
        settings.ZOOM_WEBHOOK_SECRET_TOKEN.encode(), message.encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"v0={digest}", signature)


def url_validation_response(plain_token: str) -> dict:
    """Build the CRC response Zoom expects for endpoint.url_validation events."""
    encrypted = hmac.new(
        settings.ZOOM_WEBHOOK_SECRET_TOKEN.encode(), plain_token.encode(), hashlib.sha256
    ).hexdigest()
    return {"plainToken": plain_token, "encryptedToken": encrypted}
