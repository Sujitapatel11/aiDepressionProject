import React from 'react';
import { useIdentityStudio } from '../hooks/useIdentityStudio';

const CATEGORIES = [
  { id: 'styles', label: 'Style Presets', icon: '🎭' },
  { id: 'auras', label: 'Aura Glow', icon: '🔮' },
  { id: 'backgrounds', label: 'Background', icon: '🎨' },
  { id: 'companions', label: 'Companion', icon: '🐾' },
  { id: 'expressions', label: 'Expressions', icon: '😊' },
  { id: 'accessories', label: 'Accessories', icon: '👑' }
];

export const CategoryTabNavigator = () => {
  const { activeCategory, setActiveCategory } = useIdentityStudio();

  return (
    <div className="category-nav-bar" role="tablist">
      {CATEGORIES.map(cat => (
        <button
          key={cat.id}
          role="tab"
          aria-selected={activeCategory === cat.id}
          className={`category-tab-btn ${activeCategory === cat.id ? 'active' : ''}`}
          onClick={() => setActiveCategory(cat.id)}
        >
          <span>{cat.icon}</span>
          <span>{cat.label}</span>
        </button>
      ))}
    </div>
  );
};
