/**
 * AfricaTravel — Backend API Client
 *
 * Centralized fetch wrapper handling JWT attachment, automatic access-token
 * refresh on expiry, and consistent {success, data|error} response contracts
 * that mirror the backend's error-handler shape exactly.
 */

const API_BASE = '/api';

const ACCESS_TOKEN_KEY = 'AfricaTravel_ACCESS_TOKEN';
const REFRESH_TOKEN_KEY = 'AfricaTravel_REFRESH_TOKEN';
const CURRENT_USER_KEY = 'AfricaTravel_CURRENT_USER';

let refreshInFlight = null;

// --- Session persistence helpers -------------------------------------------------

export function getAccessToken() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
  } catch {
    return null;
  }
}

export function getRefreshToken() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
  } catch {
    return null;
  }
}

export function getStoredUser() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CURRENT_USER_KEY) : null;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession({ accessToken, refreshToken, user } = {}) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    if (user) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to persist session', e);
  }
}

export function updateStoredUser(patch) {
  const current = getStoredUser() || {};
  setSession({ user: { ...current, ...patch } });
}

export function clearSession() {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
  } catch (e) {
    console.error('Failed to clear session', e);
  }
}

export function hasSession() {
  return Boolean(getAccessToken());
}

// --- Core request logic ------------------------------------------------------------

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.success) {
          throw new Error(body?.error?.message || 'Session expired');
        }
        setSession({
          accessToken: body.data.accessToken,
          refreshToken: body.data.refreshToken || refreshToken
        });
        return body.data.accessToken;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}

function buildQueryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

async function request(method, path, { body, auth = true, retry = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch (networkErr) {
    return {
      success: false,
      error: { message: 'Network error — please check your connection and try again.', code: 'NETWORK_ERROR' }
    };
  }

  let json;
  try {
    json = await res.json();
  } catch {
    json = { success: false, error: { message: 'Invalid server response', code: 'INVALID_RESPONSE' } };
  }

  // Access token expired: attempt a single silent refresh then retry once
  if (res.status === 401 && auth && retry && json?.error?.code === 'TOKEN_EXPIRED') {
    try {
      await refreshAccessToken();
      return request(method, path, { body, auth, retry: false });
    } catch {
      clearSession();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return json;
    }
  }

  // Any other auth failure: clear session and bounce to login
  if (res.status === 401 && auth && json?.error?.code !== 'INVALID_CREDENTIALS') {
    clearSession();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  return json;
}

export const apiClient = {
  get(path, query, opts) {
    return request('GET', `${path}${buildQueryString(query)}`, opts);
  },
  post(path, body, opts) {
    return request('POST', path, { ...opts, body });
  },
  patch(path, body, opts) {
    return request('PATCH', path, { ...opts, body });
  }
};
