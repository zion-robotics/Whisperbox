// ============================================================
//  WhisperBox — API Client
//  Base fetch with auth headers and auto token refresh
// ============================================================

const BASE_URL = 'https://whisperbox.koyeb.app';

// In-memory token store (never localStorage)
let accessToken = null;
let refreshToken = null;
let refreshPromise = null;

export function setTokens(access, refresh) {
  accessToken = access;
  refreshToken = refresh;
}

export function getAccessToken() { return accessToken; }
export function getRefreshToken() { return refreshToken; }

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
}

// ── Auto token refresh ──────────────────────────────────────

async function doRefresh() {
  if (!refreshToken) throw new Error('No refresh token');

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    clearTokens();
    throw new Error('Session expired. Please log in again.');
  }

  const data = await res.json();
  accessToken = data.access_token;
  return data.access_token;
}

async function refreshOnce() {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

// ── Core fetch wrapper ──────────────────────────────────────

export async function apiFetch(path, options = {}, retry = true) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Auto-refresh on 401
  if (res.status === 401 && retry) {
    try {
      await refreshOnce();
      return apiFetch(path, options, false);
    } catch {
      throw new Error('Session expired. Please log in again.');
    }
  }

  if (!res.ok) {
    let errorMsg = `Request failed: ${res.status}`;
    try {
      const err = await res.json();
      if (err.detail) {
        errorMsg = Array.isArray(err.detail)
          ? err.detail.map(d => d.msg).join(', ')
          : err.detail;
      }
    } catch {}
    throw new Error(errorMsg);
  }

  // 204 No Content
  if (res.status === 204) return null;

  return res.json();
}
