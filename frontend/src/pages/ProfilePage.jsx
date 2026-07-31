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
    <div className="max-w-5xl mx-auto py-6 px-4 lg:py-8 lg:px-6 space-y-6 lg:space-y-8 animate-fadeIn">
      {/* HERO PROFILE HEADER */}
      <div className="p-6 lg:p-8 rounded-[32px] bg-white border border-purple-100 shadow-sm flex items-center gap-6">
        <div
          onClick={() => window.openAvatarPicker && window.openAvatarPicker()}
          className="w-20 h-20 lg:w-24 lg:h-24 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-lg relative cursor-pointer overflow-hidden border-2 border-purple-200"
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
              🌱 Personal Journey
            </span>
          </div>
          <h1 className="t-display text-gray-900 text-2xl lg:text-3xl font-extrabold">{username || 'User'}</h1>
          <p className="t-body-md text-gray-500 italic mt-1">“Your wellness journey continues one day at a time.” 🌸</p>
        </div>
      </div>

      {/* SUMMARY STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-6 rounded-[28px] bg-white border border-gray-200 shadow-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-2xl mx-auto mb-2">
            📖
          </div>
          <div className="text-3xl font-black text-purple-700 mb-1">{dashData?.journal_count ?? 0}</div>
          <p className="t-caption text-gray-500 font-semibold">Total Journal Reflections</p>
        </div>

        <div className="p-6 rounded-[28px] bg-white border border-gray-200 shadow-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl mx-auto mb-2">
            🤝
          </div>
          <div className="text-3xl font-black text-purple-700 mb-1">{dashData?.active_connections_count ?? 0}</div>
          <p className="t-caption text-gray-500 font-semibold">Support Connections</p>
        </div>

        <div className="p-6 rounded-[28px] bg-white border border-gray-200 shadow-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl mx-auto mb-2">
            🤖
          </div>
          <div className="text-3xl font-black text-purple-700 mb-1">{dashData?.unread_insights_count ?? 0}</div>
          <p className="t-caption text-gray-500 font-semibold">AI Reflections Received</p>
        </div>
      </div>

      {/* ACCOUNT & CUSTOMIZATION ACTIONS */}
      <div className="p-6 lg:p-8 rounded-[32px] bg-white border border-gray-200 shadow-sm space-y-4">
        <h3 className="t-h4 font-bold text-gray-900">Account & Privacy Sanctuary</h3>
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
          <button
            onClick={() => window.openAvatarPicker && window.openAvatarPicker()}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-sm transition border-none cursor-pointer"
          >
            Choose Anonymous Avatar
          </button>
          <button
            onClick={logout}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-sm transition border-none cursor-pointer"
          >
            Sign Out Securely
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
