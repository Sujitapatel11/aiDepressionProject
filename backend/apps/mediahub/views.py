import re

from django.conf import settings
from django.core.files.base import ContentFile
from django.http import HttpResponse, JsonResponse, HttpResponseRedirect, StreamingHttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes, throttle_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.identity.models import CreatorPost

from config.throttles import MediaUploadRateThrottle

from .media_validation import ValidationError, validate_and_prepare
from .models import MediaAsset
from .serializers import MediaAssetSerializer
from .signing import verify_media_token
from .storage import presigned_get_url, r2_enabled
from . import usage

MAX_FILES_PER_UPLOAD = settings.MEDIA_MAX_FILES_PER_UPLOAD
RANGE_RE = re.compile(r'^bytes=(\d*)-(\d*)$')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([MediaUploadRateThrottle])
@parser_classes([MultiPartParser])
def upload_media(request):
    """Multipart upload endpoint. Accepts one or more `files`; each file is
    content-validated, re-encoded (images), stored, and returned as an asset
    ready to be attached to a post. Nothing here fabricates success — files
    that fail validation are reported per-item in `errors`. When R2 storage
    is active, whole-request is refused (with current usage numbers) if it
    would cross a free-tier safety ceiling."""
    files = request.FILES.getlist('files')
    if not files:
        return Response({'detail': 'No files were provided.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(files) > MAX_FILES_PER_UPLOAD:
        return Response(
            {'detail': f'At most {MAX_FILES_PER_UPLOAD} files per upload.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    prepared_items, errors = [], []
    for file_obj in files:
        try:
            prepared_items.append(validate_and_prepare(file_obj))
        except ValidationError as exc:
            errors.append({'file': file_obj.name, 'detail': exc.detail})

    # Free-tier gate (R2 mode): refuse BEFORE any object is written.
    if usage.uploads_blocked(sum(p['size_bytes'] for p in prepared_items)):
        return Response(
            {
                'detail': usage.blocked_reason(sum(p['size_bytes'] for p in prepared_items)),
                'usage': usage.usage_snapshot(),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    uploaded = []
    for prepared in prepared_items:
        asset = MediaAsset(
            id=prepared['id'],
            user=request.user,
            file_ext=prepared['file_ext'],
            kind=prepared['kind'],
            original_name=prepared['original_name'],
            content_type=prepared['content_type'],
            size_bytes=prepared['size_bytes'],
            width=prepared['width'],
            height=prepared['height'],
        )
        asset.file.save(f'{asset.id}.{asset.file_ext}', ContentFile(prepared['data']), save=True)
        uploaded.append(asset)
    if uploaded:
        usage.record_put(n=len(uploaded))

    response_payload = {
        'uploaded': MediaAssetSerializer(uploaded, many=True).data,
        'errors': errors,
    }
    if usage.usage_snapshot()['warnings']:
        response_payload['usage'] = usage.usage_snapshot()
    if not uploaded:
        return Response(response_payload, status=status.HTTP_400_BAD_REQUEST)
    return Response(response_payload, status=status.HTTP_201_CREATED)


def serve_media(request, asset_id):
    """Permission-checked media serving. Access rules mirror post visibility:
    orphan assets are visible to their uploader (or staff) only, drafts to
    the owner only, hidden community posts stay blocked, published posts are
    public. Unknown/denied assets return 404 (existence is masked).

    R2 mode: after permission, 302 to a short-TTL presigned GET on the
    private bucket (Video seeking uses R2's native Range support).
    Local mode: stream bytes directly with hand-rolled Range support."""
    asset = MediaAsset.objects.filter(id=asset_id).select_related(
        'creator_post__creator',
        'community_post',
    ).first()
    user = _request_user(request)
    signed_user_id = verify_media_token(request.GET.get('at'), asset_id)
    if not asset or not _asset_access_allowed(asset, user, signed_user_id):
        return JsonResponse({'detail': 'Not found.'}, status=404)

    if r2_enabled():
        try:
            redirect_url = presigned_get_url(asset)
        except Exception:
            return JsonResponse({'detail': 'Not found.'}, status=404)
        response = HttpResponseRedirect(redirect_url)
        response['Cache-Control'] = 'private, max-age=300'
        usage.record_get()
        return response

    try:
        media_file = asset.file.open('rb')
    except (FileNotFoundError, ValueError):
        return JsonResponse({'detail': 'Not found.'}, status=404)

    total = media_file.size
    content_type = asset.content_type or 'application/octet-stream'
    return _stream_file(request, media_file, total, content_type)


def _request_user(request):
    """Best-effort user resolution for a plain (non-DRF) view: the session
    user for browser requests, or the JWT Bearer user for programmatic ones.
    Anonymous requests resolve to Django's AnonymousUser."""
    user = getattr(request, 'user', None)
    if user is not None and getattr(user, 'is_authenticated', False):
        return user
    try:
        jwt_user, _ = JWTAuthentication().authenticate(request)
    except Exception:
        jwt_user = None
    return jwt_user or user


def _asset_access_allowed(asset, user, signed_user_id=None):
    # A valid signed preview token binds this exact asset to its uploader.
    if signed_user_id is not None and asset.user_id == signed_user_id:
        return True

    if asset.creator_post_id:
        post = asset.creator_post
        if post.deleted_at:
            return False
        if post.status == CreatorPost.Status.PUBLISHED and post.published_at and \
                post.published_at <= timezone.now():
            return True
        return user is not None and getattr(user, 'is_authenticated', False) and \
            (user.is_staff or post.creator.user_id == user.id)

    if asset.community_post_id:
        post = asset.community_post
        if not post.is_hidden:
            return True
        return user is not None and getattr(user, 'is_authenticated', False) and \
            (user.is_staff or post.user_id == user.id)

    # Orphan: only the uploader (or staff) may fetch/preview it.
    return user is not None and getattr(user, 'is_authenticated', False) and \
        (user.is_staff or asset.user_id == user.id)


def _parse_range(header, total):
    match = RANGE_RE.match(header or '')
    if not match or total <= 0:
        return None
    start_text, end_text = match.groups()
    start = int(start_text) if start_text else 0
    end = int(end_text) if end_text else total - 1
    if start_text == '' and end_text:
        # suffix form: bytes=-N → last N bytes
        start = max(total - end, 0)
        end = total - 1
    if start > end or start >= total:
        return None
    end = min(end, total - 1)
    return start, end


def _stream_file(request, media_file, total, content_type):
    """Stream with HTTP Range support (Django 4.2 FileResponse lacks it),
    which browsers need for video seeking and partial playback."""
    range_header = request.META.get('HTTP_RANGE')
    span = _parse_range(range_header, total)

    if span is None and range_header:
        # Malformed/unsatisfiable range → tell the client the real extent.
        media_file.close()
        response = JsonResponse({'detail': 'Requested range not satisfiable.'}, status=416)
        response['Content-Range'] = f'bytes */{total}'
        return response

    if span is None:
        start, end = 0, total - 1
        status_code = 200
    else:
        start, end = span
        status_code = 206

    def chunk_reader():
        try:
            media_file.seek(start)
            remaining = end - start + 1
            while remaining > 0:
                chunk = media_file.read(min(64 * 1024, remaining))
                if not chunk:
                    break
                remaining -= len(chunk)
                yield chunk
        finally:
            media_file.close()

    response = StreamingHttpResponse(chunk_reader(), status=status_code, content_type=content_type)
    if status_code == 206:
        response['Content-Range'] = f'bytes {start}-{end}/{total}'
    response['Content-Length'] = end - start + 1
    response['Accept-Ranges'] = 'bytes'
    response['Cache-Control'] = 'private, max-age=3600'
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def storage_usage(request):
    """Staff-only free-tier monitoring: projected R2 usage, ceilings and
    warnings for the current calendar month. Non-staff get 403 visibly
    (this is operational data, not user content)."""
    if not request.user.is_staff:
        return Response({'detail': 'Staff only.'}, status=status.HTTP_403_FORBIDDEN)
    return Response(usage.usage_snapshot())


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_orphan_media(request, asset_id):
    """Uploader-side removal of a not-yet-published asset (e.g. after the
    user removes it from the composer before posting)."""
    asset = MediaAsset.objects.filter(id=asset_id, user=request.user).first()
    if not asset or asset.creator_post_id or asset.community_post_id:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    asset.file.delete(save=False)
    asset.delete()
    return Response({'detail': 'Deleted.'}, status=status.HTTP_200_OK)
