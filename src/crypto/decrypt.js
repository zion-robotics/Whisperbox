// ============================================================
//  WhisperBox — Decryption
//  RSA-OAEP unwrap AES key, AES-GCM decrypt message
// ============================================================

import { base64ToBuffer } from './keyManager';

// ── Decrypt AES key with RSA private key ────────────────────

async function decryptAESKeyWithRSA(encryptedKeyBase64, privateKey) {
  const encryptedKeyBuffer = base64ToBuffer(encryptedKeyBase64);
  const aesKeyBuffer = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    encryptedKeyBuffer
  );

  return crypto.subtle.importKey(
    'raw',
    aesKeyBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
}

// ── Main decrypt function ───────────────────────────────────

export async function decryptMessage(payload, privateKey, isSentByMe) {
  try {
    const { ciphertext, iv, encryptedKey, encryptedKeyForSelf } = payload;

    // Use the right encrypted key based on who's decrypting
    const keyToDecrypt = isSentByMe ? encryptedKeyForSelf : encryptedKey;

    if (!keyToDecrypt || !ciphertext || !iv) {
      throw new Error('Missing payload fields');
    }

    // 1. Decrypt AES key with RSA private key
    const aesKey = await decryptAESKeyWithRSA(keyToDecrypt, privateKey);

    // 2. Decrypt ciphertext with AES-GCM
    const ivBuffer = base64ToBuffer(iv);
    const ciphertextBuffer = base64ToBuffer(ciphertext);

    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      aesKey,
      ciphertextBuffer
    );

    const decoder = new TextDecoder();
    return { success: true, text: decoder.decode(plaintextBuffer) };
  } catch (err) {
    // Graceful failure — never crash on bad decryption
    console.warn('Decryption failed:', err.message);
    return { success: false, text: null };
  }
}
