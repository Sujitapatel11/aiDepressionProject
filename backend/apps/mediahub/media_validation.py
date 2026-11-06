"""Content validation for uploaded media.

Rejects on extension, declared type, real file signature, browser-compatible
codec, or configured size limits — never trusts the client-side filename or
Content-Type alone.

Large videos are validated by streaming a bounded header plus a chunked codec
scan; they are never held in memory. Images must be decoded by Pillow and are
re-encoded pixel-only (this also strips EXIF/metadata).
"""

import io
import uuid

from django.conf import settings
from PIL import Image

from apps.mediahub.models import MediaAsset

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
IMAGE_FORMATS = {'JPEG', 'PNG', 'WEBP'}
VIDEO_EXTENSIONS = {'.mp4', '.mov', '.m4v'}
# QuickTime brands ('qt  ') and ISO-BMFF brand prefixes used by MP4/MOV containers.
VIDEO_FTYP_BRANDS = (b'iso', b'mp', b'm4v', b'qt', b'msnv', b'avc', b'hev')

VIDEO_CONTENT_TYPES = {
    '.mp4': 'video/mp4',
    '.m4v': 'video/mp4',
    '.mov': 'video/quicktime',
}

# Codecs every current browser can decode in an MP4/MOV container.
# H.264 (avc1/avc3), VP9 and AV1 are broadly supported.
# HEVC/H.265 (hvc1/hev1) only plays on some Safari/Edge builds, so uploads are
# rejected with an actionable message instead of silently failing to play.
BROWSER_VIDEO_CODECS = (b'avc1', b'avc3', b'vp09', b'av01')
INCOMPATIBLE_VIDEO_CODECS = (b'hvc1', b'hev1')

# Media type derived from an asset's validated format, used as serve-time
# Content-Type fallback when the stored value is missing.
FORMAT_CONTENT_TYPES = {
    'JPEG': 'image/jpeg',
    'PNG': 'image/png',
    'WEBP': 'image/webp',
}

HEADER_BYTES = 4096
SCAN_CHUNK_BYTES = 1024 * 1024


class ValidationError(Exception):
    def __init__(self, detail):
        self.detail = detail


def _file_extension(name):
    ext = ''
    if name and '.' in name:
        ext = '.' + name.rsplit('.', 1)[1].strip().lower()
    return ext


def _image_bytes_size_and_dims(data):
    """Validate image content by re-opening and re-encoding it with Pillow.
    Returns (data, content_type, width, height). Re-encoding strips EXIF and
    any embedded payloads, giving a clean pixel-only file."""
    with Image.open(io.BytesIO(data)) as probe:
        fmt = probe.format
        if fmt not in IMAGE_FORMATS:
            raise ValidationError('Unsupported image format.')
        width, height = probe.size
        probe.load()

    with Image.open(io.BytesIO(data)) as im:
        if fmt == 'JPEG' and im.mode not in ('RGB', 'L'):
            im = im.convert('RGB')
        out = io.BytesIO()
        save_kwargs = {'format': fmt}
        if fmt == 'JPEG':
            save_kwargs['quality'] = 92
            save_kwargs['optimize'] = True
        elif fmt == 'PNG':
            save_kwargs['optimize'] = True
        im.save(out, **save_kwargs)

    return out.getvalue(), FORMAT_CONTENT_TYPES[fmt], width, height


def _validate_video_header(data):
    """MP4/MOV container check: must begin with an 'ftyp' box whose major
    brand is ISO-BMFF/MP4/QuickTime family."""
    if len(data) < 12:
        raise ValidationError('Video file is truncated or invalid.')
    if data[4:8] != b'ftyp':
        raise ValidationError('Unsupported video container (missing ftyp box).')
    brand = data[8:12].lower()
    if not any(brand.startswith(prefix) for prefix in VIDEO_FTYP_BRANDS):
        raise ValidationError('Unsupported video container brand.')


