from django.db import models
from django.contrib.auth.models import User


class Insight(models.Model):
    MOOD_CHOICES = [
        ('positive', 'Positive'),
        ('neutral', 'Neutral'),
        ('negative', 'Negative'),
        ('mixed', 'Mixed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="insights")
    journal = models.OneToOneField(
        'journal.JournalEntry',
        on_delete=models.CASCADE,
        related_name="insight",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=255)
    message = models.TextField()

    # Sentiment / NLP fields
    mood = models.CharField(max_length=16, choices=MOOD_CHOICES, default='neutral', db_index=True)
    sentiment_score = models.FloatField(default=0.0)   # VADER compound: -1.0 to 1.0
    keywords = models.JSONField(default=list)           # top extracted keywords
    emotion_tags = models.JSONField(default=list)       # e.g. ["anxious", "hopeful"]

    source_window_start = models.DateTimeField()
    source_window_end = models.DateTimeField()
    is_read = models.BooleanField(default=False)
    is_dismissed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_dismissed", "is_read"]),
        ]

    def __str__(self):
        return f"Insight({self.user.username}, {self.mood}, {self.title})"
