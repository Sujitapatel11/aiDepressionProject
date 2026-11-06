import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  addQueueVideo,
  closeRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  listMessages,
  playQueueVideo,
  removeQueueVideo,
  reorderQueue,
  sendRoomMessage,
  updatePlayback,
} from '../services/soulTubeApi';
import { SoulTubeSocket } from '../services/soulTubeWebSocket';
import RoomPlayer from '../features/soultube/components/RoomPlayer';
import RoomChat from '../features/soultube/components/RoomChat';
import RoomQueue from '../features/soultube/components/RoomQueue';
import RoomParticipants from '../features/soultube/components/RoomParticipants';
import VideoLibraryPicker from '../features/soultube/components/VideoLibraryPicker';

const SIGNED_URL_REFRESH_MS = 20 * 60 * 1000;

function mergeMessage(list, message) {
  if (!message || message.id === undefined || message.id === null) return list;
  if (list.some((item) => item.id === message.id)) return list;
  return [...list, message];
}

export default function SoulTubeRoomPage() {
  const { code: rawCode } = useParams();
  const code = String(rawCode || '').toUpperCase();
  const navigate = useNavigate();
  const { username } = useAuth();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const [messages, setMessages] = useState([]);
  const [messagesError, setMessagesError] = useState('');
  const [connection, setConnection] = useState({ label: 'Connecting…', connected: false });
  const [playback, setPlayback] = useState(null);
  const [playbackReceivedAt, setPlaybackReceivedAt] = useState(0);

  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyItemId, setBusyItemId] = useState(null);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const socketRef = useRef(null);
  const noticeTimerRef = useRef(null);
  const lastRestPlaybackRef = useRef(0);

  const showNotice = useCallback((message) => {
    setNotice(message);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(''), 3500);
  }, []);

  useEffect(() => () => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
  }, []);

  const applyPlayback = useCallback((snapshot) => {
    if (!snapshot) return;
    setPlayback(snapshot);
    setPlaybackReceivedAt(Date.now());
  }, []);

  const loadRoom = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setLoadError('');
    const result = await getRoom(code);
    if (!result.ok) {
      if (result.status === 404) setNotFound(true);
      else setLoadError(result.error);
      if (!silent) setLoading(false);
      return null;
    }
    setNotFound(false);
    setRoom(result.data);
    applyPlayback(result.data?.playback);
    if (!silent) setLoading(false);
    return result.data;
  }, [applyPlayback, code]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setLoadError('');
    getRoom(code).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        if (result.status === 404) setNotFound(true);
        else setLoadError(result.error);
        setLoading(false);
        return;
      }
      setRoom(result.data);
      applyPlayback(result.data?.playback);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [applyPlayback, code]);

  const joined = Boolean(room?.joined);
  const isHost = Boolean(room?.is_host);
  const roomOpen = room?.status === 'active' && room?.is_active !== false;

  // Live room channel: only while the viewer is an active participant.
  useEffect(() => {
    if (!joined || !roomOpen) return undefined;

    const socket = new SoulTubeSocket(code, {
      onStatusChange: (label, connected) => setConnection({ label, connected }),
      onSync: (snapshot) => applyPlayback(snapshot),
      onPlayback: (snapshot) => applyPlayback(snapshot),
      onChat: (message) => setMessages((previous) => mergeMessage(previous, message)),
      onParticipants: (participants) => {
        setRoom((previous) => (previous
          ? { ...previous, participants, participant_count: participants.length }
          : previous));
      },
      onQueue: (queue) => {
        setRoom((previous) => (previous ? { ...previous, queue } : previous));
      },
      onRoomVideo: (video, snapshot, queue) => {
        setRoom((previous) => (previous ? { ...previous, video, queue } : previous));
        applyPlayback(snapshot);
      },
      onClosed: () => {
        setConnection({ label: 'Room closed', connected: false });
        setRoom((previous) => (previous
          ? { ...previous, status: 'closed', is_active: false }
          : previous));
        showNotice('The host closed this room.');
      },
      onError: (detail) => setActionError(detail),
    });

    socketRef.current = socket;
    socket.connect();
    return () => {
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [applyPlayback, code, joined, roomOpen, showNotice]);

  // Chat history for members (latest 100, served oldest-first).
  useEffect(() => {
    if (!joined) return undefined;
    let cancelled = false;
    setMessagesError('');
    listMessages(code).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setMessagesError(result.error);
        return;
      }
      const history = Array.isArray(result.data) ? result.data : [];
      setMessages((previous) => {
        const merged = new Map();
        [...history, ...previous].forEach((message) => {
          if (message && message.id !== undefined) merged.set(message.id, message);
        });
        return [...merged.values()].sort((a, b) => {
          const aTime = Date.parse(a.created_at) || 0;
          const bTime = Date.parse(b.created_at) || 0;
          return aTime - bTime || (a.id || 0) - (b.id || 0);
        });
      });
    });
    return () => { cancelled = true; };
  }, [code, joined]);

  // Signed preview URLs expire after an hour; refresh the room snapshot well
  // before that so a long watch party keeps a playable source.
  useEffect(() => {
    if (!joined || !roomOpen) return undefined;
    const timer = setInterval(() => {
      loadRoom({ silent: true });
    }, SIGNED_URL_REFRESH_MS);
    return () => clearInterval(timer);
  }, [joined, loadRoom, roomOpen]);

  const handleJoin = async () => {
    setJoinError('');
    setJoining(true);
    const result = await joinRoom(code);
    setJoining(false);
    if (!result.ok) {
      setJoinError(result.error);
      return;
    }
    setNotFound(false);
    setLoadError('');
    setRoom(result.data);
    applyPlayback(result.data?.playback);
  };

  const handleLeave = async () => {
    const run = async () => {
      const result = await leaveRoom(code);
      if (!result.ok && result.status !== 404) {
        setActionError(result.error);
        return;
      }
      socketRef.current?.disconnect();
      navigate('/soultube');
    };
    if (typeof window.showConfirm === 'function') {
      window.showConfirm('Leave this room? You can rejoin while it is open.', run);
    } else if (window.confirm('Leave this room? You can rejoin while it is open.')) {
      run();
    }
  };

  const handleCloseRoom = async () => {
    const run = async () => {
      const result = await closeRoom(code);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      setRoom(result.data);
      applyPlayback(result.data?.playback);
      socketRef.current?.disconnect();
      showNotice('Room closed for everyone.');
    };
    if (typeof window.showConfirm === 'function') {
      window.showConfirm('Close this room for everyone? This cannot be undone.', run, true);
    } else if (window.confirm('Close this room for everyone? This cannot be undone.')) {
      run();
    }
  };

  const copyInvite = async () => {
    const link = `${window.location.origin}/soultube/rooms/${code}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        showNotice('Invite link copied.');
        return;
      }
    } catch (err) {
      // Clipboard can be blocked; show the code instead of silently failing.
    }
    showNotice(`Share this room code: ${code}`);
  };

  const sendMessage = useCallback(async (body) => {
    const socket = socketRef.current;
    if (socket && socket.sendChat(body)) {
      return true;
    }
    const result = await sendRoomMessage(code, body);
    if (!result.ok) {
      setActionError(result.error);
      return false;
    }
    setMessages((previous) => mergeMessage(previous, result.data));
    return true;
  }, [code]);

  const publishPlayback = useCallback((payload) => {
    const socket = socketRef.current;
    if (socket && socket.sendPlayback(payload)) return;
    // REST fallback keeps state durable when the socket is reconnecting, but
    // the 5s heartbeat must not exhaust the playback throttle: at most one
    // request every 20 seconds.
    const now = Date.now();
    if (now - lastRestPlaybackRef.current < 20000) return;
    lastRestPlaybackRef.current = now;
    updatePlayback(code, payload).then((result) => {
      if (!result.ok) setActionError(result.error);
    });
  }, [code]);

  const requestSync = useCallback(() => {
    socketRef.current?.requestSync();
  }, []);

  const refreshVideo = useCallback(() => {
    loadRoom({ silent: true });
  }, [loadRoom]);

  const handleAddToQueue = async (video) => {
    setActionError('');
    const result = await addQueueVideo(code, video.id);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setRoom((previous) => {
      if (!previous) return previous;
      if ((previous.queue || []).some((item) => item.id === result.data.id)) return previous;
      return { ...previous, queue: [...(previous.queue || []), result.data] };
    });
    setShowAddVideo(false);
    showNotice('Video added to the queue.');
  };

  const handleRemoveFromQueue = async (item) => {
    setBusyItemId(item.id);
    setActionError('');
    const result = await removeQueueVideo(code, item.id);
    setBusyItemId(null);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setRoom((previous) => (previous
      ? { ...previous, queue: (previous.queue || []).filter((entry) => entry.id !== item.id) }
      : previous));
  };

  const handlePlayFromQueue = async (item) => {
    setBusyItemId(item.id);
    setActionError('');
    const result = await playQueueVideo(code, item.id);
    setBusyItemId(null);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setRoom(result.data);
    applyPlayback(result.data?.playback);
    showNotice('Now playing the next video.');
  };

  const handleMoveQueueItem = async (item, direction) => {
    const queue = room?.queue || [];
    const from = queue.findIndex((entry) => entry.id === item.id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= queue.length) return;
    const reordered = [...queue];
    [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
    setBusyItemId(item.id);
    setActionError('');
    const result = await reorderQueue(code, reordered.map((entry) => entry.id));
    setBusyItemId(null);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setRoom((previous) => (previous ? { ...previous, queue: reordered } : previous));
  };

  if (loading) {
    return (
      <main className="min-h-full bg-[#fbf8fe] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="h-8 w-52 animate-pulse rounded-full bg-violet-100" />
          <div className="aspect-video animate-pulse rounded-[28px] bg-violet-100" />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="h-48 animate-pulse rounded-[26px] bg-white" />
            <div className="h-48 animate-pulse rounded-[26px] bg-white" />
          </div>
        </div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="grid min-h-full place-items-center bg-[#fbf8fe] px-4 py-12">
        <div className="w-full max-w-md rounded-[28px] border border-violet-100 bg-white p-7 text-center shadow-sm">
          <span className="text-4xl" aria-hidden="true">🔒</span>
          <h1 className="mt-3 text-xl font-extrabold text-[#211832]">This room is not available</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#796d8a]">
            The code may be wrong, the room may be private, or it has already ended.
          </p>
          {joinError && <p className="mt-3 text-xs font-semibold text-rose-600">{joinError}</p>}
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleJoin}
              disabled={joining}
              className="rounded-full bg-violet-700 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-violet-800 disabled:cursor-wait disabled:bg-slate-300"
            >
              {joining ? 'Joining…' : `Join room ${code}`}
            </button>
            <button
              type="button"
              onClick={() => loadRoom()}
              className="rounded-full border border-violet-200 px-4 py-2.5 text-xs font-extrabold text-violet-700 transition hover:bg-violet-50"
            >
              Check again
            </button>
            <Link to="/soultube" className="rounded-full border border-violet-200 px-4 py-2.5 text-xs font-extrabold text-violet-700 transition hover:bg-violet-50">
              Back to SoulTube
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="grid min-h-full place-items-center bg-[#fbf8fe] px-4 py-12">
        <div className="w-full max-w-md rounded-[28px] border border-rose-200 bg-rose-50 p-7 text-center">
          <h1 className="text-lg font-extrabold text-rose-800">The room could not be loaded</h1>
          <p className="mt-2 text-xs font-semibold text-rose-700">{loadError}</p>
          <button type="button" onClick={() => loadRoom()} className="mt-4 rounded-full bg-rose-600 px-4 py-2 text-xs font-extrabold text-white">
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!room) return null;

  const participants = room.participants || [];
  const queue = room.queue || [];

  return (
    <main className="min-h-full bg-[#fbf8fe] px-4 pb-10 pt-5 text-[#241b35] sm:px-6 lg:px-8 lg:pt-7">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="rounded-[26px] border border-violet-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Link to="/soultube" className="text-[11px] font-extrabold uppercase tracking-[.18em] text-violet-400 hover:text-violet-700">
                ← SoulTube
              </Link>
              <h1 className="mt-1.5 break-words text-xl font-extrabold tracking-tight text-[#211832] sm:text-2xl">
                {room.name}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-violet-500">
                <span>Hosted by <strong className="text-violet-700">{room.host_username}</strong></span>
                <span aria-hidden="true">·</span>
                <span>{participants.length}{room.max_participants ? `/${room.max_participants}` : ''} in the room</span>
                <span aria-hidden="true">·</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${room.visibility === 'private' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {room.visibility === 'private' ? 'Private' : 'Public'}
                </span>
                {!roomOpen && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600">
                    Ended
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={copyInvite}
                className="rounded-full border border-violet-200 bg-white px-3 py-2 text-[11px] font-extrabold tracking-widest text-violet-700 transition hover:bg-violet-50"
                title="Copy invite link"
              >
                {room.code} ⧉
              </button>
              {joined && roomOpen && isHost && (
                <button
                  type="button"
                  onClick={handleCloseRoom}
                  className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-extrabold text-rose-700 transition hover:bg-rose-100"
                >
                  Close room
                </button>
              )}
              {joined && roomOpen && !isHost && (
                <button
                  type="button"
                  onClick={handleLeave}
                  className="rounded-full border border-violet-200 bg-white px-3 py-2 text-[11px] font-extrabold text-violet-700 transition hover:bg-violet-50"
                >
                  Leave room
                </button>
              )}
            </div>
          </div>

          {notice && (
            <p className="mt-3 rounded-xl bg-violet-50 px-3 py-2 text-[11px] font-bold text-violet-700">{notice}</p>
          )}
          {actionError && (
            <div className="mt-3 flex items-start justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
              <span>{actionError}</span>
              <button type="button" onClick={() => setActionError('')} aria-label="Dismiss error" className="font-extrabold">×</button>
            </div>
          )}
        </header>

        {!joined && roomOpen && (
          <section className="rounded-[26px] border border-violet-200 bg-white p-6 text-center shadow-sm">
            <span className="text-3xl" aria-hidden="true">🎟️</span>
            <h2 className="mt-2 text-lg font-extrabold text-[#2b2040]">Join this watch room</h2>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-violet-500">
              You will see the shared player, the queue, and the room chat. The host controls play,
              pause, and seek for everyone.
            </p>
            {joinError && <p className="mt-3 text-xs font-semibold text-rose-600">{joinError}</p>}
            <button
              type="button"
              onClick={handleJoin}
              disabled={joining}
              className="mt-4 rounded-full bg-violet-700 px-6 py-3 text-xs font-extrabold text-white transition hover:bg-violet-800 disabled:cursor-wait disabled:bg-slate-300"
            >
              {joining ? 'Joining…' : 'Join room →'}
            </button>
          </section>
        )}

        {!roomOpen && (
          <section className="rounded-[26px] border border-violet-100 bg-white px-5 py-4 text-sm font-semibold text-violet-600 shadow-sm">
            This room has ended. The video and chat are read-only.
          </section>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-4">
            <section className="rounded-[28px] border border-violet-100 bg-white p-3 shadow-sm sm:p-4">
              <RoomPlayer
                video={joined ? room.video : null}
                playback={playback}
                playbackReceivedAt={playbackReceivedAt}
                isHost={isHost && roomOpen}
                roomClosed={!roomOpen}
                onHostPlayback={publishPlayback}
                onRefresh={refreshVideo}
                onRequestSync={requestSync}
                connectionLabel={connection.label}
              />
              {!joined && roomOpen && (
                <p className="mt-2 px-1 text-center text-[11px] font-semibold text-violet-400">
                  Join the room to load the shared player.
                </p>
              )}
            </section>

            <RoomQueue
              queue={joined ? queue : []}
              isHost={isHost && roomOpen}
              busyItemId={busyItemId}
              onPlay={handlePlayFromQueue}
              onRemove={handleRemoveFromQueue}
              onMove={handleMoveQueueItem}
              onAddClick={() => setShowAddVideo((value) => !value)}
            />

            {joined && isHost && roomOpen && showAddVideo && (
              <section className="rounded-[26px] border border-violet-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-extrabold text-[#2b2040]">Add from your videos</h2>
                    <p className="text-[10px] font-semibold text-violet-400">
                      Only videos you uploaded can be added.
                    </p>
                  </div>
                  <button type="button" onClick={() => setShowAddVideo(false)} className="text-xs font-extrabold text-violet-500">
                    Close
                  </button>
                </div>
                <div className="mt-3">
                  <VideoLibraryPicker onPick={handleAddToQueue} />
                </div>
              </section>
            )}
          </div>

          <aside className="min-w-0 space-y-4">
            <RoomChat
              messages={messages}
              onSend={sendMessage}
              connected={connection.connected}
              disabled={!joined || !roomOpen}
              currentUsername={username}
            />
            {messagesError && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">
                Chat history could not be loaded: {messagesError}
              </p>
            )}
            <RoomParticipants participants={participants} maxParticipants={room.max_participants} />
          </aside>
        </div>
      </div>
    </main>
  );
}
