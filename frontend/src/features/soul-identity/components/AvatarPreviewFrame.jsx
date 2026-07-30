import React from 'react';
import { useIdentityStudio } from '../hooks/useIdentityStudio';
import { AURA_PRESETS } from '../constants/auras';

export const AvatarPreviewFrame = () => {
  const { currentAvatarUrl, identityConfig, isLoading } = useIdentityStudio();

  const auraId = identityConfig?.equipped_cosmetics?.aura || 'none';
  const selectedAura = AURA_PRESETS.find(a => a.id === auraId) || AURA_PRESETS[0];
  const auraClass = selectedAura.cssClass || 'aura-none';

  return (
    <div className="text-center mb-6">
      <div className={`aura-frame-wrapper ${auraClass}`}>
        <div className="avatar-circular-frame">
          {isLoading ? (
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          ) : (
            <img
              src={currentAvatarUrl}
              alt="Soul Identity Preview"
              className="avatar-preview-img"
              loading="eager"
            />
          )}
        </div>
      </div>
      <h2 className="text-xl font-bold text-gray-800 font-heading">Soul Identity Studio</h2>
      <p className="text-xs text-gray-500 mt-1">Craft your visual identity across SoulCare</p>
    </div>
  );
};
