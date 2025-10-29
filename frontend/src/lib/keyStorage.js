/**
 * Secure Key Storage Module
 * 
 * Stores RSA private keys securely in IndexedDB, encrypted with a user passphrase.
 * Uses PBKDF2 to derive an AES key from the passphrase, then encrypts the private key.
 * 
 * SECURITY TRADEOFFS:
 * 
 * 1. IndexedDB with passphrase encryption (RECOMMENDED for web apps):
 *    ✓ Works in all browsers
 *    ✓ Private key encrypted at rest
 *    ✓ User controls passphrase
 *    ✗ Vulnerable if passphrase is weak
 *    ✗ Private key in memory during decryption
 * 
 * 2. OS Secure Storage (future enhancement):
 *    ✓ Hardware-backed security (e.g., TPM, Secure Enclave)
 *    ✓ No passphrase needed (managed by OS)
 *    ✗ Requires Electron or native app
 *    ✗ Not available in browsers
 * 
 * 3. No encryption (NOT RECOMMENDED):
 *    ✗ Private key stored in plaintext
 *    ✗ Anyone with file system access can read it
 */

const DB_NAME = "chatify_secure_keys";
const DB_VERSION = 1;
const STORE_NAME = "private_keys";
const PBKDF2_ITERATIONS = 100000; // OWASP recommendation for 2023+

/**
 * Initialize IndexedDB for key storage.
 * 
 * @returns {Promise<IDBDatabase>}
 */
async function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "userId" });
      }
    };
  });
}

/**
 * Derives an AES key from a user passphrase using PBKDF2.
 * 
 * @param {string} passphrase - User's passphrase
 * @param {Uint8Array} salt - Salt for PBKDF2 (16 bytes recommended)
 * @returns {Promise<CryptoKey>} Derived AES-256 key
 */
async function deriveKeyFromPassphrase(passphrase, salt) {
  try {
    // Import passphrase as a key material
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(passphrase),
      "PBKDF2",
      false,
      ["deriveBits", "deriveKey"]
    );
    
    // Derive AES-256-GCM key from passphrase
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      {
        name: "AES-GCM",
        length: 256,
      },
      false, // not extractable
      ["encrypt", "decrypt"]
    );
    
    return derivedKey;
  } catch (error) {
    console.error("Failed to derive key from passphrase:", error);
    throw new Error("Key derivation failed");
  }
}

/**
 * Saves a private key to IndexedDB, encrypted with a passphrase.
 * 
 * @param {string} userId - User ID to associate with the key
 * @param {CryptoKey} privateKey - RSA private key to store
 * @param {string} passphrase - User's passphrase for encryption
 * @returns {Promise<void>}
 * 
 * Example Input:
 * userId: "user_123"
 * privateKey: CryptoKey { type: "private", ... }
 * passphrase: "MyS3cur3P@ssw0rd!"
 */
