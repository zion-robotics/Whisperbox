import { apiFetch, setTokens, clearTokens } from './client';

export async function register(payload) {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function login(username, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function getMe() {
  return apiFetch('/auth/me');
}

export async function logout(refreshToken) {
  try {
    await apiFetch('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } finally {
    clearTokens();
  }
}
