import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

const PROMPTS = [
  "What's one small thing that went well today?",
  'Describe a moment this week when you felt at peace.',
  'What emotion are you carrying right now?',
  "Write about something you're looking forward to.",
  'What would you tell a friend who felt the way you do today?',
  'What drained your energy today, and what restored it?',
  'Describe your ideal version of tomorrow.',
  "What's something you've been avoiding thinking about?",
  'Write three things you are grateful for right now.',
  'What does your body need most today?',
  'What made you smile recently, even briefly?',
  'What boundary do you need to set or honour today?',
  'Write about a person who makes you feel safe.',
  'If today had a colour, what would it be and why?',
  "What's a belief you hold that you've never questioned?",
];

const shortcuts = [
  { label: 'Journal', detail: "Today's entry", icon: '✍️', tone: 'from-violet-200 to-fuchsia-200', path: '/journal', tag: 'Write' },
  { label: 'Connect', detail: 'Find your people', icon: '♡', tone: 'from-pink-200 to-rose-200', path: '/peers', tag: 'People' },
  { label: 'Community', detail: 'Shared moments', icon: '🎮', tone: 'from-violet-500 to-purple-700', path: '/community', tag: 'Explore' },
  { label: 'Insights', detail: 'Your reflections', icon: '◉', tone: 'from-fuchsia-200 to-purple-200', path: '/insights', tag: 'Discover' },
];

function RoomIllustration() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-label="Illustration of a cozy floating sanctuary room" role="img"
      style={{ background: 'radial-gradient(ellipse at 50% 75%, #f9c9e8 0%, #a98ce8 35%, #55417f 72%, #211b45 100%)' }}>
      <div className="absolute -top-16 left-8 h-48 w-48 rounded-full bg-fuchsia-200/30 blur-3xl" />
      <div className="absolute top-10 right-8 h-40 w-40 rounded-full bg-indigo-200/30 blur-3xl" />
      {Array.from({ length: 22 }, (_, i) => (
        <span key={i} className="absolute rounded-full bg-white/80" style={{
          width: i % 4 === 0 ? 4 : 2, height: i % 4 === 0 ? 4 : 2,
          left: ((i * 37) % 96) + '%', top: ((i * 19) % 68) + '%',
          opacity: 0.35 + (i % 5) * 0.12,
        }} />
      ))}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[#241a43]/80 to-transparent" />
      <div className="absolute bottom-[16%] left-[9%] h-[46%] w-[82%] rounded-t-[48%] border border-white/30 bg-gradient-to-b from-[#f4dafa]/90 via-[#d5b8ef]/95 to-[#8b6ab9] shadow-2xl">
        <div className="absolute left-[8%] top-[12%] h-[48%] w-[26%] rounded-t-full border-[5px] border-[#f8e9ff] bg-gradient-to-b from-[#7768b2] to-[#f6c9e8] shadow-inner">
          <div className="absolute inset-x-2 bottom-2 h-1/2 rounded-t-full bg-[#f8d9ef]/70" />
          <span className="absolute right-2 top-4 text-white/90">✦</span>
        </div>
        <div className="absolute right-[12%] top-[25%] h-[45%] w-[27%] rounded-t-2xl border border-white/50 bg-gradient-to-b from-[#fff0fb] to-[#a88bc9] shadow-lg">
          <div className="absolute inset-x-2 bottom-0 h-2/5 rounded-t-xl bg-[#755d9e]" />
          <div className="absolute left-1/2 top-2 h-3 w-3 -translate-x-1/2 rounded-full bg-amber-100 shadow-[0_0_18px_8px_rgba(255,239,177,.55)]" />
        </div>
        <div className="absolute bottom-0 left-[34%] h-[38%] w-[34%] rounded-t-[45%] bg-gradient-to-b from-[#fff5fc] to-[#d9b7e8] shadow-xl">
          <div className="absolute inset-x-2 top-3 h-8 rounded-full bg-[#b99bd8]" />
          <div className="absolute bottom-0 left-0 right-0 h-4 rounded-t-full bg-[#8d70b6]" />
        </div>
        <div className="absolute -bottom-2 left-[6%] text-4xl drop-shadow-lg">🪴</div>
        <div className="absolute -bottom-2 right-[5%] text-4xl drop-shadow-lg">🌿</div>
        <div className="absolute left-[43%] top-[8%] text-xl text-white drop-shadow">☾</div>
      </div>
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/30 bg-[#241a43]/45 px-4 py-1.5 text-xs font-semibold tracking-wide text-white/90 backdrop-blur-md">
        YOUR LITTLE CORNER OF THE UNIVERSE
      </div>
    </div>
  );
}

