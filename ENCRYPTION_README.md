# End-to-End Encryption Implementation Guide

## Overview

This document describes the complete end-to-end (E2E) encryption implementation for the Chatify application using **hybrid encryption** with AES-256-GCM and RSA-OAEP.

### Key Features

- ✅ **AES-256-GCM** for message payload encryption (fast, authenticated)
- ✅ **RSA-OAEP (2048-bit)** for AES key wrapping (secure key exchange)
- ✅ **Private keys never leave the client** (stored encrypted in IndexedDB)
- ✅ **Backend never sees plaintext** messages or private keys
- ✅ **Base64 encoding** for all binary data in JSON
- ✅ **PBKDF2** for passphrase-based key derivation (100k iterations)
- ✅ **Graceful fallback** for decryption failures

---

## Architecture

### High-Level Flow

```
┌─────────────┐                    ┌─────────────┐
│   Sender    │                    │  Recipient  │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │ 1. Generate AES key              │
       │ 2. Encrypt message with AES      │
       │ 3. Wrap AES key with RSA-pub     │
       │ 4. Send encrypted payload        │
       ├──────────────────────────────────>
       │                                  │
       │                                  │ 5. Unwrap AES key with RSA-priv
       │                                  │ 6. Decrypt message with AES
       │                                  │ 7. Display plaintext
       │                                  │
┌──────▼──────┐                    ┌──────▼──────┐
│   Backend   │                    │  IndexedDB  │
│ (stores     │                    │ (encrypted  │
│  encrypted  │                    │  private    │
│  payload)   │                    │  keys)      │
└─────────────┘                    └─────────────┘
```

### Components

#### Frontend

1. **`crypto.js`** - Web Crypto API utilities
   - Key generation (RSA-OAEP)
   - Encryption/decryption (AES-GCM + RSA-OAEP)
   - PEM import/export
   - Hybrid encryption wrapper

2. **`keyStorage.js`** - Secure key storage in IndexedDB
   - Private key encryption with passphrase (PBKDF2)
   - IndexedDB persistence
   - Key backup/restore

3. **`useAuthStore.js`** - Authentication & key management
   - Key generation during signup
   - Key unlocking during login
   - Passphrase management (memory only)

4. **`useChatStore.js`** - Message encryption/decryption
   - Encrypt outgoing messages
   - Decrypt incoming messages
   - Decrypt stored messages on load

5. **`ChatWidget.jsx`** - UI components
   - Encryption status indicators
   - Setup/unlock modals
   - Failed decryption fallback UI

#### Backend

1. **`User.js` model** - Public key storage
   - `publicKeyPem` (String) - RSA public key in PEM format
   - `keyId` (String) - Key version for rotation

2. **`Message.js` model** - Encrypted message storage
   - `messagePayload` (Mixed) - Encrypted JSON object
   - `isEncrypted` (Boolean) - Encryption flag

3. **`keys.controller.js`** - Public key API
   - `POST /api/keys/register` - Register public key
   - `GET /api/keys/:userId` - Fetch public key
   - `GET /api/keys/batch` - Batch fetch (for group chats)

4. **`message.controller.js`** - Message handling
   - Validate encrypted payload structure
   - Store encrypted payload as-is (never decrypt)
   - Forward encrypted messages via WebSocket

---

## I/O Examples

### 1. Key Generation (Signup)

**Frontend: Generate RSA Key Pair**

```javascript
import { generateRsaKeyPair, exportPublicKeyToPem } from "./lib/crypto";
import { savePrivateKey } from "./lib/keyStorage";

const passphrase = "MyS3cur3P@ssw0rd!";
const userId = "507f1f77bcf86cd799439011";

// Generate keys
const { publicKey, privateKey } = await generateRsaKeyPair();

// Export public key to PEM
const publicKeyPem = await exportPublicKeyToPem(publicKey);

// Save private key locally (encrypted with passphrase)
await savePrivateKey(userId, privateKey, passphrase);

// Register public key with backend
await axiosInstance.post("/keys/register", {
  userId,
  publicKeyPem,
  keyId: "v1"
});
```

**Output: Public Key (PEM format)**

```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAw8zT5mZ9...
...
-----END PUBLIC KEY-----
```

**Backend: Store Public Key**

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "publicKeyPem": "-----BEGIN PUBLIC KEY-----\nMIIBIj...\n-----END PUBLIC KEY-----",
  "keyId": "v1"
}
```

**Response:**

```json
{
  "ok": true,
  "message": "Public key registered successfully",
  "keyId": "v1"
}
```

---

### 2. Encrypting a Message (Send)

**Frontend: Encrypt Message for Recipient**

```javascript
import { encryptMessageForRecipient } from "./lib/crypto";

