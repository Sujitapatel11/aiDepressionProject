// ─── useAuth Hook ─────────────────────────────────────────────────────────────
// Provides auth state (token, userId, username) and login/logout helpers.
// Reads only sc_* localStorage keys (canonical keys from original app.js).
// ─────────────────────────────────────────────────────────────────────────────
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getStoredToken,
  getStoredUserId,
  getStoredUsername,
  setAuthData,
  clearAuthData,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token,    setToken]    = useState(getStoredToken);
  const [userId,   setUserId]   = useState(getStoredUserId);
  const [username, setUsername] = useState(getStoredUsername);

  // Sync state if localStorage is changed in another tab
  useEffect(() => {
    function handleStorage() {
      setToken(getStoredToken());
      setUserId(getStoredUserId());
      setUsername(getStoredUsername());
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  function login(data) {
    setAuthData(data);
    setToken(data.token);
    setUserId(data.user_id);
    setUsername(data.username);
  }

  // Mirrors logout() in app.js: clear localStorage
  // WS lifecycle is managed in the Chat feature, not at auth level
  function logout() {
    clearAuthData();
    setToken('');
    setUserId(0);
    setUsername('');
  }

  return (
    <AuthContext.Provider value={{
      token,
      userId,
      username,
      isAuthenticated: Boolean(token),
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
