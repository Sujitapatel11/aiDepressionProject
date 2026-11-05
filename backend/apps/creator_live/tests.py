"""Tests for creator_live: models, LiveKit service, API endpoints.

Model tests (original) are preserved unchanged. New test classes cover:
- LiveKit configuration guard (no real credentials needed).
- Token generation (mocked — never touches a real LiveKit server).
- Session CRUD authorization.
- Join permission enforcement for all AudienceType variants.
- Ended-session token rejection.
- Secret never appears in API responses.
"""

import uuid
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .models import CreatorPlan, CreatorSubscription, LiveParticipant, LiveSession, LiveSessionAudience

User = get_user_model()

# ─── Helpers ────────────────────────────────────────────────────────────────

LIVEKIT_SETTINGS = dict(
    LIVEKIT_URL='wss://test.livekit.example',
    LIVEKIT_API_KEY='testkey',
    LIVEKIT_API_SECRET='testsecret',
)


def _make_user(username, **kw):
    return User.objects.create_user(username=username, password='Test-Pass-2026!', **kw)


def _free_plan():
    plan, _ = CreatorPlan.objects.get_or_create(
        code='free',
        defaults={'name': 'Free', 'is_free': True, 'is_active': True,
                  'monthly_broadcast_limit': 3, 'max_duration_minutes': 30},
    )
    return plan


def _activate_subscription(user, plan=None):
    if plan is None:
        plan = _free_plan()
    sub, _ = CreatorSubscription.objects.update_or_create(
        creator=user, plan=plan,
        defaults={'status': CreatorSubscription.Status.ACTIVE},
    )
    return sub


# ─── Original model tests (unchanged) ───────────────────────────────────────

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


# ─── LiveKit service unit tests ──────────────────────────────────────────────

