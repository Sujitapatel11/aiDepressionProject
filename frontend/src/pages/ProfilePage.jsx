import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

export const ProfilePage = () => {
  const { username, logout } = useAuth();

  const [dashData, setDashData] = useState(null);
  const [customAvatar, setCustomAvatar] = useState(() => localStorage.getItem('sc_av_' + username) || '');

  useEffect(() => {
    setCustomAvatar(localStorage.getItem('sc_av_' + username) || '');

    async function loadData() {
      const res = await api('GET', '/dashboard/');
      if (res && res.ok) {
        const data = await res.json();
        setDashData(data);
      }
    }
    loadData();
  }, [username]);

  const initials = (username || '?').slice(0, 2).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto py-5 px-4 lg:py-8 lg:px-6 space-y-6 animate-fadeIn">
      {/* PERSONAL UNIVERSE PROFILE HEADER */}
      <div className="relative overflow-hidden p-6 lg:p-8 rounded-[30px] bg-gradient-to-br from-[#30224f] via-[#7354a1] to-[#d9a9d2] border border-violet-100 shadow-[0_18px_42px_-24px_rgba(91,49,145,.65)] flex flex-col sm:flex-row items-start sm:items-center gap-5 text-white">
        <div
          onClick={() => window.openAvatarPicker && window.openAvatarPicker()}
          className="w-20 h-20 lg:w-24 lg:h-24 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-lg relative cursor-pointer overflow-hidden border-2 border-white/70"
          style={{ background: customAvatar ? 'none' : 'linear-gradient(135deg,#8B5CF6,#7C3AED)' }}
        >
          {customAvatar ? (
            <img src={customAvatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span>{initials}</span>
          )}
          <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-purple-600 border-2 border-white flex items-center justify-center text-white text-xs">
            ✎
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wider">
              ✦ Your Personal Universe
            </span>
          </div>
          <h1 className="t-display text-white text-2xl lg:text-3xl font-extrabold">{username || 'User'}</h1>
          <p className="t-body-md text-white/80 italic mt-1">Your space, your story, your pace. Make this corner of SoulCare feel like yours. ✨</p>
        </div>
      </div>

      {/* YOUR JOURNEY AT A GLANCE */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
        <div className="p-5 sm:p-6 rounded-[26px] bg-white border border-violet-100 shadow-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-2xl mx-auto mb-2">
            📖
          </div>
          <div className="text-3xl font-black text-violet-700 mb-1">{dashData?.journal_count ?? 0}</div>
          <p className="t-caption text-gray-500 font-semibold">Total Journal Reflections</p>
        </div>

        <div className="p-6 rounded-[28px] bg-white border border-gray-200 shadow-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl mx-auto mb-2">
            🤝
          </div>
          <div className="text-3xl font-black text-purple-700 mb-1">{dashData?.active_connections_count ?? 0}</div>
          <p className="t-caption text-gray-500 font-semibold">Connections</p>
        </div>

        <div className="p-6 rounded-[28px] bg-white border border-gray-200 shadow-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl mx-auto mb-2">
            🤖
          </div>
          <div className="text-3xl font-black text-purple-700 mb-1">{dashData?.unread_insights_count ?? 0}</div>
          <p className="t-caption text-gray-500 font-semibold">Unread AI Insights</p>
        </div>
      </div>

      <section className="rounded-[26px] border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-violet-500">Your universe</p>
        <h2 className="mt-1 text-lg font-extrabold text-[#2b2040]">Keep exploring your spaces</h2>
        <p className="mt-1 text-xs leading-relaxed text-[#91859e]">Jump back into the parts of SoulCare that matter to you.</p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button type="button" onClick={() => window.location.assign('/world')} className="rounded-2xl bg-[#f8f4fc] p-3 text-left text-xs font-extrabold text-violet-800 transition hover:bg-violet-100">🌌 Soul World <span className="float-right">→</span></button>
          <button type="button" onClick={() => window.location.assign('/journal')} className="rounded-2xl bg-[#f8f4fc] p-3 text-left text-xs font-extrabold text-violet-800 transition hover:bg-violet-100">🌿 Journal Forest <span className="float-right">→</span></button>
          <button type="button" onClick={() => window.location.assign('/creator-studio')} className="rounded-2xl bg-[#f8f4fc] p-3 text-left text-xs font-extrabold text-violet-800 transition hover:bg-violet-100">✍️ Creator Studio <span className="float-right">→</span></button>
        </div>
      </section>

      {/* ACCOUNT & PRIVACY SANCTUARY */}
      <div className="p-6 lg:p-8 rounded-[28px] bg-white border border-violet-100 shadow-sm space-y-4">
        <h3 className="t-h4 font-bold text-[#34264b]">Account & Privacy Sanctuary</h3>
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
          <button
            onClick={() => window.openAvatarPicker && window.openAvatarPicker()}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold text-sm transition border-none cursor-pointer"
          >
            Choose Anonymous Avatar
          </button>
          <button
            onClick={logout}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-pink-50 hover:bg-pink-100 text-rose-600 font-bold text-sm transition border-none cursor-pointer"
          >
            Sign Out Securely
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
