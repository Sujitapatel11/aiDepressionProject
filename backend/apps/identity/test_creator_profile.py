from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from .models import CreatorProfile


class CreatorProfileApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='creator_alpha',
            email='alpha-private@example.com',
            password='ExistingPassword123!',
        )
        self.other_user = User.objects.create_user(
            username='creator_beta',
            email='beta-private@example.com',
            password='OtherPassword123!',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def activate(self, username='alpha_creator', **extra):
        payload = {'username': username, 'display_name': 'Alpha Creator'}
        payload.update(extra)
        return self.client.post('/api/creators/activate/', payload, format='json')

    def test_activation_creates_profile_without_creating_or_changing_account(self):
        password_hash = self.user.password
        account_count = User.objects.count()

        response = self.activate(bio='A public creator bio.')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CreatorProfile.objects.count(), 1)
        self.assertEqual(User.objects.count(), account_count)
        self.user.refresh_from_db()
        self.assertEqual(self.user.password, password_hash)
        self.assertEqual(CreatorProfile.objects.get(user=self.user).monetization_status,
                         CreatorProfile.MonetizationStatus.NOT_ELIGIBLE)

    def test_repeated_activation_is_idempotent(self):
        first = self.activate()
        second = self.activate(username='another_name')

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(CreatorProfile.objects.filter(user=self.user).count(), 1)
        self.assertEqual(second.data['username'], 'alpha_creator')

    def test_creator_username_is_unique_case_insensitively(self):
        self.assertEqual(self.activate(username='PublicName').status_code, status.HTTP_201_CREATED)
        self.client.force_authenticate(user=self.other_user)

        response = self.activate(username='publicname')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)
        self.assertEqual(CreatorProfile.objects.count(), 1)

    def test_activation_requires_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.post(
            '/api/creators/activate/',
            {'username': 'unauth_creator', 'display_name': 'Unauthenticated'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(CreatorProfile.objects.count(), 0)

    def test_profile_update_is_limited_to_the_authenticated_owner(self):
        self.activate()
        other_profile = CreatorProfile.objects.create(
            user=self.other_user,
            username='beta_creator',
            display_name='Beta Creator',
        )

        response = self.client.patch(
            '/api/creators/me/',
            {
                'display_name': 'Updated Alpha',
                'bio': 'Updated bio.',
                'monetization_status': CreatorProfile.MonetizationStatus.ELIGIBLE,
                'is_active': False,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['display_name'], 'Updated Alpha')
        self.assertEqual(response.data['monetization_status'], 'not_eligible')
        self.assertTrue(response.data['is_active'])
        other_profile.refresh_from_db()
        self.assertEqual(other_profile.display_name, 'Beta Creator')

    def test_public_profile_exposes_creator_fields_only(self):
        self.activate(bio='Public biography.')
        self.client.force_authenticate(user=None)

        response = self.client.get('/api/creators/ALPHA_CREATOR/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['display_name'], 'Alpha Creator')
        self.assertEqual(response.data['bio'], 'Public biography.')
        self.assertNotIn('email', response.data)
        self.assertNotIn('user', response.data)
        self.assertNotIn('monetization_status', response.data)

    def test_inactive_creator_is_not_public(self):
        self.activate()
        profile = CreatorProfile.objects.get(user=self.user)
        profile.is_active = False
        profile.save(update_fields=['is_active'])
        self.client.force_authenticate(user=None)

        response = self.client.get('/api/creators/alpha_creator/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)