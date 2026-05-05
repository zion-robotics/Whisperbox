import { apiFetch } from './client';

export async function getConversations() {
  return apiFetch('/conversations');
}

export async function getMessages(userId, { limit = 50, before } = {}) {
  let url = `/conversations/${userId}/messages?limit=${limit}`;
  if (before) url += `&before=${encodeURIComponent(before)}`;
  return apiFetch(url);
}

export async function sendMessageRest(toUserId, payload) {
  return apiFetch('/messages', {
    method: 'POST',
    body: JSON.stringify({ to: toUserId, payload }),
  });
}