class LiveKitServiceConfigTests(TestCase):

    def test_returns_false_when_no_credentials(self):
        from .livekit_service import is_livekit_configured
        with override_settings(LIVEKIT_URL='', LIVEKIT_API_KEY='', LIVEKIT_API_SECRET=''):
            self.assertFalse(is_livekit_configured())

    def test_returns_false_when_partially_configured(self):
        from .livekit_service import is_livekit_configured
        with override_settings(LIVEKIT_URL='wss://x', LIVEKIT_API_KEY='key', LIVEKIT_API_SECRET=''):
            self.assertFalse(is_livekit_configured())

    def test_returns_true_when_all_three_set(self):
        from .livekit_service import is_livekit_configured
        with override_settings(**LIVEKIT_SETTINGS):
            self.assertTrue(is_livekit_configured())

    def test_room_name_is_deterministic(self):
        from .livekit_service import room_name_for_session
        sid = uuid.uuid4()
        self.assertEqual(room_name_for_session(sid), f'sc-{sid}')
        # Calling twice with same UUID gives same name
        self.assertEqual(room_name_for_session(sid), room_name_for_session(sid))

    def test_generate_token_raises_without_config(self):
        from .livekit_service import generate_token
        with override_settings(LIVEKIT_URL='', LIVEKIT_API_KEY='', LIVEKIT_API_SECRET=''):
            with self.assertRaises(RuntimeError):
                generate_token(
                    session_id=uuid.uuid4(), user_id=1, username='test',
                    is_host=False, can_publish=False, can_subscribe=True,
                )

    @override_settings(**LIVEKIT_SETTINGS)
    def test_generate_token_returns_string_jwt(self):
        """Token generation with mocked AccessToken — no real LiveKit call."""
        from .livekit_service import generate_token
        mock_token = MagicMock()
        mock_token.to_jwt.return_value = 'eyJmYWtlLmp3dA=='

        with patch('apps.creator_live.livekit_service.AccessToken', return_value=mock_token):
            # patch the chained .with_* calls
            mock_token.with_identity.return_value = mock_token
            mock_token.with_name.return_value = mock_token
            mock_token.with_ttl.return_value = mock_token
            mock_token.with_grants.return_value = mock_token

            result = generate_token(
                session_id=uuid.uuid4(), user_id=99, username='alice',
                is_host=True, can_publish=True, can_subscribe=True,
            )
        self.assertIsInstance(result, str)
        self.assertTrue(result)  # non-empty

    @override_settings(**LIVEKIT_SETTINGS)
    def test_token_never_contains_api_secret(self):
        """The API secret must not leak into the returned token string."""
        from .livekit_service import generate_token
        mock_token = MagicMock()
        mock_token.to_jwt.return_value = 'eyJmYWtlLmp3dA=='
        mock_token.with_identity.return_value = mock_token
        mock_token.with_name.return_value = mock_token
        mock_token.with_ttl.return_value = mock_token
        mock_token.with_grants.return_value = mock_token

        with patch('apps.creator_live.livekit_service.AccessToken', return_value=mock_token):
            token = generate_token(
                session_id=uuid.uuid4(), user_id=1, username='bob',
                is_host=False, can_publish=False, can_subscribe=True,
            )
        # The raw secret must never appear inside the token value
        self.assertNotIn(LIVEKIT_SETTINGS['LIVEKIT_API_SECRET'], token)

    @override_settings(**LIVEKIT_SETTINGS)
    def test_host_gets_room_admin_grant(self):
        """Host tokens must request roomAdmin=True."""
        from .livekit_service import generate_token
        captured_grants = {}

        def fake_with_grants(grants):
            captured_grants['grants'] = grants
            return mock_token

        mock_token = MagicMock()
        mock_token.to_jwt.return_value = 'eyJ0ZXN0'
        mock_token.with_identity.return_value = mock_token
        mock_token.with_name.return_value = mock_token
        mock_token.with_ttl.return_value = mock_token
        mock_token.with_grants.side_effect = fake_with_grants

        fake_grants = MagicMock()

        with patch('apps.creator_live.livekit_service.AccessToken', return_value=mock_token), \
             patch('apps.creator_live.livekit_service.VideoGrants', return_value=fake_grants) as MockGrants:
            generate_token(
                session_id=uuid.uuid4(), user_id=1, username='creator',
                is_host=True, can_publish=True, can_subscribe=True,
            )
            call_kwargs = MockGrants.call_args.kwargs
            self.assertTrue(call_kwargs.get('room_admin'), 'Host must have room_admin=True')
            self.assertTrue(call_kwargs.get('room_join'))
            # Recording grant must never be set
            self.assertNotIn('room_record', call_kwargs)

    @override_settings(**LIVEKIT_SETTINGS)
    def test_viewer_never_gets_room_admin(self):
        """Viewer tokens must have roomAdmin=False."""
        from .livekit_service import generate_token
        fake_grants = MagicMock()

        mock_token = MagicMock()
        mock_token.to_jwt.return_value = 'eyJ2aWV3ZXI='
        mock_token.with_identity.return_value = mock_token
        mock_token.with_name.return_value = mock_token
        mock_token.with_ttl.return_value = mock_token
        mock_token.with_grants.return_value = mock_token

        with patch('apps.creator_live.livekit_service.AccessToken', return_value=mock_token), \
             patch('apps.creator_live.livekit_service.VideoGrants', return_value=fake_grants) as MockGrants:
            generate_token(
                session_id=uuid.uuid4(), user_id=2, username='viewer',
                is_host=False, can_publish=False, can_subscribe=True,
            )
            call_kwargs = MockGrants.call_args.kwargs
            self.assertFalse(call_kwargs.get('room_admin', False))


# ─── Session CRUD API tests ──────────────────────────────────────────────────

