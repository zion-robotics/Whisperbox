# WhisperBox — End-to-End Encrypted Messaging

> A secure messaging app where the server **never sees plaintext**. All encryption and decryption happens on the client using the Web Crypto API.

![E2EE](https://img.shields.io/badge/Encryption-E2EE-green)
![Web Crypto](https://img.shields.io/badge/API-Web%20Crypto-blue)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61dafb)

---

## Setup Instructions

```bash
git clone <your-repo-url>
cd whisperbox
npm install
npm run dev        # development
npm run build      # production build
```

No environment variables needed — backend is `https://whisperbox.koyeb.app`.

---

## Architecture Diagram

```
┌────────────────────────── CLIENT ──────────────────────────┐
│                                                             │
│  keyManager.js → PBKDF2 + AES-KW + RSA-OAEP keypair gen   │
│  encrypt.js    → AES-GCM encrypt + RSA-OAEP key wrap      │
│  decrypt.js    → RSA-OAEP unwrap + AES-GCM decrypt        │
│                                                             │
│  In-Memory Only: privateKey (CryptoKey), tokens            │
│  Never stored:   raw keys, plaintext, passwords            │
│                                                             │
│  ──── HTTPS + WSS ────────────────────────────────────►   │
└─────────────────────────────────────────────────────────────┘
                          │
┌────────────────── WHISPERBOX BACKEND ───────────────────────┐
│  Stores ONLY: bcrypt(password), public_key,                 │
│  wrapped_private_key (AES-KW blob), pbkdf2_salt,            │
│  ciphertext + iv + encryptedKey + encryptedKeyForSelf       │
│                                                             │
│  NEVER sees: plaintext, raw private keys                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Encryption Flow

### Register
1. Generate RSA-OAEP 2048-bit keypair
2. Generate 128-bit PBKDF2 salt
3. Derive AES-KW key from password via PBKDF2 (310,000 iterations)
4. Wrap private key with AES-KW → `wrapped_private_key`
5. Export public key → `public_key`
6. POST all to `/auth/register`

### Login
1. POST `/auth/login` → get `wrapped_private_key` + `pbkdf2_salt`
2. Re-derive AES-KW from password + salt
3. Unwrap private key into memory as non-extractable CryptoKey

### Send Message
1. Fetch recipient's RSA public key
2. Generate ephemeral AES-GCM 256-bit key + 96-bit IV
3. Encrypt plaintext → `ciphertext`
4. Encrypt AES key with recipient's RSA key → `encryptedKey`
5. Encrypt AES key with own RSA key → `encryptedKeyForSelf`
6. Send via WebSocket (fallback: POST /messages)

### Receive Message
1. Decrypt `encryptedKey` with own RSA private key → AES key
2. Decrypt `ciphertext` with AES key + IV → plaintext
3. On failure → show [Unable to decrypt], never crash

---

## Key Management

| Key | Stored Where | Extractable |
|---|---|---|
| RSA Public Key | Server (plaintext) | Yes |
| RSA Private Key | Server (AES-KW wrapped) + Memory only | No |
| AES-KW Wrapping Key | Never stored | No |
| Per-message AES-GCM Key | Never stored | No |

---

## Security Decisions

- **Web Crypto API only** — no third-party crypto libs
- **Tokens in memory only** — never localStorage/sessionStorage
- **PBKDF2 with 310,000 iterations** — OWASP 2023 minimum
- **Replay attack protection** — seen message IDs tracked in memory
- **Graceful decryption failure** — shows [Unable to decrypt], never throws

---

## Security Trade-offs

- **No Perfect Forward Secrecy** — RSA-OAEP used for key exchange. True PFS requires ECDH ephemeral keys (Signal Protocol). Mitigation: private keys are AES-KW wrapped with PBKDF2.
- **Session lost on page refresh** — intentional; prevents persistent token storage attacks
- **Password-dependent security** — weak passwords weaken the wrapped key blob

---

## Known Limitations

1. No perfect forward secrecy (RSA-OAEP, not ECDH)
2. No multi-device support
3. No group messaging
4. Session clears on page refresh (re-login required)
5. No message deletion
