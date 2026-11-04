import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.CreateModel(
            name="SubscriptionPlan",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.SlugField(max_length=40, unique=True)),
                ("name", models.CharField(max_length=80)),
                ("description", models.TextField(blank=True)),
                ("currency", models.CharField(max_length=3)),
                ("amount_minor", models.PositiveBigIntegerField(help_text="Amount in the currency's minor unit (e.g. paisa/cents).")),
                ("interval", models.CharField(choices=[("month", "Monthly"), ("year", "Yearly")], default="month", max_length=10)),
                ("active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["currency", "amount_minor"]},
        ),
        migrations.CreateModel(
            name="PaymentTransaction",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("provider", models.CharField(choices=[("esewa", "eSewa"), ("khalti", "Khalti")], max_length=12)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("initiated", "Initiated"), ("paid", "Paid"), ("failed", "Failed"), ("refunded", "Refunded")], db_index=True, default="pending", max_length=12)),
                ("amount_minor", models.PositiveBigIntegerField()),
                ("currency", models.CharField(max_length=3)),
                ("idempotency_key", models.CharField(max_length=80, unique=True)),
                ("provider_reference", models.CharField(blank=True, db_index=True, max_length=120)),
                ("checkout_url", models.URLField(blank=True)),
                ("provider_payload", models.JSONField(blank=True, default=dict)),
                ("failure_reason", models.CharField(blank=True, max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("paid_at", models.DateTimeField(blank=True, null=True)),
                ("plan", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="transactions", to="payments.subscriptionplan")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="payment_transactions", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"], "indexes": [models.Index(fields=["user", "status", "-created_at"], name="payments_pa_user_id_1cfdad_idx")]},
        ),
        migrations.CreateModel(
            name="UserSubscription",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("starts_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("ends_at", models.DateTimeField()),
                ("active", models.BooleanField(db_index=True, default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("payment", models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name="subscription", to="payments.paymenttransaction")),
                ("plan", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="payments.subscriptionplan")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="subscriptions", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-ends_at"]},
        ),
    ]
