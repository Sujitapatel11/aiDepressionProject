import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Smile, MessageSquare, Moon, User, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../common/Avatar';

export const DesktopSidebar = ({ pendingRequestsCount = 0 }) => {
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Today', icon: LayoutDashboard },
    { to: '/journal', label: 'Journal', icon: BookOpen },
    { to: '/insights', label: 'Insights', icon: Smile },
    { to: '/support', label: 'Messages', icon: MessageSquare, badge: pendingRequestsCount },
    { to: '/sleep', label: 'Sleep Tracker', icon: Moon },
  ];

  return (
    <aside id="sidebar" className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between h-screen sticky top-0 flex-shrink-0 z-20">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-black text-xl shadow-inner">
            🌸
          </div>
          <div>
            <h1 className="t-h3" style={{ color: 'var(--coral-dk)' }}>SoulCare</h1>
            <p className="t-caption">Peer Sanctuary</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-4 py-3 rounded-2xl font-semibold text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-purple-50 text-purple-700 font-bold border border-purple-100 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
                {Boolean(item.badge) && item.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white font-bold text-xs">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Profile & Logout Bottom Bar */}
      <div className="p-4 border-t border-gray-100 space-y-2">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex items-center justify-between p-3 rounded-2xl transition-all ${
              isActive ? 'bg-purple-50 border border-purple-100' : 'hover:bg-gray-50'
            }`
          }
        >
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={username} className="w-9 h-9 text-xs" />
            <div className="min-w-0 flex-1">
              <p className="t-h5 truncate text-gray-900">{username || 'Guest'}</p>
              <p className="t-caption truncate">View Sanctuary Profile</p>
            </div>
          </div>
        </NavLink>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs transition border-none bg-transparent cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
