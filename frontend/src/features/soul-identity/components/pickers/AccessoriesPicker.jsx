import React from 'react';
import { useIdentityStudio } from '../../hooks/useIdentityStudio';

const ACCESSORY_PRESETS = [
  { id: 'default', name: 'Default Frame', icon: '⭕' },
  { id: 'zen_ring', name: 'Zen Ring', icon: '💫' },
  { id: 'early_pioneer', name: 'Pioneer Badge', icon: '🏅' },
  { id: 'crown_light', name: 'Halo Crown', icon: '👑' }
];

export const AccessoriesPicker = () => {
  const { identityConfig, setIdentityConfig } = useIdentityStudio();

  const currentAcc = identityConfig?.equipped_cosmetics?.frame || 'default';

  const selectAcc = (accId) => {
    setIdentityConfig(prev => ({
      ...prev,
      equipped_cosmetics: {
        ...(prev.equipped_cosmetics || {}),
        frame: accId
      }
    }));
  };

  return (
    <div className="picker-grid">
      {ACCESSORY_PRESETS.map(acc => (
        <div
          key={acc.id}
          className={`picker-card ${currentAcc === acc.id ? 'selected' : ''}`}
          onClick={() => selectAcc(acc.id)}
        >
          <div className="picker-icon-box">{acc.icon}</div>
          <div className="picker-title">{acc.name}</div>
        </div>
      ))}
    </div>
  );
};
