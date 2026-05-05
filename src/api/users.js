import { apiFetch } from './client';

export async function searchUsers(query) {
  return apiFetch(`/users/search?q=${encodeURIComponent(query)}`);
}

export async function getUserPublicKey(userId) {
  const data = await apiFetch(`/users/${userId}/public-key`);
  return data.public_key;
}
