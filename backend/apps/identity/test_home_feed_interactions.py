"""Home feed interaction tests: tab feeds, server-side pagination, bookmarks,
comment deletion, and viewer state persistence (followed_by_me / liked_by_me /
bookmarked_by_me) across requests."""
from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from .models import (
    CreatorFollow,
    CreatorPost,
    CreatorPostBookmark,
    CreatorPostComment,
    CreatorPostLike,
    CreatorProfile,
    PublicProfile,
)
from .creator_serializers import CreatorPostSerializer

FEED_PAGE_SIZE = 10


class HomeFeedTestBase(TestCase):
    def setUp(self):
        self.creator_user = User.objects.create_user(username='creator_base', password='CreatorPassword123!')
        self.other_creator_user = User.objects.create_user(username='creator_two', password='CreatorPassword123!')
        self.reader = User.objects.create_user(username='reader_base', password='ReaderPassword123!')
        self.creator = CreatorProfile.objects.create(
            user=self.creator_user, username='base_creator', display_name='Base Creator',
        )
        self.other_creator = CreatorProfile.objects.create(
            user=self.other_creator_user, username='other_creator', display_name='Other Creator',
        )
        self.client_reader = APIClient()
        self.client_reader.force_authenticate(self.reader)
        self.anon_client = APIClient()

    def make_post(self, caption='Feed post', creator=None, published_at=None, **overrides):
        creator = creator if creator is not None else self.creator
        values = {
            'content_type': CreatorPost.ContentType.TEXT,
            'caption': caption,
            'status': CreatorPost.Status.PUBLISHED,
            'published_at': published_at if published_at is not None else timezone.now(),
        }
        values.update(overrides)
        return CreatorPost.objects.create(creator=creator, **values)


