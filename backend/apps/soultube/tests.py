import io
from datetime import timedelta
from urllib.parse import quote

from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase, TransactionTestCase, override_settings
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient

from apps.chat.models import WebSocketAuthTicket
from apps.mediahub.models import MediaAsset

from .models import (
    WatchRoom,
    WatchRoomChatMessage,
    WatchRoomParticipant,
    WatchRoomPlaybackState,
)


def mp4_bytes():
    header = b'\x00\x00\x00\x18ftypisom\x00\x00\x02\x00isomiso2avc1mp41'
    return header + b'\x00' * 128


def png_bytes():
    out = io.BytesIO()
    Image.new('RGB', (4, 4), (200, 140, 240)).save(out, format='PNG')
    return out.getvalue()


class SoulTubeAPITests(TestCase):
    def setUp(self):
        cache.clear()
        self.host = User.objects.create_user('tube_host', 'host@example.com', 'SoulPass!2026')
        self.viewer = User.objects.create_user('tube_viewer', 'viewer@example.com', 'SoulPass!2026')
        self.outsider = User.objects.create_user('tube_outsider', 'out@example.com', 'SoulPass!2026')
        self.client = APIClient()
        self.client.force_authenticate(self.host)

    def create_room(self, **overrides):
        payload = {
            'name': 'Friday movie night',
            'visibility': 'public',
            'max_participants': 10,
        }
        payload.update(overrides)
        return self.client.post('/api/soultube/rooms/create/', payload, format='json')

    def upload_video(self, client=None, user=None):
        client = client or self.client
        from django.core.files.uploadedfile import SimpleUploadedFile
        upload = SimpleUploadedFile('movie.mp4', mp4_bytes(), content_type='video/mp4')
        res = client.post('/api/media/uploads/', {'files': upload}, format='multipart')
        assert res.status_code == 201, res.content
        return res.json()['uploaded'][0]['id']

    def test_create_room_adds_host_membership_and_playback_state(self):
        res = self.create_room()
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual(body['host_username'], 'tube_host')
        self.assertTrue(body['is_host'])
        self.assertTrue(body['joined'])
        self.assertEqual(body['participants'][0]['role'], 'host')
        room = WatchRoom.objects.get(code=body['code'])
        self.assertTrue(WatchRoomPlaybackState.objects.filter(room=room).exists())

    def test_private_room_hidden_from_list_and_outsider(self):
        res = self.create_room(name='Private screening', visibility='private')
        code = res.json()['code']
        self.client.force_authenticate(self.viewer)

        listing = self.client.get('/api/soultube/rooms/')
        self.assertEqual(listing.status_code, 200)
        codes = [room['code'] for room in listing.json()['results']]
        self.assertNotIn(code, codes)

        detail = self.client.get(f'/api/soultube/rooms/{code}/')
        self.assertEqual(detail.status_code, 404)

        joined = self.client.post(f'/api/soultube/rooms/{code}/join/')
        self.assertEqual(joined.status_code, 200, joined.content)
        self.assertEqual(len(joined.json()['participants']), 2)

        detail = self.client.get(f'/api/soultube/rooms/{code}/')
        self.assertEqual(detail.status_code, 200)

    def test_join_rejects_outsider_when_room_is_full(self):
        res = self.create_room(max_participants=2)
        code = res.json()['code']
        self.client.force_authenticate(self.viewer)
        self.assertEqual(self.client.post(f'/api/soultube/rooms/{code}/join/').status_code, 200)
        self.client.force_authenticate(self.outsider)
        full = self.client.post(f'/api/soultube/rooms/{code}/join/')
        self.assertEqual(full.status_code, 409)
        self.assertIn('full', full.json()['detail'].lower())

    def test_non_host_cannot_control_playback_queue_or_close(self):
        video_id = self.upload_video()
        res = self.create_room(video_asset_id=video_id)
        code = res.json()['code']

        self.client.force_authenticate(self.viewer)
        self.client.post(f'/api/soultube/rooms/{code}/join/')

        playback = self.client.patch(
            f'/api/soultube/rooms/{code}/playback/',
            {'is_playing': True, 'position_seconds': 3}, format='json',
        )
        self.assertEqual(playback.status_code, 403)

        queue = self.client.post(
            f'/api/soultube/rooms/{code}/queue/',
            {'video_asset_id': video_id}, format='json',
        )
        self.assertEqual(queue.status_code, 403)

        closed = self.client.post(f'/api/soultube/rooms/{code}/close/')
        self.assertEqual(closed.status_code, 403)

    def test_host_controls_playback_with_server_timestamp(self):
        video_id = self.upload_video()
        code = self.create_room(video_asset_id=video_id).json()['code']

        res = self.client.patch(
            f'/api/soultube/rooms/{code}/playback/',
            {'is_playing': True, 'position_seconds': 12.5}, format='json',
        )
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertTrue(body['is_playing'])
        self.assertGreaterEqual(body['position_seconds'], 12.5)
        self.assertIn('server_timestamp', body)

        state = WatchRoomPlaybackState.objects.get(room__code=code)
        self.assertEqual(state.position_seconds, 12.5)
        self.assertEqual(state.updated_by, self.host)

    def test_queue_requires_own_video_and_play_moves_it_to_player(self):
        video_id = self.upload_video()
        code = self.create_room().json()['code']

        add = self.client.post(
            f'/api/soultube/rooms/{code}/queue/',
            {'video_asset_id': video_id, 'title': 'First'}, format='json',
        )
        self.assertEqual(add.status_code, 201, add.content)
        item_id = add.json()['id']

        play = self.client.post(f'/api/soultube/rooms/{code}/queue/{item_id}/play/')
        self.assertEqual(play.status_code, 200, play.content)
        room = WatchRoom.objects.get(code=code)
        self.assertEqual(str(room.video_asset_id), video_id)
        self.assertEqual(room.queue_items.count(), 0)

        self.client.force_authenticate(self.viewer)
        foreign = self.client.post(
            f'/api/soultube/rooms/{code}/queue/',
            {'video_asset_id': video_id}, format='json',
        )
        self.assertEqual(foreign.status_code, 403)

    def test_queue_reorder_accepts_numeric_item_ids(self):
        video_id = self.upload_video()
        code = self.create_room().json()['code']
        first = self.client.post(
            f'/api/soultube/rooms/{code}/queue/',
            {'video_asset_id': video_id, 'title': 'First'}, format='json',
        ).json()
        second = self.client.post(
            f'/api/soultube/rooms/{code}/queue/',
            {'video_asset_id': video_id, 'title': 'Second'}, format='json',
        ).json()

        res = self.client.post(
            f'/api/soultube/rooms/{code}/queue/reorder/',
            {'item_ids': [second['id'], first['id']]}, format='json',
        )
        self.assertEqual(res.status_code, 200, res.content)
        titles = [item['title'] for item in res.json()['queue']]
        self.assertEqual(titles, ['Second', 'First'])

    def test_room_rejects_non_video_assets(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        upload = SimpleUploadedFile('photo.png', png_bytes(), content_type='image/png')
        res = self.client.post('/api/media/uploads/', {'files': upload}, format='multipart')
        image_id = res.json()['uploaded'][0]['id']

        res = self.create_room(video_asset_id=image_id)
        self.assertEqual(res.status_code, 400)
        self.assertIn('video', res.json()['video_asset_id'][0].lower())

    def test_chat_requires_membership_and_lists_messages(self):
        code = self.create_room().json()['code']
        self.client.force_authenticate(self.viewer)
        self.assertEqual(
            self.client.post(f'/api/soultube/rooms/{code}/messages/', {'body': 'hi'}, format='json').status_code,
            403,
        )
        self.client.post(f'/api/soultube/rooms/{code}/join/')
        sent = self.client.post(
            f'/api/soultube/rooms/{code}/messages/', {'body': 'hello room'}, format='json',
        )
        self.assertEqual(sent.status_code, 201, sent.content)
        listing = self.client.get(f'/api/soultube/rooms/{code}/messages/')
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.json()[0]['body'], 'hello room')

        too_long = self.client.post(
            f'/api/soultube/rooms/{code}/messages/', {'body': 'x' * 501}, format='json',
        )
        self.assertEqual(too_long.status_code, 400)

    def test_close_room_blocks_join_and_marks_closed(self):
        code = self.create_room().json()['code']
        res = self.client.post(f'/api/soultube/rooms/{code}/close/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['status'], 'closed')

        self.client.force_authenticate(self.viewer)
        join = self.client.post(f'/api/soultube/rooms/{code}/join/')
        self.assertEqual(join.status_code, 409)

    def test_room_video_is_served_only_to_active_participants(self):
        from rest_framework_simplejwt.tokens import RefreshToken

        def authenticate(user):
            # /api/media/serve/ is a plain Django view, so it reads the JWT
            # Bearer header rather than DRF's force_authenticate override.
            self.client.force_authenticate(user)
            self.client.credentials(
                HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}',
            )

        video_id = self.upload_video()
        code = self.create_room(video_asset_id=video_id).json()['code']

        # Host (an active participant) receives a playable signed URL.
        authenticate(self.host)
        host_detail = self.client.get(f'/api/soultube/rooms/{code}/').json()
        self.assertFalse(host_detail['video']['is_public'])
        self.assertIn('at=', host_detail['video']['preview_url'])
        self.assertEqual(
            self.client.get(host_detail['video']['preview_url']).status_code, 200,
        )

        # A public room is readable before joining, but non-members must not
        # receive the bearer preview URL.
        authenticate(self.outsider)
        outsider_detail = self.client.get(f'/api/soultube/rooms/{code}/').json()
        self.assertIsNone(outsider_detail['video'])
        self.assertEqual(self.client.get(f'/api/media/serve/{video_id}/').status_code, 404)

        join = self.client.post(f'/api/soultube/rooms/{code}/join/')
        self.assertEqual(join.status_code, 200)
        joined = self.client.get(f'/api/soultube/rooms/{code}/').json()
        self.assertIn('at=', joined['video']['preview_url'])
        self.assertEqual(self.client.get(joined['video']['preview_url']).status_code, 200)
        self.assertEqual(self.client.get(f'/api/media/serve/{video_id}/').status_code, 200)

    def test_host_must_close_instead_of_leaving(self):
        code = self.create_room().json()['code']
        res = self.client.post(f'/api/soultube/rooms/{code}/leave/')
        self.assertEqual(res.status_code, 400)
        self.assertIn('close', res.json()['detail'].lower())

    def test_viewer_can_leave_and_rejoin(self):
        code = self.create_room().json()['code']
        self.client.force_authenticate(self.viewer)
        self.assertEqual(self.client.post(f'/api/soultube/rooms/{code}/join/').status_code, 200)

        left = self.client.post(f'/api/soultube/rooms/{code}/leave/')
        self.assertEqual(left.status_code, 204)
        detail = self.client.get(f'/api/soultube/rooms/{code}/').json()
        self.assertFalse(detail['joined'])
        self.assertEqual(len(detail['participants']), 1)

        rejoined = self.client.post(f'/api/soultube/rooms/{code}/join/')
        self.assertEqual(rejoined.status_code, 200)
        self.assertTrue(rejoined.json()['joined'])

    def test_cleanup_command_closes_expired_rooms(self):
        code = self.create_room().json()['code']
        WatchRoom.objects.filter(code=code).update(expires_at=timezone.now() - timedelta(minutes=1))
        call_command('cleanup_watch_rooms')
        room = WatchRoom.objects.get(code=code)
        self.assertEqual(room.status, WatchRoom.Status.CLOSED)
        self.assertIsNotNone(room.closed_at)


