// ─── SoulCare API Service ─────────────────────────────────────────────────────
// Mirrors the api() function in app.js exactly:
//   - Authorization: Bearer {token} header on all calls
//   - 401 → clearAuthData + redirect to /login
//   - sc_* keys are canonical; soulcare_* are duplicates written by original backend
//
// In development the Vite proxy forwards /api → http://127.0.0.1:8000/api
// so VITE_API_BASE_URL defaults to '/api' (same-origin, no CORS).
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// ── Token readers (sc_* keys only — canonical keys from original app.js) ──────
export const getStoredToken    = () => localStorage.getItem('sc_token')    || '';
export const getStoredUserId   = () => Number(localStorage.getItem('sc_uid'))      || 0;
export const getStoredUsername = () => localStorage.getItem('sc_username') || '';

// ── Auth data writers (writes both sc_* and soulcare_* — matches original) ────
export const setAuthData = (data) => {
  localStorage.setItem('sc_token',    data.token);
  localStorage.setItem('sc_refresh',  data.refresh || '');
  localStorage.setItem('sc_uid',      String(data.user_id));
  localStorage.setItem('sc_username', data.username);
  // Original login.html also writes these duplicates — preserved for parity
  localStorage.setItem('soulcare_token',    data.token);
  localStorage.setItem('soulcare_refresh',  data.refresh || '');
  localStorage.setItem('soulcare_user_id',  String(data.user_id));
  localStorage.setItem('soulcare_username', data.username);
};

// ── Auth data clearers (clears both key sets — matches original logout()) ──────
export const clearAuthData = () => {
  localStorage.removeItem('sc_token');
  localStorage.removeItem('sc_refresh');
  localStorage.removeItem('sc_uid');
  localStorage.removeItem('sc_username');
  localStorage.removeItem('soulcare_token');
  localStorage.removeItem('soulcare_refresh');
  localStorage.removeItem('soulcare_user_id');
  localStorage.removeItem('soulcare_username');
};

// ── Core fetch wrapper (mirrors api() in app.js exactly) ─────────────────────
export async function api(method, path, body = null) {
  try {
    const token = getStoredToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const opts = { method, headers };
    if (body) {
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE}${path}`, opts);

    // 401 → logout + redirect (mirrors: if(res.status===401){logout();return null})
    if (res.status === 401) {
      clearAuthData();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return null;
    }

    return res;
  } catch (err) {
    console.error('API Error:', path, err);
    return null;
  }
}