def _scan_video_codec(file_obj):
    """Chunked scan for the codec sample entry. Returns True when a broadly
    browser-compatible codec is present, False when only an incompatible one
    (HEVC) is present, and None when no sample entry is found (many very small
    or streamed-header files). Never loads the whole file into memory."""
    found_compatible = False
    found_incompatible = False
    overlap = max(len(codec) for codec in BROWSER_VIDEO_CODECS + INCOMPATIBLE_VIDEO_CODECS) - 1
    tail = b''
    file_obj.seek(0)
    while True:
        chunk = file_obj.read(SCAN_CHUNK_BYTES)
        if not chunk:
            break
        window = (tail + chunk).lower()
        if any(codec in window for codec in BROWSER_VIDEO_CODECS):
            found_compatible = True
            break
        if any(codec in window for codec in INCOMPATIBLE_VIDEO_CODECS):
            found_incompatible = True
        tail = window[-overlap:]
    file_obj.seek(0)
    if found_compatible:
        return True
    if found_incompatible:
        return False
    return None


def _validate_declared_type(file_obj, is_image, is_video):
    """Reject obvious declared-type/extension contradictions. The real content
    is still verified below; this check only catches mixed-up clients early."""
    declared = str(getattr(file_obj, 'content_type', '') or '').strip().lower()
    if not declared:
        return
    if is_image and not declared.startswith('image/'):
        raise ValidationError('The file is named as an image but was sent with a non-image type.')
    if is_video and not declared.startswith(('video/', 'application/octet-stream')):
        raise ValidationError('The file is named as a video but was sent with a non-video type.')


def _video_size(file_obj):
    size = getattr(file_obj, 'size', None)
    if isinstance(size, int) and size >= 0:
        return size
    file_obj.seek(0, io.SEEK_END)
    size = file_obj.tell()
    file_obj.seek(0)
    return size


def validate_and_prepare(file_obj):
    """Validate one uploaded file and return a dict suitable for
    MediaAsset creation. Raises ValidationError with a safe message.

    Images return `data` (bytes, re-encoded). Videos return `file_obj` (the
    original stream positioned at 0) so storage can stream it without an
    extra full-file copy in memory.
    """
    name = file_obj.name or ''
    ext = _file_extension(name)

    if not ext:
        raise ValidationError('File has no extension.')

    is_image_kind = ext in IMAGE_EXTENSIONS
    is_video_kind = ext in VIDEO_EXTENSIONS
    if not is_image_kind and not is_video_kind:
        raise ValidationError('Unsupported file type. Images must be JPG, JPEG, PNG or WEBP; videos MP4 or MOV.')

    _validate_declared_type(file_obj, is_image_kind, is_video_kind)

    if is_image_kind:
        data = file_obj.read()
        max_bytes = settings.MEDIA_MAX_IMAGE_MB * 1024 * 1024
        if len(data) > max_bytes:
            raise ValidationError(f'Image exceeds the {settings.MEDIA_MAX_IMAGE_MB} MB limit.')
        try:
            data, content_type, width, height = _image_bytes_size_and_dims(data)
        except ValidationError:
            raise
        except Exception:
            raise ValidationError('Image content could not be verified.')
        kind = MediaAsset.Kind.IMAGE
        size_bytes = len(data)
        prepared_file = None
    else:
        size_bytes = _video_size(file_obj)
        max_bytes = settings.MEDIA_MAX_VIDEO_MB * 1024 * 1024
        if size_bytes <= 0:
            raise ValidationError('Video file is empty.')
        if size_bytes > max_bytes:
            raise ValidationError(f'Video exceeds the {settings.MEDIA_MAX_VIDEO_MB} MB limit.')
        header = file_obj.read(HEADER_BYTES)
        file_obj.seek(0)
        _validate_video_header(header)
        codec_compatible = _scan_video_codec(file_obj)
        if codec_compatible is False:
            raise ValidationError(
                'This video uses HEVC/H.265, which most browsers cannot play. '
                'Export it as MP4 with H.264 (or WebM with VP9/AV1) and try again.'
            )
        content_type = VIDEO_CONTENT_TYPES[ext]
        width = height = None
        kind = MediaAsset.Kind.VIDEO
        data = None
        prepared_file = file_obj

    return {
        'id': uuid.uuid4(),
        'file_ext': ext.lstrip('.'),
        'kind': kind,
        'original_name': name.rsplit('/', 1)[-1][:256],
        'content_type': content_type,
        'size_bytes': size_bytes,
        'width': width,
        'height': height,
        'data': data,
        'file_obj': prepared_file,
    }