class SessionCreateAPITests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.creator = _make_user('creator_api')
        self.other = _make_user('other_api')

    def test_anonymous_rejected(self):
        res = self.client.post('/api/live/sessions/create/', {'title': 'Hello'}, format='json')
        self.assertEqual(res.status_code, 401)

    def test_creates_session_with_free_plan_auto_provision(self):
        _free_plan()  # ensure a free plan exists
        self.client.force_authenticate(self.creator)
        res = self.client.post('/api/live/sessions/create/', {
            'title': 'My first stream', 'mode': 'audio', 'audience_type': 'public',
        }, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        data = res.data
        self.assertEqual(data['creator_username'], self.creator.username)
        self.assertEqual(data['status'], 'draft')
        self.assertEqual(data['mode'], 'audio')

    def test_creates_session_with_active_subscription(self):
        _activate_subscription(self.creator)
        self.client.force_authenticate(self.creator)
        res = self.client.post('/api/live/sessions/create/', {
            'title': 'Subscriber stream', 'mode': 'video',
        }, format='json')
        self.assertEqual(res.status_code, 201)

    def test_rejected_with_no_plan_and_no_free_plan_exists(self):
        """If no free plan and no subscription → 403."""
        # Remove all plans so auto-provision fails
        CreatorPlan.objects.all().delete()
        self.client.force_authenticate(self.creator)
        res = self.client.post('/api/live/sessions/create/', {'title': 'Blocked'}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_blank_title_rejected(self):
        _free_plan()
        self.client.force_authenticate(self.creator)
        res = self.client.post('/api/live/sessions/create/', {'title': '  '}, format='json')
        self.assertEqual(res.status_code, 400)


class SessionLifecycleAPITests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.creator = _make_user('lc_creator')
        self.viewer = _make_user('lc_viewer')
        _activate_subscription(self.creator)
        self.client.force_authenticate(self.creator)
        res = self.client.post('/api/live/sessions/create/', {
            'title': 'Lifecycle test', 'mode': 'audio_video', 'audience_type': 'public',
        }, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.session_id = res.data['id']

    def test_start_transitions_to_live(self):
        res = self.client.post(f'/api/live/sessions/{self.session_id}/start/')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['status'], 'live')
        self.assertIsNotNone(res.data['started_at'])

    def test_end_transitions_to_ended(self):
        self.client.post(f'/api/live/sessions/{self.session_id}/start/')
        res = self.client.post(f'/api/live/sessions/{self.session_id}/end/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['status'], 'ended')

    def test_non_creator_cannot_start(self):
        self.client.force_authenticate(self.viewer)
        res = self.client.post(f'/api/live/sessions/{self.session_id}/start/')
        self.assertEqual(res.status_code, 404)

    def test_non_creator_cannot_end(self):
        self.client.force_authenticate(self.viewer)
        res = self.client.post(f'/api/live/sessions/{self.session_id}/end/')
        self.assertEqual(res.status_code, 404)

    def test_double_end_returns_conflict(self):
        self.client.post(f'/api/live/sessions/{self.session_id}/start/')
        self.client.post(f'/api/live/sessions/{self.session_id}/end/')
        res = self.client.post(f'/api/live/sessions/{self.session_id}/end/')
        self.assertEqual(res.status_code, 409)

    def test_session_detail_visible_to_public(self):
        self.client.force_authenticate(self.viewer)
        res = self.client.get(f'/api/live/sessions/{self.session_id}/')
        self.assertEqual(res.status_code, 200)

    def test_unknown_session_returns_404(self):
        res = self.client.get(f'/api/live/sessions/{uuid.uuid4()}/')
        self.assertEqual(res.status_code, 404)


# ─── Token endpoint tests ────────────────────────────────────────────────────

class TokenEndpointTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.creator = _make_user('tok_creator')
        self.viewer = _make_user('tok_viewer')
        self.stranger = _make_user('tok_stranger')
        _activate_subscription(self.creator)
        self.client.force_authenticate(self.creator)
        res = self.client.post('/api/live/sessions/create/', {
            'title': 'Token test', 'mode': 'audio_video', 'audience_type': 'public',
        }, format='json')
        self.session_id = res.data['id']

    def test_returns_503_when_livekit_not_configured(self):
        with override_settings(LIVEKIT_URL='', LIVEKIT_API_KEY='', LIVEKIT_API_SECRET=''):
            res = self.client.post(f'/api/live/sessions/{self.session_id}/token/')
        self.assertEqual(res.status_code, 503)
        self.assertNotIn('token', res.data)

    @override_settings(**LIVEKIT_SETTINGS)
    def test_creator_receives_host_token(self):
        mock_token = MagicMock()
        mock_token.to_jwt.return_value = 'eyJjcmVhdG9y'
        mock_token.with_identity.return_value = mock_token
        mock_token.with_name.return_value = mock_token
        mock_token.with_ttl.return_value = mock_token
        mock_token.with_grants.return_value = mock_token

        with patch('apps.creator_live.livekit_service.AccessToken', return_value=mock_token), \
             patch('apps.creator_live.livekit_service.VideoGrants'):
            res = self.client.post(f'/api/live/sessions/{self.session_id}/token/')

        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['role'], 'host')
        self.assertIn('token', res.data)
        self.assertIn('room', res.data)
        self.assertIn('livekit_url', res.data)
        # Secret must never appear in any response field
        for v in res.data.values():
            self.assertNotEqual(str(v), LIVEKIT_SETTINGS['LIVEKIT_API_SECRET'])

    @override_settings(**LIVEKIT_SETTINGS)
    def test_viewer_receives_viewer_token(self):
        mock_token = MagicMock()
        mock_token.to_jwt.return_value = 'eyJ2aWV3ZXI='
        mock_token.with_identity.return_value = mock_token
        mock_token.with_name.return_value = mock_token
        mock_token.with_ttl.return_value = mock_token
        mock_token.with_grants.return_value = mock_token

        self.client.force_authenticate(self.viewer)
        with patch('apps.creator_live.livekit_service.AccessToken', return_value=mock_token), \
             patch('apps.creator_live.livekit_service.VideoGrants'):
            res = self.client.post(f'/api/live/sessions/{self.session_id}/token/')

        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['role'], 'viewer')

    @override_settings(**LIVEKIT_SETTINGS)
    def test_ended_session_rejects_token(self):
        """Token endpoint must reject ended sessions regardless of LiveKit config."""
        # End the session
        self.client.post(f'/api/live/sessions/{self.session_id}/start/')
        self.client.post(f'/api/live/sessions/{self.session_id}/end/')

        mock_token = MagicMock()
        mock_token.to_jwt.return_value = 'eyJlbmRlZA=='
        mock_token.with_identity.return_value = mock_token
        mock_token.with_name.return_value = mock_token
        mock_token.with_ttl.return_value = mock_token
        mock_token.with_grants.return_value = mock_token

        self.client.force_authenticate(self.viewer)
        with patch('apps.creator_live.livekit_service.AccessToken', return_value=mock_token), \
             patch('apps.creator_live.livekit_service.VideoGrants'):
            res = self.client.post(f'/api/live/sessions/{self.session_id}/token/')
        self.assertEqual(res.status_code, 404)

    @override_settings(**LIVEKIT_SETTINGS)
    def test_anonymous_cannot_get_token(self):
        self.client.force_authenticate(None)
        res = self.client.post(f'/api/live/sessions/{self.session_id}/token/')
        self.assertEqual(res.status_code, 401)

    @override_settings(**LIVEKIT_SETTINGS)
    def test_unknown_session_token_returns_404(self):
        with patch('apps.creator_live.livekit_service.AccessToken'), \
             patch('apps.creator_live.livekit_service.VideoGrants'):
            res = self.client.post(f'/api/live/sessions/{uuid.uuid4()}/token/')
        self.assertEqual(res.status_code, 404)


# ─── Private session access tests ───────────────────────────────────────────

class PrivateSessionAccessTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.creator = _make_user('priv_creator')
        self.invitee = _make_user('priv_invitee')
        self.outsider = _make_user('priv_outsider')
        _activate_subscription(self.creator)
        self.client.force_authenticate(self.creator)
        res = self.client.post('/api/live/sessions/create/', {
            'title': 'Private session', 'mode': 'video', 'audience_type': 'private',
        }, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.session_id = res.data['id']
        self.session = LiveSession.objects.get(id=self.session_id)

    def test_outsider_cannot_see_private_session_detail(self):
        self.client.force_authenticate(self.outsider)
        res = self.client.get(f'/api/live/sessions/{self.session_id}/')
        self.assertEqual(res.status_code, 404)

    def test_outsider_not_in_list(self):
        self.client.force_authenticate(self.outsider)
        res = self.client.get('/api/live/sessions/')
        self.assertEqual(res.status_code, 200)
        ids = [s['id'] for s in res.data]
        self.assertNotIn(str(self.session_id), ids)

    def test_accepted_invitee_can_see_session(self):
        LiveSessionAudience.objects.create(
            session=self.session,
            user=self.invitee,
            invited_by=self.creator,
            status=LiveSessionAudience.InvitationStatus.ACCEPTED,
        )
        self.client.force_authenticate(self.invitee)
        res = self.client.get(f'/api/live/sessions/{self.session_id}/')
        self.assertEqual(res.status_code, 200)

    @override_settings(**LIVEKIT_SETTINGS)
    def test_outsider_cannot_get_token_for_private_session(self):
        mock_token = MagicMock()
        mock_token.to_jwt.return_value = 'eyJibG9ja2Vk'
        mock_token.with_identity.return_value = mock_token
        mock_token.with_name.return_value = mock_token
        mock_token.with_ttl.return_value = mock_token
        mock_token.with_grants.return_value = mock_token

        self.client.force_authenticate(self.outsider)
        with patch('apps.creator_live.livekit_service.AccessToken', return_value=mock_token), \
             patch('apps.creator_live.livekit_service.VideoGrants'):
            res = self.client.post(f'/api/live/sessions/{self.session_id}/token/')
        self.assertEqual(res.status_code, 404)

    @override_settings(**LIVEKIT_SETTINGS)
    def test_accepted_invitee_can_get_token(self):
        LiveSessionAudience.objects.create(
            session=self.session,
            user=self.invitee,
            invited_by=self.creator,
            status=LiveSessionAudience.InvitationStatus.ACCEPTED,
        )
        mock_token = MagicMock()
        mock_token.to_jwt.return_value = 'eyJpbnZpdGVl'
        mock_token.with_identity.return_value = mock_token
        mock_token.with_name.return_value = mock_token
        mock_token.with_ttl.return_value = mock_token
        mock_token.with_grants.return_value = mock_token

        self.client.force_authenticate(self.invitee)
        with patch('apps.creator_live.livekit_service.AccessToken', return_value=mock_token), \
             patch('apps.creator_live.livekit_service.VideoGrants'):
            res = self.client.post(f'/api/live/sessions/{self.session_id}/token/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['role'], 'viewer')


# ─── Follower audience authorization tests ───────────────────────────────────

class FollowerAudienceAuthTests(TestCase):
    """Verify that FOLLOWERS sessions enforce the CreatorFollow relationship.

    Scenarios covered:
    - Accepted follower receives a token (viewer role).
    - Non-follower is denied a token (404).
    - Creator of the session always receives a host token regardless.
    - Unauthenticated request is rejected (401).
    - Follower sees session in the session list; non-follower does not.
    """

    def setUp(self):
        self.client = APIClient()
        self.creator = _make_user('fol_creator')
        self.follower = _make_user('fol_follower')
        self.non_follower = _make_user('fol_nonfollower')

        _activate_subscription(self.creator)

        # Create a CreatorProfile for the creator (required by CreatorFollow)
        from apps.identity.models import CreatorProfile
        self.creator_profile = CreatorProfile.objects.create(
            user=self.creator,
            username='fol_creator',
            display_name='Follower Test Creator',
        )

        # Wire the follower up — non_follower deliberately gets no follow record
        from apps.identity.models import CreatorFollow
        CreatorFollow.objects.create(
            creator=self.creator_profile,
            follower=self.follower,
        )

        # Create the followers-only session as the creator and start it so it
        # appears in the session list (list view only shows LIVE / SCHEDULED).
        self.client.force_authenticate(self.creator)
        res = self.client.post('/api/live/sessions/create/', {
            'title': 'Followers-only stream',
            'mode': 'audio_video',
            'audience_type': 'followers',
        }, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.session_id = res.data['id']
        # Transition to LIVE so the session appears in session_list queries
        start_res = self.client.post(f'/api/live/sessions/{self.session_id}/start/')
        self.assertEqual(start_res.status_code, 200, start_res.data)
        self.session = LiveSession.objects.get(id=self.session_id)

    # ── token endpoint tests ──────────────────────────────────────────────────

    @override_settings(**LIVEKIT_SETTINGS)
    def test_follower_receives_viewer_token(self):
        """An accepted follower must get a 200 with role=viewer."""
        mock_token = MagicMock()
        mock_token.to_jwt.return_value = 'eyJmb2xsb3dlcg=='
        mock_token.with_identity.return_value = mock_token
        mock_token.with_name.return_value = mock_token
        mock_token.with_ttl.return_value = mock_token
        mock_token.with_grants.return_value = mock_token

        self.client.force_authenticate(self.follower)
        with patch('apps.creator_live.livekit_service.AccessToken', return_value=mock_token), \
             patch('apps.creator_live.livekit_service.VideoGrants'):
            res = self.client.post(f'/api/live/sessions/{self.session_id}/token/')

        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['role'], 'viewer')
        self.assertIn('token', res.data)

    @override_settings(**LIVEKIT_SETTINGS)
    def test_non_follower_cannot_get_token(self):
        """A user with no CreatorFollow record must be denied (404)."""
        mock_token = MagicMock()
        mock_token.to_jwt.return_value = 'eyJibG9ja2Vk'
        mock_token.with_identity.return_value = mock_token
        mock_token.with_name.return_value = mock_token
        mock_token.with_ttl.return_value = mock_token
        mock_token.with_grants.return_value = mock_token

        self.client.force_authenticate(self.non_follower)
        with patch('apps.creator_live.livekit_service.AccessToken', return_value=mock_token), \
             patch('apps.creator_live.livekit_service.VideoGrants'):
            res = self.client.post(f'/api/live/sessions/{self.session_id}/token/')

        self.assertEqual(res.status_code, 404, res.data)
        self.assertNotIn('token', res.data)

    @override_settings(**LIVEKIT_SETTINGS)
    def test_creator_receives_host_token_on_followers_session(self):
        """The session creator always gets host access regardless of audience type."""
        mock_token = MagicMock()
        mock_token.to_jwt.return_value = 'eyJjcmVhdG9y'
        mock_token.with_identity.return_value = mock_token
        mock_token.with_name.return_value = mock_token
        mock_token.with_ttl.return_value = mock_token
        mock_token.with_grants.return_value = mock_token

        self.client.force_authenticate(self.creator)
        with patch('apps.creator_live.livekit_service.AccessToken', return_value=mock_token), \
             patch('apps.creator_live.livekit_service.VideoGrants'):
            res = self.client.post(f'/api/live/sessions/{self.session_id}/token/')

        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['role'], 'host')

    def test_unauthenticated_user_rejected_on_followers_session(self):
        """Unauthenticated requests must return 401 before any audience check."""
        self.client.force_authenticate(None)
        res = self.client.post(f'/api/live/sessions/{self.session_id}/token/')
        self.assertEqual(res.status_code, 401)
        self.assertNotIn('token', res.data)

    # ── session list visibility tests ─────────────────────────────────────────

    def test_follower_sees_followers_session_in_list(self):
        """A user who follows the creator must see the session in the list."""
        self.client.force_authenticate(self.follower)
        res = self.client.get('/api/live/sessions/')
        self.assertEqual(res.status_code, 200)
        ids = [s['id'] for s in res.data]
        self.assertIn(str(self.session_id), ids)

    def test_non_follower_does_not_see_followers_session_in_list(self):
        """A user who does not follow the creator must not see the session in the list."""
        self.client.force_authenticate(self.non_follower)
        res = self.client.get('/api/live/sessions/')
        self.assertEqual(res.status_code, 200)
        ids = [s['id'] for s in res.data]
        self.assertNotIn(str(self.session_id), ids)
