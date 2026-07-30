import React from 'react';
import { useIdentityStudio } from '../hooks/useIdentityStudio';

export const StudioActionBar = () => {
  const { isSaving, saveIdentity, randomizeIdentity, toastMessage, error } = useIdentityStudio();

  return (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl mb-4 text-center">
          {error}
        </div>
      )}

      <div className="action-bar">
        <button
          type="button"
          className="btn-randomize"
          onClick={randomizeIdentity}
          disabled={isSaving}
        >
          <span>🎲</span>
          <span>Randomize</span>
        </button>

        <button
          type="button"
          className="btn-save-identity"
          onClick={saveIdentity}
          disabled={isSaving}
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <span>💾</span>
              <span>Save Identity</span>
            </>
          )}
        </button>
      </div>

      {toastMessage && (
        <div className="identity-toast">
          ✨ {toastMessage}
        </div>
      )}
    </>
  );
};
