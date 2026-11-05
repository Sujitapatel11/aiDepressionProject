from datetime import date
from decimal import Decimal
import uuid

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from .creator_services import create_monthly_settlement, record_verified_ad_event
from .models import (
    CreatorAdminAuditLog,
    CreatorFollow,
    CreatorLedgerEntry,
    CreatorPost,
    CreatorPostComment,
    CreatorPostLike,
    CreatorPostShare,
    CreatorPostView,
    CreatorProfile,
    CreatorSecuritySignal,
    CreatorWithdrawalRequest,
    VerifiedAdEvent,
)


class CreatorEcosystemApiTests(TestCase):
    def setUp(self):
        self.creator_user = User.objects.create_user(username='owner_account', password='ExistingPassword123!')
        self.viewer = User.objects.create_user(username='viewer_account', password='ViewerPassword123!')
        self.staff = User.objects.create_user(username='moderator_account', password='ModeratorPassword123!', is_staff=True)
        self.creator = CreatorProfile.objects.create(
            user=self.creator_user,
            username='public_owner',
            display_name='Public Owner',
        )
        self.creator_client = APIClient()
        self.creator_client.force_authenticate(self.creator_user)
        self.viewer_client = APIClient()
        self.viewer_client.force_authenticate(self.viewer)
        self.staff_client = APIClient()
        self.staff_client.force_authenticate(self.staff)

    def make_post(self, **overrides):
        values = {
            'content_type': CreatorPost.ContentType.TEXT,
            'caption': 'A real creator post for testing.',
            'status': CreatorPost.Status.PUBLISHED,
            'published_at': timezone.now(),
        }
        values.update(overrides)
        return CreatorPost.objects.create(creator=self.creator, **values)

    def test_create_publish_edit_soft_delete_and_owner_protection(self):
        draft = self.creator_client.post('/api/creators/posts/create/', {
            'content_type': 'text', 'caption': 'Draft text', 'status': 'draft',
            'hashtags': ['SoulCare', '#writing'], 'category': 'writing',
        }, format='json')
        self.assertEqual(draft.status_code, status.HTTP_201_CREATED)
        self.assertEqual(draft.data['status'], 'draft')

        publish = self.creator_client.patch(
            f"/api/creators/posts/{draft.data['id']}/edit/",
            {'status': 'published'}, format='json',
        )
        self.assertEqual(publish.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(publish.data['published_at'])

        owner_edit = self.creator_client.patch(
            f"/api/creators/posts/{draft.data['id']}/edit/",
            {'caption': 'Owner updated this post.'}, format='json',
        )
        self.assertEqual(owner_edit.status_code, status.HTTP_200_OK)
        self.assertEqual(owner_edit.data['caption'], 'Owner updated this post.')

        self.viewer_client.force_authenticate(self.viewer)
        denied = self.viewer_client.patch(
            f"/api/creators/posts/{draft.data['id']}/edit/",
            {'caption': 'Attempted takeover'}, format='json',
        )
        self.assertEqual(denied.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.viewer_client.delete(
            f"/api/creators/posts/{draft.data['id']}/delete/"
        ).status_code, status.HTTP_404_NOT_FOUND)

        deleted = self.creator_client.delete(f"/api/creators/posts/{draft.data['id']}/delete/")
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)
        deleted_post = CreatorPost.objects.get(pk=draft.data['id'])
        self.assertIsNotNone(deleted_post.deleted_at)
        self.assertEqual(CreatorPost.objects.count(), 1)

    def test_media_validation_and_public_draft_exclusion(self):
        bad_url = self.creator_client.post('/api/creators/posts/create/', {
            'content_type': 'image', 'caption': 'Image', 'media_url': 'http://example.test/image.jpg',
        }, format='json')
        no_url = self.creator_client.post('/api/creators/posts/create/', {
            'content_type': 'video', 'caption': 'Video without media',
        }, format='json')
        self.assertEqual(bad_url.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(no_url.status_code, status.HTTP_400_BAD_REQUEST)

        draft = self.make_post(status=CreatorPost.Status.DRAFT, published_at=None)
        response = self.viewer_client.get('/api/creators/feed/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)
        self.assertTrue(CreatorPost.objects.filter(pk=draft.pk).exists())

    def test_likes_comments_shares_and_views_are_unique_and_not_self_counted(self):
        post = self.make_post()
        view_one = self.viewer_client.post(f'/api/creators/posts/{post.pk}/view/')
        view_repeat = self.viewer_client.post(f'/api/creators/posts/{post.pk}/view/')
        self.assertEqual(view_one.status_code, status.HTTP_201_CREATED)
        self.assertEqual(view_repeat.status_code, status.HTTP_200_OK)
        self.assertEqual(CreatorPostView.objects.count(), 1)

        self.assertEqual(self.viewer_client.post(f'/api/creators/posts/{post.pk}/like/').status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.viewer_client.post(f'/api/creators/posts/{post.pk}/like/').status_code, status.HTTP_200_OK)
        self.assertEqual(CreatorPostLike.objects.count(), 1)
        self.assertEqual(self.viewer_client.post(
            f'/api/creators/posts/{post.pk}/comments/', {'body': 'Kind words'}, format='json'
        ).status_code, status.HTTP_201_CREATED)
        duplicate = self.viewer_client.post(
            f'/api/creators/posts/{post.pk}/comments/', {'body': 'Kind words'}, format='json'
        )
        self.assertEqual(duplicate.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(self.viewer_client.post(f'/api/creators/posts/{post.pk}/share/').status_code,
                         status.HTTP_201_CREATED)
        self.assertEqual(self.viewer_client.post(f'/api/creators/posts/{post.pk}/share/').status_code,
                         status.HTTP_200_OK)
        self.assertEqual(CreatorPostShare.objects.count(), 1)

        self.creator_client.post(f'/api/creators/posts/{post.pk}/view/')
        self.creator_client.post(f'/api/creators/posts/{post.pk}/like/')
        self.assertEqual(CreatorPostView.objects.count(), 1)
        self.assertEqual(CreatorPostLike.objects.count(), 1)
        self.assertTrue(CreatorSecuritySignal.objects.filter(kind='self_engagement').exists())

    def test_public_feed_paginates_and_post_detail_hides_account_data(self):
        for index in range(23):
            self.make_post(caption=f'Post {index}')
        response = self.viewer_client.get('/api/creators/feed/?page_size=5')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 23)
        self.assertEqual(len(response.data['results']), 5)
        detail = self.viewer_client.get(f"/api/creators/posts/{response.data['results'][0]['id']}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertNotIn('email', detail.data)
        self.assertNotIn('user_id', detail.data)

    def test_follow_and_real_dashboard_aggregation(self):
        post = self.make_post()
        self.assertEqual(self.viewer_client.post('/api/creators/profiles/public_owner/follow/').status_code,
                         status.HTTP_201_CREATED)
        self.viewer_client.post(f'/api/creators/posts/{post.pk}/view/')
        self.viewer_client.post(f'/api/creators/posts/{post.pk}/like/')
        self.viewer_client.post(f'/api/creators/posts/{post.pk}/comments/', {'body': 'Comment'}, format='json')
        self.viewer_client.post(f'/api/creators/posts/{post.pk}/share/')

        dashboard = self.creator_client.get('/api/creators/dashboard/')
        self.assertEqual(dashboard.status_code, status.HTTP_200_OK)
        self.assertEqual(dashboard.data['followers'], 1)
        self.assertEqual(dashboard.data['total_posts'], 1)
        self.assertEqual(dashboard.data['views'], 1)
        self.assertEqual(dashboard.data['likes'], 1)
        self.assertEqual(dashboard.data['comments'], 1)
        self.assertEqual(dashboard.data['shares'], 1)

    def test_verified_ad_revenue_is_split_50_50_and_ledger_is_immutable(self):
        post = self.make_post()
        with self.assertRaises(ValidationError):
            record_verified_ad_event(
                post=post, provider='test-provider', provider_event_id='unverified',
                net_amount='10.00', verified_at=timezone.now(), signature_verified=False,
            )

        kwargs = dict(
            post=post, provider='test-provider', provider_event_id='evt-1',
            net_amount='10.01', verified_at=timezone.now(), signature_verified=True,
        )
        ledger = record_verified_ad_event(**kwargs)
        repeated = record_verified_ad_event(**kwargs)
        self.assertEqual(ledger.pk, repeated.pk)
        self.assertEqual(VerifiedAdEvent.objects.count(), 1)
        self.assertEqual(CreatorLedgerEntry.objects.count(), 1)
        attribution = ledger.attribution
        self.assertEqual(attribution.creator_amount, Decimal('5.01'))
        self.assertEqual(attribution.platform_amount, Decimal('5.00'))
        with self.assertRaises(ValidationError):
            ledger.delete()
        with self.assertRaises(ValidationError):
            CreatorLedgerEntry.objects.filter(pk=ledger.pk).update(amount=Decimal('99.00'))
        with self.assertRaises(ValidationError):
            CreatorLedgerEntry.objects.filter(pk=ledger.pk).delete()
        with self.assertRaises(ValidationError):
            CreatorLedgerEntry.objects.bulk_update([ledger], ['amount'])

    def test_monthly_settlement_uses_verified_attribution_only(self):
        post = self.make_post()
        record_verified_ad_event(
            post=post, provider='test-provider', provider_event_id='evt-month',
            net_amount='20.00', verified_at=timezone.now(), signature_verified=True,
        )
        month = timezone.localdate().replace(day=1)
        settlement = create_monthly_settlement(self.creator, month)
        self.assertEqual(settlement.net_amount, Decimal('20.00'))
        self.assertEqual(settlement.creator_amount, Decimal('10.00'))
        self.assertEqual(settlement.platform_amount, Decimal('10.00'))
        repeated_settlement = create_monthly_settlement(self.creator, month)
        self.assertEqual(repeated_settlement.pk, settlement.pk)
        self.assertEqual(self.creator.monthly_settlements.count(), 1)

    @override_settings(
        CREATOR_AD_REVENUE_PROVIDER_CONFIGURED=True,
        CREATOR_MINIMUM_WITHDRAWAL='10.00',
        CREATOR_EARNING_HOLD_DAYS=0,
    )
    def test_withdrawal_balance_validation_idempotency_and_admin_audit(self):
        post = self.make_post()
        record_verified_ad_event(
            post=post, provider='test-provider', provider_event_id='evt-withdraw',
            net_amount='100.00', verified_at=timezone.now(), signature_verified=True,
        )
        invalid = self.creator_client.post('/api/creators/withdrawals/', {
            'request_key': str(uuid.uuid4()), 'amount': '60.00',
        }, format='json')
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)

        request_key = str(uuid.uuid4())
        payload = {'request_key': request_key, 'amount': '50.00'}
        created = self.creator_client.post('/api/creators/withdrawals/', payload, format='json')
        retried = self.creator_client.post('/api/creators/withdrawals/', payload, format='json')
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(retried.status_code, status.HTTP_200_OK)
        withdrawal_id = created.data['id']

        creator_staff = User.objects.create_user(username='staff_creator', password='SecurePassword123!', is_staff=True)
        creator_staff_profile = CreatorProfile.objects.create(
            user=creator_staff, username='staff_creator_public', display_name='Staff Creator'
        )
        self_withdrawal = CreatorWithdrawalRequest.objects.create(
            creator=creator_staff_profile, request_key=uuid.uuid4(), amount=Decimal('10.00')
        )
        self_staff_client = APIClient()
        self_staff_client.force_authenticate(creator_staff)
        self.assertEqual(self_staff_client.patch(
            f'/api/creators/admin/profiles/{creator_staff_profile.pk}/',
            {'is_active': False, 'reason': 'self action'}, format='json',
        ).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self_staff_client.post(
            f'/api/creators/admin/withdrawals/{self_withdrawal.pk}/review/',
            {'action': 'approve', 'reason': 'Self-approval attempt.'}, format='json',
        ).status_code, status.HTTP_403_FORBIDDEN)

        approve = self.staff_client.post(
            f'/api/creators/admin/withdrawals/{withdrawal_id}/review/',
            {'action': 'approve', 'reason': 'Reviewed against the ledger.'}, format='json',
        )
        self.assertEqual(approve.status_code, status.HTTP_200_OK)
        paid = self.staff_client.post(
            f'/api/creators/admin/withdrawals/{withdrawal_id}/review/',
            {'action': 'paid', 'reason': 'Payout completed.', 'payment_reference': 'PAY-TEST-1'}, format='json',
        )
        self.assertEqual(paid.status_code, status.HTTP_200_OK)
        self.assertEqual(paid.data['status'], CreatorWithdrawalRequest.Status.PAID)
        self.assertEqual(CreatorAdminAuditLog.objects.count(), 2)

    def test_admin_endpoints_require_staff_and_signals_do_not_auto_suspend(self):
        post = self.make_post()
        self.creator_client.post(f'/api/creators/posts/{post.pk}/view/')
        signal = CreatorSecuritySignal.objects.get(kind=CreatorSecuritySignal.Kind.SELF_ENGAGEMENT)
        self.assertTrue(self.creator.is_active)

        denied = self.viewer_client.get('/api/creators/admin/profiles/')
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)
        reviewed = self.staff_client.post(
            f'/api/creators/admin/signals/{signal.pk}/review/',
            {'status': CreatorSecuritySignal.Status.REVIEWED, 'reason': 'Reviewed; no restriction warranted.'},
            format='json',
        )
        self.assertEqual(reviewed.status_code, status.HTTP_200_OK)
        self.creator.refresh_from_db()
        self.assertTrue(self.creator.is_active)

    def test_earnings_are_unavailable_without_ad_provider(self):
        post = self.make_post()
        record_verified_ad_event(
            post=post, provider='test-provider', provider_event_id='provider-disabled-event',
            net_amount='75.00', verified_at=timezone.now(), signature_verified=True,
        )
        response = self.creator_client.get('/api/creators/earnings/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['available'])
        self.assertEqual(response.data['balances'], {'pending': '0.00', 'available': '0.00', 'paid': '0.00'})

    def test_staff_cannot_grant_monetization_eligibility_without_provider(self):
        response = self.staff_client.patch(
            f'/api/creators/admin/profiles/{self.creator.pk}/',
            {'monetization_status': CreatorProfile.MonetizationStatus.ELIGIBLE, 'reason': 'manual test'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.creator.refresh_from_db()
        self.assertEqual(self.creator.monetization_status, CreatorProfile.MonetizationStatus.NOT_ELIGIBLE)