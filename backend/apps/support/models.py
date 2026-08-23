import uuid
from datetime import timedelta
from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils import timezone


def default_expiry():
    return timezone.now() + timedelta(days=7)


class UserProfile(models.Model):
    """
    Stores Big Five personality scores computed from journal entries.
    Used by the matching engine to rank peer suggestions by compatibility.
    Scores range 0.0–1.0.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")

    # Big Five (OCEAN)
    openness          = models.FloatField(default=0.5)
    conscientiousness = models.FloatField(default=0.5)
    extraversion      = models.FloatField(default=0.5)
    agreeableness     = models.FloatField(default=0.5)
    neuroticism       = models.FloatField(default=0.5)

    # Dominant emotion pattern from recent journals
    dominant_emotion  = models.CharField(max_length=32, default="neutral")

    # One-time explicit consent for AI personalized connection activities
    has_activity_consent = models.BooleanField(default=False)
    activity_consent_at  = models.DateTimeField(null=True, blank=True)

    updated_at = models.DateTimeField(auto_now=True)

    def personality_vector(self):
        return [self.openness, self.conscientiousness, self.extraversion,
                self.agreeableness, self.neuroticism]

    def __str__(self):
        return f"Profile({self.user.username})"


class SupportRequest(models.Model):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"

    STATUS_CHOICES = [
        (PENDING, "Pending"),
        (ACCEPTED, "Accepted"),
        (REJECTED, "Rejected"),
        (EXPIRED, "Expired"),
    ]

    request_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    from_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_support_requests")
    to_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="received_support_requests")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(default=default_expiry)

    class Meta:
        indexes = [
            models.Index(fields=["to_user", "status"]),
            models.Index(fields=["expires_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["from_user", "to_user", "status"],
                name="unique_pending_support_request"
            )
        ]

    def clean(self):
        if self.from_user_id == self.to_user_id:
            raise ValidationError("Cannot send support request to yourself.")

    def save(self, *args, **kwargs):
        if self.status == self.PENDING and self.expires_at and self.expires_at <= timezone.now():
            self.status = self.EXPIRED
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.from_user_id} → {self.to_user_id} ({self.status})"


class SupportConnection(models.Model):
    STATUS_ACTIVE = "active"
    STATUS_BLOCKED = "blocked"
    STATUS_DISCONNECTED = "disconnected"

    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_BLOCKED, "Blocked"),
        (STATUS_DISCONNECTED, "Disconnected"),
    ]

    connection_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    user_one = models.ForeignKey(User, on_delete=models.CASCADE, related_name="connections_as_one")
    user_two = models.ForeignKey(User, on_delete=models.CASCADE, related_name="connections_as_two")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    blocked_at = models.DateTimeField(null=True, blank=True)
    disconnected_at = models.DateTimeField(null=True, blank=True)
    blocked_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="blocked_connections"
    )
    alias_user_one = models.CharField(max_length=64)
    alias_user_two = models.CharField(max_length=64)

    class Meta:
        unique_together = ("user_one", "user_two")
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["user_one", "status"]),
            models.Index(fields=["user_two", "status"]),
        ]

    def clean(self):
        if self.user_one_id == self.user_two_id:
            raise ValidationError("Connection requires two different users.")

    def save(self, *args, **kwargs):
        if self.user_one_id and self.user_two_id:
            if self.user_one_id > self.user_two_id:
                self.user_one, self.user_two = self.user_two, self.user_one
                self.alias_user_one, self.alias_user_two = self.alias_user_two, self.alias_user_one
        super().save(*args, **kwargs)

    def get_peer(self, user):
        return self.user_two if self.user_one_id == user.id else self.user_one

    def get_alias_for(self, user):
        return self.alias_user_one if self.user_one_id == user.id else self.alias_user_two

    def calculate_activity_score(self) -> dict:
        """
        Calculates connection activity score at query time (denormalization choice explained in code comments):
        - total_messages (M * 1)
        - active_days: distinct dates with messages (D * 10) -> strongly rewards sustained interaction spread across days
        - days_connected: calendar days active (min(15, C * 2))
        Score = min(100, (M * 1) + (D * 10) + min(15, C * 2))
        """
        total_messages = self.messages.count()
        active_days = self.messages.values("created_at__date").distinct().count()
        days_connected = max(1, (timezone.now() - self.created_at).days)

        score = min(100, (total_messages * 1) + (active_days * 10) + min(15, days_connected * 2))

        if score < 20:
            level = 1
            level_name = "Seed Connection"
            next_threshold = 20
            progress_pct = int((score / 20) * 100)
            unlocked = ["interest_tags"]
        elif score < 50:
            level = 2
            level_name = "Growing Companion"
            next_threshold = 50
            progress_pct = int(((score - 20) / 30) * 100)
            unlocked = ["interest_tags", "get_to_know_quiz"]
        elif score < 80:
            level = 3
            level_name = "Deepening Bond"
            next_threshold = 80
            progress_pct = int(((score - 50) / 30) * 100)
            unlocked = ["interest_tags", "get_to_know_quiz", "compatibility_summary"]
        else:
            level = 4
            level_name = "Trusted Circle"
            next_threshold = 100
            progress_pct = 100
            unlocked = ["interest_tags", "get_to_know_quiz", "compatibility_summary", "trusted_badge"]

        return {
            "score": score,
            "level": level,
            "level_name": level_name,
            "next_threshold": next_threshold,
            "progress_pct": max(0, min(100, progress_pct)),
            "unlocked_features": unlocked,
            "total_messages": total_messages,
            "active_days": active_days,
            "days_connected": days_connected,
        }

    def get_compatibility_summary(self, user) -> str | None:
        """
        Light, human-readable compatibility summary unlocked at Level 3 (Score 50+).
        Never a raw percentage.
        """
        score_data = self.calculate_activity_score()
        if score_data["level"] < 3:
            return None

        peer = self.get_peer(user)
        try:
            my_prof = UserProfile.objects.get(user=user)
            peer_prof = UserProfile.objects.get(user=peer)

            # Compare dominant emotions or personality tendencies
            if my_prof.dominant_emotion == peer_prof.dominant_emotion and my_prof.dominant_emotion != "neutral":
                return f"You both share a warm, {my_prof.dominant_emotion} emotional frequency in your reflections."
            elif my_prof.agreeableness >= 0.55 and peer_prof.agreeableness >= 0.55:
                return "You both exhibit high empathy and supportive communication styles."
            elif my_prof.openness >= 0.55 and peer_prof.openness >= 0.55:
                return "You both tend to explore deep, thoughtful themes in your conversations."
        except UserProfile.DoesNotExist:
            pass

        return "You both maintain a steady, supportive rhythm of open and mindful communication."

    def __str__(self):
        return f"{self.connection_id} ({self.status})"


class ConnectionActivityQuiz(models.Model):
    STATUS_PENDING = "pending"
    STATUS_COMPLETED = "completed"

    quiz_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    connection = models.ForeignKey(SupportConnection, on_delete=models.CASCADE, related_name="activity_quizzes")
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name="created_quizzes")

    # Array of question dicts:
    # [{"id": "q1", "prompt": "...", "options": ["Choice A", "Choice B", "Choice C", "Choice D"]}]
    questions = models.JSONField(default=list)

    # Dict of answers per user: {"q1": "Selected Option Text"}
    user_one_answers = models.JSONField(default=dict, blank=True)
    user_two_answers = models.JSONField(default=dict, blank=True)

    user_one_completed_at = models.DateTimeField(null=True, blank=True)
    user_two_completed_at = models.DateTimeField(null=True, blank=True)

    status = models.CharField(max_length=20, default=STATUS_PENDING, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["connection", "status"]),
        ]

    def is_completed_by(self, user):
        if user.id == self.connection.user_one_id:
            return self.user_one_completed_at is not None
        elif user.id == self.connection.user_two_id:
            return self.user_two_completed_at is not None
        return False

    def is_fully_completed(self):
        return self.user_one_completed_at is not None and self.user_two_completed_at is not None

    def __str__(self):
        return f"Quiz({self.quiz_id} for {self.connection_id})"

