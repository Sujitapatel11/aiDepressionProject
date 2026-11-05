"""Add storage/Cloudinary fields and journal_entry FK to MediaAsset.

These fields were added to MediaAsset after 0001_initial was generated:
  - storage_provider  (CharField, db_index)
  - cloudinary_public_id (CharField, db_index)
  - secure_url        (URLField)
  - thumbnail_url     (URLField)
  - duration          (FloatField, nullable)
  - visibility        (CharField, db_index)
  - journal_entry     (ForeignKey → journal.JournalEntry, nullable)

Also aligns the `file` field to be nullable (blank=True, null=True) to allow
Cloudinary assets that have no local file, and adds the two missing composite
indexes that reference the new columns.
"""

import apps.mediahub.models
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mediahub', '0002_r2usagemonth'),
        ('journal', '0002_journalentry_journal_jou_user_id_0b563a_idx'),
    ]

    operations = [
        # 1 — storage_provider
        migrations.AddField(
            model_name='mediaasset',
            name='storage_provider',
            field=models.CharField(
                choices=[('local', 'Local/Volume'), ('r2', 'Cloudflare R2'), ('cloudinary', 'Cloudinary')],
                db_index=True,
                default='local',
                max_length=16,
            ),
        ),
        # 2 — cloudinary_public_id
        migrations.AddField(
            model_name='mediaasset',
            name='cloudinary_public_id',
            field=models.CharField(blank=True, db_index=True, default='', max_length=256),
        ),
        # 3 — secure_url
        migrations.AddField(
            model_name='mediaasset',
            name='secure_url',
            field=models.URLField(blank=True, default='', max_length=1024),
        ),
        # 4 — thumbnail_url
        migrations.AddField(
            model_name='mediaasset',
            name='thumbnail_url',
            field=models.URLField(blank=True, default='', max_length=1024),
        ),
        # 5 — duration
        migrations.AddField(
            model_name='mediaasset',
            name='duration',
            field=models.FloatField(blank=True, null=True),
        ),
        # 6 — visibility
        migrations.AddField(
            model_name='mediaasset',
            name='visibility',
            field=models.CharField(
                choices=[('public', 'Public'), ('private', 'Private'), ('unlisted', 'Unlisted')],
                db_index=True,
                default='public',
                max_length=12,
            ),
        ),
        # 7 — journal_entry FK
        migrations.AddField(
            model_name='mediaasset',
            name='journal_entry',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='media_assets',
                to='journal.journalentry',
            ),
        ),
        # 8 — make file nullable (Cloudinary assets have no local file)
        migrations.AlterField(
            model_name='mediaasset',
            name='file',
            field=models.FileField(
                blank=True,
                max_length=512,
                null=True,
                upload_to=apps.mediahub.models.media_upload_path,
            ),
        ),
        # 9 — composite index on [storage_provider, created_at]
        migrations.AddIndex(
            model_name='mediaasset',
            index=models.Index(
                fields=['storage_provider', 'created_at'],
                name='mediahub_storage_created_idx',
            ),
        ),
        # 10 — index on [journal_entry]
        migrations.AddIndex(
            model_name='mediaasset',
            index=models.Index(
                fields=['journal_entry'],
                name='mediahub_me_journal_entry_idx',
            ),
        ),
    ]
