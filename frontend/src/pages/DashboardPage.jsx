import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

const PROMPTS = [
  "What's one small thing that went well today?",
  "Describe a moment this week when you felt at peace.",
  "What emotion are you carrying right now?",
  "Write about something you're looking forward to.",
  "What would you tell a friend who felt the way you do today?",
  "What drained your energy today, and what restored it?",
  "Describe your ideal version of tomorrow.",
  "What's something you've been avoiding thinking about?",
  "Write three things you're grateful for right now.",
  "What does your body need most today?",
  "What made you smile recently, even briefly?",
  "What boundary do you need to set or honour today?",
  "Write about a person who makes you feel safe.",
  "If today had a colour, what would it be and why?",
  "What's a belief you hold that you've never questioned?"
];

export const DashboardPage = () => {
  const { username } = useAuth();
  const navigate = useNavigate();

  const [dashData, setDashData] = useState(null);
  const [sleepStats, setSleepStats] = useState(null);
  const [customAvatar, setCustomAvatar] = useState('');

  useEffect(() => {
    setCustomAvatar(localStorage.getItem('sc_av_' + username) || '');

    async function loadData() {
      // Load Dashboard Stats
      const res = await api('GET', '/dashboard/');
      if (res && res.ok) {
        const data = await res.json();
        setDashData(data);
      }

      // Load Sleep Stats
      try {
        const sRes = await api('GET', '/sleep/stats/');
        if (sRes && sRes.ok) {
          const sData = await sRes.json();
          setSleepStats(sData);
        }
      } catch (e) {}
    }

    loadData();
  }, [username]);

  const getGreeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };

  const getDailyPrompt = () => {
    return PROMPTS[(new Date().getDay() + new Date().getDate()) % PROMPTS.length];
  };

  const initials = (username || '?').slice(0, 2).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 lg:py-8 lg:px-6 space-y-6 lg:space-y-8 animate-fadeIn">
      {/* 1. TOP HERO SECTION */}
      <div
        className="p-6 lg:p-8 rounded-[32px] text-white relative overflow-hidden shadow-xl"
        style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 40%, #A78BFA 100%)' }}
      >
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 blur-xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between relative z-10 gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider text-purple-100 backdrop-blur-md">
                🌱 Daily Affirmation
              </span>
            </div>
            <p className="t-subtitle text-purple-200 text-base">{getGreeting()}</p>
            <h1 className="t-display text-white text-2xl lg:text-3xl font-extrabold mb-2">{username || 'Friend'}</h1>
            <p className="t-body-md text-purple-100 italic mb-5">
              “Every small step matters. You are stronger than you think.” 💜
            </p>

            {/* Streak Check-in Banner */}
            <div className="flex items-center justify-between gap-4 bg-white/15 p-3.5 px-5 rounded-2xl backdrop-blur-md border border-white/20">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🌱</span>
                <div>
                  <p className="text-[10px] font-bold text-purple-200 uppercase">Healing Journey</p>
                  <p className="text-xs lg:text-sm font-extrabold text-white">Start Your Daily Reflection Streak</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/journal')}
                className="px-4 py-2 rounded-xl bg-white text-purple-900 font-bold text-xs hover:bg-purple-50 transition border-none cursor-pointer flex-shrink-0"
              >
                Check In Today →
              </button>
            </div>
          </div>

          {/* Mascot & Avatar */}
          <div className="flex flex-row md:flex-col items-center gap-3 flex-shrink-0">
            <div
              onClick={() => window.openAvatarPicker && window.openAvatarPicker()}
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg border-2 border-white/40 cursor-pointer overflow-hidden"
              style={{
                background: customAvatar ? 'none' : 'linear-gradient(135deg,#8B5CF6,#7C3AED)',
              }}
            >
              {customAvatar ? (
                <img src={customAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="w-24 h-24 lg:w-32 lg:h-32 relative">
              <svg viewBox="0 0 120 120" fill="none" className="w-full h-full filter drop-shadow-lg">
                <rect x="35" y="60" width="50" height="45" rx="16" fill="#EDE9FE" />
                <path d="M40 60 C40 30 55 20 60 20 C65 20 80 30 80 60 Z" fill="#34D399" />
                <path d="M60 20 C50 10 35 15 35 15 C35 15 45 35 60 20 Z" fill="#10B981" />
                <circle cx="50" cy="78" r="3" fill="#374151" />
                <circle cx="70" cy="78" r="3" fill="#374151" />
                <path d="M55 86 Q60 90 65 86" stroke="#374151" strokeWidth="2" strokeLinecap="round" fill="none" />
                <circle cx="45" cy="82" r="3.5" fill="#FCA5A5" opacity="0.7" />
                <circle cx="75" cy="82" r="3.5" fill="#FCA5A5" opacity="0.7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Quick Mood Check-in */}
        <div className="mt-6 pt-5 border-t border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-bold text-purple-100 uppercase tracking-wider">How are you feeling right now?</span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button className="mood-pill active-pill bg-white/20 text-white border-white/30 hover:bg-white/30" onClick={() => navigate('/insights')}>
              <span>😊</span> Great
            </button>
            <button className="mood-pill bg-white/10 text-white/90 border-white/20 hover:bg-white/20" onClick={() => navigate('/insights')}>
              <span>🙂</span> Good
            </button>
            <button className="mood-pill bg-white/10 text-white/90 border-white/20 hover:bg-white/20" onClick={() => navigate('/insights')}>
              <span>😐</span> Okay
            </button>
            <button className="mood-pill bg-white/10 text-white/90 border-white/20 hover:bg-white/20" onClick={() => navigate('/insights')}>
              <span>🙁</span> Down
            </button>
            <button className="mood-pill bg-white/10 text-white/90 border-white/20 hover:bg-white/20" onClick={() => navigate('/insights')}>
              <span>😫</span> Awful
            </button>
          </div>
        </div>
      </div>

      {/* 2. QUICK ACTIONS GRID */}
      <div>
        <h3 class="t-h4 text-gray-700 font-bold mb-3 flex items-center gap-2">
          <span>⚡</span> Quick Sanctuary Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div
            onClick={() => navigate('/insights')}
            className="p-5 rounded-[24px] bg-white border border-purple-100 hover:border-purple-300 hover:shadow-lg transition cursor-pointer flex flex-col justify-between"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-2xl mb-3">😊</div>
            <div>
              <h4 className="t-h5 text-gray-900 font-bold mb-1">Check Mood</h4>
              <p className="t-caption text-gray-500">Log emotional score</p>
            </div>
          </div>

          <div
            onClick={() => navigate('/journal')}
            className="p-5 rounded-[24px] bg-white border border-purple-100 hover:border-purple-300 hover:shadow-lg transition cursor-pointer flex flex-col justify-between"
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-2xl mb-3">📖</div>
            <div>
              <h4 className="t-h5 text-gray-900 font-bold mb-1">Write Journal</h4>
              <p className="t-caption text-gray-500">Express thoughts</p>
            </div>
          </div>

          <div
            onClick={() => navigate('/insights')}
            className="p-5 rounded-[24px] bg-white border border-purple-100 hover:border-purple-300 hover:shadow-lg transition cursor-pointer flex flex-col justify-between"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl mb-3">🤖</div>
            <div>
              <h4 className="t-h5 text-gray-900 font-bold mb-1">AI Insights</h4>
              <p className="t-caption text-gray-500">Personalized coach</p>
            </div>
          </div>

          <div
            onClick={() => navigate('/peers')}
            className="p-5 rounded-[24px] bg-white border border-purple-100 hover:border-purple-300 hover:shadow-lg transition cursor-pointer flex flex-col justify-between"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl mb-3">🤝</div>
            <div>
              <h4 className="t-h5 text-gray-900 font-bold mb-1">Community</h4>
              <p className="t-caption text-gray-500">Safe support chats</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TODAY'S WELLNESS CARDS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="t-h4 text-gray-700 font-bold flex items-center gap-2">
            <span>✨</span> Today's Wellness
          </h3>
          <button onClick={() => navigate('/insights')} className="text-sm font-bold text-purple-600 hover:underline border-none bg-transparent cursor-pointer">
            View Analytics →
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Mood Insights Card */}
          <div
            onClick={() => navigate('/insights')}
            className="p-5 rounded-[24px] bg-white border border-gray-200 shadow-sm hover:shadow-md transition cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Unread Insights</span>
              <span className="text-xl">🧠</span>
            </div>
            <div className="text-3xl font-black text-gray-900 mb-1">
              {dashData?.unread_insights_count ?? 0}
            </div>
            <p className="t-caption text-purple-600 font-semibold">Active AI feedback</p>
          </div>

          {/* Sleep Card */}
          <div
            onClick={() => navigate('/sleep')}
            className="p-5 rounded-[24px] bg-white border border-gray-200 shadow-sm hover:shadow-md transition flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Restful Sleep</span>
              <span className="text-xl">🌙</span>
            </div>
            <div className={`my-2 ${sleepStats?.has_data ? 'text-2xl font-black text-gray-900' : 'text-sm font-bold text-gray-400'}`}>
              {sleepStats?.has_data ? `🌙 ${sleepStats.formatted_latest}` : 'No sleep data'}
            </div>
            <button onClick={(e) => { e.stopPropagation(); navigate('/sleep'); }} className="text-xs font-bold text-indigo-600 hover:underline text-left border-none bg-transparent cursor-pointer">
              {sleepStats?.has_data ? `Quality: ${sleepStats.sleep_quality} · 7d avg: ${sleepStats.formatted_avg}` : '+ Log Sleep'}
            </button>
          </div>

          {/* Stress Card */}
          <div className="p-5 rounded-[24px] bg-white border border-gray-200 shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Calm Assessment</span>
              <span className="text-xl">🍃</span>
            </div>
            <div className="text-sm font-bold text-gray-400 my-2">No stress logs</div>
            <button onClick={() => navigate('/journal')} className="text-xs font-bold text-emerald-600 hover:underline text-left border-none bg-transparent cursor-pointer">
              + Check Calm
            </button>
          </div>

          {/* Energy Card */}
          <div className="p-5 rounded-[24px] bg-white border border-gray-200 shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Vitality</span>
              <span className="text-xl">⚡</span>
            </div>
            <div className="text-sm font-bold text-gray-400 my-2">No energy logs</div>
            <button onClick={() => navigate('/journal')} className="text-xs font-bold text-amber-600 hover:underline text-left border-none bg-transparent cursor-pointer">
              + Log Energy
            </button>
          </div>
        </div>
      </div>

      {/* 4. HEALING JOURNEY & PROGRESS SECTION */}
      <div className="p-8 rounded-[28px] bg-white border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-3xl mb-3">🌱</div>
        <h4 className="t-h3 font-bold text-gray-900 mb-1">Your healing journey starts today.</h4>
        <p className="t-body-md text-gray-500 max-w-md mb-4">
          Complete your first mood check-in to begin tracking your emotional patterns and visual stability trends.
        </p>
        <button
          onClick={() => navigate('/journal')}
          className="px-6 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition border-none cursor-pointer shadow-md"
        >
          Check In Now →
        </button>
      </div>

      {/* 5. AI COACH RECOMMENDATION & REFLECTION PROMPT CARD */}
      <div
        className="p-6 rounded-[28px] text-white relative overflow-hidden shadow-lg flex items-center justify-between gap-4"
        style={{ background: 'linear-gradient(135deg, #4C1D95 0%, #5B21B6 50%, #6D28D9 100%)' }}
      >
        <div className="max-w-2xl relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full bg-purple-700/60 text-purple-200 text-xs font-bold flex items-center gap-1.5">
              <span>🤖</span> AI Companion
            </span>
          </div>
          <h3 className="t-h3 text-white mb-2">Today's Reflection Prompt</h3>
          <p className="t-body-lg text-purple-100 font-medium mb-4">{getDailyPrompt()}</p>
          <button
            onClick={() => navigate('/journal')}
            className="px-5 py-2.5 rounded-xl bg-white text-purple-950 font-bold hover:bg-purple-50 transition border-none cursor-pointer inline-flex items-center gap-2 shadow-md"
          >
            <span>Write Journal</span>
            <span>→</span>
          </button>
        </div>
        <div className="text-6xl flex-shrink-0 opacity-80 hidden sm:block">💡</div>
      </div>

      {/* 6. COMMUNITY & SUPPORT SUMMARY TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div
          onClick={() => navigate('/peers')}
          className="p-6 rounded-[28px] bg-white border border-gray-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-purple-300 transition"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl flex-shrink-0">💬</div>
            <div>
              <h4 className="t-h4 font-bold text-gray-900">Active Peer Chats</h4>
              <p className="t-caption text-gray-500">Connected companions</p>
            </div>
          </div>
          <div className="text-2xl font-black text-purple-700">{dashData?.active_connections_count ?? 0}</div>
        </div>

        <div
          onClick={() => navigate('/peers')}
          className="p-6 rounded-[28px] bg-white border border-gray-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-purple-300 transition"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-2xl flex-shrink-0">📬</div>
            <div>
              <h4 className="t-h4 font-bold text-gray-900">Support Requests</h4>
              <p className="t-caption text-gray-500">Pending connection invitations</p>
            </div>
          </div>
          <div className="text-2xl font-black text-purple-700">{dashData?.pending_requests_count ?? 0}</div>
        </div>
      </div>

      {/* 7. JOURNAL LATEST REFLECTION ENTRY */}
      <div className="p-6 rounded-[28px] bg-white border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-black"
              style={{ background: 'linear-gradient(135deg,#8B5CF6,#7C3AED)' }}
            >
              {initials}
            </div>
            <div>
              <h4 className="t-h4 font-bold text-gray-900">{username}</h4>
              <p className="t-caption text-gray-400">Latest Journal Reflection</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/journal')}
            className="px-4 py-2 rounded-xl bg-purple-50 text-purple-700 font-bold text-sm hover:bg-purple-100 transition border-none cursor-pointer"
          >
            Start Journaling →
          </button>
        </div>
        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
          <p className="t-body-md text-gray-700 italic">
            {dashData?.latest_journal_preview?.content ||
              '✍️ Every journey begins with one page. Write your first reflection to unlock AI insights.'}
          </p>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
          <span>
            Total Journal Entries: <strong className="text-purple-700">{dashData?.journal_count ?? 0}</strong>
          </span>
          <span>🔒 100% Private & Encrypted</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
