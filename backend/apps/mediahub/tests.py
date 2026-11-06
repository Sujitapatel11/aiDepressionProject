import io
import uuid
from datetime import timedelta

from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient

from apps.community.models import CommunityPost
from apps.identity.models import CreatorFollow, CreatorPost, CreatorProfile
from apps.mediahub.models import MediaAsset
from django.contrib.auth.models import User


def image_bytes(fmt, size=(4, 4), color=(200, 140, 240)):
    out = io.BytesIO()
    img = Image.new('RGB', size, color)
    img.save(out, format=fmt)
    return out.getvalue()


def mp4_bytes():
    header = b'\x00\x00\x00\x18ftypisom\x00\x00\x02\x00isomiso2avc1mp41'
    return header + b'\x00' * 128


class MediaUploadTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('media_qa_a', 'a@example.com', 'MediaPass!2026')
        self.other = User.objects.create_user('media_qa_b', 'b@example.com', 'MediaPass!2026')
        self.client.force_authenticate(self.user)
        self.url = '/api/media/uploads/'

    def upload(self, name, data, content_type='application/octet-stream', field='files'):
        import json
        from django.core.files.uploadedfile import SimpleUploadedFile
        f = SimpleUploadedFile(name, data, content_type=content_type)
        return self.client.post(self.url, {field: f}, format='multipart')

    def test_valid_png_upload(self):
        res = self.upload('pic.png', image_bytes('PNG'), 'image/png')
        self.assertEqual(res.status_code, 201)
        body = res.json()
        self.assertEqual(len(body['uploaded']), 1)
        self.assertEqual(body['serialized_errors' if 'serialized_errors' in body else 'errors'], [])
        asset = body['uploaded'][0]
        self.assertEqual(asset['kind'], 'image')
        self.assertEqual(asset['width'], 4)
        self.assertEqual(asset['height'], 4)
        self.assertTrue(asset['url'].startswith('/api/media/serve/'))

    def test_valid_jpeg_and_webp(self):
        res = self.upload('a.jpg', image_bytes('JPEG'), 'image/jpeg')
        self.assertEqual(res.status_code, 201)
        res2 = self.upload('b.webp', image_bytes('WEBP'), 'image/webp')
        self.assertEqual(res2.status_code, 201)

    def test_multi_image_upload(self):
        import json
        from django.core.files.uploadedfile import SimpleUploadedFile
        files = [
            SimpleUploadedFile('one.png', image_bytes('PNG'), 'image/png'),
            SimpleUploadedFile('two.png', image_bytes('PNG'), 'image/png'),
            SimpleUploadedFile('three.webp', image_bytes('WEBP'), 'image/webp'),
        ]
        res = self.client.post(self.url, {'files': files}, format='multipart')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(len(res.json()['uploaded']), 3)

    def test_unsupported_extension_rejected(self):
        res = self.upload('notes.txt', b'hello world', 'text/plain')
        self.assertEqual(res.status_code, 400)
        self.assertIn('Images must be JPG', ' '.join(e['detail'] for e in res.json()['errors']))
        self.assertEqual(MediaAsset.objects.count(), 0)

    def test_fake_png_rejected(self):
        res = self.upload('fake.png', b'not an image at all', 'image/png')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(MediaAsset.objects.count(), 0)

    def test_gif_rejected(self):
        res = self.upload('anim.gif', image_bytes('GIF'), 'image/gif')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(MediaAsset.objects.count(), 0)

    def test_oversized_image_rejected(self):
        with override_settings(MEDIA_MAX_IMAGE_MB=0):
            res = self.upload('big.png', image_bytes('PNG'), 'image/png')
        self.assertEqual(res.status_code, 400)
        self.assertIn('limit', res.json()['errors'][0]['detail'])

    def test_valid_mp4_upload(self):
        res = self.upload('clip.mp4', mp4_bytes(), 'video/mp4')
        self.assertEqual(res.status_code, 201, res.json())
        self.assertEqual(res.json()['uploaded'][0]['kind'], 'video')
        self.assertIsNone(res.json()['uploaded'][0]['width'])

    def test_fake_video_rejected(self):
        res = self.upload('clip.mp4', b'\x00' * 64, 'video/mp4')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(MediaAsset.objects.count(), 0)

    def test_mov_quicktime_brand_accepted(self):
        brand = b'\x00\x00\x00\x14ftypqt  \x00\x00\x02\x00'
        res = self.upload('clip.mov', brand + b'\x00' * 128, 'video/quicktime')
        self.assertEqual(res.status_code, 201)

    def test_anonymous_rejected(self):
        self.client.force_authenticate(None)
        res = self.upload('pic.png', image_bytes('PNG'))
        self.assertEqual(res.status_code, 401)

    def test_too_many_files_rejected(self):
        import json
        from django.core.files.uploadedfile import SimpleUploadedFile
        files = [SimpleUploadedFile(f'f{i}.png', image_bytes('PNG'), 'image/png') for i in range(7)]
        res = self.client.post(self.url, {'files': files}, format='multipart')
        self.assertEqual(res.status_code, 400)


class MediaAccessTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.a = User.objects.create_user('media_qa_a', 'a@example.com', 'MediaPass!2026')
        self.b = User.objects.create_user('media_qa_b', 'b@example.com', 'MediaPass!2026')
        self.client.force_authenticate(self.a)
        png = image_bytes('PNG')
        res = self.client.post('/api/media/uploads/', {'files': png_file(png)}, format='multipart')
        self.asset_id = res.json()['uploaded'][0]['id']
        self.asset = MediaAsset.objects.get(id=self.asset_id)
        self.preview_url = res.json()['uploaded'][0]['preview_url']
        self.serve_url = f'/api/media/serve/{self.asset_id}/'

    def test_owner_serve_via_signed_preview(self):
        res = self.client.get(self.preview_url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get('Content-Type'), 'image/png')

    def test_orphan_visible_only_to_owner(self):
        res = self.client.get(self.preview_url)
        self.assertEqual(res.status_code, 200)
        res = self.client.get(self.serve_url)
        self.assertEqual(res.status_code, 404)

    def test_orphan_delete_by_owner_only(self):
        res = self.client.delete(f'/api/media/uploads/{self.asset_id}/')
        self.assertEqual(res.status_code, 200)
        self.assertFalse(MediaAsset.objects.filter(id=self.asset_id).exists())
        asset2 = MediaAsset.objects.create(
            id=uuid.uuid4(), user=self.a, file_ext='png', kind=MediaAsset.Kind.IMAGE,
            original_name='x.png', content_type='image/png', size_bytes=10,
            created_at=timezone.now(),
        )
        self.client.force_authenticate(self.b)
        res = self.client.delete(f'/api/media/uploads/{asset2.id}/')
        self.assertEqual(res.status_code, 404)

    def test_tampered_preview_token_denied(self):
        parts = self.preview_url.split('?at=')
        bad = parts[0] + '?at=' + parts[1][:-2] + 'XX'
        res = self.client.get(bad)
        self.assertEqual(res.status_code, 404)

    def test_community_attached_public_then_hidden(self):
        res = self.client.post('/api/community/posts/create/', {
            'content': 'a photo moment', 'media_asset_ids': [str(self.asset_id)],
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(len(res.json()['media']), 1)
        post_id = res.json()['id']

        res = self.client.get(self.serve_url)
        self.assertEqual(res.status_code, 200)

        post = CommunityPost.objects.get(id=post_id)
        post.check_and_auto_hide(threshold=0)  # force-hide
        res = self.client.get(self.serve_url)
        self.assertEqual(res.status_code, 404)

    def test_foreign_asset_attachment_rejected(self):
        # B (another user) tries to attach A's orphan asset to B's own post.
        # Silent dropping used to leave a "published" post with no media; the
        # API now fails loudly so the client can surface a real error.
        client_b = APIClient()
        client_b.force_authenticate(self.b)
        res = client_b.post('/api/community/posts/create/', {
            'content': 'b trying', 'media_asset_ids': [str(self.asset_id)],
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('media_asset_ids', res.json())
        self.assertFalse(CommunityPost.objects.filter(user=self.b).exists())
        self.asset.refresh_from_db()
        self.assertIsNone(self.asset.community_post)

    def test_creator_draft_media_owner_only_then_public(self):
        creator = CreatorProfile.objects.create(user=self.a, username='media_qa_a', display_name='A')
        res = self.client.post('/api/creators/posts/create/', {
            'content_type': 'image', 'caption': 'draft with photo', 'status': 'draft',
            'media_asset_ids': [str(self.asset_id)],
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(len(res.json()['media']), 1)

        # Draft: anonymous/public URL is masked, signed owner preview works.
        res = self.client.get(self.serve_url)
        self.assertEqual(res.status_code, 404)
        res = self.client.get(self.preview_url)
        self.assertEqual(res.status_code, 200)

        post_id = CreatorPost.objects.filter(creator=creator).first().id
        res = self.client.patch(f'/api/creators/posts/{post_id}/edit/', {'status': 'published'}, format='json')
        self.assertEqual(res.json()['status'], 'published')
        res = self.client.get(self.serve_url)
        self.assertEqual(res.status_code, 200)

    def test_creator_post_delete_cleans_media(self):
        creator = CreatorProfile.objects.create(user=self.a, username='media_qa_a', display_name='A')
        res = self.client.post('/api/creators/posts/create/', {
            'content_type': 'image', 'caption': 'to be deleted',
            'media_asset_ids': [str(self.asset_id)],
        }, format='json')
        post_id = res.json()['id']
        stored_name = self.asset.file.name
        import os
        from django.conf import settings as dj_settings
        disk = os.path.join(dj_settings.MEDIA_ROOT, stored_name)
        self.assertTrue(os.path.exists(disk))
        res = self.client.delete(f'/api/creators/posts/{post_id}/delete/')
        self.assertEqual(res.status_code, 204)
        self.assertFalse(MediaAsset.objects.filter(id=self.asset_id).exists())
        self.assertFalse(os.path.exists(disk))

    def test_cleanup_command_removes_old_orphans_only(self):
        self.asset.created_at = timezone.now() - timedelta(hours=48)
        self.asset.save()
        fresh = MediaAsset.objects.create(
            id=uuid.uuid4(), user=self.a, file_ext='png', kind=MediaAsset.Kind.IMAGE,
            original_name='fresh.png', content_type='image/png', size_bytes=10,
            created_at=timezone.now(),
        )
        call_command('cleanup_orphan_media', hours=24)
        self.assertFalse(MediaAsset.objects.filter(id=self.asset_id).exists())
        self.assertTrue(MediaAsset.objects.filter(id=fresh.id).exists())


def png_file(data, name='pic.png'):
    from django.core.files.uploadedfile import SimpleUploadedFile
    return SimpleUploadedFile(name, data, 'image/png')


class R2UsageAndRedirectTests(TestCase):
    """Free-tier accounting + presigned delivery, without any real network:
    fake credentials make r2_enabled() true (presigning is local-only math),
    while the storage backend stays local in tests by settings design."""

    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user('usage_admin', 'ua@x.com', 'MediaPass!2026', is_staff=True)
        self.user = User.objects.create_user('usage_user', 'uu@x.com', 'MediaPass!2026')
        self.client.force_authenticate(self.user)

    def upload_png(self, token_hours=None):
        res = self.client.post('/api/media/uploads/', {'files': png_file(image_bytes('PNG'))}, format='multipart')
        return res

    def test_upload_increments_usage_counters(self):
        from apps.mediahub.models import R2UsageMonth
        from apps.mediahub.usage import month_key, storage_bytes_used
        before = storage_bytes_used()
        # PUT accounting only applies while R2 is the active backend.
        with override_settings(
                R2_ACCOUNT_ID='acct', R2_ACCESS_KEY_ID='key', R2_SECRET_ACCESS_KEY='sec',
                R2_BUCKET_NAME='bucket'):
            res = self.upload_png()
        self.assertEqual(res.status_code, 201)
        record = R2UsageMonth.objects.get(month=month_key())
        self.assertEqual(record.put_ops, 1)
        self.assertGreater(storage_bytes_used(), before)

    def test_ceiling_blocks_upload_with_usage_payload(self):
        from apps.mediahub.models import MediaAsset as MA
        count_before = MA.objects.count()
        with override_settings(
                R2_ACCOUNT_ID='acct', R2_ACCESS_KEY_ID='key', R2_SECRET_ACCESS_KEY='sec',
                R2_BUCKET_NAME='bucket', R2_MAX_PUT_OPS_MONTH=0):
            res = self.upload_png()
        self.assertEqual(res.status_code, 400)
        self.assertIn('ceiling', res.json()['detail'])
        self.assertIn('usage', res.json())
        self.assertEqual(MA.objects.count(), count_before)  # nothing written

    def test_usage_endpoint_staff_only(self):
        res = self.client.get('/api/media/usage/')
        self.assertEqual(res.status_code, 403)
        self.client.force_authenticate(self.staff)
        res = self.client.get('/api/media/usage/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('storage_bytes', res.json())
        self.assertIn('warnings', res.json())

    def test_serve_redirects_to_presigned_url_in_r2_mode(self):
        res = self.upload_png()
        self.assertEqual(res.status_code, 201, res.content)
        # Owner-scoped access goes through the signed preview URL, exactly
        # like <img>/<video> tags do (they can't send auth headers).
        preview = res.json()['uploaded'][0]['preview_url']
        with override_settings(
                R2_ACCOUNT_ID='acct', R2_ACCESS_KEY_ID='key', R2_SECRET_ACCESS_KEY='sec',
                R2_BUCKET_NAME='bucket'):
            serve_res = self.client.get(preview)
        self.assertEqual(serve_res.status_code, 302, getattr(serve_res, 'content', b''))
        location = serve_res['Location']
        self.assertIn('.r2.cloudflarestorage.com', location)
        self.assertIn('X-Amz-Signature', location)
        self.assertEqual(serve_res['Cache-Control'], 'private, max-age=300')

    def test_denied_serve_never_redirects(self):
        res = self.upload_png()
        self.assertEqual(res.status_code, 201, res.content)
        asset_id = res.json()['uploaded'][0]['id']
        other = User.objects.create_user('usage_other', 'uo@x.com', 'MediaPass!2026')
        self.client.force_authenticate(other)
        with override_settings(
                R2_ACCOUNT_ID='acct', R2_ACCESS_KEY_ID='key', R2_SECRET_ACCESS_KEY='sec',
                R2_BUCKET_NAME='bucket'):
            serve_res = self.client.get(f'/api/media/serve/{asset_id}/')
        self.assertEqual(serve_res.status_code, 404)


class MediaRangeRequestTests(TestCase):
    """Browsers need Range support to seek in uploaded videos. The local
    streaming path implements it by hand (Django's FileResponse does not), so
    it gets explicit coverage for 200/206/416 responses."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('media_range_a', 'ra@example.com', 'MediaPass!2026')
        self.client.force_authenticate(self.user)
        from django.core.files.uploadedfile import SimpleUploadedFile
        self.data = mp4_bytes()
        upload = SimpleUploadedFile('seek.mp4', self.data, content_type='video/mp4')
        res = self.client.post('/api/media/uploads/', {'files': upload}, format='multipart')
        self.assertEqual(res.status_code, 201, res.content)
        self.preview_url = res.json()['uploaded'][0]['preview_url']

    def _serve(self, range_header=None):
        extra = {'HTTP_RANGE': range_header} if range_header else {}
        return self.client.get(self.preview_url, **extra)

    def _body(self, response):
        return b''.join(response.streaming_content)

    def test_full_response_without_range_header(self):
        res = self._serve()
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res['Accept-Ranges'], 'bytes')
        self.assertEqual(int(res['Content-Length']), len(self.data))
        self.assertEqual(self._body(res), self.data)

    def test_partial_content_for_explicit_range(self):
        res = self._serve('bytes=0-9')
        self.assertEqual(res.status_code, 206)
        self.assertEqual(res['Content-Range'], f'bytes 0-9/{len(self.data)}')
        self.assertEqual(int(res['Content-Length']), 10)
        self.assertEqual(self._body(res), self.data[:10])

    def test_suffix_range_returns_tail(self):
        res = self._serve('bytes=-5')
        self.assertEqual(res.status_code, 206)
        self.assertEqual(self._body(res), self.data[-5:])

    def test_open_ended_range_reads_to_end(self):
        res = self._serve(f'bytes={len(self.data) - 8}-')
        self.assertEqual(res.status_code, 206)
        self.assertEqual(self._body(res), self.data[-8:])

    def test_unsatisfiable_range_is_rejected_with_real_extent(self):
        res = self._serve(f'bytes={len(self.data) + 10}-{len(self.data) + 20}')
        self.assertEqual(res.status_code, 416)
        self.assertEqual(res['Content-Range'], f'bytes */{len(self.data)}')

    def test_malformed_range_is_rejected(self):
        res = self._serve('bytes=not-a-range')
        self.assertEqual(res.status_code, 416)
        self.assertEqual(res['Content-Range'], f'bytes */{len(self.data)}')

class MediaLibraryTests(TestCase):
    """The SoulTube host picker lists only the caller's own uploads."""

    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user('library_a', 'la@example.com', 'MediaPass!2026')
        self.other = User.objects.create_user('library_b', 'lb@example.com', 'MediaPass!2026')
        self.client.force_authenticate(self.user)

    def _upload(self, name, data, content_type, client=None):
        from django.core.files.uploadedfile import SimpleUploadedFile
        client = client or self.client
        upload = SimpleUploadedFile(name, data, content_type=content_type)
        return client.post('/api/media/uploads/', {'files': upload}, format='multipart')

    def test_library_lists_only_own_videos(self):
        video = self._upload('mine.mp4', mp4_bytes(), 'video/mp4')
        self.assertEqual(video.status_code, 201, video.content)
        self._upload('mine.png', image_bytes('PNG'), 'image/png')

        self.client.force_authenticate(self.other)
        foreign = self._upload('theirs.mp4', mp4_bytes(), 'video/mp4')
        self.assertEqual(foreign.status_code, 201, foreign.content)
        self.client.force_authenticate(self.user)

        res = self.client.get('/api/media/library/?kind=video')
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertEqual(len(body['results']), 1)
        self.assertEqual(body['results'][0]['kind'], 'video')
        self.assertEqual(body['results'][0]['original_name'], 'mine.mp4')
        self.assertTrue(body['results'][0]['preview_url'])

    def test_library_rejects_unknown_kind(self):
        res = self.client.get('/api/media/library/?kind=audio')
        self.assertEqual(res.status_code, 400)

    def test_library_requires_authentication(self):
        res = APIClient().get('/api/media/library/')
        self.assertEqual(res.status_code, 401)
