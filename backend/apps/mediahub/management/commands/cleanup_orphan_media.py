"""Delete orphan media assets older than the configured grace period.

Orphans = assets with no creator_post and no community_post, i.e. uploads
abandoned before publishing (composer removed, page closed, network drop).

Run manually or from cron:  python manage.py cleanup_orphan_media
"""

from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.mediahub.models import MediaAsset
from apps.mediahub.services import delete_assets_of


class Command(BaseCommand):
    help = 'Delete uploaded media files that were never attached to a post.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours', type=int, default=None,
            help='Grace period in hours (default: settings.MEDIA_ORPHAN_CLEANUP_HOURS)',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Report what would be deleted without deleting.',
        )

    def handle(self, *args, **options):
        hours = options['hours'] or settings.MEDIA_ORPHAN_CLEANUP_HOURS
        cutoff = timezone.now() - timedelta(hours=hours)
        orphans = MediaAsset.objects.filter(
            creator_post__isnull=True,
            community_post__isnull=True,
            created_at__lt=cutoff,
        )
        count = orphans.count()
        bytes_freed = sum(a.size_bytes for a in orphans)
        if options['dry_run']:
            self.stdout.write(f'{count} orphan asset(s) older than {hours}h would be freed.')
        else:
            delete_assets_of(orphans)
            self.stdout.write(f'Deleted {count} orphan asset(s) ({bytes_freed} bytes).')

        # Free-tier monitoring surface: warnings to cron/operators on each run.
        from apps.mediahub.usage import usage_snapshot
        snap = usage_snapshot()
        if snap['r2_active']:
            gb = snap['storage_bytes'] / 1024**3
            self.stdout.write(
                f"R2 usage {snap['month']}: {gb:.2f} GB stored, "
                f"{snap['put_ops']} uploads, {snap['get_ops']} serves.")
            for warning in snap['warnings']:
                self.stdout.write(self.style.WARNING(f'USAGE WARNING: {warning}'))
