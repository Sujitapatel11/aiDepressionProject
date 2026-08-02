// ─── SoulCare API Service ─────────────────────────────────────────────────────
// Handles API URL construction, authentication headers, and fetch requests.
// Dynamically resolves import.meta.env.VITE_API_BASE_URL:
//   - Production (Vercel): VITE_API_BASE_URL=https://aidepressionproject.onrender.com
//     Resolves getApiUrl('/auth/login/') → https://aidepressionproject.onrender.com/api/auth/login/
//   - Development (Localhost): VITE_API_BASE_URL=/api or unset
//     Resolves getApiUrl('/journal/') → /api/journal/ (Vite dev server proxies /api → http://127.0.0.1:8000/api)
// ─────────────────────────────────────────────────────────────────────────────

export const getApiUrl = (path) => {
  const envBase = (import.meta.env.VITE_API_BASE_URL || '/api').trim();
  let base = envBase.replace(/\/+$/, '');

  if (!base || base === '/') {
    base = '/api';
  }

  // If environment variable is an absolute domain like "https://aidepressionproject.onrender.com"
  // ensure the /api route prefix is attached
  if (base.startsWith('http') && !base.endsWith('/api') && !base.includes('/api/')) {
    base = `${base}/api`;
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

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
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const opts = { method, headers };
    if (body) {
      if (body instanceof FormData) {
        opts.body = body;
      } else {
        headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
    }

    const url = getApiUrl(path);
    const res = await fetch(url, opts);

    // 401 → logout + redirect
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
