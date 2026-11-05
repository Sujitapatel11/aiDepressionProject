// ─── SoulCare API Service ─────────────────────────────────────────────────────
// Handles API URL construction, authentication headers, and fetch requests.
// Dynamically resolves import.meta.env.VITE_API_BASE_URL:
//   - Production (Vercel): VITE_API_BASE_URL=https://aidepressionproject.onrender.com
//     Resolves getApiUrl('/auth/login/') → https://aidepressionproject.onrender.com/api/auth/login/
//   - Development (Localhost): VITE_API_BASE_URL=/api or unset
//     Resolves getApiUrl('/journal/') → /api/journal/ (Vite dev server proxies /api → http://127.0.0.1:8000/api)
// ─────────────────────────────────────────────────────────────────────────────

export const getApiUrl = (path) => {
  const envBase = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL || '/api').trim();
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

// Absolute URL shapes that must pass through untouched (external media_url
// values, blob/data previews produced by the browser).
const ABSOLUTE_URL_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/**
 * Resolve a media path returned by the backend into a browser-usable URL.
 *
 * The media serializers emit backend-relative paths that already include the
 * `/api` mount point (`/api/media/serve/<id>/?at=…`). Feeding those straight
 * into getApiUrl() duplicates the prefix (`/api/api/media/...`, 404). This
 * helper strips the backend prefix exactly once and then resolves against the
 * configured API base, so the same value is correct behind the Vite proxy
 * (base `/api`) and against an absolute production origin
 * (`https://host` → `https://host/api/...`). Absolute URLs are unchanged.
 */
export const resolveMediaUrl = (path) => {
  if (path === null || path === undefined) return path;
  const raw = String(path).trim();
  if (!raw) return raw;
  if (ABSOLUTE_URL_RE.test(raw)) return raw;
  const withoutApiPrefix = raw.replace(/^\/api(?=\/)/, '');
  return getApiUrl(withoutApiPrefix);
};

// ── Token readers (sc_* keys only — canonical keys from original app.js) ──────
export const getStoredToken        = () => localStorage.getItem('sc_token')   || localStorage.getItem('soulcare_token')   || '';
export const getStoredRefreshToken = () => localStorage.getItem('sc_refresh') || localStorage.getItem('soulcare_refresh') || '';
export const getStoredUserId       = () => Number(localStorage.getItem('sc_uid'))     || Number(localStorage.getItem('soulcare_user_id')) || 0;
export const getStoredUsername     = () => localStorage.getItem('sc_username') || localStorage.getItem('soulcare_username') || '';

// ── Token writers (saves both sc_* and soulcare_* canonical keys) ─────────────
export const setTokens = (access, refresh) => {
  if (access) {
    localStorage.setItem('sc_token', access);
    localStorage.setItem('soulcare_token', access);
  }
  if (refresh) {
    localStorage.setItem('sc_refresh', refresh);
    localStorage.setItem('soulcare_refresh', refresh);
  }
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}
  }
};

// ── Auth data writers (writes both sc_* and soulcare_* — matches original) ────
export const setAuthData = (data) => {
  const tokenVal = data.token || data.access || '';
  const refreshVal = data.refresh || '';

  if (tokenVal) {
    localStorage.setItem('sc_token', tokenVal);
    localStorage.setItem('soulcare_token', tokenVal);
  }
  if (refreshVal) {
    localStorage.setItem('sc_refresh', refreshVal);
    localStorage.setItem('soulcare_refresh', refreshVal);
  }
  if (data.user_id !== undefined) {
    localStorage.setItem('sc_uid', String(data.user_id));
    localStorage.setItem('soulcare_user_id', String(data.user_id));
  }
  if (data.username !== undefined) {
    localStorage.setItem('sc_username', data.username);
    localStorage.setItem('soulcare_username', data.username);
  }
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

// ── Single-Flight Token Refresh ───────────────────────────────────────────────
// If multiple concurrent requests hit 401, only ONE refresh request is executed.
// All others await the same promise to prevent refresh token reuse rejection.
let refreshPromise = null;

export async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    return null;
  }

  refreshPromise = (async () => {
    try {
      const url = getApiUrl('/auth/token/refresh/');
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      const newAccess = data.access || data.token || '';
      const newRefresh = data.refresh || refreshToken;

      if (!newAccess) {
        return null;
      }

      // Requirement 2: Always save BOTH the new access token and the new rotated refresh token
      setTokens(newAccess, newRefresh);
      return newAccess;
    } catch (err) {
      console.error('Single-flight token refresh failed:', err);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ── Core fetch wrapper (with single-retry on 401) ────────────────────────────
export async function api(method, path, body = null, isRetry = false) {
  try {
    const token = getStoredToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const opts = { method, headers };
    if (body) {
      if (typeof FormData !== 'undefined' && body instanceof FormData) {
        opts.body = body;
      } else {
        headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
    }

    const url = getApiUrl(path);
    const res = await fetch(url, opts);

    // 401 handling: refresh once and retry original request once
    if (res.status === 401) {
      const cleanPath = String(path || '');
      const isAuthEndpoint =
        cleanPath.includes('/auth/token/refresh') ||
        cleanPath.includes('/auth/login') ||
        cleanPath.includes('/auth/signup');

      // Requirement 3: No infinite loops; fail immediately if retry or auth endpoint
      if (isRetry || isAuthEndpoint) {
        clearAuthData();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return null;
      }

      // Execute single-flight refresh
      const newAccess = await refreshAccessToken();
      if (!newAccess) {
        clearAuthData();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return null;
      }

      // Retry original request once with isRetry = true
      return api(method, path, body, true);
    }

    return res;
  } catch (err) {
    console.error('API Error:', path, err);
    return null;
  }
}

// ── Multipart upload with progress (XMLHttpRequest; fetch cannot report
//    upload progress). Returns {ok, status, json} or null on network failure.
export async function apiUpload(path, formData, { onProgress } = {}, isRetry = false) {
  return new Promise((resolve) => {
    const token = getStoredToken();
    const xhr = new XMLHttpRequest();
    xhr.open('POST', getApiUrl(path), true);
    if (token) {
      try { xhr.setRequestHeader('Authorization', `Bearer ${token}`); } catch (e) {}
    }
    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
      };
    }
    xhr.onload = async () => {
      if (xhr.status === 401 && !isRetry) {
        const newAccess = await refreshAccessToken();
        if (newAccess) {
          resolve(apiUpload(path, formData, { onProgress }, true));
          return;
        }
        clearAuthData();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        resolve(null);
        return;
      }
      let json = null;
      try { json = JSON.parse(xhr.responseText); } catch (err) { /* non-JSON body */ }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, json });
    };
    xhr.onerror = () => resolve(null);
    xhr.onabort = () => resolve(null);
    xhr.send(formData);
  });
}
