import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SoulIdentityStudio } from '../SoulIdentityStudio';

describe('SoulIdentityStudio Integration', () => {
  test('renders all studio navigation categories and action buttons', async () => {
    render(<SoulIdentityStudio />);

    expect(screen.getByText('Style Presets')).toBeInTheDocument();
    expect(screen.getByText('Aura Glow')).toBeInTheDocument();
    expect(screen.getByText('Randomize')).toBeInTheDocument();
    expect(screen.getByText('Save Identity')).toBeInTheDocument();
  });

  test('category tab switching activates corresponding category view', () => {
    render(<SoulIdentityStudio />);

    const auraTab = screen.getByText('Aura Glow');
    fireEvent.click(auraTab);

    expect(screen.getByText('Golden Warmth')).toBeInTheDocument();
    expect(screen.getByText('Celestial Light')).toBeInTheDocument();
  });
});
