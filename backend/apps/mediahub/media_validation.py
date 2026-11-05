"""Content validation for uploaded media. Rejects on extension, declared
type, real file signature, or configured size limits — never trusts the
client-side filename or Content-Type alone."""

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

# Media type derived from an asset's validated format, used as serve-time
# Content-Type fallback when the stored value is missing.
FORMAT_CONTENT_TYPES = {
    'JPEG': 'image/jpeg',
    'PNG': 'image/png',
    'WEBP': 'image/webp',
}


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


def validate_and_prepare(file_obj):
    """Validate one uploaded file and return a dict suitable for
    MediaAsset creation. Raises ValidationError with a safe message."""
    name = file_obj.name or ''
    ext = _file_extension(name)
    data = file_obj.read()

    if not ext:
        raise ValidationError('File has no extension.')

    is_image_kind = ext in IMAGE_EXTENSIONS
    is_video_kind = ext in VIDEO_EXTENSIONS
    if not is_image_kind and not is_video_kind:
        raise ValidationError('Unsupported file type. Images must be JPG, JPEG, PNG or WEBP; videos MP4 or MOV.')

    if is_image_kind:
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
    else:
        max_bytes = settings.MEDIA_MAX_VIDEO_MB * 1024 * 1024
        if len(data) > max_bytes:
            raise ValidationError(f'Video exceeds the {settings.MEDIA_MAX_VIDEO_MB} MB limit.')
        _validate_video_header(data)
        content_type = 'video/mp4' if ext in ('.mp4', '.m4v') else 'video/quicktime'
        width = height = None
        kind = MediaAsset.Kind.VIDEO

    return {
        'id': uuid.uuid4(),
        'file_ext': ext.lstrip('.'),
        'kind': kind,
        'original_name': name.rsplit('/', 1)[-1][:256],
        'content_type': content_type,
        'size_bytes': len(data),
        'width': width,
        'height': height,
        'data': data,
    }
