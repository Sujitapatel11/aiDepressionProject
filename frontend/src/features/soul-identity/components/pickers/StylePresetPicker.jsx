import React from 'react';
import { useIdentityStudio } from '../../hooks/useIdentityStudio';
import { STYLE_PRESETS } from '../../constants/styles';

export const StylePresetPicker = () => {
  const { stylePreset, setStylePreset } = useIdentityStudio();

  return (
    <div className="picker-grid">
      {STYLE_PRESETS.map(preset => (
        <div
          key={preset.id}
          className={`picker-card ${stylePreset === preset.id ? 'selected' : ''}`}
          onClick={() => setStylePreset(preset.id)}
        >
          <div className="picker-icon-box">🎨</div>
          <div className="picker-title">{preset.name}</div>
          <div className="picker-subtitle">{preset.description}</div>
        </div>
      ))}
    </div>
  );
};
