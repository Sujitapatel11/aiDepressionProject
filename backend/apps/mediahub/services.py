"""Attachment helpers shared by the creator and community post systems."""

import logging

from apps.mediahub.models import MediaAsset

logger = logging.getLogger(__name__)


class MediaAttachmentError(Exception):
    """Raised when requested asset IDs cannot be attached to a post."""

    def __init__(self, detail):
        self.detail = detail
        super().__init__(str(detail))


def normalize_asset_ids(asset_ids):
    """De-duplicate IDs while preserving request order.

    Duplicate IDs used to be a silent no-op; normalising here guarantees one
    asset can never be attached twice through a single request.
    """
    seen, ordered = set(), []
    for value in asset_ids or []:
        key = str(value)
        if key not in seen:
            seen.add(key)
            ordered.append(key)
    return ordered


def _check_target(asset, creator_post=None, community_post=None):
    """Return True when the asset can belong to the requested target."""
    target_creator = creator_post.id if creator_post is not None else None
    target_community = community_post.id if community_post is not None else None
    if asset.journal_entry_id:
        return False
    if asset.creator_post_id and asset.creator_post_id != target_creator:
        return False
    if asset.community_post_id and asset.community_post_id != target_community:
        return False
    if target_creator is None and target_community is None:
        return False
    return True


def validate_attachment(asset_ids, user, *, creator_post=None, community_post=None):
    """Validate (without writing) that every requested asset may be attached
    to the target. Raises MediaAttachmentError with per-ID explanations."""
    ids = normalize_asset_ids(asset_ids)
    if not ids:
        return []
    if creator_post is None and community_post is None:
        raise MediaAttachmentError({'detail': 'An attachment target is required.'})

    found = {
        str(asset.id): asset
        for asset in MediaAsset.objects.filter(id__in=ids, user=user)
    }
    missing = [asset_id for asset_id in ids if asset_id not in found]
    if missing:
        raise MediaAttachmentError({
            'media_asset_ids': [
                f'Unknown or unowned media asset: {asset_id}. Upload it from your own account first.'
                for asset_id in missing
            ]
        })

    invalid = [
        asset_id for asset_id, asset in found.items()
        if not _check_target(asset, creator_post=creator_post, community_post=community_post)
    ]
    if invalid:
        raise MediaAttachmentError({
            'media_asset_ids': [
                f'Media asset {asset_id} is already attached to another post or is private journal media.'
                for asset_id in invalid
            ]
        })
    return ids


def attach_media_assets_strict(asset_ids, user, *, creator_post=None, community_post=None):
    """Attach uploader-owned assets, raising MediaAttachmentError with a clear
    per-ID explanation when any requested asset is missing, foreign, already
    attached elsewhere, or journal-private.

    Returns the number of assets attached/verified. Idempotent for assets that
    already belong to the same post.
    """
    ids = validate_attachment(
        asset_ids, user, creator_post=creator_post, community_post=community_post,
    )
    if not ids:
        return 0
    MediaAsset.objects.filter(id__in=ids).update(
        creator_post=creator_post,
        community_post=community_post,
    )
    return len(ids)


def attach_media_assets(asset_ids, user, *, creator_post=None, community_post=None):
    """Backwards-compatible non-raising helper. Prefer the strict variant in
    API views so publishing never silently drops attachments."""
    try:
        return attach_media_assets_strict(
            asset_ids, user, creator_post=creator_post, community_post=community_post
        )
    except MediaAttachmentError as exc:
        logger.warning('Media attachment skipped: %s', exc.detail)
        return 0


def delete_asset_file(asset):
    """Delete one asset's stored object (local/R2 file or Cloudinary object)."""
    if asset.storage_provider == MediaAsset.StorageProvider.CLOUDINARY and asset.cloudinary_public_id:
        from apps.mediahub.cloudinary_service import delete_from_cloudinary
        resource_type = 'video' if asset.kind == MediaAsset.Kind.VIDEO else 'image'
        delete_from_cloudinary(asset.cloudinary_public_id, resource_type)
        return
    if asset.file:
        asset.file.delete(save=False)


def replace_creator_post_assets(post, asset_ids, user):
    """Replace a creator post's attachments. Assets removed from the post
    (or replaced ones) are deleted from storage. Returns post.media_assets."""
    ids = normalize_asset_ids(asset_ids)
    if ids:
        attach_media_assets_strict(ids, user, creator_post=post)

    current = list(post.media_assets.all())
    wanted_ids = set(ids)
    for stale in current:
        if str(stale.id) not in wanted_ids:
            try:
                delete_asset_file(stale)
            except Exception:
                logger.exception('Could not delete removed media object %s', stale.id)
            stale.delete()
    return post.media_assets.all()


def delete_assets_of(queryset):
    """Delete files on storage and rows for the given assets."""
    for asset in queryset:
        try:
            delete_asset_file(asset)
        except Exception:
            logger.exception('Could not delete media object %s', asset.id)
        asset.delete()
