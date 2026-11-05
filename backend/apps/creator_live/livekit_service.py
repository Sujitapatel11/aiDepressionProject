"""LiveKit integration service for SoulCare.

Responsibilities:
- Check LiveKit configuration (fail closed when unconfigured).
- Generate short-lived, scoped access tokens for participants.
- Derive deterministic room names from session UUIDs so the backend
  is always the source of truth — clients never supply their own room names.
- Recording is explicitly disabled at the token level; the model flag
  only controls UI display.
- API secret is never returned to any client; it lives only inside
  this module at call time.
"""

import logging
from datetime import timedelta

from django.conf import settings

# Lazy-safe module-level import: livekit.api is only required when LiveKit is
# configured and generate_token() is actually called, but importing at module
# level lets tests patch apps.creator_live.livekit_service.AccessToken and
# apps.creator_live.livekit_service.VideoGrants cleanly.
try:
    from livekit.api import AccessToken, VideoGrants
except ImportError:  # pragma: no cover — only absent in a broken install
    AccessToken = None  # type: ignore[assignment,misc]
    VideoGrants = None  # type: ignore[assignment,misc]

logger = logging.getLogger(__name__)

# Access tokens expire after 2 hours. LiveKit re-validates the token on every
# WebRTC reconnect, so short-lived tokens are safe for long sessions — clients
# reconnect with a fresh token if they exceed this window.
TOKEN_TTL = timedelta(hours=2)


# ─── Configuration guard ────────────────────────────────────────────────────


def is_livekit_configured() -> bool:
    """True only when all three required LiveKit credentials are present."""
    return bool(
        getattr(settings, 'LIVEKIT_URL', '').strip()
        and getattr(settings, 'LIVEKIT_API_KEY', '').strip()
        and getattr(settings, 'LIVEKIT_API_SECRET', '').strip()
    )


def get_livekit_url() -> str:
    """Returns the LiveKit server URL. Raises RuntimeError when unconfigured."""
    url = getattr(settings, 'LIVEKIT_URL', '').strip()
    if not url:
        raise RuntimeError('LIVEKIT_URL is not configured.')
    return url


# ─── Room naming ────────────────────────────────────────────────────────────


def room_name_for_session(session_id) -> str:
    """Deterministic room name derived from the LiveSession UUID.
    Clients never choose their own room name.
    Format: `sc-<uuid>` (prefix avoids accidental collisions with other apps
    on a shared LiveKit instance).
    """
    return f'sc-{session_id}'


# ─── Token generation ────────────────────────────────────────────────────────


def generate_token(
    *,
    session_id,
    user_id: int,
    username: str,
    is_host: bool,
    can_publish: bool,
    can_subscribe: bool,
    can_publish_data: bool = True,
) -> str:
    """Generate a signed LiveKit AccessToken.

    Parameters
    ----------
    session_id : UUID or str
        The LiveSession primary key — used to derive the room name.
    user_id : int
        Django user PK; embedded in token identity so LiveKit can correlate
        participants to SoulCare accounts.
    username : str
        Display identity sent to LiveKit (not the user's real name by default
        — callers should pass a display name or anonymised handle).
    is_host : bool
        When True, grants roomAdmin (can kick, mute, end room, update metadata).
        When False, grants roomJoin only.
    can_publish : bool
        Whether this participant may publish audio/video tracks.
    can_subscribe : bool
        Whether this participant may receive published tracks.
    can_publish_data : bool
        Whether this participant may send data channel messages (reactions,
        chat pings). Defaults True for all roles.

    Returns
    -------
    str
        A signed JWT string ready to pass directly to the LiveKit JS/mobile SDK.
        The API secret is consumed here and never included in the return value.

    Raises
    ------
    RuntimeError
        When LiveKit is not configured (all callers must handle this gracefully).
    """
    if not is_livekit_configured():
        raise RuntimeError(
            'LiveKit is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, '
            'and LIVEKIT_API_SECRET in the environment.'
        )

    if AccessToken is None or VideoGrants is None:  # pragma: no cover
        raise RuntimeError('livekit-api package is not installed.')

    api_key = settings.LIVEKIT_API_KEY.strip()
    api_secret = settings.LIVEKIT_API_SECRET.strip()
    room = room_name_for_session(session_id)

    # Grants — recording is always disabled regardless of model flag
    grants = VideoGrants(
        room=room,
        room_join=True,
        room_admin=is_host,
        can_publish=can_publish,
        can_subscribe=can_subscribe,
        can_publish_data=can_publish_data,
        # Recording grants deliberately omitted — never set room_record=True
        # unless a separately configured recording storage destination exists.
    )

    token = (
        AccessToken(api_key=api_key, api_secret=api_secret)
        .with_identity(str(user_id))
        .with_name(username[:128])  # LiveKit display name cap
        .with_ttl(TOKEN_TTL)
        .with_grants(grants)
        .to_jwt()
    )

    logger.info(
        'LiveKit token issued: session=%s user=%s host=%s publish=%s',
        session_id, user_id, is_host, can_publish,
    )
    return token
