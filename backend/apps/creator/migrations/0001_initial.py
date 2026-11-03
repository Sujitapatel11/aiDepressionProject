# Initial creator platform schema.
import uuid
from decimal import Decimal
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.core.validators

class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.CreateModel(
            name="CreatorProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("display_name", models.CharField(max_length=80)),
                ("bio", models.CharField(blank=True, default="", max_length=500)),
                ("is_enabled", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="creator_profile", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name="CreatorPost",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=160)),
                ("body", models.TextField(max_length=20000)),
                ("status", models.CharField(choices=[("draft", "Draft"), ("published", "Published"), ("archived", "Archived")], db_index=True, default="draft", max_length=12)),
                ("published_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("creator", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="posts", to="creator.creatorprofile")),
            ],
            options={"ordering": ["-published_at", "-created_at"]},
        ),
        migrations.CreateModel(
            name="AdRevenueEvent",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("provider", models.CharField(max_length=40)),
                ("provider_event_id", models.CharField(max_length=160, unique=True)),
                ("gross_amount", models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(Decimal("0.01"))])),
                ("currency", models.CharField(default="USD", max_length=3)),
                ("occurred_at", models.DateTimeField()),
                ("verified", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("post", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="ad_revenue_events", to="creator.creatorpost")),
            ],
        ),
        migrations.CreateModel(
            name="CreatorEarning",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("gross_amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("share_rate", models.DecimalField(decimal_places=4, default=Decimal("0.5000"), max_digits=5)),
                ("creator_amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("currency", models.CharField(max_length=3)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("creator", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="earnings", to="creator.creatorprofile")),
                ("post", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="earnings", to="creator.creatorpost")),
                ("revenue_event", models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name="earning", to="creator.adrevenueevent")),
            ],
        ),
        migrations.CreateModel(
            name="CreatorWithdrawal",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(Decimal("1.00"))])),
                ("currency", models.CharField(default="USD", max_length=3)),
                ("status", models.CharField(choices=[("requested", "Requested"), ("approved", "Approved"), ("rejected", "Rejected")], db_index=True, default="requested", max_length=12)),
                ("admin_note", models.CharField(blank=True, default="", max_length=500)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("creator", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="withdrawals", to="creator.creatorprofile")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="CreatorSettlement",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("currency", models.CharField(max_length=3)),
                ("period_start", models.DateField()),
                ("period_end", models.DateField()),
                ("total_amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("status", models.CharField(choices=[("prepared", "Prepared"), ("paid", "Paid")], db_index=True, default="prepared", max_length=12)),
                ("payout_reference", models.CharField(blank=True, default="", max_length=160)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("paid_at", models.DateTimeField(blank=True, null=True)),
                ("creator", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="settlements", to="creator.creatorprofile")),
            ],
            options={"ordering": ["-period_start", "creator_id", "currency"]},
        ),
        migrations.CreateModel(
            name="CreatorSettlementLine",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("earning", models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name="settlement_line", to="creator.creatorearning")),
                ("settlement", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="lines", to="creator.creatorsettlement")),
            ],
        ),
        migrations.AddConstraint(
            model_name="creatorsettlement",
            constraint=models.UniqueConstraint(fields=("creator", "currency", "period_start"), name="uniq_creator_month_settlement"),
        ),
        migrations.AddIndex(
            model_name="creatorpost",
            index=models.Index(fields=["status", "-published_at"], name="creator_post_status_pub_idx"),
        ),
    ]
