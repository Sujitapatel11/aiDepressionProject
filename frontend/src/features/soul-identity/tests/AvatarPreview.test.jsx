import React from 'react';
import { render, screen } from '@testing-library/react';
import { IdentityStudioProvider } from '../context/IdentityStudioContext';
import { AvatarPreviewFrame } from '../components/AvatarPreviewFrame';

describe('AvatarPreviewFrame', () => {
  test('renders circular avatar frame and heading', () => {
    render(
      <IdentityStudioProvider>
        <AvatarPreviewFrame />
      </IdentityStudioProvider>
    );

    expect(screen.getByText('Soul Identity Studio')).toBeInTheDocument();
    expect(screen.getByAltText('Soul Identity Preview')).toBeInTheDocument();
  });
});
