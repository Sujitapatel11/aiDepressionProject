from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

from apps.community.models import CommunityPost
from apps.identity.models import CreatorPost


def media_upload_path(instance, filename):
    """Safe, date-partitioned storage path: posts/YYYY/MM/<uuid>.<ext>."""
    now = timezone.now()
    return f'posts/{now:%Y}/{now:%m}/{instance.id}.{instance.file_ext}'


class MediaAsset(models.Model):
    """A validated uploaded media file detached from any single post system.

    Uploads start as orphan assets owned by the uploader and are attached to
    an existing CreatorPost or CommunityPost when the post is saved. Serving
    is permission-checked in views; the file itself is never publicly mapped.
    """

    class Kind(models.TextChoices):
        IMAGE = 'image', 'Image'
        VIDEO = 'video', 'Video'

    id = models.UUIDField(primary_key=True, editable=False)
    # file_ext is stored so the storage path can be built before the file is
    # saved (media_upload_path runs prior to file assignment).
    file_ext = models.CharField(max_length=12, editable=False, default='')
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='media_uploads',
    )
    kind = models.CharField(max_length=8, choices=Kind.choices, db_index=True)
    file = models.FileField(upload_to=media_upload_path, max_length=512)
    original_name = models.CharField(max_length=256, blank=True, default='')
    content_type = models.CharField(max_length=128, blank=True, default='')
    size_bytes = models.PositiveBigIntegerField(default=0)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)

    creator_post = models.ForeignKey(
        CreatorPost, on_delete=models.CASCADE, null=True, blank=True,
        related_name='media_assets',
    )
    community_post = models.ForeignKey(
        CommunityPost, on_delete=models.CASCADE, null=True, blank=True,
        related_name='media_assets',
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['creator_post']),
            models.Index(fields=['community_post']),
        ]

    def __str__(self):
        owner = self.user.username if self.user else 'orphan'
        return f'Asset({self.id}, {self.kind}, owner={owner}, {self.size_bytes}B)'


class R2UsageMonth(models.Model):
    """Calendar-month projection of Cloudflare R2 usage (uploads PUTs and
    authorized serve GETs) used for free-tier ceilings and warnings. See
    apps.mediahub.usage for the accounting rules; storage bytes are the
    MediaAsset aggregate, not stored here."""

    month = models.CharField(max_length=7, primary_key=True)  # 'YYYY-MM'
    put_ops = models.PositiveBigIntegerField(default=0)
    get_ops = models.PositiveBigIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'R2Usage({self.month}: put={self.put_ops} get={self.get_ops})'

    class Meta:
        verbose_name = 'R2 usage month'