export const DashboardPage = () => {
  const { username } = useAuth();
  const navigate = useNavigate();
  const [dashData, setDashData] = useState(null);
  const [sleepStats, setSleepStats] = useState(null);
  const [customAvatar, setCustomAvatar] = useState('');

  useEffect(() => {
    setCustomAvatar(localStorage.getItem('sc_av_' + username) || '');

    async function loadData() {
      const res = await api('GET', '/dashboard/');
      if (res && res.ok) {
        const data = await res.json();
        setDashData(data);
      }

      try {
        const sRes = await api('GET', '/sleep/stats/');
        if (sRes && sRes.ok) {
          const sData = await sRes.json();
          setSleepStats(sData);
        }
      } catch (e) {
        // Sleep stats are optional; the rest of the dashboard remains available.
      }
    }

    loadData();
  }, [username]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  }, []);
  const dailyPrompt = PROMPTS[(new Date().getDay() + new Date().getDate()) % PROMPTS.length];
  const initials = (username || '?').slice(0, 2).toUpperCase();

  const openAvatarPicker = () => {
    if (window.openAvatarPicker) window.openAvatarPicker();
  };

  return (
    <main className="min-h-full bg-[#fbf8fe] px-4 pb-8 pt-5 text-[#241b35] sm:px-6 lg:px-8 lg:pt-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-xl text-white shadow-md shadow-violet-200">✦</div>
            <div>
              <p className="text-lg font-extrabold leading-tight tracking-tight text-violet-800">SoulCare</p>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-violet-400">Your personal universe</p>
            </div>
          </div>
          <button type="button" onClick={openAvatarPicker} aria-label="Change profile avatar"
            className="relative flex h-11 w-11 items-center justify-center overflow-visible rounded-full border-2 border-white bg-violet-600 text-sm font-extrabold text-white shadow-md ring-2 ring-violet-100">
            {customAvatar ? <img src={customAvatar} alt="Your avatar" className="h-full w-full rounded-full object-cover" /> : initials}
            <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />
          </button>
        </header>

        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-1 text-sm font-semibold text-violet-500">A little space just for you ✨</p>
              <h1 className="text-2xl font-extrabold tracking-tight text-[#211832] sm:text-3xl">{greeting}, {username || 'friend'}</h1>
              <p className="mt-1 text-sm text-[#796d8a]">Take a breath. Your sanctuary is waiting.</p>
            </div>
            <button type="button" onClick={() => navigate('/profile')}
              className="rounded-full border border-violet-200 bg-white px-4 py-2 text-xs font-bold text-violet-700 shadow-sm transition hover:bg-violet-50">
              View profile ↗
            </button>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-white/80 px-4 py-3 shadow-sm">
            <span className="text-lg">☾</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 text-xs font-bold">
                <span className="text-violet-800">Your sanctuary, your pace</span>
                <span className="text-violet-400">One day at a time</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-violet-100"><div className="h-full w-2/3 rounded-full bg-gradient-to-r from-fuchsia-300 to-violet-500" /></div>
            </div>
          </div>
        </section>

        <section className="relative h-[340px] overflow-hidden rounded-[28px] border border-violet-200/70 shadow-[0_18px_50px_-24px_rgba(91,49,145,.65)] sm:h-[390px]">
          <RoomIllustration />
          <div className="absolute left-4 top-4 rounded-full border border-white/60 bg-white/85 px-3 py-1.5 text-[11px] font-bold text-violet-800 shadow-sm backdrop-blur">✧ Sanctuary room</div>
          <button type="button" onClick={() => navigate('/journal')}
            className="absolute right-4 top-4 rounded-full bg-violet-700 px-4 py-2 text-xs font-bold text-white shadow-lg transition hover:bg-violet-800">
            ✍ Write today
          </button>
          <button type="button" onClick={() => navigate('/insights')}
            className="absolute bottom-20 left-4 rounded-full border border-white/70 bg-white/90 px-3 py-2 text-xs font-bold text-violet-800 shadow-md backdrop-blur transition hover:bg-white">
            ✦ Your insights
          </button>
          <button type="button" onClick={() => navigate('/peers')}
            className="absolute bottom-20 right-4 rounded-full border border-white/70 bg-white/90 px-3 py-2 text-xs font-bold text-violet-800 shadow-md backdrop-blur transition hover:bg-white">
            ♡ Find connection
          </button>
          <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-2xl border border-white/70 bg-white/90 p-3 shadow-xl backdrop-blur-md">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-200 to-violet-200 text-xl">🌙</div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-violet-900">A gentle reminder</p>
              <p className="truncate text-xs text-[#766982]">You don't have to figure everything out today.</p>
            </div>
            <span className="ml-auto text-lg">✨</span>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div><h2 className="text-lg font-extrabold text-[#2b2040]">Orbital shortcuts</h2><p className="text-xs text-[#887d98]">Jump back into your space</p></div>
            <span className="text-lg text-violet-400">✣</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {shortcuts.map((item) => (
              <button key={item.label} type="button" onClick={() => navigate(item.path)}
                className="group flex min-h-[142px] flex-col items-center justify-center rounded-[25px] border border-violet-100 bg-white px-3 py-4 text-center shadow-[0_5px_18px_-14px_rgba(75,35,125,.5)] transition hover:-translate-y-1 hover:border-violet-300 hover:shadow-lg">
                <span className={`mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${item.tone} text-3xl text-violet-800 shadow-inner transition group-hover:scale-105`}>{item.icon}</span>
                <span className="text-sm font-extrabold text-[#322644]">{item.label}</span>
                <span className="mt-1 text-[11px] text-[#8a7d99]">{item.detail}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button type="button" onClick={() => navigate('/insights')} className="rounded-2xl border border-violet-100 bg-white p-4 text-left shadow-sm transition hover:border-violet-300">
            <p className="text-xs font-bold uppercase tracking-wide text-violet-500">Unread insights</p>
            <p className="mt-1 text-2xl font-extrabold text-violet-900">{dashData?.unread_insights_count ?? 0}</p>
            <p className="text-xs text-[#887d98]">AI reflections waiting</p>
          </button>
          <button type="button" onClick={() => navigate('/sleep')} className="rounded-2xl border border-indigo-100 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300">
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-500">Restful sleep</p>
            <p className="mt-1 text-lg font-extrabold text-indigo-900">{sleepStats?.has_data ? sleepStats.formatted_latest : 'No sleep data yet'}</p>
            <p className="text-xs text-[#887d98]">{sleepStats?.has_data ? `Quality: ${sleepStats.sleep_quality} · 7-day avg: ${sleepStats.formatted_avg}` : 'Add a sleep entry when ready'}</p>
          </button>
          <button type="button" onClick={() => navigate('/peers')} className="rounded-2xl border border-pink-100 bg-white p-4 text-left shadow-sm transition hover:border-pink-300">
            <p className="text-xs font-bold uppercase tracking-wide text-pink-500">Connections</p>
            <p className="mt-1 text-2xl font-extrabold text-pink-900">{dashData?.active_connections_count ?? 0}</p>
            <p className="text-xs text-[#887d98]">People in your circle</p>
          </button>
          <button type="button" onClick={() => navigate('/peers')} className="rounded-2xl border border-amber-100 bg-white p-4 text-left shadow-sm transition hover:border-amber-300">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-600">Requests</p>
            <p className="mt-1 text-2xl font-extrabold text-amber-900">{dashData?.pending_requests_count ?? 0}</p>
            <p className="text-xs text-[#887d98]">Connection invitations</p>
          </button>
        </section>

        <section className="rounded-[26px] border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div><p className="text-xs font-bold uppercase tracking-[.16em] text-violet-500">Sanctuary vibe</p><h2 className="mt-1 text-lg font-extrabold text-[#2b2040]">Make space to pause</h2></div>
            <span className="text-2xl">🌷</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-2xl bg-[#fff3fa] p-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-100">☾</span><div><p className="text-[11px] text-[#9b7892]">A moment for</p><p className="text-sm font-bold text-[#583b63]">Gentle reflection</p></div></div>
            <div className="flex items-center gap-3 rounded-2xl bg-[#f4f0ff] p-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100">✧</span><div><p className="text-[11px] text-[#8877a6]">Your daily prompt</p><p className="text-sm font-bold text-[#49356d]">Take it one thought at a time</p></div></div>
          </div>
          <div className="mt-4 rounded-2xl bg-gradient-to-r from-violet-700 to-fuchsia-600 p-4 text-white">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-violet-100">Today's reflection</p>
            <p className="mt-2 text-base font-semibold leading-relaxed">{dailyPrompt}</p>
            <button type="button" onClick={() => navigate('/journal')} className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-extrabold text-violet-800 transition hover:bg-violet-50">Open journal →</button>
          </div>
        </section>

        <section className="rounded-[26px] border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[.16em] text-violet-500">Your recent words</p><h2 className="mt-1 text-lg font-extrabold text-[#2b2040]">Latest journal reflection</h2></div>
            <button type="button" onClick={() => navigate('/journal')} className="text-xs font-extrabold text-violet-700 hover:underline">Open journal ↗</button>
          </div>
          <p className="mt-4 rounded-2xl bg-[#faf7fd] p-4 text-sm leading-relaxed text-[#6e627d]">
            {dashData?.latest_journal_preview?.content || 'Your page is waiting. Write your first reflection whenever you feel ready.'}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#9489a0]">
            <span>{dashData?.journal_count ?? 0} journal entries</span>
            <span>🔒 Your reflections are private</span>
          </div>
        </section>
      </div>
    </main>
  );
};

export default DashboardPage;