class HomeFeedPaginationTests(HomeFeedTestBase):
    def test_default_page_size_is_ten_and_pages_walk_without_duplicates(self):
        for index in range(FEED_PAGE_SIZE * 2 + 5):
            self.make_post(caption=f'Post number {index}', published_at=timezone.now() - timedelta(minutes=index))

        seen_ids = []
        url = '/api/creators/feed/latest/'
        total = FEED_PAGE_SIZE * 2 + 5
        while url:
            response = self.client_reader.get(url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            page_ids = [post['id'] for post in response.data['results']]
            self.assertEqual(len(page_ids), min(10, total - len(seen_ids)))
            seen_ids.extend(page_ids)
            url = response.data['next']
        self.assertEqual(len(seen_ids), total)
        self.assertEqual(len(set(seen_ids)), 25, 'Pages must not repeat post IDs')

        next_pattern = {'page': '2'}
        first = self.client_reader.get('/api/creators/feed/latest/', next_pattern)
        self.assertEqual(first.data['count'], 25)

    def test_page_size_is_configurable_and_capped(self):
        for index in range(15):
            self.make_post(published_at=timezone.now() - timedelta(minutes=index))
        wide = self.client_reader.get('/api/creators/feed/latest/', {'page_size': 500})
        self.assertEqual(wide.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(wide.data['results']), 50)

    def test_out_of_range_page_is_rejected(self):
        self.make_post()
        response = self.client_reader.get('/api/creators/feed/latest/', {'page': 7})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unknown_tab_is_404(self):
        response = self.client_reader.get('/api/creators/feed/everything/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class HomeFeedVisibilityTests(HomeFeedTestBase):
    def test_drafts_deleted_and_future_posts_are_excluded(self):
        self.make_post(caption='Visible now')
        self.make_post(caption='Future scheduled', published_at=timezone.now() + timedelta(days=3))
        self.make_post(caption='Draft stage', status=CreatorPost.Status.DRAFT, published_at=None)
        deleted = self.make_post(caption='Soft deleted', published_at=timezone.now() - timedelta(hours=1))
        deleted.deleted_at = timezone.now()
        deleted.save(update_fields=['deleted_at'])

        response = self.client_reader.get('/api/creators/feed/latest/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['caption'], 'Visible now')

    def test_posts_from_inactive_creators_are_hidden(self):
        self.creator.is_active = False
        self.creator.save(update_fields=['is_active'])
        self.make_post()
        self.other_creator.is_active = False
        self.other_creator.save(update_fields=['is_active'])
        self.make_post(creator=self.other_creator)

        response = self.client_reader.get('/api/creators/feed/latest/')
        self.assertEqual(response.data['count'], 0)


class FollowingFeedTests(HomeFeedTestBase):
    def test_anonymous_following_feed_requires_authentication(self):
        response = self.anon_client.get('/api/creators/feed/following/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_following_feed_only_returns_followed_creators(self):
        self.make_post(caption='Followed creator post', published_at=timezone.now() - timedelta(minutes=1))
        self.make_post(creator=self.other_creator, caption='Unfollowed creator post')

        response = self.client_reader.get('/api/creators/feed/following/')
        self.assertEqual(response.data['count'], 0, 'Empty state until user follows someone')

        CreatorFollow.objects.create(creator=self.creator, follower=self.reader)
        response = self.client_reader.get('/api/creators/feed/following/')
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['creator_username'], 'base_creator')


class TrendingFeedTests(HomeFeedTestBase):
    def test_trending_ranks_by_real_engagement_and_recency_window(self):
        quiet = self.make_post('Quiet post', published_at=timezone.now() - timedelta(days=3))
        popular = self.make_post('Popular post', published_at=timezone.now() - timedelta(days=1))
        stale_popular = self.make_post('Stale popular post', published_at=timezone.now() - timedelta(days=45))

        reader_two = User.objects.create_user(username='second_reader', password='SecondReaderPassword123!')
        for index in range(4):
            liker = User.objects.create_user(username=f'pop_liker_{index}', password=f'PopLikerPassword{index}123!')
            CreatorPostLike.objects.create(post=popular, user=liker)
        CreatorPostLike.objects.create(post=stale_popular, user=reader_two)

        response = self.client_reader.get('/api/creators/feed/trending/')
        captions = [post['caption'] for post in response.data['results']]
        self.assertEqual(captions, ['Popular post', 'Quiet post'])
        self.assertNotIn('Stale popular post', captions, 'Posts outside the recency window are excluded')

    def test_trending_falls_back_to_recency_without_engagement(self):
        newer = self.make_post('Newer', published_at=timezone.now() - timedelta(minutes=1))
        older = self.make_post('Older', published_at=timezone.now() - timedelta(minutes=5))
        response = self.client_reader.get('/api/creators/feed/trending/')
        self.assertEqual([post['id'] for post in response.data['results']], [str(newer.pk), str(older.pk)])


class ForYouFeedTests(HomeFeedTestBase):
    def test_interest_match_ranks_matching_posts_first(self):
        PublicProfile.objects.get_or_create(user=self.reader, interests=['mindfulness'])
        match = self.make_post('Mindfulness match', published_at=timezone.now() - timedelta(days=2))
        match.category = 'mindfulness'
        match.save(update_fields=['category'])
        mismatch = self.make_post('Popular mismatch', published_at=timezone.now() - timedelta(days=1))
        for index in range(6):
            liker = User.objects.create_user(username=f'liker_{index}', password=f'LikerPassword{index}123!')
            CreatorPostLike.objects.create(post=mismatch, user=liker)

        response = self.client_reader.get('/api/creators/feed/for-you/')
        self.assertEqual([post['caption'] for post in response.data['results']], ['Mindfulness match', 'Popular mismatch'])
    def test_viewer_without_interests_gets_chronological_fallback(self):
        PublicProfile.objects.get_or_create(user=self.reader, interests=[])
        newer = self.make_post('Newer', published_at=timezone.now() - timedelta(minutes=1))
        older = self.make_post('Older', published_at=timezone.now() - timedelta(minutes=3))
        response = self.client_reader.get('/api/creators/feed/for-you/')
        self.assertEqual([post['id'] for post in response.data['results']], [str(newer.pk), str(older.pk)])

    def test_serialization_exposes_no_private_data(self):
        self.make_post()
        response = self.client_reader.get('/api/creators/feed/for-you/')
        fields = set(response.data['results'][0].keys())
        expected = {
            'id', 'creator_username', 'creator_display_name', 'creator_avatar',
            'content_type', 'caption', 'media_url', 'hashtags', 'category',
            'status', 'published_at', 'created_at', 'updated_at',
            'likes_count', 'comments_count', 'shares_count', 'views_count',
            'liked_by_me', 'followed_by_me', 'bookmarked_by_me', 'media',
        }
        self.assertEqual(fields, expected)
        forbidden = {'email', 'seed_key', 'identity_config', 'personality', 'journal'}
        self.assertFalse(forbidden & fields, 'Private signals must never appear in feed payloads')


class FollowStatePersistenceTests(HomeFeedTestBase):
    def test_follow_unfollow_sets_followed_by_me_in_feed(self):
        self.make_post()
        feed = self.client_reader.get('/api/creators/feed/latest/')
        self.assertFalse(feed.data['results'][0]['followed_by_me'])

        created = self.client_reader.post('/api/creators/profiles/base_creator/follow/')
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        duplicate = self.client_reader.post('/api/creators/profiles/base_creator/follow/')
        self.assertEqual(duplicate.status_code, status.HTTP_200_OK)
        self.assertEqual(duplicate.data['created'], False)
        self.assertEqual(CreatorFollow.objects.count(), 1, 'Duplicate follow rows are prevented')

        feed = self.client_reader.get('/api/creators/feed/latest/')
        self.assertTrue(feed.data['results'][0]['followed_by_me'])

        self.client_reader.delete('/api/creators/profiles/base_creator/follow/')
        feed = self.client_reader.get('/api/creators/feed/latest/')
        self.assertFalse(feed.data['results'][0]['followed_by_me'])

    def test_cannot_follow_self(self):
        follower_client = APIClient()
        follower_client.force_authenticate(self.creator_user)
        response = follower_client.post('/api/creators/profiles/base_creator/follow/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(CreatorFollow.objects.count(), 0)

    def test_followed_by_me_is_false_for_anonymous(self):
        self.make_post()
        response = self.anon_client.get('/api/creators/feed/latest/')
        self.assertFalse(response.data['results'][0]['followed_by_me'])
        self.assertFalse(response.data['results'][0]['bookmarked_by_me'])


class LikeUnlikeTests(HomeFeedTestBase):
    def test_like_toggle_persists_and_prevents_duplicates(self):
        post = self.make_post()
        first = self.client_reader.post(f'/api/creators/posts/{post.pk}/like/')
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CreatorPostLike.objects.count(), 1)
        repeat = self.client_reader.post(f'/api/creators/posts/{post.pk}/like/')
        self.assertEqual(repeat.status_code, status.HTTP_200_OK)
        self.assertEqual(CreatorPostLike.objects.count(), 1, 'Duplicate like rows are prevented')

        feed = self.client_reader.get('/api/creators/feed/latest/')
        self.assertTrue(feed.data['results'][0]['liked_by_me'])
        self.assertEqual(feed.data['results'][0]['likes_count'], 1)

        removed = self.client_reader.delete(f'/api/creators/posts/{post.pk}/like/')
        self.assertEqual(removed.status_code, status.HTTP_200_OK)
        feed = self.client_reader.get('/api/creators/feed/latest/')
        self.assertFalse(feed.data['results'][0]['liked_by_me'])
        self.assertEqual(feed.data['results'][0]['likes_count'], 0)

    def test_anonymous_cannot_like(self):
        post = self.make_post()
        response = self.anon_client.post(f'/api/creators/posts/{post.pk}/like/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class CommentLifecycleTests(HomeFeedTestBase):
    def test_comment_create_list_validation_and_author_delete(self):
        post = self.make_post()
        created = self.client_reader.post(f'/api/creators/posts/{post.pk}/comments/', {'body': 'Gentle words.'}, format='json')
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data['author_label'], 'SoulCare member')
        self.assertEqual(created.data['author_username'], 'reader_base')

        too_long = self.client_reader.post(
            f'/api/creators/posts/{post.pk}/comments/', {'body': 'x' * 1001}, format='json'
        )
        self.assertEqual(too_long.status_code, status.HTTP_400_BAD_REQUEST)

        empty = self.client_reader.post(f'/api/creators/posts/{post.pk}/comments/', {'body': '   '}, format='json')
        self.assertEqual(empty.status_code, status.HTTP_400_BAD_REQUEST)

        listing = self.client_reader.get(f'/api/creators/posts/{post.pk}/comments/')
        self.assertEqual(listing.data['count'], 1)
        self.assertTrue(listing.data['results'][0]['author_is_me'])

        deleted = self.client_reader.delete(f"/api/creators/comments/{created.data['id']}/delete/")
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)
        listing = self.client_reader.get(f'/api/creators/posts/{post.pk}/comments/')
        self.assertEqual(listing.data['count'], 0)

    def test_user_cannot_delete_another_users_comment(self):
        post = self.make_post()
        comment = CreatorPostComment.objects.create(post=post, user=self.reader, body='Not yours to delete.')
        stranger = User.objects.create_user(username='stranger_user', password='StrangerPassword123!')
        client = APIClient()
        client.force_authenticate(stranger)
        response = client.delete(f'/api/creators/comments/{comment.pk}/delete/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(CreatorPostComment.objects.filter(pk=comment.pk).exists())

    def test_anonymous_cannot_comment(self):
        post = self.make_post()
        response = self.anon_client.post(f'/api/creators/posts/{post.pk}/comments/', {'body': 'hi'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class BookmarkTests(HomeFeedTestBase):
    def test_bookmark_toggle_and_saved_posts_listing(self):
        post = self.make_post('Saved post')
        unpublished = self.make_post('Hidden draft', status=CreatorPost.Status.DRAFT, published_at=None)

        created = self.client_reader.post(f'/api/creators/posts/{post.pk}/bookmark/')
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        duplicate = self.client_reader.post(f'/api/creators/posts/{post.pk}/bookmark/')
        self.assertEqual(duplicate.status_code, status.HTTP_200_OK)
        self.assertEqual(CreatorPostBookmark.objects.count(), 1, 'Duplicate bookmark rows are prevented')

        draft_attempt = self.client_reader.post(f'/api/creators/posts/{unpublished.pk}/bookmark/')
        self.assertEqual(draft_attempt.status_code, status.HTTP_404_NOT_FOUND,
                         'Unpublished posts must never be bookmarkable')

        saved = self.client_reader.get('/api/creators/bookmarks/')
        self.assertEqual(saved.data['count'], 1, 'Unpublished posts never appear in saved lists')
        self.assertEqual(saved.data['results'][0]['caption'], 'Saved post')
        self.assertTrue(saved.data['results'][0]['bookmarked_by_me'])

        feed = self.client_reader.get('/api/creators/feed/latest/')
        self.assertTrue(feed.data['results'][0]['bookmarked_by_me'])

        removed = self.client_reader.delete(f'/api/creators/posts/{post.pk}/bookmark/')
        self.assertEqual(removed.status_code, status.HTTP_200_OK)
        self.assertEqual(CreatorPostBookmark.objects.count(), 0)
        feed = self.client_reader.get('/api/creators/feed/latest/')
        self.assertFalse(feed.data['results'][0]['bookmarked_by_me'])

    def test_bookmarks_are_private_per_user(self):
        post = self.make_post('Private save')
        self.client_reader.post(f'/api/creators/posts/{post.pk}/bookmark/')

        stranger = User.objects.create_user(username='bookmark_strianger', password='BookmarkPassword123!')
        stranger_client = APIClient()
        stranger_client.force_authenticate(stranger)

        feed = stranger_client.get('/api/creators/feed/latest/')
        self.assertFalse(feed.data['results'][0]['bookmarked_by_me'], 'Other users must not see my bookmark state')

        saved = stranger_client.get('/api/creators/bookmarks/')
        self.assertEqual(saved.data['count'], 0, 'Saved lists must expose only the requester\'s bookmarks')

        anon = self.anon_client.get('/api/creators/bookmarks/')
        self.assertEqual(anon.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonymous_cannot_bookmark(self):
        post = self.make_post()
        response = self.anon_client.post(f'/api/creators/posts/{post.pk}/bookmark/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
