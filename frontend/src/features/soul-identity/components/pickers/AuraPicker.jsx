import React from 'react';
import { useIdentityStudio } from '../../hooks/useIdentityStudio';
import { AURA_PRESETS } from '../../constants/auras';

export const AuraPicker = () => {
  const { identityConfig, setIdentityConfig } = useIdentityStudio();

  const currentAura = identityConfig?.equipped_cosmetics?.aura || 'none';

  const selectAura = (auraId) => {
    setIdentityConfig(prev => ({
      ...prev,
      equipped_cosmetics: {
        ...(prev.equipped_cosmetics || {}),
        aura: auraId
      }
    }));
  };

  return (
    <div className="picker-grid">
      {AURA_PRESETS.map(aura => (
        <div
          key={aura.id}
          className={`picker-card ${currentAura === aura.id ? 'selected' : ''}`}
          onClick={() => selectAura(aura.id)}
        >
          <div
            className="picker-icon-box"
            style={{ background: aura.color + '22', color: aura.color }}
          >
            🔮
          </div>
          <div className="picker-title">{aura.name}</div>
        </div>
      ))}
    </div>
  );
};
