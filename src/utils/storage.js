/**
 * utils/storage.js — Secure client-side session storage
 *
 * Security decisions:
 * - JWT token: sessionStorage only (cleared on tab close)
 * - Private key: IndexedDB wrapped with password-derived AES key (via KeyManager)
 * - Public key cache: sessionStorage (public, no sensitivity)
 * - No sensitive data in localStorage
 */

const Store = (() => {
  const SESSION_KEY = 'wb_session';
  const PUBKEY_CACHE_KEY = 'wb_pubkey_cache';

  // ── Session ────────────────────────────────────────────────────────────────

  function saveSession(username, token) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ username, token }));
  }

  function loadSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(PUBKEY_CACHE_KEY);
  }

  // ── Public key cache (non-sensitive) ───────────────────────────────────────
  // Caches recipient public keys to avoid repeated API calls

  function getCachedPublicKey(username) {
    try {
      const raw = sessionStorage.getItem(PUBKEY_CACHE_KEY);
      const cache = raw ? JSON.parse(raw) : {};
      return cache[username] || null;
    } catch { return null; }
  }

  function setCachedPublicKey(username, b64Key) {
    try {
      const raw = sessionStorage.getItem(PUBKEY_CACHE_KEY);
      const cache = raw ? JSON.parse(raw) : {};
      cache[username] = b64Key;
      sessionStorage.setItem(PUBKEY_CACHE_KEY, JSON.stringify(cache));
    } catch {}
  }

  // ── Conversation list (local, non-sensitive) ────────────────────────────────

  function getConversations(username) {
    try {
      const raw = sessionStorage.getItem(`wb_convs_${username}`);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function addConversation(username, partner) {
    const convs = getConversations(username);
    if (!convs.includes(partner)) {
      convs.unshift(partner);
      sessionStorage.setItem(`wb_convs_${username}`, JSON.stringify(convs));
    }
  }

  return {
    saveSession,
    loadSession,
    clearSession,
    getCachedPublicKey,
    setCachedPublicKey,
    getConversations,
    addConversation,
  };
})();
