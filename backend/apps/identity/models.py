import uuid
from django.db import models
from django.contrib.auth.models import User


class UserIdentity(models.Model):
    """
    Stores user's visual identity parameters, avatar engine configuration, and cosmetics setup.
    Decoupled from User and UserProfile to ensure zero side-effects on peer matching.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='user_identity')
    avatar_provider = models.CharField(max_length=32, default='dicebear', db_index=True)
    avatar_provider_version = models.CharField(max_length=16, default='v7')
    style_preset = models.CharField(max_length=64, default='bottts')
    seed_key = models.CharField(max_length=255)
    config_version = models.PositiveIntegerField(default=1)
    identity_config = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'identity_useridentity'
        verbose_name = 'User Identity'
        verbose_name_plural = 'User Identities'

    def __str__(self):
        return f"UserIdentity({self.user.username}, provider={self.avatar_provider})"


class CosmeticItem(models.Model):
    """
    Catalog of unlockable accessories, aura effects, frames, themes, and companions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=128)
    category = models.CharField(max_length=32, db_index=True)  # 'headwear', 'aura', 'companion', 'frame', 'theme'
    layer_key = models.CharField(max_length=64)
    asset_uri = models.CharField(max_length=512)
    is_premium = models.BooleanField(default=False)
    required_achievement = models.CharField(max_length=64, null=True, blank=True)
    season_tag = models.CharField(max_length=32, null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'identity_cosmeticitem'
        verbose_name = 'Cosmetic Item'
        verbose_name_plural = 'Cosmetic Items'

    def __str__(self):
        return f"{self.name} [{self.category}]"


class UserCosmeticInventory(models.Model):
    """
    Tracks inventory of unlocked and equipped cosmetics for each user.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cosmetic_inventory')
    cosmetic_item = models.ForeignKey(CosmeticItem, on_delete=models.CASCADE, related_name='owners')
    is_equipped = models.BooleanField(default=False)
    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'identity_usercosmeticinventory'
        unique_together = ('user', 'cosmetic_item')
        verbose_name = 'User Cosmetic Inventory'
        verbose_name_plural = 'User Cosmetic Inventories'

    def __str__(self):
        status = "Equipped" if self.is_equipped else "Inventory"
        return f"{self.user.username} - {self.cosmetic_item.name} ({status})"
