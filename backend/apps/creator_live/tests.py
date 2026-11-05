from django.test import TestCase
from django.contrib.auth import get_user_model

from .models import CreatorPlan, CreatorSubscription, LiveSession, LiveParticipant


User = get_user_model()


class CreatorLiveModelTests(TestCase):
    def setUp(self):
        self.creator = User.objects.create_user(username='creator', password='test-password')
        self.viewer = User.objects.create_user(username='viewer', password='test-password')
        self.plan = CreatorPlan.objects.create(
            code='free', name='Free', is_free=True, monthly_broadcast_limit=3, max_duration_minutes=30
        )

    def test_creator_subscription_is_distinct_from_fan_subscription(self):
        subscription = CreatorSubscription.objects.create(
            creator=self.creator, plan=self.plan, status=CreatorSubscription.Status.ACTIVE
        )
        self.assertEqual(subscription.creator, self.creator)
        self.assertTrue(subscription.grants_hosting_access)

    def test_live_session_and_participant(self):
        session = LiveSession.objects.create(
            creator=self.creator, title='Test broadcast', mode=LiveSession.Mode.AUDIO
        )
        participant = LiveParticipant.objects.create(
            session=session, user=self.viewer, role=LiveParticipant.Role.LISTENER
        )
        self.assertTrue(participant.is_active)
        self.assertEqual(session.participants.count(), 1)