@override_settings(
    CHANNEL_LAYERS={'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}},
)
class SoulTubeWebSocketTests(TransactionTestCase):
    def setUp(self):
        from config.asgi import application

        cache.clear()
        self.application = application
        self.host = User.objects.create_user('ws_host', 'wsh@example.com', 'SoulPass!2026')
        self.viewer = User.objects.create_user('ws_viewer', 'wsv@example.com', 'SoulPass!2026')
        self.outsider = User.objects.create_user('ws_out', 'wso@example.com', 'SoulPass!2026')
        self.room = WatchRoom.objects.create(
            code='ROOM42',
            name='Socket room',
            host=self.host,
            visibility=WatchRoom.Visibility.PUBLIC,
            max_participants=10,
        )
        WatchRoomParticipant.objects.create(
            room=self.room, user=self.host, role=WatchRoomParticipant.Role.HOST,
        )
        WatchRoomPlaybackState.objects.create(room=self.room)

    def communicator(self, user, code='ROOM42'):
        raw_ticket, _ = WebSocketAuthTicket.issue_for_user(user)
        return WebsocketCommunicator(
            self.application,
            f'/ws/soultube/{code}/?ticket={quote(raw_ticket)}',
            headers=[(b'origin', b'http://testserver')],
        )

    def test_member_connects_and_receives_sync(self):
        communicator = self.communicator(self.host)

        async def run():
            connected, _ = await communicator.connect()
            self.assertTrue(connected)
            sync = await communicator.receive_json_from()
            self.assertEqual(sync['type'], 'sync')
            await communicator.disconnect()

        async_to_sync(run)()

    def test_non_member_is_rejected(self):
        communicator = self.communicator(self.outsider)

        async def run():
            connected, _ = await communicator.connect()
            self.assertFalse(connected)

        async_to_sync(run)()

    def test_chat_message_broadcasts_and_persists(self):
        WatchRoomParticipant.objects.create(room=self.room, user=self.viewer)
        communicator = self.communicator(self.viewer)

        async def run():
            connected, _ = await communicator.connect()
            self.assertTrue(connected)
            await communicator.receive_json_from()  # initial sync
            await communicator.send_json_to({'type': 'chat', 'body': 'hello from ws'})
            event = await communicator.receive_json_from()
            self.assertEqual(event['type'], 'chat.message')
            self.assertEqual(event['message']['body'], 'hello from ws')
            await communicator.disconnect()

        async_to_sync(run)()
        self.assertTrue(
            WatchRoomChatMessage.objects.filter(room=self.room, body='hello from ws').exists()
        )

    def test_only_host_can_broadcast_playback(self):
        WatchRoomParticipant.objects.create(room=self.room, user=self.viewer)
        self.room.video_asset = MediaAsset.objects.create(
            id='11111111-1111-4111-8111-111111111111',
            user=self.host,
            file_ext='mp4',
            kind=MediaAsset.Kind.VIDEO,
            original_name='movie.mp4',
            content_type='video/mp4',
            size_bytes=10,
        )
        self.room.save(update_fields=['video_asset'])

        viewer_socket = self.communicator(self.viewer)

        async def viewer_run():
            connected, _ = await viewer_socket.connect()
            self.assertTrue(connected)
            await viewer_socket.receive_json_from()  # sync
            await viewer_socket.send_json_to({
                'type': 'playback', 'is_playing': True, 'position_seconds': 4,
            })
            error = await viewer_socket.receive_json_from()
            self.assertEqual(error['type'], 'error')
            await viewer_socket.disconnect()

        async_to_sync(viewer_run)()

        host_socket = self.communicator(self.host)

        async def host_run():
            connected, _ = await host_socket.connect()
            self.assertTrue(connected)
            await host_socket.receive_json_from()  # sync
            await host_socket.send_json_to({
                'type': 'playback', 'is_playing': True, 'position_seconds': 4,
            })
            event = await host_socket.receive_json_from()
            self.assertEqual(event['type'], 'playback')
            self.assertTrue(event['playback']['is_playing'])
            await host_socket.disconnect()

        async_to_sync(host_run)()
        state = WatchRoomPlaybackState.objects.get(room=self.room)
        self.assertTrue(state.is_playing)
        self.assertEqual(state.position_seconds, 4)

    def test_viewer_reconnects_with_a_fresh_ticket(self):
        WatchRoomParticipant.objects.create(room=self.room, user=self.viewer)
        first = self.communicator(self.viewer)
        second = self.communicator(self.viewer)

        async def run():
            connected, _ = await first.connect()
            self.assertTrue(connected)
            await first.receive_json_from()
            await first.disconnect()

            reconnected, _ = await second.connect()
            self.assertTrue(reconnected)
            sync = await second.receive_json_from()
            self.assertEqual(sync['type'], 'sync')
            await second.send_json_to({'type': 'chat', 'body': 'back again'})
            event = await second.receive_json_from()
            self.assertEqual(event['message']['body'], 'back again')
            await second.disconnect()

        async_to_sync(run)()
        self.assertTrue(WatchRoomChatMessage.objects.filter(body='back again').exists())

    def test_reconnect_rejected_after_leaving_room(self):
        membership = WatchRoomParticipant.objects.create(room=self.room, user=self.viewer)
        first = self.communicator(self.viewer)

        async def run():
            connected, _ = await first.connect()
            self.assertTrue(connected)
            await first.receive_json_from()
            await first.disconnect()

        async_to_sync(run)()

        membership.left_at = timezone.now()
        membership.save(update_fields=['left_at'])
        second = self.communicator(self.viewer)

        async def reconnect():
            connected, _ = await second.connect()
            self.assertFalse(connected)

        async_to_sync(reconnect)()
