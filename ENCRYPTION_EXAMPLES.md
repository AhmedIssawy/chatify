# E2E Encryption Code Examples

This file contains copy-pastable code examples for implementing and testing end-to-end encryption in Chatify.

## Table of Contents

1. [User Registration with Encryption](#1-user-registration-with-encryption)
2. [User Login with Encryption Unlock](#2-user-login-with-encryption-unlock)
3. [Sending Encrypted Messages](#3-sending-encrypted-messages)
4. [Receiving and Decrypting Messages](#4-receiving-and-decrypting-messages)
5. [Key Backup and Restore](#5-key-backup-and-restore)
6. [Manual Encryption/Decryption Testing](#6-manual-encryptiondecryption-testing)
7. [Backend API Usage](#7-backend-api-usage)

---

## 1. User Registration with Encryption

### Frontend: During Signup Flow

```javascript
// In SignUpPage.jsx or useAuthStore.js

import { useAuthStore } from "../store/useAuthStore";

const SignUpPage = () => {
  const { signup, setupEncryption } = useAuthStore();
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    password: "",
    encryptionPassphrase: "", // Optional: separate from login password
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Create account
    await signup({
      email: formData.email,
      fullName: formData.fullName,
      password: formData.password,
    });

    // 2. Optional: Set up encryption immediately
    if (formData.encryptionPassphrase) {
      const success = await setupEncryption(formData.encryptionPassphrase);
      
      if (success) {
        toast.success("Account created with encryption enabled! 🔒");
      } else {
        toast.error("Account created, but encryption setup failed.");
      }
    } else {
      // User can set up encryption later
      toast.success("Account created! Set up encryption in chat settings.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Email"
        required
      />
      <input
        type="text"
        value={formData.fullName}
        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
        placeholder="Full Name"
        required
      />
      <input
        type="password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        placeholder="Password"
        required
      />
      
      {/* Optional: Encryption passphrase during signup */}
      <div className="border-t pt-4 mt-4">
        <label className="text-sm font-medium">
          Encryption Passphrase (Optional)
        </label>
        <input
          type="password"
          value={formData.encryptionPassphrase}
          onChange={(e) => setFormData({ ...formData, encryptionPassphrase: e.target.value })}
          placeholder="Separate passphrase for encryption"
          minLength={8}
        />
        <p className="text-xs text-gray-500 mt-1">
          If set, your messages will be end-to-end encrypted. This cannot be recovered if forgotten.
        </p>
      </div>

      <button type="submit">Sign Up</button>
    </form>
  );
};
```

### Backend: Store Public Key

```javascript
// In auth.controller.js (signup endpoint)

import User from "../models/User.js";

export const signup = async (req, res) => {
  const { email, fullName, password } = req.body;

  // ... existing signup logic ...

  const newUser = new User({
    email,
    fullName,
    password: hashedPassword,
    publicKeyPem: "", // Initially empty
    keyId: "v1",
  });

  await newUser.save();

  // ... generate token and send response ...
};
```

---

## 2. User Login with Encryption Unlock

### Frontend: During Login Flow

```javascript
// In LoginPage.jsx

import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import EncryptionSetup from "../components/EncryptionSetup";

const LoginPage = () => {
  const { login, hasEncryptionKey, unlockEncryption } = useAuthStore();
  const [showEncryptionUnlock, setShowEncryptionUnlock] = useState(false);
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    
    await login(loginData);

    // After successful login, check if user has encryption keys
    if (hasEncryptionKey) {
      // Prompt user to unlock encryption
      setShowEncryptionUnlock(true);
    }
  };

  return (
    <>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          value={loginData.email}
          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={loginData.password}
          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
          placeholder="Password"
          required
        />
        <button type="submit">Log In</button>
      </form>

      {/* Show encryption unlock modal after login */}
      {showEncryptionUnlock && (
        <EncryptionSetup
          mode="unlock"
          onClose={() => setShowEncryptionUnlock(false)}
        />
      )}
    </>
  );
};
```

---

## 3. Sending Encrypted Messages

### Example 1: Automatic Encryption (via useChatStore)

```javascript
// In ChatWidget.jsx

import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";

const ChatWidget = () => {
  const { sendMessage } = useChatStore();
  const { isEncryptionEnabled, hasEncryptionKey, userPassphrase } = useAuthStore();
  const [messageText, setMessageText] = useState("");

  const handleSend = async (e) => {
    e.preventDefault();

    // sendMessage automatically encrypts if encryption is enabled
    await sendMessage({
      text: messageText,
      image: null,
    });

    setMessageText("");
  };

  return (
    <form onSubmit={handleSend}>
      {/* Show encryption status */}
      {isEncryptionEnabled && hasEncryptionKey && userPassphrase && (
        <div className="bg-green-100 p-2 text-xs text-green-800">
          🔒 This message will be encrypted
        </div>
      )}

      <input
        type="text"
        value={messageText}
        onChange={(e) => setMessageText(e.target.value)}
        placeholder="Type a message..."
      />
      <button type="submit">Send</button>
    </form>
  );
};
```

### Example 2: Manual Encryption (Low-Level)

```javascript
// In a custom hook or component

import { axiosInstance } from "../lib/axios";
import { encryptMessageForRecipient } from "../lib/crypto";

const sendEncryptedMessage = async (recipientId, plaintext) => {
  try {
    // 1. Fetch recipient's public key
    const keyRes = await axiosInstance.get(`/keys/${recipientId}`);
    const { publicKeyPem } = keyRes.data;

    // 2. Encrypt message
    const messagePayload = await encryptMessageForRecipient(plaintext, publicKeyPem);

    // 3. Send to backend
    const res = await axiosInstance.post(`/messages/send/${recipientId}`, {
      messagePayload,
      isEncrypted: true,
    });

    console.log("Encrypted message sent:", res.data);
    return res.data;
  } catch (error) {
    console.error("Failed to send encrypted message:", error);
    throw error;
  }
};

// Usage:
await sendEncryptedMessage("507f1f77bcf86cd799439012", "Secret message");
```

---

## 4. Receiving and Decrypting Messages

### Example 1: Automatic Decryption (via useChatStore)

```javascript
// In ChatWidget.jsx

import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";

const ChatWidget = () => {
  const { selectedUser, getMessagesByUserId, messages } = useChatStore();

  useEffect(() => {
    if (selectedUser) {
      // getMessagesByUserId automatically decrypts messages
      getMessagesByUserId(selectedUser._id);
    }
  }, [selectedUser]);

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg._id}>
          {/* If decryption failed, msg.text will be "[🔒 Can't decrypt this message]" */}
          {msg._decryptionFailed && <span className="text-red-500">🔒</span>}
          <p>{msg.text}</p>
        </div>
      ))}
    </div>
  );
};
```

### Example 2: Manual Decryption (Low-Level)

```javascript
// In a custom hook or component

import { axiosInstance } from "../lib/axios";
import { decryptMessagePayload, parseMessagePayload } from "../lib/crypto";
import { getPrivateKey } from "../lib/keyStorage";

const fetchAndDecryptMessages = async (conversationId, userId, passphrase) => {
  try {
    // 1. Fetch encrypted messages from backend
    const res = await axiosInstance.get(`/messages/${conversationId}`);
    const encryptedMessages = res.data;

    // 2. Get user's private key
    const privateKey = await getPrivateKey(userId, passphrase);

    if (!privateKey) {
      throw new Error("Private key not found. Set up encryption first.");
    }

    // 3. Decrypt each message
    const decryptedMessages = await Promise.all(
      encryptedMessages.map(async (msg) => {
        // Skip if not encrypted
        if (!msg.isEncrypted || !msg.messagePayload) {
          return msg;
        }

        try {
          const payload = parseMessagePayload(msg.messagePayload);
          const plaintext = await decryptMessagePayload(payload, privateKey);

          return {
            ...msg,
            text: plaintext,
            _decrypted: true,
          };
        } catch (error) {
          console.error("Failed to decrypt message:", msg._id, error);
          return {
            ...msg,
            text: "[🔒 Can't decrypt this message]",
            _decryptionFailed: true,
          };
        }
      })
    );

    return decryptedMessages;
  } catch (error) {
    console.error("Failed to fetch and decrypt messages:", error);
    throw error;
  }
};

// Usage:
const messages = await fetchAndDecryptMessages(
  "507f1f77bcf86cd799439012",
  "507f1f77bcf86cd799439011",
  "MyPassphrase123!"
);
```

---

## 5. Key Backup and Restore

### Export Private Key Backup

```javascript
// In a settings page or component

import { exportPrivateKeyBackup } from "../lib/keyStorage";
import { useAuthStore } from "../store/useAuthStore";

const ExportKeyBackup = () => {
  const { authUser, userPassphrase } = useAuthStore();

  const handleExport = async () => {
    try {
      if (!userPassphrase) {
        alert("Please unlock encryption first");
        return;
      }

      const backupJson = await exportPrivateKeyBackup(authUser._id, userPassphrase);

      // Download as file
      const blob = new Blob([backupJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chatify-key-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      alert("Key backup exported! Store this file securely.");
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export key backup");
    }
  };

  return (
    <button onClick={handleExport} className="btn btn-primary">
      📦 Export Key Backup
    </button>
  );
};
```

### Import Private Key Backup

```javascript
// In a settings page or component

import { importPrivateKeyBackup } from "../lib/keyStorage";

const ImportKeyBackup = () => {
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const backupJson = await file.text();
      await importPrivateKeyBackup(backupJson);

      alert("Key backup imported successfully! You can now decrypt your messages.");
    } catch (error) {
      console.error("Import failed:", error);
      alert("Failed to import key backup. Check file format.");
    }
  };

  return (
    <div>
      <label className="btn btn-secondary">
        📥 Import Key Backup
        <input
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
      </label>
    </div>
  );
};
```

---

## 6. Manual Encryption/Decryption Testing

### Test in Browser Console

```javascript
// Open browser console (F12) and run:

// 1. Import functions (if using ES modules)
import {
  generateRsaKeyPair,
  exportPublicKeyToPem,
  encryptMessageForRecipient,
  decryptMessagePayload,
} from "./lib/crypto.js";

// 2. Generate keys
const { publicKey, privateKey } = await generateRsaKeyPair();
const publicKeyPem = await exportPublicKeyToPem(publicKey);

console.log("Public Key:", publicKeyPem);

// 3. Encrypt a message
const plaintext = "This is a test message!";
const encrypted = await encryptMessageForRecipient(plaintext, publicKeyPem);

console.log("Encrypted:", encrypted);
// Output: { version: 1, alg: "AES-GCM+RSA-OAEP", iv: "...", wrappedKey: "...", ciphertext: "..." }

// 4. Decrypt the message
const decrypted = await decryptMessagePayload(encrypted, privateKey);

console.log("Decrypted:", decrypted);
// Output: "This is a test message!"

// 5. Verify they match
console.assert(plaintext === decrypted, "Encryption/decryption failed!");
```

### Test with Different Users

```javascript
// User A
const userA = await generateRsaKeyPair();
const userAPubPem = await exportPublicKeyToPem(userA.publicKey);

// User B
const userB = await generateRsaKeyPair();
const userBPubPem = await exportPublicKeyToPem(userB.publicKey);

// User A sends message to User B
const message = "Hello from A to B!";
const encryptedForB = await encryptMessageForRecipient(message, userBPubPem);

// User B decrypts
const decryptedByB = await decryptMessagePayload(encryptedForB, userB.privateKey);
console.log(decryptedByB); // "Hello from A to B!"

// User A tries to decrypt (should fail - not the recipient)
try {
  await decryptMessagePayload(encryptedForB, userA.privateKey);
} catch (error) {
  console.log("User A cannot decrypt (as expected):", error.message);
}
```

---

## 7. Backend API Usage

### Register Public Key

```bash
curl -X POST http://localhost:3000/api/keys/register \
  -H "Content-Type: application/json" \
  -H "Cookie: jwt=YOUR_JWT_TOKEN" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "publicKeyPem": "-----BEGIN PUBLIC KEY-----\nMIIBIj...\n-----END PUBLIC KEY-----",
    "keyId": "v1"
  }'
```

**Response:**
```json
{
  "ok": true,
  "message": "Public key registered successfully",
  "keyId": "v1"
}
```

### Fetch Public Key

```bash
curl -X GET http://localhost:3000/api/keys/507f1f77bcf86cd799439011 \
  -H "Cookie: jwt=YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "publicKeyPem": "-----BEGIN PUBLIC KEY-----\nMIIBIj...\n-----END PUBLIC KEY-----",
  "keyId": "v1"
}
```

### Send Encrypted Message

```bash
curl -X POST http://localhost:3000/api/messages/send/507f1f77bcf86cd799439012 \
  -H "Content-Type: application/json" \
  -H "Cookie: jwt=YOUR_JWT_TOKEN" \
  -d '{
    "messagePayload": {
      "version": 1,
      "alg": "AES-GCM+RSA-OAEP",
      "iv": "rN3jK8pQmL9xT2vY",
      "wrappedKey": "XyZ1a2b3...c4d5e6f==",
      "ciphertext": "dGh1c3...Mlpcw=="
    },
    "isEncrypted": true
  }'
```

**Response:**
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

### Fetch Messages (Returns Encrypted)

```bash
curl -X GET http://localhost:3000/api/messages/507f1f77bcf86cd799439012 \
  -H "Cookie: jwt=YOUR_JWT_TOKEN"
```

**Response:**
```json
[
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
]
```

---

## 📝 Notes

- All examples assume you're running on **HTTPS** or **localhost** (required for Web Crypto API)
- Replace `YOUR_JWT_TOKEN` with actual JWT from login
- User IDs are MongoDB ObjectIds (24-character hex strings)
- Passphrases should be at least 8 characters (12+ recommended)
- Always handle errors gracefully (decryption can fail)

## 🚀 Next Steps

1. Copy relevant examples to your components
2. Test encryption/decryption flow end-to-end
3. Implement key backup UI
4. Add encryption settings page
5. Read `ENCRYPTION_README.md` for advanced topics

Happy encrypting! 🔒
