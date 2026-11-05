"""Initial migration for the creator_live app.

Creates: CreatorPlan, CreatorSubscription, LiveSession,
         LiveSessionAudience, LiveParticipant.
"""

import uuid
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='CreatorPlan',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.SlugField(max_length=40, unique=True)),
                ('name', models.CharField(max_length=80)),
                ('description', models.TextField(blank=True, default='')),
                ('price_minor', models.PositiveBigIntegerField(default=0)),
                ('currency', models.CharField(default='INR', max_length=3)),
                ('billing_interval', models.CharField(
                    choices=[('monthly', 'Monthly'), ('yearly', 'Yearly'), ('none', 'No billing')],
                    default='none', max_length=16,
                )),
                ('monthly_broadcast_limit', models.PositiveIntegerField(
                    blank=True, null=True,
                    help_text='Maximum broadcasts in a billing month; null means unlimited.',
                )),
                ('max_duration_minutes', models.PositiveIntegerField(
                    blank=True, null=True,
                    help_text='Maximum duration per broadcast; null means unlimited.',
                )),
                ('max_viewers', models.PositiveIntegerField(
                    blank=True, null=True,
                    help_text='Maximum concurrent viewers; null means provider/platform limit.',
                )),
                ('features', models.JSONField(blank=True, default=dict)),
                ('is_free', models.BooleanField(default=False)),
                ('is_active', models.BooleanField(db_index=True, default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['price_minor', 'name'],
            },
        ),
        migrations.AddConstraint(
            model_name='creatorplan',
            constraint=models.CheckConstraint(
                check=models.Q(price_minor__gte=0),
                name='creator_plan_price_nonnegative',
            ),
        ),

        migrations.CreateModel(
            name='CreatorSubscription',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('creator', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='creator_live_subscriptions',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('plan', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='subscriptions',
                    to='creator_live.creatorplan',
                )),
                ('status', models.CharField(
                    choices=[
                        ('pending', 'Pending'), ('active', 'Active'), ('past_due', 'Past due'),
                        ('canceled', 'Canceled'), ('expired', 'Expired'), ('trialing', 'Trialing'),
                    ],
                    db_index=True, default='pending', max_length=16,
                )),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('current_period_start', models.DateTimeField(blank=True, null=True)),
                ('current_period_end', models.DateTimeField(blank=True, db_index=True, null=True)),
                ('cancel_at_period_end', models.BooleanField(default=False)),
                ('canceled_at', models.DateTimeField(blank=True, null=True)),
                ('provider', models.CharField(blank=True, default='', max_length=32)),
                ('provider_customer_id', models.CharField(blank=True, default='', max_length=128)),
                ('provider_subscription_id', models.CharField(blank=True, default='', max_length=128)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='creatorsubscription',
            index=models.Index(fields=['creator', 'status'], name='creator_sub_creator_idx'),
        ),
        migrations.AddIndex(
            model_name='creatorsubscription',
            index=models.Index(fields=['status', 'current_period_end'], name='creator_sub_status_period_idx'),
        ),
        migrations.AddConstraint(
            model_name='creatorsubscription',
            constraint=models.UniqueConstraint(
                fields=['provider', 'provider_subscription_id'],
                condition=~models.Q(provider_subscription_id=''),
                name='creator_subscription_provider_id_uniq',
            ),
        ),

        migrations.CreateModel(
            name='LiveSession',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('creator', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='hosted_live_sessions',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('title', models.CharField(max_length=120)),
                ('description', models.TextField(blank=True, default='')),
                ('category', models.CharField(blank=True, db_index=True, default='', max_length=64)),
                ('thumbnail_url', models.URLField(blank=True, default='', max_length=1024)),
                ('mode', models.CharField(
                    choices=[('audio', 'Audio'), ('video', 'Video'), ('audio_video', 'Audio and video')],
                    default='audio_video', max_length=16,
                )),
                ('audience_type', models.CharField(
                    choices=[
                        ('public', 'Public'), ('followers', 'Followers'), ('subscribers', 'Fan subscribers'),
                        ('private', 'Invite only'), ('community', 'Community members'),
                    ],
                    db_index=True, default='public', max_length=16,
                )),
                ('status', models.CharField(
                    choices=[
                        ('draft', 'Draft'), ('scheduled', 'Scheduled'), ('live', 'Live'),
                        ('paused', 'Paused'), ('ended', 'Ended'), ('canceled', 'Canceled'),
                    ],
                    db_index=True, default='draft', max_length=16,
                )),
                ('comments_enabled', models.BooleanField(default=True)),
                ('reactions_enabled', models.BooleanField(default=True)),
                ('speaking_requests_enabled', models.BooleanField(default=False)),
                ('recording_enabled', models.BooleanField(default=False)),
                ('recording_consent_confirmed', models.BooleanField(default=False)),
                ('scheduled_at', models.DateTimeField(blank=True, db_index=True, null=True)),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('ended_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='livesession',
            index=models.Index(
                fields=['status', 'audience_type', '-created_at'],
                name='live_session_status_aud_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='livesession',
            index=models.Index(fields=['creator', '-created_at'], name='live_session_creator_idx'),
        ),
        migrations.AddConstraint(
            model_name='livesession',
            constraint=models.CheckConstraint(
                check=models.Q(ended_at__isnull=True) | models.Q(started_at__isnull=False),
                name='live_session_end_requires_start',
            ),
        ),

        migrations.CreateModel(
            name='LiveSessionAudience',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('session', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='audience_invites',
                    to='creator_live.livesession',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='live_session_invitations',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('invited_by', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='sent_live_invitations',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('status', models.CharField(
                    choices=[
                        ('invited', 'Invited'), ('accepted', 'Accepted'),
                        ('declined', 'Declined'), ('revoked', 'Revoked'),
                    ],
                    db_index=True, default='invited', max_length=16,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('responded_at', models.DateTimeField(blank=True, null=True)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='livesessionaudience',
            constraint=models.UniqueConstraint(
                fields=['session', 'user'],
                name='live_session_audience_user_uniq',
            ),
        ),

        migrations.CreateModel(
            name='LiveParticipant',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('session', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='participants',
                    to='creator_live.livesession',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='live_participations',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('role', models.CharField(
                    choices=[('viewer', 'Viewer'), ('listener', 'Listener'), ('speaker', 'Speaker')],
                    default='viewer', max_length=12,
                )),
                ('joined_at', models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
                ('left_at', models.DateTimeField(blank=True, null=True)),
                ('is_muted', models.BooleanField(default=False)),
                ('removed_at', models.DateTimeField(blank=True, null=True)),
            ],
            options={
                'ordering': ['joined_at'],
            },
        ),
        migrations.AddIndex(
            model_name='liveparticipant',
            index=models.Index(fields=['session', 'left_at'], name='live_part_session_left_idx'),
        ),
        migrations.AddIndex(
            model_name='liveparticipant',
            index=models.Index(fields=['user', '-joined_at'], name='live_part_user_joined_idx'),
        ),
        migrations.AddConstraint(
            model_name='liveparticipant',
            constraint=models.UniqueConstraint(
                fields=['session', 'user'],
                condition=models.Q(left_at__isnull=True),
                name='live_one_active_participation_per_user',
            ),
        ),
    ]
