/**
 * keys.js — RSA-OAEP keypair generation & management
 * Private keys NEVER leave the client.
 * Public keys are stored on the server.
 */

const KeyManager = (() => {
  const DB_NAME = 'whisperbox_keys';
  const DB_VERSION = 1;
  const STORE_NAME = 'keypairs';

  // RSA-OAEP config
  const RSA_PARAMS = {
    name: 'RSA-OAEP',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256',
  };

  // ── IndexedDB helpers ──────────────────────────────────────────────────────

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        e.target.result.createObjectStore(STORE_NAME, { keyPath: 'username' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveKeypairToDB(username, keypair) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ username, keypair });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function loadKeypairFromDB(username) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(username);
      req.onsuccess = () => resolve(req.result ? req.result.keypair : null);
      req.onerror = () => reject(req.error);
    });
  }

  // ── Key generation ─────────────────────────────────────────────────────────

  async function generateKeypair() {
    const keypair = await crypto.subtle.generateKey(RSA_PARAMS, true, [
      'encrypt',
      'decrypt',
    ]);
    return keypair;
  }

  // Export public key as base64 (for server storage)
  async function exportPublicKey(publicKey) {
    const spki = await crypto.subtle.exportKey('spki', publicKey);
    return btoa(String.fromCharCode(...new Uint8Array(spki)));
  }

  // Export private key wrapped in AES-GCM with a password-derived key
  async function exportPrivateKeyEncrypted(privateKey, password) {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Derive AES key from password
    const rawKey = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    const aesKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' },
      rawKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    const pkcs8 = await crypto.subtle.exportKey('pkcs8', privateKey);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, pkcs8);

    return {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      salt: btoa(String.fromCharCode(...salt)),
      iv: btoa(String.fromCharCode(...iv)),
    };
  }

  async function importPrivateKeyEncrypted(wrapped, password) {
    const enc = new TextEncoder();
    const salt = Uint8Array.from(atob(wrapped.salt), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(wrapped.iv), c => c.charCodeAt(0));
    const encrypted = Uint8Array.from(atob(wrapped.encrypted), c => c.charCodeAt(0));

    const rawKey = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    const aesKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' },
      rawKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    const pkcs8 = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, encrypted);
    return crypto.subtle.importKey('pkcs8', pkcs8, RSA_PARAMS, false, ['decrypt']);
  }

  // Import a recipient's public key from base64 spki
  async function importPublicKey(b64) {
    const spki = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    return crypto.subtle.importKey('spki', spki, RSA_PARAMS, false, ['encrypt']);
  }

  // ── Session key cache (in-memory only) ────────────────────────────────────
  let _sessionKeys = null; // { publicKey, privateKey }

  function setSessionKeys(keys) { _sessionKeys = keys; }
  function getSessionKeys() { return _sessionKeys; }
  function clearSessionKeys() { _sessionKeys = null; }

  return {
    generateKeypair,
    exportPublicKey,
    exportPrivateKeyEncrypted,
    importPrivateKeyEncrypted,
    importPublicKey,
    saveKeypairToDB,
    loadKeypairFromDB,
    setSessionKeys,
    getSessionKeys,
    clearSessionKeys,
  };
})();
