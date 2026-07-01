const SESSION_TOKEN_KEY = 'receipt-hub-session-token';

let runtimeConfig = {
  mode: 'offline',
  allowRegistration: false,
  version: '1.0.0-phase1',
};

function readStoredToken() {
  try {
    return globalThis.localStorage?.getItem(SESSION_TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

export function getRuntimeConfig() {
  return runtimeConfig;
}

export function isHostedMode() {
  return runtimeConfig.mode === 'server';
}

export function getSessionToken() {
  return readStoredToken();
}

export function setSessionToken(token) {
  try {
    if (token) {
      globalThis.localStorage?.setItem(SESSION_TOKEN_KEY, token);
      return;
    }
    globalThis.localStorage?.removeItem(SESSION_TOKEN_KEY);
  } catch {
    // Ignore storage access failures and fall back to in-memory auth state.
  }
}

export async function initialiseRuntimeConfig() {
  try {
    const response = await fetch('./api/config', {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error('Hosted configuration is unavailable.');
    }
    const config = await response.json();
    runtimeConfig = {
      mode: config.mode === 'server' ? 'server' : 'offline',
      allowRegistration: Boolean(config.allowRegistration),
      version: config.version || runtimeConfig.version,
    };
  } catch {
    runtimeConfig = {
      mode: 'offline',
      allowRegistration: false,
      version: runtimeConfig.version,
    };
  }
  return runtimeConfig;
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = getSessionToken();
  if (token) headers.set('Authorization', ['Bearer', token].join(' '));
  const response = await fetch(path, { ...options, headers });
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;
  if (!response.ok) {
    const message = payload?.error || payload?.message || 'Request failed.';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return payload;
}

export async function getSession() {
  return request('./api/auth/session');
}

export async function loginUser(credentials) {
  const payload = await request('./api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  setSessionToken(payload.token);
  return payload;
}

export async function registerUser(details) {
  const payload = await request('./api/auth/register', {
    method: 'POST',
    body: JSON.stringify(details),
  });
  setSessionToken(payload.token);
  return payload;
}

export async function logoutUser() {
  try {
    await request('./api/auth/logout', { method: 'POST' });
  } finally {
    setSessionToken('');
  }
}

export async function listAuditLogs(limit = 12) {
  const payload = await request(`./api/audit-logs?limit=${encodeURIComponent(limit)}`);
  return payload.logs ?? [];
}

export async function apiGet(path) {
  return request(path, { method: 'GET' });
}

export async function apiPut(path, body) {
  return request(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function apiDelete(path) {
  return request(path, { method: 'DELETE' });
}
