import React from 'react';

function QueueRow({ item, index, total, isHost, busy, onPlay, onRemove, onMove }) {
  const video = item.video;
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-white px-3 py-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-violet-100 text-[11px] font-extrabold text-violet-700">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-extrabold text-[#2b2040]">
          {item.title || video?.original_name || 'Queued video'}
        </p>
        <p className="mt-0.5 text-[10px] font-semibold text-violet-400">
          {video?.original_name && video.original_name !== item.title ? video.original_name : 'Ready to play'}
        </p>
      </div>
      {isHost && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(item, -1)}
            disabled={busy || index === 0}
            aria-label={`Move ${item.title || 'video'} up`}
            className="grid h-7 w-7 place-items-center rounded-lg border border-violet-100 text-[11px] font-extrabold text-violet-600 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(item, 1)}
            disabled={busy || index === total - 1}
            aria-label={`Move ${item.title || 'video'} down`}
            className="grid h-7 w-7 place-items-center rounded-lg border border-violet-100 text-[11px] font-extrabold text-violet-600 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => onPlay(item)}
            disabled={busy}
            className="rounded-lg bg-violet-700 px-2.5 py-1.5 text-[10px] font-extrabold text-white transition hover:bg-violet-800 disabled:cursor-wait disabled:opacity-60"
          >
            Play
          </button>
          <button
            type="button"
            onClick={() => onRemove(item)}
            disabled={busy}
            aria-label={`Remove ${item.title || 'video'} from the queue`}
            className="grid h-7 w-7 place-items-center rounded-lg border border-rose-100 text-[11px] font-extrabold text-rose-600 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-40"
          >
            ×
          </button>
        </div>
      )}
    </li>
  );
}

export default function RoomQueue({
  queue,
  isHost,
  busyItemId = null,
  onPlay,
  onRemove,
  onMove,
  onAddClick,
}) {
  return (
    <section className="rounded-[26px] border border-violet-100 bg-white p-4 shadow-sm sm:p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-extrabold text-[#2b2040]">Watch queue</h2>
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-violet-400">
            {queue.length ? `${queue.length} video${queue.length === 1 ? '' : 's'} waiting` : 'Nothing queued yet'}
          </p>
        </div>
        {isHost && (
          <button
            type="button"
            onClick={onAddClick}
            className="rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] font-extrabold text-violet-700 transition hover:bg-violet-100"
          >
            + Add from my videos
          </button>
        )}
      </header>

      {queue.length ? (
        <ul className="mt-3 space-y-2">
          {queue.map((item, index) => (
            <QueueRow
              key={item.id}
              item={item}
              index={index}
              total={queue.length}
              isHost={isHost}
              busy={busyItemId === item.id}
              onPlay={onPlay}
              onRemove={onRemove}
              onMove={onMove}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-2xl border border-dashed border-violet-200 bg-violet-50/50 px-4 py-4 text-xs text-violet-600">
          {isHost
            ? 'Add a video you uploaded to keep the watch party going.'
            : 'The host has not queued another video yet.'}
        </p>
      )}
      {!isHost && queue.length > 0 && (
        <p className="mt-2 text-[10px] font-semibold text-violet-400">
          Only the host can change the queue.
        </p>
      )}
    </section>
  );
}
