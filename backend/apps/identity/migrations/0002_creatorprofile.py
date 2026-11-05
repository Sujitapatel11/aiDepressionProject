import django.db.models.deletion
import django.db.models.functions.text
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('identity', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='CreatorProfile',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name='ID',
                    ),
                ),
                ('username', models.CharField(db_index=True, max_length=30)),
                ('display_name', models.CharField(max_length=80)),
                ('bio', models.CharField(blank=True, default='', max_length=500)),
                ('avatar', models.URLField(blank=True, default='', max_length=1024)),
                ('cover_image', models.URLField(blank=True, default='', max_length=1024)),
                ('is_active', models.BooleanField(default=True)),
                (
                    'monetization_status',
                    models.CharField(
                        choices=[
                            ('not_eligible', 'Not eligible'),
                            ('pending_review', 'Pending review'),
                            ('eligible', 'Eligible'),
                            ('suspended', 'Suspended'),
                        ],
                        default='not_eligible',
                        max_length=20,
                    ),
                ),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                (
                    'user',
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='creator_profile',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                'ordering': ['username'],
                'constraints': [
                    models.UniqueConstraint(
                        django.db.models.functions.text.Lower('username'),
                        name='creator_profile_username_ci_uniq',
                    ),
                ],
            },
        ),
    ]