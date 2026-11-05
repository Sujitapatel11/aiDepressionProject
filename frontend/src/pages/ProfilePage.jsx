import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import PublicProfileEditor from '../components/profile/PublicProfileEditor';

const creatorUsernameFromAccount = (value) => {
  const username = (value || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);
  return username.length >= 3 ? username : 'creator';
};

export const ProfilePage = () => {
  const { username, logout } = useAuth();

  const [dashData, setDashData] = useState(null);
  const [customAvatar, setCustomAvatar] = useState(() => localStorage.getItem('sc_av_' + username) || '');
  const [creatorProfile, setCreatorProfile] = useState(null);
  const [creatorLoading, setCreatorLoading] = useState(true);
  const [creatorSaving, setCreatorSaving] = useState(false);
  const [creatorError, setCreatorError] = useState('');
  const [creatorNotice, setCreatorNotice] = useState('');
  const [creatorForm, setCreatorForm] = useState({
    username: creatorUsernameFromAccount(username),
    display_name: username || '',
    bio: '',
    avatar: '',
    cover_image: '',
  });

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

  useEffect(() => {
    let active = true;

    const loadCreatorProfile = async () => {
      setCreatorLoading(true);
      const response = await api('GET', '/creators/me/');
      if (!active) return;

      if (response && response.ok) {
        try {
          const profile = await response.json();
          if (!active) return;
          setCreatorProfile(profile);
          setCreatorForm({
            username: profile.username || creatorUsernameFromAccount(username),
            display_name: profile.display_name || username || '',
            bio: profile.bio || '',
            avatar: profile.avatar || '',
            cover_image: profile.cover_image || '',
          });
        } catch (error) {
          setCreatorError('Creator profile could not be read. Try again.');
        }
      } else if (response?.status === 404) {
        setCreatorProfile(null);
        setCreatorForm((current) => ({
          ...current,
          username: creatorUsernameFromAccount(username),
          display_name: username || '',
        }));
      } else if (response) {
        setCreatorError('Creator profile could not be loaded. Try again.');
      }
      if (active) setCreatorLoading(false);
    };

    loadCreatorProfile();
    return () => { active = false; };
  }, [username]);

  const handleCreatorFieldChange = (event) => {
    const { name, value } = event.target;
    setCreatorForm((current) => ({ ...current, [name]: value }));
  };

  const saveCreatorProfile = async (event) => {
    event.preventDefault();
    setCreatorSaving(true);
    setCreatorError('');
    setCreatorNotice('');

    try {
      const path = creatorProfile ? '/creators/me/' : '/creators/activate/';
      const method = creatorProfile ? 'PATCH' : 'POST';
      const response = await api(method, path, creatorForm);
      if (!response) {
        setCreatorError('Creator service could not be reached. Please try again.');
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        const usernameError = Array.isArray(data.username) ? data.username[0] : '';
        setCreatorError(usernameError || data.detail || 'Creator profile could not be saved.');
        return;
      }

      setCreatorProfile(data);
      setCreatorForm({
        username: data.username,
        display_name: data.display_name,
        bio: data.bio || '',
        avatar: data.avatar || '',
        cover_image: data.cover_image || '',
      });
      setCreatorNotice(creatorProfile ? 'Creator profile updated.' : 'Creator Mode is active.');
    } catch (error) {
      setCreatorError('Creator profile response could not be read. Please try again.');
    } finally {
      setCreatorSaving(false);
    }
  };

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

      {/* PUBLIC PROFILE EDITOR */}
      <PublicProfileEditor fallbackAvatar={customAvatar} username={username} />

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

      <section className="overflow-hidden rounded-[26px] border border-violet-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-violet-50 p-5 sm:p-6">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-violet-500">Creator Mode</p>
            <h2 className="mt-1 text-lg font-extrabold text-[#2b2040]">
              {creatorProfile ? 'Your creator profile' : 'Make a public creator profile'}
            </h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-[#91859e]">
              {creatorProfile
                ? 'Your creator profile is linked to this SoulCare account.'
                : 'Activate instantly with your existing account. Your login and private profile stay unchanged.'}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold ${creatorProfile?.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-violet-50 text-violet-700'}`}>
            {creatorLoading ? 'Checking…' : creatorProfile?.is_active ? 'Active' : 'Not active'}
          </span>
        </div>

        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.2fr_.8fr]">
          <form onSubmit={saveCreatorProfile} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-bold text-[#5b4b6c]">
                Public username
                <input
                  name="username"
                  value={creatorForm.username}
                  onChange={handleCreatorFieldChange}
                  minLength={3}
                  maxLength={30}
                  pattern="[A-Za-z0-9_]{3,30}"
                  autoComplete="off"
                  required
                  className="mt-2 w-full rounded-xl border border-violet-100 bg-[#fbf9fd] px-3 py-2.5 text-sm font-medium text-[#302441] outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </label>
              <label className="block text-xs font-bold text-[#5b4b6c]">
                Display name
                <input
                  name="display_name"
                  value={creatorForm.display_name}
                  onChange={handleCreatorFieldChange}
                  maxLength={80}
                  required
                  className="mt-2 w-full rounded-xl border border-violet-100 bg-[#fbf9fd] px-3 py-2.5 text-sm font-medium text-[#302441] outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </label>
            </div>
            <label className="block text-xs font-bold text-[#5b4b6c]">
              Bio
              <textarea
                name="bio"
                value={creatorForm.bio}
                onChange={handleCreatorFieldChange}
                maxLength={500}
                rows={3}
                className="mt-2 w-full resize-y rounded-xl border border-violet-100 bg-[#fbf9fd] px-3 py-2.5 text-sm font-medium text-[#302441] outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-bold text-[#5b4b6c]">
                Avatar image URL
                <input
                  type="url"
                  name="avatar"
                  value={creatorForm.avatar}
                  onChange={handleCreatorFieldChange}
                  maxLength={1024}
                  placeholder="https://…"
                  className="mt-2 w-full rounded-xl border border-violet-100 bg-[#fbf9fd] px-3 py-2.5 text-sm font-medium text-[#302441] outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </label>
              <label className="block text-xs font-bold text-[#5b4b6c]">
                Cover image URL
                <input
                  type="url"
                  name="cover_image"
                  value={creatorForm.cover_image}
                  onChange={handleCreatorFieldChange}
                  maxLength={1024}
                  placeholder="https://…"
                  className="mt-2 w-full rounded-xl border border-violet-100 bg-[#fbf9fd] px-3 py-2.5 text-sm font-medium text-[#302441] outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </label>
            </div>
            {creatorError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700" role="alert">{creatorError}</p>}
            {creatorNotice && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700" role="status">{creatorNotice}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-violet-50 pt-4">
              <p className="text-[11px] text-[#91859e]">
                Monetization: {creatorProfile?.monetization_status || 'not_eligible'}
              </p>
              <button
                type="submit"
                disabled={creatorLoading || creatorSaving}
                className="rounded-xl bg-violet-700 px-5 py-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatorSaving ? 'Saving…' : creatorProfile ? 'Save creator profile' : 'Activate Creator Mode'}
              </button>
            </div>
          </form>

          <aside className="overflow-hidden rounded-2xl border border-violet-100 bg-[#fbf9fd]">
            {creatorForm.cover_image ? (
              <img src={creatorForm.cover_image} alt="Creator cover preview" className="h-28 w-full object-cover" />
            ) : (
              <div className="h-28 bg-gradient-to-r from-[#e7dff4] via-[#f2e7f2] to-[#f7e5ed]" />
            )}
            <div className="p-4">
              <div className="flex items-center gap-3">
                {creatorForm.avatar ? (
                  <img src={creatorForm.avatar} alt="Creator avatar preview" className="h-12 w-12 rounded-full border-2 border-white object-cover shadow-sm" />
                ) : (
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-violet-700 text-sm font-extrabold text-white">
                    {(creatorForm.display_name || creatorForm.username || '?').slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-[#34264b]">{creatorForm.display_name || 'Display name'}</p>
                  <p className="truncate text-xs text-violet-600">@{creatorForm.username || 'username'}</p>
                </div>
              </div>
              <p className="mt-3 min-h-10 whitespace-pre-wrap text-xs leading-relaxed text-[#796d8a]">
                {creatorForm.bio || 'Your creator bio will appear here.'}
              </p>
            </div>
          </aside>
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
