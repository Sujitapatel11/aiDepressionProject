import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

// ─── SettingsPage ─────────────────────────────────────────────────────────────
// Email is fetched fresh from GET /api/auth/me/ on every mount using the
// authenticated user's JWT. Never reads from localStorage or a stale context
// value — those sources don't store email at all (confirmed: setAuthData()
// never writes sc_email).
// ─────────────────────────────────────────────────────────────────────────────

export const SettingsPage = () => {
  const { username, logout } = useAuth();

  // ── Profile state ──────────────────────────────────────────────────────────
  const [email,       setEmail]       = useState('');
  const [loadingMe,   setLoadingMe]   = useState(true);
  const [meError,     setMeError]     = useState('');

  // ── Password reset state ───────────────────────────────────────────────────
  const [resetPending,  setResetPending]  = useState(false);
  const [resetMsg,      setResetMsg]      = useState('');

  // ── Fetch /api/auth/me/ ────────────────────────────────────────────────────
  const fetchMe = useCallback(async () => {
    setLoadingMe(true);
    setMeError('');
    try {
      const res = await api('GET', '/auth/me/');
      if (!res) {
        // api() already handled 401 → redirect; null means network/auth failure
        setMeError('Session expired. Please log in again.');
        return;
      }
      if (res.status === 403) {
        setMeError('Access denied. You do not have permission to view this page.');
        return;
      }
      if (res.status >= 500) {
        setMeError('Server error. Please try again later.');
        return;
      }
      if (!res.ok) {
        setMeError(`Unexpected error (${res.status}). Please try again.`);
        return;
      }
      const data = await res.json();
      setEmail(data.email || '');
    } catch {
      setMeError('Network error. Check your connection and try again.');
    } finally {
      setLoadingMe(false);
    }
  }, []);

  // Fetch on every mount — no caching, always fresh from the server
  useEffect(() => { fetchMe(); }, [fetchMe]);

  // ── Password reset ─────────────────────────────────────────────────────────
  const handlePasswordReset = async () => {
    if (!email) {
      setResetMsg('Cannot send reset email — email address not loaded yet.');
      return;
    }
    if (resetPending) return;           // prevent double-submit
    setResetPending(true);
    setResetMsg('');
    try {
      const res = await api('POST', '/auth/password/reset/', { email });
      if (res && res.ok) {
        setResetMsg('Password reset link sent. Check your inbox.');
      } else {
        setResetMsg('Could not send reset email. Please try again.');
      }
    } catch {
      setResetMsg('Network error. Please try again.');
    } finally {
      setResetPending(false);
    }
  };

  // ── Clear local draft cache ────────────────────────────────────────────────
  const handleClearDrafts = () => {
    localStorage.removeItem('sc_journal_draft');
    if (window.showToast) window.showToast('Local draft cache cleared.');
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────
  const CredentialSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 animate-pulse">
      {[0, 1, 2].map(i => (
        <div key={i} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
          <div className="h-3 w-20 rounded bg-gray-200" />
          <div className="h-5 w-32 rounded bg-gray-300" />
        </div>
      ))}
    </div>
  );

  // ── Error banner with retry ────────────────────────────────────────────────
  const ErrorBanner = () => (
    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-4">
      <span className="text-sm text-rose-700 font-medium">{meError}</span>
      <button
        onClick={fetchMe}
        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex-shrink-0"
      >
        Retry
      </button>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto py-6 px-4 lg:py-8 lg:px-6 space-y-6 lg:space-y-8 animate-fadeIn">

      {/* HERO HEADER */}
      <div className="p-6 lg:p-8 rounded-[32px] bg-white border border-purple-100 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wider">
              ⚙️ Control Center
            </span>
          </div>
          <h1 className="t-display text-gray-900 text-2xl lg:text-3xl font-extrabold mb-1">
            Account & Preferences
          </h1>
          <p className="t-body-md text-gray-500 italic">
            "Simple, transparent control over your privacy and security." 🔒
          </p>
        </div>
        <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-3xl flex-shrink-0">
          ⚙️
        </div>
      </div>

      {/* ACCOUNT CREDENTIALS */}
      <div className="p-6 lg:p-8 rounded-[32px] bg-white border border-gray-200 shadow-sm space-y-5">
        <h3 className="t-h4 font-bold text-gray-900 flex items-center gap-2">
          <span>👤</span> Account Credentials
        </h3>

        {loadingMe ? (
          <CredentialSkeleton />
        ) : meError ? (
          <ErrorBanner />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {/* Username */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <span className="text-xs font-bold text-gray-400 block uppercase mb-1">
                Username
              </span>
              <span className="text-base font-bold text-gray-900">
                {username || '—'}
              </span>
            </div>

            {/* Email — live from /api/auth/me/, read-only */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <span className="text-xs font-bold text-gray-400 block uppercase mb-1">
                Registered Email
              </span>
              <span
                className="text-base font-bold text-gray-900 break-all"
                title="Your registered email address"
              >
                {email || '—'}
              </span>
              <span className="text-xs text-gray-400 mt-1 block">Read-only</span>
            </div>

            {/* Security status */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <span className="text-xs font-bold text-gray-400 block uppercase mb-1">
                Account Security Status
              </span>
              <span className="text-base font-bold text-emerald-600 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                Active & Authenticated
              </span>
            </div>
          </div>
        )}
      </div>

      {/* SECURITY & PASSWORD RESET */}
      <div className="p-6 lg:p-8 rounded-[32px] bg-white border border-gray-200 shadow-sm space-y-5">
        <h3 className="t-h4 font-bold text-gray-900 flex items-center gap-2">
          <span>🔑</span> Security & Password
        </h3>
        <p className="t-body-md text-gray-600">
          Need to update your password? Request a secure password reset link sent
          directly to your registered email.
        </p>
        <div className="pt-2 space-y-3">
          <button
            onClick={handlePasswordReset}
            disabled={resetPending || loadingMe || Boolean(meError)}
            className="px-6 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition border-none cursor-pointer shadow-md"
          >
            {resetPending ? 'Sending…' : 'Send Password Reset Email →'}
          </button>
          {resetMsg && (
            <p className={`text-sm font-medium ${resetMsg.includes('sent') ? 'text-emerald-600' : 'text-rose-600'}`}>
              {resetMsg}
            </p>
          )}
        </div>
      </div>

      {/* PRIVACY & LOCAL DATA */}
      <div className="p-6 lg:p-8 rounded-[32px] bg-white border border-purple-100 shadow-sm space-y-4">
        <h3 className="t-h4 font-bold text-gray-900 flex items-center gap-2">
          <span>🛡️</span> Privacy & Local Data Sanctuary
        </h3>
        <ul className="space-y-2 text-sm text-gray-600 list-disc pl-5">
          <li>
            <strong>Encrypted Journaling:</strong> Your reflection logs are 100% private
            and protected by user-level access controls.
          </li>
          <li>
            <strong>Draft Protection:</strong> Unsaved journal drafts are saved locally
            in your browser's encrypted storage.
          </li>
          <li>
            <strong>No Popularity Tracking:</strong> SoulCare does not rank users, track
            followers, or share community stats.
          </li>
        </ul>
        <div className="pt-3 flex flex-wrap gap-4">
          <button
            onClick={handleClearDrafts}
            className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition border-none cursor-pointer"
          >
            Clear Local Draft Cache
          </button>
          <button
            onClick={logout}
            className="px-5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition border-none cursor-pointer"
          >
            Sign Out Account
          </button>
        </div>
      </div>

    </div>
  );
};

export default SettingsPage;