const plaintext = "Hello! This is a secret message.";
const recipientPublicKeyPem = "-----BEGIN PUBLIC KEY-----\nMIIBIj...\n-----END PUBLIC KEY-----";

// Encrypt
const messagePayload = await encryptMessageForRecipient(plaintext, recipientPublicKeyPem);

console.log(messagePayload);
```

**Output: Encrypted Message Payload**

```json
{
  "version": 1,
  "alg": "AES-GCM+RSA-OAEP",
  "iv": "rN3jK8pQmL9xT2vY",
  "wrappedKey": "XyZ1a2b3...c4d5e6f==",
  "ciphertext": "dGh1c3...Mlpcw=="
}
```

**Send to Backend:**

```javascript
await axiosInstance.post("/messages/send/507f1f77bcf86cd799439011", {
  messagePayload,
  isEncrypted: true
});
```

**Backend: Store Encrypted Payload**

```json
{
  "_id": "60d5ecb54b24a1234567890a",
  "senderId": "507f1f77bcf86cd799439011",
  "receiverId": "507f1f77bcf86cd799439012",
  "messagePayload": {
    "version": 1,
    "alg": "AES-GCM+RSA-OAEP",
    "iv": "rN3jK8pQmL9xT2vY",
    "wrappedKey": "XyZ1a2b3...c4d5e6f==",
    "ciphertext": "dGh1c3...Mlpcw=="
  },
  "isEncrypted": true,
  "createdAt": "2023-10-28T12:34:56.789Z"
}
```

---

### 3. Decrypting a Message (Receive)

**Frontend: Fetch and Decrypt Messages**

```javascript
import { decryptMessagePayload, parseMessagePayload } from "./lib/crypto";
import { getPrivateKey } from "./lib/keyStorage";

const userId = "507f1f77bcf86cd799439011";
const passphrase = "MyS3cur3P@ssw0rd!";

// Fetch messages from backend
const res = await axiosInstance.get("/messages/507f1f77bcf86cd799439012");
const messages = res.data;

// Load private key
const privateKey = await getPrivateKey(userId, passphrase);

// Decrypt each message
const decryptedMessages = await Promise.all(
  messages.map(async (msg) => {
    if (!msg.isEncrypted) return msg;

    try {
      const payload = parseMessagePayload(msg.messagePayload);
      const plaintext = await decryptMessagePayload(payload, privateKey);
      return { ...msg, text: plaintext };
    } catch (error) {
      return { ...msg, text: "[🔒 Can't decrypt this message]" };
    }
  })
);

console.log(decryptedMessages);
```

**Output: Decrypted Messages**

```json
[
  {
    "_id": "60d5ecb54b24a1234567890a",
    "senderId": "507f1f77bcf86cd799439011",
    "receiverId": "507f1f77bcf86cd799439012",
    "text": "Hello! This is a secret message.",
    "isEncrypted": true,
    "createdAt": "2023-10-28T12:34:56.789Z"
  }
]
```

---

### 4. Failed Decryption (Fallback)

**Scenario:** User tries to decrypt with wrong passphrase or missing private key.

**Output:**

```json
{
  "_id": "60d5ecb54b24a1234567890a",
  "senderId": "507f1f77bcf86cd799439011",
  "receiverId": "507f1f77bcf86cd799439012",
  "text": "[🔒 Can't decrypt this message]",
  "isEncrypted": true,
  "_decryptionFailed": true,
  "createdAt": "2023-10-28T12:34:56.789Z"
}
```

**UI Display:** Message shown with lock icon and italic styling.

---

## Key Management Best Practices

### 1. Passphrase Security

#### DO ✅
- Use a **strong passphrase** (min 12 chars, mix of upper/lower/numbers/symbols)
- Store passphrase in a **password manager** (e.g., 1Password, Bitwarden)
- Never share passphrase via insecure channels
- Use different passphrases for different services

#### DON'T ❌
- Don't use weak passphrases (e.g., "password123")
- Don't reuse passphrases across services
- Don't store passphrase in plaintext files
- Don't log passphrase to console or analytics

### 2. Private Key Storage

#### Current Implementation: IndexedDB + PBKDF2

**Security:**
- Private key encrypted at rest with passphrase-derived AES key
- 100,000 PBKDF2 iterations (OWASP recommendation)
- Browser sandboxing protects against other websites

**Risks:**
- Vulnerable if attacker has physical access to device
- Vulnerable if passphrase is weak or compromised
- Browser extensions can potentially access IndexedDB

**Recommendations:**
- Enable full disk encryption on device (BitLocker, FileVault)
- Use strong passphrase with high entropy
- Clear IndexedDB on logout (optional)

#### Future Enhancement: Hardware-Backed Storage

**For Electron/Native Apps:**
- Use OS keychain (macOS Keychain, Windows Credential Manager)
- Hardware security modules (TPM, Secure Enclave)
- No passphrase needed (managed by OS)

### 3. Key Backup & Recovery

#### Problem: Lost passphrase = lost messages

**Solutions:**

1. **Encrypted Backup Export**
   ```javascript
   import { exportPrivateKeyBackup } from "./lib/keyStorage";
   
   const backupJson = await exportPrivateKeyBackup(userId, passphrase);
   // User saves this JSON to secure location (password manager)
   ```

2. **Recovery Key (future enhancement)**
   - Generate a recovery key during signup
   - Display once, user must save it
   - Can be used to decrypt private key if passphrase forgotten

3. **Multi-Device Sync (future enhancement)**
   - Encrypt private key with secondary passphrase
   - Store on backend for multi-device access
   - User enters secondary passphrase on new device

### 4. Key Rotation

#### Why rotate keys?
- Compromised private key
- Lost passphrase (with backup)
- Algorithm upgrade (RSA 2048 → 4096)

#### How to rotate:

1. Generate new key pair
2. Register new public key with `keyId: "v2"`
3. Update backend to use new key for future messages
4. Keep old private key for decrypting old messages

**Backend stores:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "publicKeyPem": "-----BEGIN PUBLIC KEY-----\n...(new key)...\n-----END PUBLIC KEY-----",
  "keyId": "v2",
  "previousKeys": [
    { "keyId": "v1", "publicKeyPem": "..." }
  ]
}
```

