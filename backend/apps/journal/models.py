from django.db import models
from django.contrib.auth.models import User


class JournalEntry(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="journals")
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            # Matches the committed 0002 migration's index name; without this
            # pin Django regenerates a different default name and
            # `makemigrations --check` reports a spurious index rename.
            models.Index(fields=["user", "is_deleted", "-created_at"], name='journal_jou_user_id_0b563a_idx'),
        ]

    def __str__(self):
        return f"Journal({self.user.username}, {self.created_at})"
