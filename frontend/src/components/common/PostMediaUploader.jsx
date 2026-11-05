import React, { useRef, useState } from 'react';
import { api, apiUpload, getApiUrl } from '../../services/api';

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const VIDEO_EXT = /\.(mp4|mov|m4v)$/i;
const IMAGE_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp';
const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/x-m4v';

const resolveSrc = (path) => (path && path.startsWith('/') ? getApiUrl(path) : path);

/**
 * Shared direct-from-device media picker for the existing composers.
 * Picks files (button or drag & drop), previews them, shows upload
 * progress, and allows removal before publishing. Files upload as
 * multipart FormData to /api/media/uploads/ — never base64 JSON.
 */
export default function PostMediaUploader({
  value = [],
  onChange,
  imageLimit = 6,
  videoLimit = 1,
  imageMaxMb = 10,
  videoMaxMb = 100,
  disabled = false,
}) {
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(null); // { filename, percent }
  const [dragOver, setDragOver] = useState(false);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const imageCount = value.filter((item) => item.kind === 'image').length;
  const videoCount = value.filter((item) => item.kind === 'video').length;

  const pickSrc = (asset) => asset.preview_url || asset.url;

  const handleFiles = async (fileList, kind) => {
    if (disabled) return;
    const files = Array.from(fileList || []);
    if (!files.length) return;

    setError('');

    // Client-side pre-checks so users fail fast with clear messages.
    const rejected = [];
    const accepted = [];
    files.forEach((file) => {
      const wantedKind = IMAGE_EXT.test(file.name) ? 'image' : VIDEO_EXT.test(file.name) ? 'video' : null;
      if (!wantedKind) { rejected.push(`${file.name}: unsupported type`); return; }
      if (wantedKind === 'image' && file.size > imageMaxMb * 1024 * 1024) {
        rejected.push(`${file.name}: over ${imageMaxMb} MB`); return;
      }
      if (wantedKind === 'video' && file.size > videoMaxMb * 1024 * 1024) {
        rejected.push(`${file.name}: over ${videoMaxMb} MB`); return;
      }
      if (wantedKind === 'image' && imageCount + accepted.filter((f) => f[1] === 'image').length >= imageLimit) {
        rejected.push(`up to ${imageLimit} images per post`); return;
      }
      if (wantedKind === 'video' && videoCount >= videoLimit) {
        rejected.push(`only ${videoLimit} video per post`); return;
      }
      accepted.push([file, wantedKind]);
    });

    if (rejected.length) setError(rejected.join(' · '));
    if (!accepted.length) return;

    const formData = new FormData();
    accepted.forEach(([file]) => formData.append('files', file));
    setProgress({ filename: accepted[0][0].name, percent: 0 });
    const response = await apiUpload('/media/uploads/', formData, {
      onProgress: (percent) => setProgress((current) => (current ? { ...current, percent } : current)),
    });
    setProgress(null);

    if (!response) {
      setError('Upload failed — network error. Your images were not posted; try again.');
      return;
    }
    const json = response.json || {};
    if (!response.ok) {
      setError((json.detail) || (json.errors && json.errors.map((e) => `${e.file}: ${e.detail}`).join(' · ')) || 'Upload failed. Try again.');
      return;
    }

    let uploaded = json.uploaded || [];
    let nextValue = [...value, ...uploaded];
    if (accepted.length === 1 && accepted[0][1] === 'video') {
      // Replace any previously selected video (only one video per post).
      nextValue = [
        ...nextValue.filter((item) => item.kind !== 'video' || item.id === uploaded[0]?.id),
      ];
    }
    onChange(nextValue);
    if (json.errors && json.errors.length) {
      setError(json.errors.map((e) => `${e.file}: ${e.detail}`).join(' · '));
    }
  };

  const removeAsset = async (assetId) => {
    // Best-effort server-side cleanup; even if the call fails the asset
    // will not be attached to any post and the orphan cleaner removes it.
    const response = await api('DELETE', `/media/uploads/${assetId}/`);
    if (response && !response.ok && response.status !== 404) {
      setError('Media removal failed. Try removing it again before publishing.');
      return;
    }
    onChange(value.filter((item) => item.id !== assetId));
  };

  const isUploading = progress !== null;

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer?.files, 'mixed');
      }}
      className={`rounded-2xl border-2 border-dashed p-3 transition ${dragOver ? 'border-violet-400 bg-violet-50' : 'border-violet-200 bg-[#fbf9fd]'}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || isUploading || imageCount >= imageLimit}
          onClick={() => imageInputRef.current?.click()}
          className="rounded-full bg-white px-4 py-2 text-xs font-extrabold text-violet-700 shadow-sm transition border-none cursor-pointer hover:bg-violet-50 disabled:opacity-50"
        >
          📷 Photos
        </button>
        <button
          type="button"
          disabled={disabled || isUploading || videoCount >= videoLimit}
          onClick={() => videoInputRef.current?.click()}
          className="rounded-full bg-white px-4 py-2 text-xs font-extrabold text-fuchsia-700 shadow-sm transition border-none cursor-pointer hover:bg-violet-50 disabled:opacity-50"
        >
          🎬 Video
        </button>
        <span className="text-[10px] font-semibold text-[#9a8fa5]">
          JPG · PNG · WEBP (max {imageMaxMb} MB) {videoLimit ? '· MP4/MOV ' : ''}
          {videoLimit ? `(max ${videoMaxMb} MB)` : ''} · or drop files here
        </span>
        <input ref={imageInputRef} type="file" accept={IMAGE_ACCEPT} multiple hidden
          onChange={(e) => { handleFiles(e.target.files, 'image'); e.target.value = ''; }} />
        <input ref={videoInputRef} type="file" accept={VIDEO_ACCEPT} hidden
          onChange={(e) => { handleFiles(e.target.files, 'video'); e.target.value = ''; }} />
      </div>

      {isUploading && progress && (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold text-violet-700">
            <span className="truncate pr-2">Uploading {progress.filename}…</span>
            <span>{progress.percent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-violet-100">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      )}

      {value.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {value.map((asset) => (
            <div key={asset.id} className="group relative">
              {asset.kind === 'video' ? (
                <video src={resolveSrc(pickSrc(asset))} className="h-20 w-28 rounded-xl border border-violet-200 bg-black object-cover" muted playsInline />
              ) : (
                <img src={resolveSrc(pickSrc(asset))} alt={asset.original_name || ''} className="h-20 w-28 rounded-xl border border-violet-200 object-cover" />
              )}
              <button
                type="button"
                disabled={disabled || isUploading}
                onClick={() => removeAsset(asset.id)}
                title="Remove media"
                className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-rose-200 bg-white text-[10px] font-black text-rose-600 shadow transition hover:bg-rose-50 border-none cursor-pointer disabled:opacity-50"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-rose-50 px-3 py-2">
          <p className="text-[11px] font-semibold text-rose-700" role="alert">{error}</p>
          <button type="button" onClick={() => setError('')} className="text-[10px] font-black text-rose-500 cursor-pointer">dismiss</button>
        </div>
      )}
    </div>
  );
}
