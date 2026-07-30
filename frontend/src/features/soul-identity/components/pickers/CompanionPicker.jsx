import React from 'react';
import { useIdentityStudio } from '../../hooks/useIdentityStudio';
import { COMPANION_PRESETS } from '../../constants/companions';

export const CompanionPicker = () => {
  const { identityConfig, setIdentityConfig } = useIdentityStudio();

  const currentCompanion = identityConfig?.equipped_cosmetics?.companion || 'none';

  const selectCompanion = (companionId) => {
    setIdentityConfig(prev => ({
      ...prev,
      equipped_cosmetics: {
        ...(prev.equipped_cosmetics || {}),
        companion: companionId
      }
    }));
  };

  return (
    <div className="picker-grid">
      {COMPANION_PRESETS.map(companion => (
        <div
          key={companion.id}
          className={`picker-card ${currentCompanion === companion.id ? 'selected' : ''}`}
          onClick={() => selectCompanion(companion.id)}
        >
          <div className="picker-icon-box">{companion.icon}</div>
          <div className="picker-title">{companion.name}</div>
        </div>
      ))}
    </div>
  );
};
