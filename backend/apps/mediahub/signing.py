"""Time-limited signed media tokens.

<img>/<video> tags cannot send Authorization headers, so owner-only access
(draft posts, orphan uploads) is granted through short-lived signed query
tokens bound to a specific asset and uploader. Public post media never needs
a token. Tokens expire after an hour and are verified server-side.
"""

from django.core.signing import BadSignature, SignatureExpired, TimestampSigner

_SIGNER_SALT = 'soulcare.media.serve'
PREVIEW_TOKEN_MAX_AGE = 3600


def _signer():
    return TimestampSigner(salt=_SIGNER_SALT)


def sign_media_token(asset_id, user_id):
    return _signer().sign(f'{asset_id}:{user_id}')


def verify_media_token(token, asset_id):
    """Returns the user_id bound in a valid, non-expired token for this
    asset, else None. Bad tokens never raise — they simply deny."""
    if not token or not asset_id:
        return None
    try:
        value = _signer().unsign(token, max_age=PREVIEW_TOKEN_MAX_AGE)
    except (BadSignature, SignatureExpired, Exception):
        return None
    parts = str(value).split(':')
    if len(parts) != 2 or parts[0] != str(asset_id):
        return None
    try:
        return int(parts[1])
    except ValueError:
        return None


def media_preview_url(asset, user_id):
    """Relative preview URL with the owner's signed token attached."""
    return f'/api/media/serve/{asset.id}/?at={sign_media_token(asset.id, user_id)}'
