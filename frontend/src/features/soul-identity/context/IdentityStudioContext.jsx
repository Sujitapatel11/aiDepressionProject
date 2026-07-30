import React, { createContext, useState, useEffect } from 'react';
import { fetchMyIdentity, updateMyIdentity } from '../api/identityApi';
import { buildAvatarUrl } from '../services/avatarBuilder';
import { STYLE_PRESETS } from '../constants/styles';
import { AURA_PRESETS } from '../constants/auras';
import { BACKGROUND_PRESETS } from '../constants/backgrounds';

export const IdentityStudioContext = createContext(null);

export const IdentityStudioProvider = ({ children }) => {
  const [avatarProvider, setAvatarProvider] = useState('dicebear');
  const [stylePreset, setStylePreset] = useState('bottts');
  const [seedKey, setSeedKey] = useState('soulcare_user');
  const [identityConfig, setIdentityConfig] = useState({
    background_color: 'transparent',
    equipped_cosmetics: {
      aura: 'golden_glow',
      companion: 'none',
      badge: 'soul_member',
      theme: 'soft_lavender'
    }
  });

  const [activeCategory, setActiveCategory] = useState('styles');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Load initial identity from API on mount
  useEffect(() => {
    let isMounted = true;
    const loadIdentity = async () => {
      try {
        setIsLoading(true);
        const data = await fetchMyIdentity();
        if (isMounted && data) {
          if (data.avatar_provider) setAvatarProvider(data.avatar_provider);
          if (data.style_preset) setStylePreset(data.style_preset);
          if (data.identity_config) setIdentityConfig(data.identity_config);
          setError(null);
        }
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadIdentity();
    return () => { isMounted = false; };
  }, []);

  // Pure dynamic avatar URL construction via avatarBuilder service
  const currentAvatarUrl = buildAvatarUrl({
    style_preset: stylePreset,
    seed_key: seedKey,
    identity_config: identityConfig
  });

  // Action: Save Identity
  const saveIdentity = async () => {
    try {
      setIsSaving(true);
      setError(null);
      await updateMyIdentity({
        style_preset: stylePreset,
        avatar_provider: avatarProvider,
        identity_config: identityConfig
      });
      setToastMessage('Soul Identity updated successfully!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save identity');
    } finally {
      setIsSaving(false);
    }
  };

  // Action: Randomize Identity
  const randomizeIdentity = () => {
    const randomStyle = STYLE_PRESETS[Math.floor(Math.random() * STYLE_PRESETS.length)].id;
    const randomAura = AURA_PRESETS[Math.floor(Math.random() * AURA_PRESETS.length)].id;
    const randomBg = BACKGROUND_PRESETS[Math.floor(Math.random() * BACKGROUND_PRESETS.length)].hex;

    setStylePreset(randomStyle);
    setIdentityConfig(prev => ({
      ...prev,
      background_color: randomBg,
      equipped_cosmetics: {
        ...(prev.equipped_cosmetics || {}),
        aura: randomAura
      }
    }));
  };

  const value = {
    avatarProvider,
    setAvatarProvider,
    stylePreset,
    setStylePreset,
    seedKey,
    setSeedKey,
    identityConfig,
    setIdentityConfig,
    activeCategory,
    setActiveCategory,
    currentAvatarUrl,
    isLoading,
    isSaving,
    error,
    toastMessage,
    saveIdentity,
    randomizeIdentity
  };

  return (
    <IdentityStudioContext.Provider value={value}>
      {children}
    </IdentityStudioContext.Provider>
  );
};
