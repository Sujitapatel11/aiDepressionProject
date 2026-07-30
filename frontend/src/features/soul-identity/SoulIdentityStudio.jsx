import React from 'react';
import { IdentityStudioProvider } from './context/IdentityStudioContext';
import { useIdentityStudio } from './hooks/useIdentityStudio';
import { AvatarPreviewFrame } from './components/AvatarPreviewFrame';
import { CategoryTabNavigator } from './components/CategoryTabNavigator';
import { StudioActionBar } from './components/StudioActionBar';
import { StylePresetPicker } from './components/pickers/StylePresetPicker';
import { AuraPicker } from './components/pickers/AuraPicker';
import { BackgroundPicker } from './components/pickers/BackgroundPicker';
import { CompanionPicker } from './components/pickers/CompanionPicker';
import { ExpressionPicker } from './components/pickers/ExpressionPicker';
import { AccessoriesPicker } from './components/pickers/AccessoriesPicker';
import './styles/studio.css';

const StudioContent = () => {
  const { activeCategory } = useIdentityStudio();

  const renderActivePicker = () => {
    switch (activeCategory) {
      case 'styles':
        return <StylePresetPicker />;
      case 'auras':
        return <AuraPicker />;
      case 'backgrounds':
        return <BackgroundPicker />;
      case 'companions':
        return <CompanionPicker />;
      case 'expressions':
        return <ExpressionPicker />;
      case 'accessories':
        return <AccessoriesPicker />;
      default:
        return <StylePresetPicker />;
    }
  };

  return (
    <div className="studio-container">
      <AvatarPreviewFrame />
      <CategoryTabNavigator />
      {renderActivePicker()}
      <StudioActionBar />
    </div>
  );
};

export const SoulIdentityStudio = () => {
  return (
    <IdentityStudioProvider>
      <StudioContent />
    </IdentityStudioProvider>
  );
};

export default SoulIdentityStudio;
