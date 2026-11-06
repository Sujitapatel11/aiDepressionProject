import React, { useEffect, useRef, useState } from 'react';
import { resolveMediaUrl } from '../../services/api';
import { pickMediaUrl } from '../../services/media';

// Media paths (/api/media/serve/…) are resolved through the shared API base
// (Vite proxy in dev, absolute origin in production). Legacy absolute URLs
// stored in media_url pass through unchanged.
const resolveSrc = (path) => resolveMediaUrl(path);

/**
 * Image with lazy loading and a soft fallback when the file fails to load,
 * so no feed surface ever shows a broken-image icon.
 */
export function SafeImg({ src, alt, className }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className={`grid place-items-center bg-gradient-to-br from-violet-100 via-fuchsia-50 to-pink-100 ${className}`}>
        <span className="text-xl text-violet-300" aria-hidden="true">✦</span>
        <span className="sr-only">{failed ? 'This image could not be loaded.' : 'No image available.'}</span>
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
 * Video with deferred loading, a poster/placeholder while it is off-screen,
 * and a visible fallback when playback fails. <video preload="metadata"> in a
 * long feed still issues one request per item, so the element is only mounted
 * once it is near the viewport.
 */
export function SafeVideo({ src, poster, alt, className = '' }) {
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setFailed(false);
    setReady(false);
    setShouldLoad(false);
  }, [src]);

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { rootMargin: '200px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (!src || failed) {
    return (
      <div className={`grid place-items-center bg-black/85 text-center text-xs font-semibold text-white/80 ${className}`}>
        <span aria-hidden="true" className="text-lg">🎬</span>
        <span className="px-3">{failed ? 'This video could not be loaded.' : 'No video available.'}</span>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={`relative overflow-hidden bg-black ${className}`}>
      {shouldLoad ? (
        <video
          controls
          playsInline
          preload="metadata"
          src={resolveSrc(src)}
          poster={poster ? resolveSrc(poster) : undefined}
          aria-label={alt || 'Video'}
          onLoadedMetadata={() => setReady(true)}
          onCanPlay={() => setReady(true)}
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="relative h-full w-full">
          {poster ? (
            <img
              loading="lazy"
              src={resolveSrc(poster)}
              alt={alt || ''}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-violet-950 via-slate-900 to-black" />
          )}
          <span className="pointer-events-none absolute inset-0 grid place-items-center text-3xl text-white/90 drop-shadow" aria-hidden="true">
            ▶
          </span>
        </div>
      )}
      {shouldLoad && !ready && !failed && (
        <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/30 text-xs font-semibold text-white/90">
          Loading video…
        </span>
      )}
    </div>
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

  const videoClass = compact
    ? 'aspect-video max-h-24 w-full rounded-xl'
    : 'aspect-video max-h-[480px] w-full rounded-2xl';

  return (
    <div className={`space-y-2 ${className}`}>
      {legacyIsVideo && (
        <SafeVideo src={legacyUrl} alt={post.alt || 'Video'} className={videoClass} />
      )}
      {legacyUrl && !legacyIsVideo && (
        <SafeImg
          src={legacyUrl}
          alt={post.alt || ''}
          className={compact ? 'max-h-24 w-full rounded-xl object-cover' : 'max-h-[480px] w-full rounded-2xl object-cover'}
        />
      )}
      {videos.map((video) => (
        <SafeVideo
          key={video.id}
          src={pickMediaUrl(video)}
          poster={video.thumbnail_url}
          alt={video.original_name || 'Video'}
          className={videoClass}
        />
      ))}
      {!compact && images.length === 1 && (
        <SafeImg
          src={pickMediaUrl(images[0])}
          alt={images[0].original_name || ''}
          className="max-h-[480px] w-full rounded-2xl border border-violet-100 object-cover"
        />
      )}
      {!compact && images.length > 1 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((img) => (
            <SafeImg
              key={img.id}
              src={pickMediaUrl(img)}
              alt={img.original_name || ''}
              className="aspect-square w-full rounded-xl border border-violet-100 object-cover"
            />
          ))}
        </div>
      )}
      {compact && images.length > 0 && (
        <SafeImg
          src={pickMediaUrl(images[0])}
          alt={images[0].original_name || ''}
          className="max-h-24 w-full rounded-xl object-cover"
        />
      )}
    </div>
  );
}
