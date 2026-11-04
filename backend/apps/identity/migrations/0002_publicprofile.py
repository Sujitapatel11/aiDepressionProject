# Generated for the public profile model.
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("identity", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PublicProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("display_name", models.CharField(blank=True, max_length=50)),
                ("bio", models.CharField(blank=True, max_length=280)),
                ("interests", models.JSONField(blank=True, default=list)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="public_profile", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "identity_publicprofile"},
        ),
    ]
