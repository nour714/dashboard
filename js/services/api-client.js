/**
 * AfricaTravel — Backend API Client
 *
 * Centralized fetch wrapper handling JWT attachment, automatic access-token
 * refresh on expiry, and consistent {success, data|error} response contracts
 * that mirror the backend's error-handler shape exactly.
 */

const API_BASE = '/api';

const CURRENT_USER_KEY = 'AfricaTravel_CURRENT_USER';

// Store short-lived access token strictly in-memory (never in localStorage to prevent XSS theft)
let inMemoryAccessToken = null;
let refreshInFlight = null;

// --- Session persistence helpers -------------------------------------------------

export function getAccessToken() {
  return inMemoryAccessToken;
}

export function setAccessToken(token) {
  inMemoryAccessToken = token || null;
}

export function getStoredUser() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CURRENT_USER_KEY) : null;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession({ accessToken, user } = {}) {
  try {
    if (accessToken !== undefined) {
      inMemoryAccessToken = accessToken;
    }
    if (user && typeof localStorage !== 'undefined') {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    }
    // Clean up any legacy localStorage tokens if present
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('AfricaTravel_ACCESS_TOKEN');
      localStorage.removeItem('AfricaTravel_REFRESH_TOKEN');
    }
  } catch (e) {
    console.error('Failed to persist session', e);
  }
}

export function updateStoredUser(patch) {
  const current = getStoredUser() || {};
  setSession({ user: { ...current, ...patch } });
}

export function clearSession() {
  inMemoryAccessToken = null;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(CURRENT_USER_KEY);
      localStorage.removeItem('AfricaTravel_ACCESS_TOKEN');
      localStorage.removeItem('AfricaTravel_REFRESH_TOKEN');
    }
  } catch (e) {
    console.error('Failed to clear session', e);
  }
}

export function hasSession() {
  return Boolean(inMemoryAccessToken || getStoredUser());
}

// --- Core request logic ------------------------------------------------------------

async function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include' // Sends httpOnly refreshToken cookie automatically
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.success) {
          throw new Error(body?.error?.message || 'Session expired');
        }
        setSession({
          accessToken: body.data.accessToken
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
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined)
    });
  } catch (networkErr) {
    return {
      success: false,
      error: { message: 'Network error — please check your connection and try again.', code: 'NETWORK_ERROR' }
    };
  }

  // Handle 204 No Content (e.g. DELETE responses)
  if (res.status === 204) {
    return { success: true, data: null };
  }

  let json;
  try {
    json = await res.json();
  } catch {
    json = { success: false, error: { message: 'Invalid server response', code: 'INVALID_RESPONSE' } };
  }

  // Any 401 other than bad login credentials: attempt a single silent refresh
  // then retry once. This covers expired and not-yet-restored access tokens.
  if (res.status === 401 && auth && retry && json?.error?.code !== 'INVALID_CREDENTIALS') {
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
  },
  delete(path, opts) {
    return request('DELETE', path, opts);
  }
};
