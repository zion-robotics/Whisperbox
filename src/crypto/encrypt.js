// ============================================================
//  WhisperBox — Encryption
//  AES-GCM for messages, RSA-OAEP for key wrapping
// ============================================================

import { bufferToBase64, importPublicKey } from './keyManager';

// ── Generate AES-GCM key ────────────────────────────────────

async function generateAESKey() {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// ── Generate random IV ──────────────────────────────────────

function generateIV() {
  const iv = new Uint8Array(12); // 96-bit
  crypto.getRandomValues(iv);
  return iv;
}

// ── RSA-OAEP encrypt AES key ────────────────────────────────

async function encryptAESKeyWithRSA(aesKey, rsaPublicKey) {
  const exportedAES = await crypto.subtle.exportKey('raw', aesKey);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    rsaPublicKey,
    exportedAES
  );
  return bufferToBase64(encrypted);
}

// ── Main encrypt function ───────────────────────────────────
// Returns the full EncryptedPayload object for the API

export async function encryptMessage(plaintext, recipientPublicKeyBase64, myPublicKey) {
  const encoder = new TextEncoder();
  const plaintextBuffer = encoder.encode(plaintext);

  // 1. Generate ephemeral AES-GCM key and IV
  const aesKey = await generateAESKey();
  const iv = generateIV();

  // 2. Encrypt plaintext
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    plaintextBuffer
  );

  // 3. Import recipient's public key
  const recipientPublicKey = await importPublicKey(recipientPublicKeyBase64);

  // 4. Encrypt AES key for recipient
  const encryptedKey = await encryptAESKeyWithRSA(aesKey, recipientPublicKey);

  // 5. Encrypt AES key for self (so sender can read own messages)
  const encryptedKeyForSelf = await encryptAESKeyWithRSA(aesKey, myPublicKey);

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    iv: bufferToBase64(iv),
    encryptedKey,
    encryptedKeyForSelf,
  };
}

// ── Replay attack protection ────────────────────────────────
// Track seen message IDs to reject duplicates

const seenMessageIds = new Set();

export function isReplayAttack(messageId) {
  if (seenMessageIds.has(messageId)) return true;
  seenMessageIds.add(messageId);
  // Keep set bounded — remove oldest if > 1000
  if (seenMessageIds.size > 1000) {
    const first = seenMessageIds.values().next().value;
    seenMessageIds.delete(first);
  }
  return false;
}
