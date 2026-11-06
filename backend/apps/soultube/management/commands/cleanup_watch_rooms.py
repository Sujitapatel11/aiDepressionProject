"""Close expired SoulTube rooms and optionally purge old closed-room data.

Usage:
    python manage.py cleanup_watch_rooms
    python manage.py cleanup_watch_rooms --purge-days 7
"""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.soultube.models import WatchRoom


class Command(BaseCommand):
    help = 'Close expired SoulTube watch rooms and optionally purge old closed rooms.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--purge-days', type=int, default=0,
            help='Delete closed rooms older than N days (default: keep them).',
        )

    def handle(self, *args, **options):
        now = timezone.now()
        expired = WatchRoom.objects.filter(
            status=WatchRoom.Status.ACTIVE,
            expires_at__lte=now,
        )
        closed_count = expired.update(status=WatchRoom.Status.CLOSED, closed_at=now)
        self.stdout.write(f'Closed {closed_count} expired room(s).')

        purge_days = options.get('purge_days') or 0
        if purge_days > 0:
            cutoff = now - timedelta(days=purge_days)
            stale = WatchRoom.objects.filter(
                status=WatchRoom.Status.CLOSED,
                closed_at__lt=cutoff,
            )
            deleted_count = stale.count()
            stale.delete()
            self.stdout.write(f'Purged {deleted_count} closed room(s) older than {purge_days} day(s).')
