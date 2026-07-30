import React from 'react';
import { useIdentityStudio } from '../../hooks/useIdentityStudio';
import { BACKGROUND_PRESETS } from '../../constants/backgrounds';

export const BackgroundPicker = () => {
  const { identityConfig, setIdentityConfig } = useIdentityStudio();

  const currentBg = identityConfig?.background_color || 'transparent';

  const selectBg = (hex) => {
    setIdentityConfig(prev => ({
      ...prev,
      background_color: hex
    }));
  };

  return (
    <div className="picker-grid">
      {BACKGROUND_PRESETS.map(bg => (
        <div
          key={bg.id}
          className={`picker-card ${currentBg === bg.hex ? 'selected' : ''}`}
          onClick={() => selectBg(bg.hex)}
        >
          <div
            className="picker-icon-box border border-gray-200"
            style={{ background: bg.hex === 'transparent' ? '#F3F0F9' : `#${bg.hex}` }}
          >
            🖼️
          </div>
          <div className="picker-title">{bg.name}</div>
        </div>
      ))}
    </div>
  );
};
