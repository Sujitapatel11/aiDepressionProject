import React from 'react';
import { useNavigate } from 'react-router-dom';

export const HeroBanner = ({ username, greeting, promptText }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div>
        <p className="t-subtitle mb-1">{greeting}</p>
        <h1 className="t-h1 text-gray-900 mb-1">
          How are you feeling today, <span style={{ color: 'var(--coral-dk)' }}>{username || 'friend'}</span>?
        </h1>
        <p className="t-caption text-gray-500">Your feelings matter. Take a moment for yourself.</p>
      </div>

      {/* Streak Banner with Plant Mascot */}
      <div
        className="p-6 sm:p-8 rounded-[28px] text-white relative overflow-hidden shadow-lg flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 50%, #6D28D9 100%)' }}
      >
        <div className="relative z-10 max-w-xs">
          <p className="t-caption text-purple-200 uppercase font-bold tracking-wider mb-1">Your Sanctuary Streak</p>
          <h2 className="t-h1 text-white text-3xl mb-1">7 days 🔥</h2>
          <p className="t-caption text-purple-100 mb-4">Keep going, you're doing amazing!</p>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                ✓
              </div>
            ))}
            <div className="w-6 h-6 rounded-full bg-yellow-300 text-purple-900 flex items-center justify-center text-xs font-bold">
              ★
            </div>
          </div>
        </div>

        <div className="w-28 h-28 relative flex-shrink-0">
          <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
            <rect x="35" y="60" width="50" height="45" rx="14" fill="#DDD6FE" />
            <path d="M40 60 C40 30 55 20 60 20 C65 20 80 30 80 60 Z" fill="#34D399" />
            <path d="M60 20 C50 10 35 15 35 15 C35 15 45 35 60 20 Z" fill="#10B981" />
            <circle cx="50" cy="78" r="3" fill="#374151" />
            <circle cx="70" cy="78" r="3" fill="#374151" />
            <path d="M55 86 Q60 90 65 86" stroke="#374151" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default HeroBanner;