export async function savePrivateKey(userId, privateKey, passphrase) {
  try {
    // 1. Export private key to PEM format
    const exported = await crypto.subtle.exportKey("pkcs8", privateKey);
    
    // 2. Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // 3. Derive encryption key from passphrase
    const encryptionKey = await deriveKeyFromPassphrase(passphrase, salt);
    
    // 4. Encrypt the private key
    const encryptedPrivateKey = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      encryptionKey,
      exported
    );
    
    // 5. Store in IndexedDB
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    
    // Convert to base64 for storage
    const record = {
      userId: userId,
      encryptedPrivateKey: arrayBufferToBase64(encryptedPrivateKey),
      salt: arrayBufferToBase64(salt.buffer),
      iv: arrayBufferToBase64(iv.buffer),
      timestamp: Date.now(),
    };
    
    await new Promise((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    db.close();
    
    console.log(`Private key saved securely for user ${userId}`);
  } catch (error) {
    console.error("Failed to save private key:", error);
    throw new Error("Private key storage failed");
  }
}

/**
 * Retrieves and decrypts a private key from IndexedDB.
 * 
 * @param {string} userId - User ID
 * @param {string} passphrase - User's passphrase for decryption
 * @returns {Promise<CryptoKey|null>} Decrypted RSA private key, or null if not found
 * 
 * Example Input:
 * userId: "user_123"
 * passphrase: "MyS3cur3P@ssw0rd!"
 * 
 * Example Output:
 * CryptoKey { type: "private", algorithm: { name: "RSA-OAEP", ... } }
 */
export async function getPrivateKey(userId, passphrase) {
  try {
    // 1. Retrieve encrypted key from IndexedDB
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    
    const record = await new Promise((resolve, reject) => {
      const request = store.get(userId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    db.close();
    
    if (!record) {
      console.warn(`No private key found for user ${userId}`);
      return null;
    }
    
    // 2. Decode from base64
    const encryptedPrivateKey = base64ToArrayBuffer(record.encryptedPrivateKey);
    const salt = base64ToArrayBuffer(record.salt);
    const iv = base64ToArrayBuffer(record.iv);
    
    // 3. Derive decryption key from passphrase
    const decryptionKey = await deriveKeyFromPassphrase(passphrase, new Uint8Array(salt));
    
    // 4. Decrypt the private key
    const decryptedPrivateKey = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(iv),
      },
      decryptionKey,
      encryptedPrivateKey
    );
    
    // 5. Import back to CryptoKey
    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      decryptedPrivateKey,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["decrypt", "unwrapKey"]
    );
    
    return privateKey;
  } catch (error) {
    console.error("Failed to retrieve private key:", error);
    // Wrong passphrase or corrupted data
    throw new Error("Private key retrieval failed. Check your passphrase.");
  }
}

/**
 * Checks if a private key exists for a user.
 * 
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if key exists
 */
export async function hasPrivateKey(userId) {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    
    const exists = await new Promise((resolve, reject) => {
      const request = store.get(userId);
      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => reject(request.error);
    });
    
    db.close();
    return exists;
  } catch (error) {
    console.error("Failed to check private key existence:", error);
    return false;
  }
}

/**
 * Deletes a private key from IndexedDB.
 * Use this when user logs out or wants to remove their key.
 * 
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function deletePrivateKey(userId) {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    
    await new Promise((resolve, reject) => {
      const request = store.delete(userId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    db.close();
    console.log(`Private key deleted for user ${userId}`);
  } catch (error) {
    console.error("Failed to delete private key:", error);
    throw new Error("Private key deletion failed");
  }
}

/**
 * Exports a private key for backup (encrypted with passphrase).
 * User should save this in a secure location (password manager, encrypted file, etc.)
 * 
 * @param {string} userId - User ID
 * @param {string} passphrase - User's passphrase
 * @returns {Promise<string>} JSON string containing encrypted backup
 * 
 * Example Output:
 * "{\"userId\":\"user_123\",\"encryptedPrivateKey\":\"...\",\"salt\":\"...\",\"iv\":\"...\"}"
 */
export async function exportPrivateKeyBackup(userId, passphrase) {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    
    const record = await new Promise((resolve, reject) => {
      const request = store.get(userId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    db.close();
    
    if (!record) {
      throw new Error("No private key found to export");
    }
    
    // Return encrypted backup (user should store this securely)
    return JSON.stringify({
      userId: record.userId,
      encryptedPrivateKey: record.encryptedPrivateKey,
      salt: record.salt,
      iv: record.iv,
      timestamp: record.timestamp,
    });
  } catch (error) {
    console.error("Failed to export private key backup:", error);
    throw new Error("Private key export failed");
  }
}

/**
 * Imports a private key from a backup.
 * 
 * @param {string} backupJson - JSON string from exportPrivateKeyBackup
 * @returns {Promise<void>}
 * 
 * Example Input:
 * "{\"userId\":\"user_123\",\"encryptedPrivateKey\":\"...\",\"salt\":\"...\",\"iv\":\"...\"}"
 */
export async function importPrivateKeyBackup(backupJson) {
  try {
    const record = JSON.parse(backupJson);
    
    // Validate backup structure
    if (!record.userId || !record.encryptedPrivateKey || !record.salt || !record.iv) {
      throw new Error("Invalid backup format");
    }
    
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    
    await new Promise((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    db.close();
    console.log(`Private key imported for user ${record.userId}`);
  } catch (error) {
    console.error("Failed to import private key backup:", error);
    throw new Error("Private key import failed");
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
