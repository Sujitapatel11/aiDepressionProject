from django.db import models
from django.contrib.auth.models import User
from datetime import date


class SleepEntry(models.Model):
    QUALITY_CHOICES = [
        ('great', 'Great'),
        ('good', 'Good'),
        ('fair', 'Fair'),
        ('poor', 'Poor'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sleep_entries")
    sleep_date = models.DateField(default=date.today, db_index=True)
    bedtime = models.DateTimeField()
    wake_time = models.DateTimeField()
    total_sleep_hours = models.FloatField(default=0.0)
    sleep_quality = models.CharField(max_length=16, choices=QUALITY_CHOICES, default='good')
    sleep_notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-sleep_date"]
        unique_together = ["user", "sleep_date"]
        indexes = [
            models.Index(fields=["user", "-sleep_date"]),
        ]

    def __str__(self):
        return f"Sleep({self.user.username}, {self.sleep_date}, {self.total_sleep_hours}h)"
