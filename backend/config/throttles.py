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

