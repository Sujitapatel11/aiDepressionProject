import React from 'react';

export const Avatar = ({ name = '?', customSrc = '', className = 'w-10 h-10 text-sm' }) => {
  const initials = (name || '?').slice(0, 2).toUpperCase();
  
  if (customSrc) {
    return (
      <div className={`${className} rounded-full overflow-hidden flex-shrink-0 border border-gray-100 shadow-sm`}>
        <img src={customSrc} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`${className} rounded-full flex items-center justify-center text-white font-black flex-shrink-0 shadow-sm`}
      style={{ background: 'linear-gradient(135deg, var(--coral), var(--lavender))' }}
    >
      {initials}
    </div>
  );
};

export default Avatar;