**Frontend decryption logic:**
```javascript
// Try decrypting with current key first, then fall back to old keys
let plaintext = null;
for (const keyId of ["v2", "v1"]) {
  try {
    const privateKey = await getPrivateKey(userId, passphrase, keyId);
    plaintext = await decryptMessagePayload(messagePayload, privateKey);
    break;
  } catch {
    continue;
  }
}
```

### 5. Secure Passphrase Storage (Session Management)

#### Current Implementation: In-Memory Only

**Code:**
```javascript
// useAuthStore.js
export const useAuthStore = create((set, get) => ({
  userPassphrase: null, // Cleared on logout
  // ...
}));
```

**Behavior:**
- Passphrase stored in JavaScript variable (memory)
- Cleared on logout
- Lost on page refresh (user must re-enter)

**Tradeoff:**
- ✅ More secure (no persistent storage)
- ❌ Less convenient (re-enter on refresh)

#### Alternative: Encrypted Session Storage

**If you want persistence across page refreshes:**

```javascript
// Encrypt passphrase with a session key (derived from timestamp + random salt)
const sessionKey = await deriveKeyFromPassphrase(
  `${Date.now()}-${crypto.randomUUID()}`,
  salt
);

const encryptedPassphrase = await crypto.subtle.encrypt(
  { name: "AES-GCM", iv },
  sessionKey,
  new TextEncoder().encode(passphrase)
);

sessionStorage.setItem("encPassphrase", arrayBufferToBase64(encryptedPassphrase));
```

**Tradeoff:**
- ✅ Survives page refresh
- ❌ Still vulnerable if attacker has access to browser session

---

## Security Considerations

### 1. What the Backend CAN See

- ❌ Plaintext messages (encrypted)
- ❌ Private keys (never sent)
- ❌ Passphrases (never sent)
- ✅ Sender and recipient IDs
- ✅ Message timestamps
- ✅ Message metadata (encrypted payload size)

### 2. Attack Vectors & Mitigations

#### XSS (Cross-Site Scripting)
**Attack:** Inject malicious script to steal keys from memory.  
**Mitigation:**
- Sanitize all user inputs
- Use Content Security Policy (CSP)
- Avoid `eval()` and `innerHTML`

#### MITM (Man-in-the-Middle)
**Attack:** Intercept and replace public keys.  
**Mitigation:**
- Use HTTPS (TLS) for all API requests
- Pin backend certificate (for native apps)
- Verify public key fingerprints (future enhancement)

#### Compromised Backend
**Attack:** Backend admin tries to decrypt messages.  
**Mitigation:**
- ✅ Backend never has private keys
- ✅ Backend cannot decrypt messages
- ✅ Even database breach doesn't expose plaintext

#### Weak Passphrase
**Attack:** Brute force passphrase to decrypt private key.  
**Mitigation:**
- Enforce strong passphrase requirements (min 12 chars)
- Use high PBKDF2 iterations (100k+)
- Warn users about weak passphrases

### 3. Compliance Considerations

#### GDPR (EU)
- ✅ Data minimization: backend doesn't see plaintext
- ✅ Right to erasure: delete encrypted messages
- ⚠️ Right to access: user must have passphrase

