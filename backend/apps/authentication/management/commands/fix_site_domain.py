from django.core.management.base import BaseCommand
from django.contrib.sites.models import Site

class Command(BaseCommand):
    help = 'Fix the default Site domain for password reset links'

    def handle(self, *args, **options):
        site, created = Site.objects.get_or_create(id=1)
        site.domain = 'soul-care-one.vercel.app'
        site.name = 'SoulCare'
        site.save()
        self.stdout.write(self.style.SUCCESS(f'Site domain set to {site.domain}'))
