import React from 'react';

export const Toast = ({ message, visible }) => {
  if (!visible || !message) return null;

  return (
    <div
      id="toast"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl bg-gray-900/90 text-white font-bold text-sm shadow-xl backdrop-blur-md transition-all duration-300"
      style={{ border: '1px solid rgba(255, 255, 255, 0.15)' }}
    >
      {message}
    </div>
  );
};

export default Toast;
