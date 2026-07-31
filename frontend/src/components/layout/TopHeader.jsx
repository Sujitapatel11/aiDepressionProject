import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../common/Avatar';

export const TopHeader = ({ title = 'SoulCare', showNotifications = true }) => {
  const { username } = useAuth();

  return (
    <div className="top-bar flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-200 sticky top-0 z-30">
      <h1 className="t-h3" style={{ color: 'var(--coral-dk)' }}>{title}</h1>
      <div className="flex items-center gap-3">
        {showNotifications && (
          <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 relative border-none cursor-pointer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <div className="w-2 h-2 rounded-full bg-purple-600 absolute top-1.5 right-1.5 border border-white"></div>
          </button>
        )}
        <Link to="/profile">
          <Avatar name={username} className="w-9 h-9 text-xs" />
        </Link>
      </div>
    </div>
  );
};

export default TopHeader;
