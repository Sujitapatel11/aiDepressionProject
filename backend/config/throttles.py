from rest_framework.throttling import UserRateThrottle, AnonRateThrottle


class AIGenerationRateThrottle(UserRateThrottle):
    scope = 'ai_generation'
    rate = '20/minute'


class PasswordResetRateThrottle(AnonRateThrottle):
    scope = 'password_reset'
    rate = '5/hour'


class CommunityPostRateThrottle(UserRateThrottle):
    scope = 'community_post'
    rate = '10/day'


class CreatorWriteRateThrottle(UserRateThrottle):
    scope = 'creator_write'
    rate = '30/hour'


class CreatorEngagementRateThrottle(UserRateThrottle):
    scope = 'creator_engagement'
    rate = '120/hour'


class CreatorWithdrawalRateThrottle(UserRateThrottle):
    scope = 'creator_withdrawal'
    rate = '5/day'


class MediaUploadRateThrottle(UserRateThrottle):
    scope = 'media_upload'
    rate = '30/hour'



class LiveKitTokenRateThrottle(UserRateThrottle):
    """Token endpoint is called once per session join; limit tightly to prevent
    credential harvesting while allowing normal participant churn."""
    scope = 'livekit_token'
    rate = '20/hour'