#### HIPAA (US Healthcare)
- ✅ Encryption at rest (IndexedDB)
- ✅ Encryption in transit (HTTPS)
- ✅ Access controls (passphrase required)

---

## Testing & Validation

### 1. Manual Test Cases

#### Test 1: Send & Receive Encrypted Message
1. User A generates keys with passphrase "Pass123!"
2. User A sends message "Secret" to User B
3. User B unlocks with passphrase "Pass456!"
4. User B sees message "Secret" decrypted

**Expected:** ✅ Message decrypts successfully

#### Test 2: Wrong Passphrase
1. User A sends encrypted message to User B
2. User B enters wrong passphrase
3. User B sees "[🔒 Can't decrypt this message]"

**Expected:** ✅ Graceful fallback UI

#### Test 3: Key Rotation
1. User A generates keys v1
2. User A sends message 1 to User B
3. User A rotates to keys v2
4. User A sends message 2 to User B
5. User B should decrypt both messages

**Expected:** ✅ Both messages decrypt (with keyId support)

### 2. Automated Tests

```javascript
// Example test: encrypt and decrypt
import { encryptMessageForRecipient, decryptMessagePayload } from "./crypto";

test("encrypt and decrypt message", async () => {
  const { publicKey, privateKey } = await generateRsaKeyPair();
  const publicKeyPem = await exportPublicKeyToPem(publicKey);
  
  const plaintext = "Test message";
  const encrypted = await encryptMessageForRecipient(plaintext, publicKeyPem);
  const decrypted = await decryptMessagePayload(encrypted, privateKey);
  
  expect(decrypted).toBe(plaintext);
});
```

---

## Troubleshooting

### Issue: "Can't decrypt this message"

**Causes:**
1. Wrong passphrase entered
2. Private key not found in IndexedDB
3. Message encrypted with different key (key rotation)
4. Corrupted encrypted payload

**Solutions:**
1. Re-enter correct passphrase
2. Import key backup if available
3. Check keyId in message payload
4. Ask sender to re-send message

### Issue: "Failed to enable encryption"

**Causes:**
1. Web Crypto API not available (HTTP instead of HTTPS)
2. Browser doesn't support RSA-OAEP or AES-GCM
3. IndexedDB quota exceeded

**Solutions:**
1. Use HTTPS (required for crypto.subtle)
2. Upgrade to modern browser (Chrome 37+, Firefox 34+)
3. Clear IndexedDB storage

### Issue: Performance slow on mobile

**Causes:**
- RSA operations are CPU-intensive
- PBKDF2 100k iterations takes time

**Solutions:**
- Show loading spinner during key generation/unlock
- Use Web Workers for crypto operations (future)
- Cache decrypted messages in memory

---

## Future Enhancements

### 1. Perfect Forward Secrecy (PFS)
- Use ephemeral keys per session (Signal Protocol)
- Old messages can't be decrypted if key compromised

### 2. Group Chat Encryption
- Generate group key
- Encrypt group key for each member
- Manage member add/remove (re-key)

### 3. Key Verification
- Display public key fingerprints
- Out-of-band verification (QR codes, voice)
- Warn if public key changes

### 4. Encrypted Attachments
- Encrypt images before Cloudinary upload
- Store encryption key in message payload
- Decrypt on client before display

### 5. Encrypted Backups
- Export all messages + keys to encrypted file
- Restore on new device with passphrase
- Cloud sync with E2E encryption (e.g., to Google Drive)

---

## References

### Standards & Specifications

- [Web Crypto API - W3C](https://www.w3.org/TR/WebCryptoAPI/)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [NIST SP 800-132 - PBKDF Recommendations](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-132.pdf)

### Libraries & Tools

- [SubtleCrypto (Web Crypto API)](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Signal Protocol](https://signal.org/docs/)

### Cryptography Concepts

- [Hybrid Encryption](https://en.wikipedia.org/wiki/Hybrid_cryptosystem)
- [RSA-OAEP](https://en.wikipedia.org/wiki/Optimal_asymmetric_encryption_padding)
- [AES-GCM](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
- [PBKDF2](https://en.wikipedia.org/wiki/PBKDF2)

---

## Contact & Support

For questions or issues with the encryption implementation:

1. Check this README for common issues
2. Review code comments in `crypto.js` and `keyStorage.js`
3. Test with I/O examples above
4. Open GitHub issue with detailed error logs

**Remember:** Never share private keys, passphrases, or plaintext messages in bug reports!

---

## License

This encryption implementation is part of the Chatify project and follows the same license.

**Disclaimer:** This implementation is for educational/demonstration purposes. For production use, conduct a thorough security audit and consider professional cryptography review.

---

**Last Updated:** October 28, 2025  
**Version:** 1.0.0  
**Encryption Algorithm:** AES-256-GCM + RSA-OAEP-2048
