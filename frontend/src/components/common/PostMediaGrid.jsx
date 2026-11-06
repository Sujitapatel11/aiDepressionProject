import React, { useState } from 'react';
import { resolveMediaUrl } from '../../services/api';

// Media paths (/api/media/serve/…) are resolved through the shared API base
// (Vite proxy in dev, absolute origin in production). Legacy absolute URLs
// stored in media_url pass through unchanged.
const resolveSrc = (path) => resolveMediaUrl(path);

function VideoPlayer({ src, className, id }) {
  const [failed, setFailed] = useState(false);
  return (
    <div key={id}>
      <video controls playsInline preload="none" src={src} className={className} onError={() => setFailed(true)} />
      {failed && (
        <p className="mt-2 text-xs text-rose-600" role="status">
          This video could not play. Use an MP4 encoded with H.264 video and AAC audio for best browser support.
        </p>
      )}
    </div>
  );
}

/**
 * Image with lazy loading and a soft fallback when the file fails to load,
 * so no feed surface ever shows a broken-image icon.
 */
export function SafeImg({ src, alt, className }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={`grid place-items-center bg-gradient-to-br from-violet-100 via-fuchsia-50 to-pink-100 ${className}`}>
        <span className="text-xl text-violet-300" aria-hidden="true">✦</span>
        <span className="sr-only">This image could not be loaded.</span>
      </div>
    );
  }
  return (
    <img
      loading="lazy"
      src={resolveSrc(src)}
      alt={alt || ''}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

/**
 * Renders post media (uploaded assets and/or a legacy external media_url)
 * for any feed surface. One component, one set of classes — display markup
 * lives here alone so no post system grows a second renderer.
 */
export default function PostMediaGrid({ post, compact = false, className = '' }) {
  const assets = post?.media || [];
  const videos = assets.filter((item) => item.kind === 'video');
  const images = assets.filter((item) => item.kind === 'image');

  const legacyUrl = !assets.length && post?.media_url && post.content_type !== 'text'
    ? resolveSrc(post.media_url)
    : null;
  const legacyIsVideo = !!legacyUrl && post.content_type === 'video';

  if (!images.length && !videos.length && !legacyUrl) return null;

  // Published posts are public: use the stable public URL. Signed preview URLs
  // expire after one hour and are only needed for drafts/orphan uploads.
  const isPublished = post?.status === 'published';
  const pick = (item) => (isPublished ? item.url : (item.preview_url || item.url));
  const videoClass = compact
    ? 'max-h-24 w-full rounded-xl bg-black object-cover'
    : 'max-h-[480px] w-full rounded-2xl bg-black';


  return (
    <div className={`space-y-2 ${className}`}>
      {legacyIsVideo && <VideoPlayer src={legacyUrl} id="legacy-video" className={videoClass} />}
      {legacyUrl && !legacyIsVideo && (
        <SafeImg
          src={legacyUrl}
          alt={post.alt || ''}
          className={compact ? 'max-h-24 w-full rounded-xl object-cover' : 'max-h-[480px] w-full rounded-2xl object-cover'}
        />
      )}
      {videos.map((video) => (
        <VideoPlayer key={video.id} id={video.id} src={resolveSrc(pick(video))} className={videoClass} />
      ))}
      {!compact && images.length === 1 && (
        <SafeImg
          src={pick(images[0])}
          alt={images[0].original_name || ''}
          className="max-h-[480px] w-full rounded-2xl border border-violet-100 object-cover"
        />
      )}
      {!compact && images.length > 1 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((img) => (
            <SafeImg
              key={img.id}
              src={pick(img)}
              alt={img.original_name || ''}
              className="aspect-square w-full rounded-xl border border-violet-100 object-cover"
            />
          ))}
        </div>
      )}
      {compact && images.length > 0 && (
        <SafeImg
          src={pick(images[0])}
          alt={images[0].original_name || ''}
          className="max-h-24 w-full rounded-xl object-cover"
        />
      )}
    </div>
  );
}
