import React, { useCallback, useEffect, useState } from 'react';
import { listMyVideos } from '../../../services/soulTubeApi';

function formatDuration(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return null;
  const mins = Math.floor(value / 60);
  const secs = Math.floor(value % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatSize(bytes) {
  const value = Number(bytes) || 0;
  if (value <= 0) return null;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Lists the signed-in user's own uploaded videos so a SoulTube host can pick
 * one without pasting IDs. Only the caller's assets are ever returned by the
 * backend; nothing here falls back to mock media.
 */
export default function VideoLibraryPicker({ onPick, selectedId = null, compact = false }) {
  const [videos, setVideos] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (page = 1) => {
    if (page === 1) setLoading(true); else setLoadingMore(true);
    setError('');
    const result = await listMyVideos({ page });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      setLoadingMore(false);
      return;
    }
    const results = Array.isArray(result.data?.results) ? result.data.results : [];
    setVideos((previous) => (page === 1 ? results : [...previous, ...results]));
    setNextPage(result.data?.next ? page + 1 : null);
    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-xs font-semibold text-violet-600">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        Loading your videos…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
        <p>{error}</p>
        <button type="button" onClick={() => load(1)} className="mt-2 rounded-full bg-rose-600 px-3 py-1.5 font-bold text-white">
          Try again
        </button>
      </div>
    );
  }

  if (!videos.length) {
    return (
      <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/50 px-4 py-4 text-xs text-violet-700">
        <p className="font-bold">No uploaded videos yet.</p>
        <p className="mt-1 leading-relaxed">
          Upload a video you own in Creator Studio or the community composer first. SoulTube never
          plays videos from other sites or people you do not own.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className={`space-y-2 ${compact ? 'max-h-48' : 'max-h-64'} overflow-y-auto pr-1`}>
        {videos.map((video) => {
          const selected = selectedId === video.id;
          const duration = formatDuration(video.duration);
          const size = formatSize(video.size_bytes);
          return (
            <button
              key={video.id}
              type="button"
              onClick={() => onPick(video)}
              aria-pressed={selected}
              className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
                selected
                  ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200'
                  : 'border-violet-100 bg-white hover:border-violet-300 hover:bg-violet-50/60'
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-base text-violet-700">
                ▶
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-extrabold text-[#2b2040]">
                  {video.original_name || 'Untitled video'}
                </span>
                <span className="mt-0.5 block text-[10px] font-semibold text-violet-400">
                  {[duration, size].filter(Boolean).join(' · ') || 'Video'}
                </span>
              </span>
              <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-extrabold ${selected ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-700'}`}>
                {selected ? 'Selected' : 'Use'}
              </span>
            </button>
          );
        })}
      </div>
      {nextPage && (
        <button
          type="button"
          onClick={() => load(nextPage)}
          disabled={loadingMore}
          className="w-full rounded-full border border-violet-200 bg-white px-3 py-2 text-[11px] font-extrabold text-violet-700 transition hover:bg-violet-50 disabled:cursor-wait disabled:opacity-60"
        >
          {loadingMore ? 'Loading…' : 'Load more videos'}
        </button>
      )}
    </div>
  );
}
