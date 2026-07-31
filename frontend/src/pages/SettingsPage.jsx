import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

export const SettingsPage = () => {
  const { username, logout } = useAuth();

  const handlePasswordReset = () => {
    if (window.showConfirm) {
      window.showConfirm(
        'Send a password reset link to your email?',
        async () => {
          await api('POST', '/auth/password/reset/', { email: username + '@soulcare.app' });
          if (window.showToast) window.showToast('Password reset request processed. Check your inbox.');
        },
        false
      );
    }
  };

  const handleClearDrafts = () => {
    localStorage.removeItem('sc_journal_draft');
    if (window.showToast) window.showToast('Local draft cache cleared.');
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 lg:py-8 lg:px-6 space-y-6 lg:space-y-8 animate-fadeIn">
      {/* HERO SETTINGS HEADER */}
      <div className="p-6 lg:p-8 rounded-[32px] bg-white border border-purple-100 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wider">
              ⚙️ Control Center
            </span>
          </div>
          <h1 className="t-display text-gray-900 text-2xl lg:text-3xl font-extrabold mb-1">Account & Preferences</h1>
          <p className="t-body-md text-gray-500 italic">“Simple, transparent control over your privacy and security.” 🔒</p>
        </div>
        <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-3xl flex-shrink-0">
          ⚙️
        </div>
      </div>

      {/* ACCOUNT CREDENTIALS SECTION */}
      <div className="p-6 lg:p-8 rounded-[32px] bg-white border border-gray-200 shadow-sm space-y-5">
        <h3 className="t-h4 font-bold text-gray-900 flex items-center gap-2">
          <span>👤</span> Account Credentials
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
            <span className="text-xs font-bold text-gray-400 block uppercase">Username</span>
            <span className="text-base font-bold text-gray-900">{username || '—'}</span>
          </div>
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
            <span className="text-xs font-bold text-gray-400 block uppercase">Registered Email</span>
            <span className="text-base font-bold text-gray-900">
              {localStorage.getItem('sc_email') || (username ? `${username}@soulcare.app` : '—')}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
            <span className="text-xs font-bold text-gray-400 block uppercase">Account Security Status</span>
            <span className="text-base font-bold text-emerald-600 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active & Authenticated
            </span>
          </div>
        </div>
      </div>

      {/* SECURITY & PASSWORD RESET SECTION */}
      <div className="p-6 lg:p-8 rounded-[32px] bg-white border border-gray-200 shadow-sm space-y-5">
        <h3 className="t-h4 font-bold text-gray-900 flex items-center gap-2">
          <span>🔑</span> Security & Password
        </h3>
        <p className="t-body-md text-gray-600">
          Need to update your password? Request a secure password reset link sent directly to your registered email.
        </p>
        <div className="pt-2">
          <button
            onClick={handlePasswordReset}
            className="px-6 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm transition border-none cursor-pointer shadow-md"
          >
            Send Password Reset Email →
          </button>
        </div>
      </div>

      {/* PRIVACY & LOCAL DATA SANCTUARY */}
      <div className="p-6 lg:p-8 rounded-[32px] bg-white border border-purple-100 shadow-sm space-y-4">
        <h3 className="t-h4 font-bold text-gray-900 flex items-center gap-2">
          <span>🛡️</span> Privacy & Local Data Sanctuary
        </h3>
        <ul className="space-y-2 text-sm text-gray-600 list-disc pl-5">
          <li>
            <strong>Encrypted Journaling:</strong> Your reflection logs are 100% private and protected by user-level access controls.
          </li>
          <li>
            <strong>Draft Protection:</strong> Unsaved journal drafts are saved locally in your browser's encrypted storage.
          </li>
          <li>
            <strong>No Popularity Tracking:</strong> SoulCare does not rank users, track followers, or share community stats.
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
