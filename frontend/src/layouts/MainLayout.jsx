import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Toast from '../components/common/Toast';
import ConfirmModal from '../components/common/ConfirmModal';
import AvatarPickerModal from '../components/common/AvatarPickerModal';

export const MainLayout = () => {
  const { username, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Toast state
  const [toast, setToast] = useState({ message: '', visible: false });

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    message: '',
    danger: false,
    onConfirm: null,
    loading: false,
  });

  // Avatar Picker Modal state
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [customAvatar, setCustomAvatar] = useState(() => localStorage.getItem('sc_av_' + username) || '');

  useEffect(() => {
    setCustomAvatar(localStorage.getItem('sc_av_' + username) || '');
  }, [username]);

  // Global helper functions exposed for child views if needed
  window.showToast = (msg) => {
    setToast({ message: msg, visible: true });
    setTimeout(() => {
      setToast({ message: '', visible: false });
    }, 3000);
  };

  window.showConfirm = (msg, callback, danger = false) => {
    setConfirmModal({
      isOpen: true,
      message: msg,
      danger,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, loading: true }));
        try {
          await callback();
        } finally {
          setConfirmModal({ isOpen: false, message: '', danger: false, onConfirm: null, loading: false });
        }
      },
      loading: false,
    });
  };

  window.openAvatarPicker = () => setIsAvatarOpen(true);

  const handleSelectAvatar = (src, label) => {
    localStorage.setItem('sc_av_' + username, src);
    setCustomAvatar(src);
    setIsAvatarOpen(false);
    window.showToast(`Avatar updated — ${label}`);
  };

  const currentTab = location.pathname === '/' ? 'dashboard' : location.pathname.substring(1);

  const initials = (username || '?').slice(0, 2).toUpperCase();

  const isChatRoute = location.pathname.startsWith('/chat');

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8FE] text-[#1F2937]">
      {/* Toast Notification */}
      <Toast message={toast.message} visible={toast.visible} />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        danger={confirmModal.danger}
        loading={confirmModal.loading}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal({ isOpen: false, message: '', danger: false, onConfirm: null, loading: false })}
      />

      {/* Avatar Picker Modal */}
      <AvatarPickerModal
        isOpen={isAvatarOpen}
        currentAvatar={customAvatar}
        onSelect={handleSelectAvatar}
        onClose={() => setIsAvatarOpen(false)}
      />

      {/* ── DESKTOP SHELL (hidden on mobile) ── */}
      <div id="desk" className="hidden lg:flex h-screen overflow-hidden bg-[#FAF8FE]">
        {/* Sidebar */}
        <aside id="sidebar" className="w-[260px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col py-3">
          {/* Logo Header */}
          <div className="px-6 py-6 mb-2 flex items-center gap-3">
            <div className="relative w-9 h-9 flex-shrink-0">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <circle cx="18" cy="18" r="16" stroke="#EDE9FE" strokeWidth="4" />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  stroke="var(--coral)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="100.53"
                  strokeDashoffset="28"
                  transform="rotate(-90 18 18)"
                />
              </svg>
            </div>
            <h1 className="t-h3 text-gray-900 font-bold">SoulCare</h1>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 px-3 space-y-1" id="sidebar-nav">
            <Link
              to="/"
              className={`snav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth="1.8" />
                <path d="M12 8v4l3 3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
              </svg>
              <span>Home</span>
            </Link>

            <Link
              to="/journal"
              className={`snav-item ${currentTab === 'journal' ? 'active' : ''}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Journal</span>
            </Link>

            <Link
              to="/insights"
              className={`snav-item ${currentTab === 'insights' ? 'active' : ''}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Insights</span>
            </Link>

            <Link
              to="/peers"
              className={`snav-item ${currentTab === 'peers' || currentTab === 'support' ? 'active' : ''}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Messages</span>
            </Link>

            <Link
              to="/community"
              className={`snav-item ${currentTab === 'community' ? 'active' : ''}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Community</span>
            </Link>

            <Link
              to="/sleep"
              className={`snav-item ${currentTab === 'sleep' ? 'active' : ''}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <span>Sleep</span>
            </Link>

            <Link
              to="/profile"
              className={`snav-item ${currentTab === 'profile' ? 'active' : ''}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Profile</span>
            </Link>

            <Link
              to="/settings"
              className={`snav-item ${currentTab === 'settings' ? 'active' : ''}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
              <span>Settings</span>
            </Link>

            <Link
              to="/beta-admin"
              className={`snav-item ${currentTab === 'beta-admin' ? 'active' : ''}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Beta Admin</span>
            </Link>
          </div>

          {/* User Signout Footer */}
          <div className="px-3 py-4 border-t border-gray-200">
            <div
              onClick={logout}
              className="snav-item cursor-pointer text-gray-700 hover:text-rose-600 hover:bg-rose-50 m-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span id="desk-username" className="truncate flex-1 t-body-sm font-semibold">
                {username}
              </span>
            </div>
          </div>
        </aside>

        {/* Main View Area */}
        <div id="desk-main" className="flex-1 overflow-hidden flex flex-col">
          <div id="desk-content" className="flex-1 overflow-y-auto bg-[#FAF8FE]">
            <Outlet />
          </div>
        </div>
      </div>

      {/* ── MOBILE SHELL (hidden on desktop) ── */}
      <div id="mob" className="flex lg:hidden flex-col h-[100dvh] overflow-hidden bg-[#FAF8FE]">
        <div id="mob-content" className="flex-1 overflow-y-auto">
          <Outlet />
        </div>

        {/* Bottom Mobile Navigation */}
        {!isChatRoute && (
          <nav id="bot-nav" className="flex-shrink-0 bg-white border-t border-gray-200 flex h-[68px] shadow-lg">
            <Link
              to="/"
              className={`nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth="1.8" />
                <path d="M12 8v4l3 3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
              </svg>
              <span className="nav-label">Home</span>
            </Link>

            <Link
              to="/journal"
              className={`nav-item ${currentTab === 'journal' ? 'active' : ''}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="nav-label">Journal</span>
            </Link>

            <Link
              to="/insights"
              className={`nav-item ${currentTab === 'insights' ? 'active' : ''}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="nav-label">Insights</span>
            </Link>

            <Link
              to="/peers"
              className={`nav-item ${currentTab === 'peers' || currentTab === 'support' ? 'active' : ''}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="nav-label">Messages</span>
            </Link>

            <Link
              to="/community"
              className={`nav-item ${currentTab === 'community' ? 'active' : ''}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="nav-label">Community</span>
            </Link>

            <Link
              to="/profile"
              className={`nav-item ${currentTab === 'profile' || currentTab === 'settings' ? 'active' : ''}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="nav-label">Profile</span>
            </Link>
          </nav>
        )}
      </div>
    </div>
  );
};

export default MainLayout;
