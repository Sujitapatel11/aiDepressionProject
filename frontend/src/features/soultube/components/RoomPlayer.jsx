import React, { useCallback, useEffect, useRef, useState } from 'react';
import { resolveMediaUrl } from '../../../services/api';
import { pickMediaUrl } from '../../../services/media';
import {
  formatClock,
  isOutOfSync,
  playbackTarget,
} from '../../../services/soulTubePlayback';

const SEEK_TOLERANCE_SECONDS = 1.75;
const VIEWER_DRIFT_CHECK_MS = 4000;
const HOST_HEARTBEAT_MS = 5000;
const VIEWER_SYNC_REQUEST_MS = 20000;

/**
 * Shared room player.
 *
 * Host: native transport controls; every play/pause/seek is published to the
 * server, plus a low-frequency heartbeat while playing so late joiners land in
 * the right place.
 *
 * Viewer: no transport controls. The server snapshot is applied on receipt and
 * re-checked periodically, correcting drift instead of trusting peer clocks.
 */
export default function RoomPlayer({
  video,
  playback,
  playbackReceivedAt = 0,
  isHost = false,
  roomClosed = false,
  onHostPlayback,
  onRefresh,
  onRequestSync,
  connectionLabel = '',
}) {
  const videoRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const src = video ? resolveMediaUrl(pickMediaUrl(video)) : null;

  const publish = useCallback((isPlaying) => {
    if (!isHost || typeof onHostPlayback !== 'function') return;
    const element = videoRef.current;
    if (!element) return;
    onHostPlayback({
      isPlaying,
      positionSeconds: Number.isFinite(element.currentTime) ? element.currentTime : 0,
    });
  }, [isHost, onHostPlayback]);

  useEffect(() => {
    setFailed(false);
    setReady(false);
    setAutoplayBlocked(false);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  // Host: restore the latest snapshot once the media can seek (initial load or
  // a queue switch). Remote playback events are deliberately not applied to
  // the host element, so own actions cannot echo into a seek loop.
  useEffect(() => {
    if (!isHost || !src) return undefined;
    const element = videoRef.current;
    if (!element) return undefined;
    const apply = () => {
      const target = playbackTarget(playback, playbackReceivedAt).position;
      if (target > 0 && Math.abs(element.currentTime - target) > SEEK_TOLERANCE_SECONDS) {
        try { element.currentTime = target; } catch (err) { /* not seekable yet */ }
      }
    };
    if (element.readyState >= 1) apply();
    else element.addEventListener('loadedmetadata', apply, { once: true });
    return () => element.removeEventListener('loadedmetadata', apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, src]);

  const applyViewerPlayback = useCallback(() => {
    const element = videoRef.current;
    if (!element || !playback) return;
    const target = playbackTarget(playback, playbackReceivedAt).position;
    if (isOutOfSync(element.currentTime, target, SEEK_TOLERANCE_SECONDS)) {
      try { element.currentTime = target; } catch (err) { /* not seekable yet */ }
    }
    if (playback.is_playing) {
      const promise = element.play();
      if (promise && typeof promise.catch === 'function') {
        promise.catch(() => setAutoplayBlocked(true));
      }
    } else {
      element.pause();
    }
  }, [playback, playbackReceivedAt]);

  // Viewer: apply every server snapshot as soon as the media is seekable.
  useEffect(() => {
    if (isHost || !src || !playback) return undefined;
    const element = videoRef.current;
    if (!element) return undefined;
    if (element.readyState >= 1) {
      applyViewerPlayback();
      return undefined;
    }
    const onLoaded = () => applyViewerPlayback();
    element.addEventListener('loadedmetadata', onLoaded, { once: true });
    return () => element.removeEventListener('loadedmetadata', onLoaded);
  }, [isHost, src, playback, playbackReceivedAt, applyViewerPlayback]);

  // Viewer: bounded drift correction while the room is playing.
  useEffect(() => {
    if (isHost || !src || !playback?.is_playing || roomClosed) return undefined;
    const timer = setInterval(() => {
      const element = videoRef.current;
      if (!element) return;
      const target = playbackTarget(playback, playbackReceivedAt).position;
      if (isOutOfSync(element.currentTime, target, SEEK_TOLERANCE_SECONDS + 0.75)) {
        try { element.currentTime = target; } catch (err) { /* ignore */ }
      }
      if (element.paused && !autoplayBlocked) {
        const promise = element.play();
        if (promise && typeof promise.catch === 'function') promise.catch(() => setAutoplayBlocked(true));
      }
    }, VIEWER_DRIFT_CHECK_MS);
    return () => clearInterval(timer);
  }, [isHost, src, playback, playbackReceivedAt, roomClosed, autoplayBlocked]);

  // Viewer: ask the server for a fresh authoritative snapshot periodically.
  useEffect(() => {
    if (isHost || roomClosed || typeof onRequestSync !== 'function') return undefined;
    const timer = setInterval(() => onRequestSync(), VIEWER_SYNC_REQUEST_MS);
    return () => clearInterval(timer);
  }, [isHost, roomClosed, onRequestSync]);

  // Host: heartbeat while playing so the stored position tracks the host.
  useEffect(() => {
    if (!isHost || roomClosed) return undefined;
    const timer = setInterval(() => {
      const element = videoRef.current;
      if (element && !element.paused && !element.ended) publish(true);
    }, HOST_HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [isHost, roomClosed, publish]);

  const handlePlay = () => {
    setAutoplayBlocked(false);
    publish(true);
  };
  const handlePause = () => publish(false);
  const handleSeeked = () => {
    const element = videoRef.current;
    if (element) publish(!element.paused && !element.ended);
  };
  const handleTimeUpdate = () => {
    const element = videoRef.current;
    if (!element) return;
    setCurrentTime(element.currentTime || 0);
    setDuration(Number.isFinite(element.duration) ? element.duration : 0);
  };

  const handleJoinPlayback = () => {
    setAutoplayBlocked(false);
    applyViewerPlayback();
  };

  const refreshStream = () => {
    setFailed(false);
    setReady(false);
    if (typeof onRefresh === 'function') onRefresh();
  };

  if (!video) {
    return (
      <div className="grid aspect-video w-full place-items-center rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-950 via-slate-900 to-black px-6 text-center">
        <div>
          <span className="text-3xl" aria-hidden="true">🎬</span>
          <p className="mt-3 text-sm font-extrabold text-white">No video selected yet</p>
          <p className="mt-1 text-xs text-white/70">
            {isHost ? 'Add a video from your library to start the watch party.' : 'Waiting for the host to choose a video.'}
          </p>
        </div>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="grid aspect-video w-full place-items-center rounded-3xl border border-rose-200 bg-rose-950/90 px-6 text-center">
        <div>
          <span className="text-3xl" aria-hidden="true">⚠️</span>
          <p className="mt-3 text-sm font-extrabold text-white">This video could not be played</p>
          <p className="mt-1 text-xs text-white/70">
            The delivery link may have expired. Refresh it and try again.
          </p>
          <button
            type="button"
            onClick={refreshStream}
            className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-extrabold text-rose-800"
          >
            Refresh stream
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-3xl bg-black shadow-[0_16px_40px_-24px_rgba(40,20,70,.8)]">
        <video
          ref={videoRef}
          src={src}
          controls={isHost}
          playsInline
          preload="auto"
          muted={muted}
          aria-label={video.original_name || 'Room video'}
          onLoadedMetadata={() => { setReady(true); handleTimeUpdate(); }}
          onCanPlay={() => setReady(true)}
          onPlay={handlePlay}
          onPause={handlePause}
          onSeeked={handleSeeked}
          onTimeUpdate={handleTimeUpdate}
          onError={() => setFailed(true)}
          className="aspect-video w-full bg-black object-contain"
        />

        {!ready && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/40 text-xs font-bold text-white">
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
              Loading video…
            </span>
          </div>
        )}

        {!isHost && playback?.is_playing && autoplayBlocked && (
          <button
            type="button"
            onClick={handleJoinPlayback}
            className="absolute inset-0 grid place-items-center bg-black/55 text-center text-white"
          >
            <span>
              <span className="text-3xl" aria-hidden="true">▶</span>
              <span className="mt-2 block text-sm font-extrabold">Tap to join the playback</span>
              <span className="mt-1 block text-[11px] text-white/80">Your browser needs a tap before audio can start.</span>
            </span>
          </button>
        )}

        {!isHost && ready && !autoplayBlocked && (
          <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-[10px] font-extrabold text-white backdrop-blur">
            {playback?.is_playing ? '● Host is playing' : '❚❚ Host has paused'}
          </div>
        )}

        {!isHost && (
          <button
            type="button"
            onClick={() => setMuted((value) => !value)}
            className="absolute bottom-3 right-3 rounded-full border border-white/20 bg-black/60 px-3 py-2 text-[11px] font-extrabold text-white backdrop-blur transition hover:bg-black/80"
          >
            {muted ? '🔇 Unmute' : '🔊 Mute'}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] font-semibold text-violet-500">
        <span className="min-w-0 truncate">
          {video.original_name || 'Room video'}
          {duration > 0 && <span className="ml-2 text-violet-400">{formatClock(currentTime)} / {formatClock(duration)}</span>}
        </span>
        <span className={connectionLabel === 'Live' ? 'text-emerald-600' : 'text-amber-600'}>
          {isHost ? 'You control playback for everyone' : connectionLabel || 'Synced with the host'}
        </span>
      </div>
    </div>
  );
}
