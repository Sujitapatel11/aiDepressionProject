import random
import uuid
from django.db import models
from django.contrib.auth.models import User

ANONYMOUS_ADJECTIVES = [
    "Peaceful", "Gentle", "Quiet", "Serene", "Kind", "Calm",
    "Hopeful", "Warm", "Humble", "Patient", "Mindful", "Resilient"
]

ANONYMOUS_NOUNS = [
    "Breeze", "Haven", "River", "Star", "Leaf", "Cloud",
    "Pebble", "Garden", "Voyager", "Echo", "Sanctuary", "Light"
]


def generate_anonymous_alias():
    """Generates a random, unlinkable pseudonym per post (e.g., 'Gentle Breeze #4f2a')."""
    adj = random.choice(ANONYMOUS_ADJECTIVES)
    noun = random.choice(ANONYMOUS_NOUNS)
    hex_suffix = uuid.uuid4().hex[:4]
    return f"{adj} {noun} #{hex_suffix}"


class CommunityPost(models.Model):
    """
    Public anonymous journal feed post.
    Fully unlinked from matching-system labels ('Companion #XXXX') and real accounts.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content = models.TextField()
    author_alias = models.CharField(max_length=64, default=generate_anonymous_alias)
    
    # Internal user FK for backend ownership & moderation ONLY — NEVER exposed in API serializers.
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="community_posts")
    
    # Safety Primitives
    report_count = models.PositiveIntegerField(default=0, db_index=True)
    is_hidden = models.BooleanField(default=False, db_index=True)
    has_crisis_resources = models.BooleanField(default=False)
    crisis_resource_note = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["is_hidden", "-created_at"]),
            models.Index(fields=["report_count"]),
        ]

    def check_and_auto_hide(self, threshold=3):
        """Auto-hides post from public feed once report count reaches threshold."""
        if self.report_count >= threshold and not self.is_hidden:
            self.is_hidden = True
            self.save(update_fields=["is_hidden"])

    def __str__(self):
        status = "HIDDEN" if self.is_hidden else "ACTIVE"
        return f"Post({self.id}, {self.author_alias}, [{status}], reports={self.report_count})"


class PostReport(models.Model):
    REASON_CHOICES = [
        ("self_harm", "Self-Harm or Crisis Concern"),
        ("harassment", "Harassment or Bullying"),
        ("spam", "Spam or Off-Topic"),
        ("other", "Other Safety Concern"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(CommunityPost, on_delete=models.CASCADE, related_name="reports")
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name="community_reports")
    reason = models.CharField(max_length=32, choices=REASON_CHOICES, default="other")
    details = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("post", "reporter")
        ordering = ["-created_at"]

    def __str__(self):
        return f"Report({self.post_id}, reason={self.reason})"


class PostReaction(models.Model):
    REACTION_CHOICES = [
        ("here_for_you", "🫂 Here for you"),
        ("sending_strength", "🌸 Sending strength"),
        ("listening", "💙 Listening"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(CommunityPost, on_delete=models.CASCADE, related_name="reactions")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="community_reactions")
    reaction_type = models.CharField(max_length=32, choices=REACTION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("post", "user", "reaction_type")

    def __str__(self):
        return f"Reaction({self.post_id}, {self.reaction_type})"
