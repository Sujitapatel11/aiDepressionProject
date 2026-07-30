import { useContext } from 'react';
import { IdentityStudioContext } from '../context/IdentityStudioContext';

export const useIdentityStudio = () => {
  const context = useContext(IdentityStudioContext);
  if (!context) {
    throw new Error('useIdentityStudio must be used within an IdentityStudioProvider');
  }
  return context;
};
