import React from 'react';
import { useIdentityStudio } from '../../hooks/useIdentityStudio';

const EXPRESSION_PRESETS = [
  { id: 'happy', name: 'Happy Calm', icon: '😊' },
  { id: 'zen', name: 'Zen Mind', icon: '🧘' },
  { id: 'hopeful', name: 'Hopeful Eye', icon: '✨' },
  { id: 'peaceful', name: 'Peaceful Smile', icon: '😌' }
];

export const ExpressionPicker = () => {
  const { identityConfig, setIdentityConfig } = useIdentityStudio();

  const currentExpr = identityConfig?.expression || 'happy';

  const selectExpr = (exprId) => {
    setIdentityConfig(prev => ({
      ...prev,
      expression: exprId
    }));
  };

  return (
    <div className="picker-grid">
      {EXPRESSION_PRESETS.map(expr => (
        <div
          key={expr.id}
          className={`picker-card ${currentExpr === expr.id ? 'selected' : ''}`}
          onClick={() => selectExpr(expr.id)}
        >
          <div className="picker-icon-box">{expr.icon}</div>
          <div className="picker-title">{expr.name}</div>
        </div>
      ))}
    </div>
  );
};
