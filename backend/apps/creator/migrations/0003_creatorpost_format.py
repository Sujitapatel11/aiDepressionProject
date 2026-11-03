from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("creator", "0002_creatorsettlement_creatorsettlementline_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="creatorpost",
            name="format",
            field=models.CharField(
                choices=[
                    ("micro-post", "Micro post"),
                    ("story", "Story"),
                    ("poem", "Poem"),
                    ("journal-piece", "Journal-inspired"),
                ],
                default="micro-post",
                max_length=20,
            ),
        ),
    ]
