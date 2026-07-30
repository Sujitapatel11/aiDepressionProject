from django.db import models
from django.contrib.auth.models import User


class UserAuthProfile(models.Model):
    """
    Stores authentication provider metadata for users (e.g. Google OAuth).
    Links 1:1 with Django's standard User model without altering standard User tables.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='auth_profile')
    google_id = models.CharField(max_length=255, unique=True, null=True, blank=True, db_index=True)
    auth_provider = models.CharField(max_length=50, default='email')
    avatar_url = models.URLField(max_length=1024, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"AuthProfile({self.user.username}, provider={self.auth_provider})"
