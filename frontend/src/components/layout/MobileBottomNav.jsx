import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Edit3, BarChart2, MessageSquare, Moon, User } from 'lucide-react';

export const MobileBottomNav = () => {
  const items = [
    { to: '/', label: 'Today', icon: Home },
    { to: '/journal', label: 'Log', icon: Edit3 },
    { to: '/insights', label: 'Data', icon: BarChart2 },
    { to: '/support', label: 'Chat', icon: MessageSquare },
    { to: '/sleep', label: 'Sleep', icon: Moon },
    { to: '/profile', label: 'Me', icon: User },
  ];

  return (
    <nav id="bot-nav" className="fixed bottom-0 left-0 right-0 h-[68px] bg-white border-t border-gray-200 flex items-center justify-around z-40 px-2">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
                isActive ? 'text-purple-700 font-bold' : 'text-gray-400 font-medium'
              }`
            }
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;
