import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createRoom, joinRoom, listRooms } from '../services/soulTubeApi';
import VideoLibraryPicker from '../features/soultube/components/VideoLibraryPicker';

const INITIAL_FORM = {
  name: '',
  visibility: 'public',
  maxParticipants: 10,
  lifetimeHours: 12,
};

function RoomCard({ room, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(room)}
      className="group flex h-full flex-col rounded-[24px] border border-violet-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-lg text-white">
          ▶
        </span>
        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-extrabold tracking-widest text-violet-600">
          {room.code}
        </span>
      </div>
      <h3 className="mt-3 line-clamp-2 text-sm font-extrabold text-[#2b2040]">{room.name}</h3>
      <p className="mt-1 text-[11px] font-semibold text-violet-400">
        Hosted by {room.host_username || 'a member'}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-extrabold">
        <span className="rounded-full bg-violet-50 px-2 py-1 text-violet-700">
          {room.participant_count}{room.max_participants ? `/${room.max_participants}` : ''} watching
        </span>
        <span className={`rounded-full px-2 py-1 ${room.visibility === 'private' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {room.visibility === 'private' ? 'Private' : 'Public'}
        </span>
        {room.joined && (
          <span className="rounded-full bg-fuchsia-50 px-2 py-1 text-fuchsia-700">Joined</span>
        )}
      </div>
      <span className="mt-auto pt-3 text-[11px] font-extrabold text-violet-600 group-hover:underline">
        {room.joined ? 'Return to room →' : 'View room →'}
      </span>
    </button>
  );
}

export default function SoulTubePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('public');
  const [rooms, setRooms] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState('');
  const requestRef = useRef(0);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const loadRooms = useCallback(async (whichTab, page = 1) => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    if (page === 1) setRoomsLoading(true);
    setRoomsError('');
    const result = await listRooms({ mine: whichTab === 'mine', page });
    if (requestRef.current !== requestId) return;
    if (!result.ok) {
      setRoomsError(result.error);
      setRoomsLoading(false);
      return;
    }
    const results = Array.isArray(result.data?.results) ? result.data.results : [];
    setRooms((previous) => (page === 1 ? results : [...previous, ...results]));
    setNextPage(result.data?.next ? page + 1 : null);
    setRoomsLoading(false);
  }, []);

  useEffect(() => {
    loadRooms(tab, 1);
  }, [tab, loadRooms]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setCreateError('');
    const name = form.name.trim();
    if (name.length < 3 || name.length > 120) {
      setCreateError('Room names must be 3–120 characters.');
      return;
    }
    setCreating(true);
    const result = await createRoom({
      name,
      visibility: form.visibility,
      max_participants: Number(form.maxParticipants),
      lifetime_hours: Number(form.lifetimeHours),
      video_asset_id: selectedVideo?.id || null,
    });
    setCreating(false);
    if (!result.ok) {
      setCreateError(result.error);
      return;
    }
    const code = result.data?.code;
    if (!code) {
      setCreateError('The room was created but no room code was returned.');
      return;
    }
    navigate(`/soultube/rooms/${code}`);
  };

  const handleJoin = async (event) => {
    event.preventDefault();
    const code = joinCode.trim().toUpperCase();
    setJoinError('');
    if (code.length < 4) {
      setJoinError('Enter the room code the host shared with you.');
      return;
    }
    setJoining(true);
    const result = await joinRoom(code);
    setJoining(false);
    if (!result.ok) {
      setJoinError(result.error);
      return;
    }
    navigate(`/soultube/rooms/${code}`);
  };

  return (
    <main className="min-h-full bg-[#fbf8fe] px-4 pb-10 pt-5 text-[#241b35] sm:px-6 lg:px-8 lg:pt-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="rounded-[28px] border border-violet-100 bg-white p-5 shadow-[0_10px_32px_-24px_rgba(91,49,145,.45)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <Link to="/world" className="text-[11px] font-extrabold uppercase tracking-[.2em] text-violet-400 hover:text-violet-700">
                ← Soul World
              </Link>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#211832] sm:text-3xl">
                SoulTube 🎬
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-[#796d8a]">
                Watch together, in sync. Bring a video you own, invite your people, and let the host
                steer play, pause, and seek.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCreate((value) => !value);
                setCreateError('');
              }}
              className="rounded-full bg-violet-700 px-5 py-3 text-xs font-extrabold text-white shadow-md shadow-violet-200 transition hover:bg-violet-800"
            >
              {showCreate ? 'Close create form' : '+ Create a room'}
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <form onSubmit={handleJoin} className="rounded-2xl border border-violet-100 bg-violet-50/40 p-3">
              <label htmlFor="join-code" className="text-[10px] font-extrabold uppercase tracking-[.16em] text-violet-500">
                Join with a room code
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="join-code"
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase().slice(0, 8))}
                  placeholder="ABC123"
                  autoComplete="off"
                  className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm font-extrabold tracking-[.18em] text-violet-800 outline-none focus:border-violet-400"
                />
                <button
                  type="submit"
                  disabled={joining || !joinCode.trim()}
                  className="rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {joining ? 'Joining…' : 'Join'}
                </button>
              </div>
              {joinError && <p className="mt-2 text-[11px] font-semibold text-rose-600">{joinError}</p>}
            </form>

            <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-900 via-violet-800 to-fuchsia-700 p-3 text-white">
              <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-violet-200">A small promise</p>
              <p className="mt-1.5 text-xs leading-relaxed text-white/85">
                SoulTube only plays videos uploaded by the host. Nothing is downloaded, proxied, or
                redistributed from other platforms.
              </p>
            </div>
          </div>
        </header>

        {showCreate && (
          <section className="rounded-[26px] border border-violet-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-extrabold text-[#2b2040]">Create a watch room</h2>
                <p className="mt-1 text-xs text-violet-500">
                  Rooms expire automatically. The host can close the room at any time.
                </p>
              </div>
              <span className="rounded-full bg-violet-100 px-3 py-1.5 text-[10px] font-extrabold text-violet-700">
                Host controls playback
              </span>
            </div>

            <form onSubmit={handleCreate} className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-3">
                <div>
                  <label htmlFor="room-name" className="text-[10px] font-extrabold uppercase tracking-[.16em] text-violet-500">
                    Room name
                  </label>
                  <input
                    id="room-name"
                    value={form.name}
                    onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value.slice(0, 120) }))}
                    placeholder="Friday movie night"
                    className="mt-1.5 w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm text-[#2b2040] outline-none focus:border-violet-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="room-visibility" className="text-[10px] font-extrabold uppercase tracking-[.16em] text-violet-500">
                      Visibility
                    </label>
                    <select
                      id="room-visibility"
                      value={form.visibility}
                      onChange={(event) => setForm((previous) => ({ ...previous, visibility: event.target.value }))}
                      className="mt-1.5 w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-xs font-semibold text-[#2b2040] outline-none focus:border-violet-400"
                    >
                      <option value="public">Public — listed</option>
                      <option value="private">Private — code only</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="room-size" className="text-[10px] font-extrabold uppercase tracking-[.16em] text-violet-500">
                      Max participants
                    </label>
                    <input
                      id="room-size"
                      type="number"
                      min={2}
                      max={50}
                      value={form.maxParticipants}
                      onChange={(event) => setForm((previous) => ({ ...previous, maxParticipants: event.target.value }))}
                      className="mt-1.5 w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-xs font-semibold text-[#2b2040] outline-none focus:border-violet-400"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="room-lifetime" className="text-[10px] font-extrabold uppercase tracking-[.16em] text-violet-500">
                    Keep the room open for
                  </label>
                  <select
                    id="room-lifetime"
                    value={form.lifetimeHours}
                    onChange={(event) => setForm((previous) => ({ ...previous, lifetimeHours: event.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-xs font-semibold text-[#2b2040] outline-none focus:border-violet-400"
                  >
                    <option value={1}>1 hour</option>
                    <option value={6}>6 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours</option>
                  </select>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-violet-500">
                  Opening video (optional)
                </p>
                <p className="mb-2 mt-1 text-[10px] text-violet-400">
                  Choose from videos you uploaded. You can add more to the queue later.
                </p>
                <VideoLibraryPicker
                  compact
                  selectedId={selectedVideo?.id}
                  onPick={(video) => setSelectedVideo((previous) => (previous?.id === video.id ? null : video))}
                />
              </div>

              {createError && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 lg:col-span-2">
                  {createError}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-violet-50 pt-3 lg:col-span-2">
                <span className="text-[11px] font-semibold text-violet-400">
                  {selectedVideo ? `Opening with: ${selectedVideo.original_name || 'selected video'}` : 'You can start without a video and add one inside the room.'}
                </span>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-full bg-violet-700 px-5 py-2.5 text-xs font-extrabold text-white transition hover:bg-violet-800 disabled:cursor-wait disabled:bg-slate-300"
                >
                  {creating ? 'Creating room…' : 'Create room →'}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-full border border-violet-100 bg-white p-1">
              <button
                type="button"
                onClick={() => setTab('public')}
                aria-pressed={tab === 'public'}
                className={`rounded-full px-4 py-2 text-[11px] font-extrabold transition ${tab === 'public' ? 'bg-violet-700 text-white' : 'text-violet-600 hover:bg-violet-50'}`}
              >
                Public rooms
              </button>
              <button
                type="button"
                onClick={() => setTab('mine')}
                aria-pressed={tab === 'mine'}
                className={`rounded-full px-4 py-2 text-[11px] font-extrabold transition ${tab === 'mine' ? 'bg-violet-700 text-white' : 'text-violet-600 hover:bg-violet-50'}`}
              >
                My rooms
              </button>
            </div>
            <button
              type="button"
              onClick={() => loadRooms(tab, 1)}
              className="text-[11px] font-extrabold text-violet-600 hover:underline"
            >
              ↻ Refresh
            </button>
          </div>

          {roomsLoading && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((key) => (
                <div key={key} className="h-40 animate-pulse rounded-[24px] border border-violet-100 bg-white" />
              ))}
            </div>
          )}

          {!roomsLoading && roomsError && (
            <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
              <p className="font-extrabold">Rooms could not be loaded.</p>
              <p className="mt-1 text-xs">{roomsError}</p>
              <button type="button" onClick={() => loadRooms(tab, 1)} className="mt-3 rounded-full bg-rose-600 px-4 py-2 text-xs font-extrabold text-white">
                Try again
              </button>
            </div>
          )}

          {!roomsLoading && !roomsError && !rooms.length && (
            <div className="rounded-[24px] border border-dashed border-violet-200 bg-white p-8 text-center">
              <span className="text-3xl" aria-hidden="true">🎬</span>
              <p className="mt-2 text-sm font-extrabold text-[#2b2040]">
                {tab === 'mine' ? 'You have not joined a room yet' : 'No public rooms are open right now'}
              </p>
              <p className="mt-1 text-xs text-violet-500">
                {tab === 'mine'
                  ? 'Create a room or join one with a code.'
                  : 'Create the first room and invite your people.'}
              </p>
            </div>
          )}

          {!roomsLoading && !roomsError && rooms.length > 0 && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rooms.map((room) => (
                  <RoomCard key={room.code} room={room} onOpen={(item) => navigate(`/soultube/rooms/${item.code}`)} />
                ))}
              </div>
              {nextPage && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => loadRooms(tab, nextPage)}
                    className="rounded-full border border-violet-200 bg-white px-5 py-2.5 text-xs font-extrabold text-violet-700 transition hover:bg-violet-50"
                  >
                    Load more rooms
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
