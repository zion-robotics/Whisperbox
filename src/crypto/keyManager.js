// ============================================================
//  WhisperBox — Key Manager
//  All cryptographic key operations using Web Crypto API only
//  Private keys NEVER leave this module in plaintext
// ============================================================

const PBKDF2_ITERATIONS = 310000; // OWASP recommended minimum
const RSA_KEY_SIZE = 2048;

// ── Helpers ────────────────────────────────────────────────

export function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ── Salt Generation ─────────────────────────────────────────

export function generateSalt() {
  const salt = new Uint8Array(16); // 128-bit
  crypto.getRandomValues(salt);
  return salt;
}

// ── PBKDF2 → AES-KW wrapping key ───────────────────────────

export async function deriveWrappingKey(password, salt) {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const saltBuffer = typeof salt === 'string' ? base64ToBuffer(salt) : salt;

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// ── RSA-OAEP Keypair Generation ─────────────────────────────

export async function generateKeypair() {
  return crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: RSA_KEY_SIZE,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

// ── Export Public Key as base64 ─────────────────────────────

export async function exportPublicKey(publicKey) {
  const exported = await crypto.subtle.exportKey('spki', publicKey);
  return bufferToBase64(exported);
}

// ── Wrap Private Key with AES-GCM ──────────────────────────

export async function wrapPrivateKey(privateKey, wrappingKey) {
  // Export private key to PKCS8
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', privateKey);
  
  // Generate IV (12 bytes for GCM)
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  
  // Encrypt with AES-GCM
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    wrappingKey,
    pkcs8
  );
  
  // Combine IV + ciphertext and return as base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return bufferToBase64(combined.buffer);
}

// ── Unwrap Private Key from AES-GCM ────────────────────────

export async function unwrapPrivateKey(wrappedPrivateKeyBase64, wrappingKey) {
  const combined = base64ToBuffer(wrappedPrivateKeyBase64);
  const view = new Uint8Array(combined);
  
  // Extract IV (first 12 bytes) and ciphertext
  const iv = view.slice(0, 12);
  const ciphertext = view.slice(12);
  
  // Decrypt with AES-GCM
  const pkcs8 = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    wrappingKey,
    ciphertext
  );
  
  // Import the decrypted PKCS8
  return crypto.subtle.importKey(
    'pkcs8',
    pkcs8,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false, // non-extractable — stays in memory
    ['decrypt']
  );
}

// ── Import Public Key from base64 ──────────────────────────

export async function importPublicKey(base64PublicKey) {
  const buffer = base64ToBuffer(base64PublicKey);
  return crypto.subtle.importKey(
    'spki',
    buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt']
  );
}

// ── Full Register Key Setup ─────────────────────────────────
// Returns everything needed for POST /auth/register

export async function setupKeysForRegister(password) {
  const salt = generateSalt();
  const wrappingKey = await deriveWrappingKey(password, salt);
  const keypair = await generateKeypair();

  const publicKeyBase64 = await exportPublicKey(keypair.publicKey);
  const wrappedPrivateKeyBase64 = await wrapPrivateKey(keypair.privateKey, wrappingKey);
  const pbkdf2SaltBase64 = bufferToBase64(salt);

  return {
    publicKey: keypair.publicKey,         // CryptoKey — keep in memory
    privateKey: keypair.privateKey,        // CryptoKey — keep in memory
    public_key: publicKeyBase64,           // → server
    wrapped_private_key: wrappedPrivateKeyBase64, // → server
    pbkdf2_salt: pbkdf2SaltBase64,         // → server
  };
}

// ── Full Login Key Restore ──────────────────────────────────
// Restores private key from server blobs + password

export async function restoreKeysFromLogin(password, wrappedPrivateKeyBase64, pbkdf2SaltBase64, publicKeyBase64) {
  const wrappingKey = await deriveWrappingKey(password, pbkdf2SaltBase64);
  const privateKey = await unwrapPrivateKey(wrappedPrivateKeyBase64, wrappingKey);
  const publicKey = await importPublicKey(publicKeyBase64);

  return { privateKey, publicKey };
}
