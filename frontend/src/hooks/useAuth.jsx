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
  api,
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
    const tokenVal = data.token || data.access || '';
    const userIdVal = Number(data.user_id) || 0;
    const usernameVal = data.username || '';
    const refreshVal = data.refresh || '';

    const normData = {
      token: tokenVal,
      refresh: refreshVal,
      user_id: userIdVal,
      username: usernameVal,
    };

    setAuthData(normData);
    setToken(tokenVal);
    setUserId(userIdVal);
    setUsername(usernameVal);
  }

  // Complete logout workflow: blacklists refresh token, clears localStorage, resets context state, and redirects to /login
  async function logout() {
    const refresh = localStorage.getItem('sc_refresh') || localStorage.getItem('soulcare_refresh');
    if (refresh) {
      try {
        await api('POST', '/auth/logout/', { refresh });
      } catch (err) {
        console.error('Logout endpoint error:', err);
      }
    }
    clearAuthData();
    setToken('');
    setUserId(0);
    setUsername('');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
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
