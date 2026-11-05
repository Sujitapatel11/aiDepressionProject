"""Attachment helpers shared by the creator and community post systems."""

from django.db import transaction

from apps.mediahub.models import MediaAsset


def attach_media_assets(asset_ids, user, *, creator_post=None, community_post=None):
    """Attach uploader-owned orphan assets to a post (idempotent, ignores
    foreign or already-attached assets). Returns the attached queryset."""
    if not asset_ids:
        return MediaAsset.objects.none()
    return MediaAsset.objects.filter(
        id__in=asset_ids,
        user=user,
        creator_post__isnull=True,
        community_post__isnull=True,
    ).update(
        creator_post=creator_post,
        community_post=community_post,
    )


def replace_creator_post_assets(post, asset_ids, user):
    """Replace a creator post's attachments. Assets removed from the post
    (or replaced ones) are deleted from storage. Returns post.media_assets."""
    current = list(post.media_assets.all())
    wanted = []
    for asset_id in asset_ids or []:
        asset = MediaAsset.objects.filter(
            id=asset_id, user=user,
        ).first()
        if asset and asset.creator_post_id == post.id:
            wanted.append(asset)
        elif asset and not asset.creator_post_id and not asset.community_post_id:
            asset.creator_post = post
            asset.save(update_fields=['creator_post'])
            wanted.append(asset)
    current_ids = {a.id for a in wanted}
    for stale in current:
        if stale.id not in current_ids:
            stale.file.delete(save=False)
            stale.delete()
    return post.media_assets.all()


def delete_assets_of(queryset):
    """Delete files on storage and rows for the given assets."""
    for asset in queryset:
        asset.file.delete(save=False)
        asset.delete()
