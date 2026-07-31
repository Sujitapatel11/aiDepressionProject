import React from 'react';

export const ConfirmModal = ({ isOpen, message, danger, onConfirm, onClose, loading }) => {
  if (!isOpen) return null;

  return (
    <div id="confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-[28px] p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4 animate-fadeIn">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${danger ? 'bg-rose-100 text-rose-600' : 'bg-purple-100 text-purple-600'}`}>
            {danger ? '⚠️' : '❓'}
          </div>
          <h3 className="t-h4 font-bold text-gray-900">Please Confirm</h3>
        </div>
        <p id="confirm-msg" className="t-body-md text-gray-600 whitespace-pre-line">
          {message}
        </p>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition border-none cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            id="confirm-ok"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition border-none cursor-pointer shadow-md ${
              danger
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {loading ? 'Processing...' : danger ? 'Yes, Delete' : 'Yes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
