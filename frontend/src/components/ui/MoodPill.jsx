import React from 'react';

export const MoodPill = ({ emoji, label, active = false, onClick, className = '' }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mood-pill ${active ? 'active-pill' : ''} ${className}`}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </button>
  );
};

export default MoodPill;
