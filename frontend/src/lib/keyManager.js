/**
 * keyManager.js - WhatsApp-style automatic key management
 * 
 * Purpose: Provides transparent, persistent encryption key management without requiring
 * user passphrases on every session. Keys are encrypted with a device-bound AES key
 * and automatically restored across page refreshes.
 * 
 * Key Features:
 * - Automatic key generation and storage
 * - Device-bound encryption (no password prompts)
 * - Silent key restoration on app load
 * - Multi-device support via export/import
 * - Secure cleanup on logout
 * 
 * Flow:
 * 1. First use: Generate RSA key pair + device key → Store encrypted in IndexedDB
 * 2. Page refresh: Auto-restore keys from IndexedDB → Decrypt with device key
 * 3. Logout: Clear all keys from IndexedDB
 * 4. Multi-device: Export encrypted backup → Import on new device
 */

import { openDB } from 'idb';
import {
  generateRsaKeyPair,
  exportPublicKeyToPem,
  importPublicKeyFromPem,
} from './crypto';

// IndexedDB configuration
const DB_NAME = 'chatify-encryption-db';
const DB_VERSION = 2;
const STORE_NAME = 'encryption-keys';
const DEVICE_KEY_STORE = 'device-keys';

/**
 * Initialize IndexedDB database
 * Creates two stores:
 * - encryption-keys: User's encrypted RSA private keys
 * - device-keys: Device-bound AES key for encrypting private keys
 */
async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Create stores if they don't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(DEVICE_KEY_STORE)) {
        db.createObjectStore(DEVICE_KEY_STORE);
      }
    },
  });
}

/**
 * Get or generate a device-bound AES key
 * This key is used to encrypt the user's private RSA key
 * It's stored in IndexedDB and persists across sessions
 * 
 * @returns {Promise<CryptoKey>} Device-bound AES-GCM key
 */
async function getDeviceKey() {
  const db = await getDB();
  
  // Check if device key already exists
  let deviceKeyData = await db.get(DEVICE_KEY_STORE, 'device-key');
  
  if (deviceKeyData) {
    // Import existing device key
    return await crypto.subtle.importKey(
      'jwk',
      deviceKeyData,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }
  
  // Generate new device key (first time setup)
  const deviceKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable
    ['encrypt', 'decrypt']
  );
  
  // Export and store device key
  const exportedKey = await crypto.subtle.exportKey('jwk', deviceKey);
  await db.put(DEVICE_KEY_STORE, exportedKey, 'device-key');
  
  return deviceKey;
}

/**
 * Encrypt data using device-bound key
 * 
 * @param {any} data - Data to encrypt
 * @param {CryptoKey} deviceKey - Device-bound AES key
 * @returns {Promise<{encrypted: ArrayBuffer, iv: Uint8Array}>}
 */
async function encryptWithDeviceKey(data, deviceKey) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(JSON.stringify(data));
  
  // Generate random IV (initialization vector)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt data
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    deviceKey,
    dataBuffer
  );
  
  return { encrypted, iv };
}

/**
 * Decrypt data using device-bound key
 * 
 * @param {ArrayBuffer} encrypted - Encrypted data
 * @param {Uint8Array} iv - Initialization vector
 * @param {CryptoKey} deviceKey - Device-bound AES key
 * @returns {Promise<any>} Decrypted data
 */
async function decryptWithDeviceKey(encrypted, iv, deviceKey) {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    deviceKey,
    encrypted
  );
  
  const decoder = new TextDecoder();
  const jsonString = decoder.decode(decrypted);
  return JSON.parse(jsonString);
}

/**
 * Generate and store RSA key pair for a user
 * This is called automatically on first signup/login
 * 
 * @param {string} userId - User's unique ID
 * @returns {Promise<{publicKey: CryptoKey, privateKey: CryptoKey, publicKeyPem: string}>}
 * 
 * @example
 * const keys = await initializeKeys('user123');
 * // Upload keys.publicKeyPem to server
 */
export async function initializeKeys(userId) {
  console.log(`[KeyManager] Initializing keys for user: ${userId}`);
  
  // 1. Generate RSA key pair
  const { publicKey, privateKey } = await generateRsaKeyPair();
  
  // 2. Export public key as PEM (to upload to server)
  const publicKeyPem = await exportPublicKeyToPem(publicKey);
  
  // 3. Export private key as JWK (to store locally)
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', privateKey);
  
  // 4. Get device key for encryption
  const deviceKey = await getDeviceKey();
  
  // 5. Encrypt private key with device key
  const { encrypted, iv } = await encryptWithDeviceKey(privateKeyJwk, deviceKey);
  
  // 6. Store encrypted private key in IndexedDB
  const db = await getDB();
  await db.put(STORE_NAME, {
    encryptedPrivateKey: encrypted,
    iv: Array.from(iv), // Convert to array for storage
    publicKeyPem,
    userId,
    createdAt: Date.now(),
  }, userId);
  
  console.log(`[KeyManager] Keys initialized and stored for user: ${userId}`);
  
  return {
    publicKey,
    privateKey,
    publicKeyPem,
  };
}

/**
 * Restore keys from IndexedDB (automatic on app load)
 * Returns null if no keys found (user needs to initialize)
 * 
 * @param {string} userId - User's unique ID
 * @returns {Promise<{publicKey: CryptoKey, privateKey: CryptoKey, publicKeyPem: string} | null>}
 * 
 * @example
 * const keys = await restoreKeys('user123');
 * if (keys) {
 *   console.log('Encryption active!');
 * }
 */
export async function restoreKeys(userId) {
  try {
    console.log(`[KeyManager] Restoring keys for user: ${userId}`);
    
    const db = await getDB();
    const keyData = await db.get(STORE_NAME, userId);
    
    if (!keyData) {
      console.log(`[KeyManager] No keys found for user: ${userId}`);
      return null;
    }
    
    // Get device key
    const deviceKey = await getDeviceKey();
    
    // Decrypt private key
    const iv = new Uint8Array(keyData.iv);
    const privateKeyJwk = await decryptWithDeviceKey(
      keyData.encryptedPrivateKey,
      iv,
      deviceKey
    );
    
    // Import private key
    const privateKey = await crypto.subtle.importKey(
      'jwk',
      privateKeyJwk,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      true,
      ['decrypt']
    );
    
    // Import public key from PEM
    const publicKey = await importPublicKeyFromPem(keyData.publicKeyPem);
    
    console.log(`[KeyManager] Keys successfully restored for user: ${userId}`);
    
    return {
      publicKey,
      privateKey,
      publicKeyPem: keyData.publicKeyPem,
    };
  } catch (error) {
    console.error('[KeyManager] Failed to restore keys:', error);
    return null;
  }
}

/**
 * Check if user has keys stored locally
 * 
 * @param {string} userId - User's unique ID
 * @returns {Promise<boolean>}
 */
export async function hasKeys(userId) {
  try {
    const db = await getDB();
    const keyData = await db.get(STORE_NAME, userId);
    return !!keyData;
  } catch (error) {
    console.error('[KeyManager] Error checking for keys:', error);
    return false;
  }
}

/**
 * Delete all keys for a user (called on logout)
 * 
 * @param {string} userId - User's unique ID
 */
export async function deleteKeys(userId) {
  try {
    console.log(`[KeyManager] Deleting keys for user: ${userId}`);
    const db = await getDB();
    await db.delete(STORE_NAME, userId);
    console.log(`[KeyManager] Keys deleted for user: ${userId}`);
  } catch (error) {
    console.error('[KeyManager] Failed to delete keys:', error);
  }
}

/**
 * Export encrypted key backup (for multi-device support)
 * Returns a JSON string that can be saved or transferred
 * 
 * @param {string} userId - User's unique ID
 * @param {string} backupPassword - Password to encrypt the backup
 * @returns {Promise<string>} Encrypted backup JSON
 * 
 * @example
 * const backup = await exportKeyBackup('user123', 'SecurePassword123');
 * // Save to file or show QR code
 */
export async function exportKeyBackup(userId, backupPassword) {
  console.log(`[KeyManager] Exporting key backup for user: ${userId}`);
  
  const db = await getDB();
  const keyData = await db.get(STORE_NAME, userId);
  
  if (!keyData) {
    throw new Error('No keys found to export');
  }
  
  // Get device key and decrypt private key
  const deviceKey = await getDeviceKey();
  const iv = new Uint8Array(keyData.iv);
  const privateKeyJwk = await decryptWithDeviceKey(
    keyData.encryptedPrivateKey,
    iv,
    deviceKey
  );
  
  // Re-encrypt with user's backup password
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(backupPassword);
  
  // Derive key from password
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const backupKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  // Encrypt private key with backup key
  const backupIv = crypto.getRandomValues(new Uint8Array(12));
  const backupData = encoder.encode(JSON.stringify(privateKeyJwk));
  
  const encryptedBackup = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: backupIv },
    backupKey,
    backupData
  );
  
  // Create backup object
  const backup = {
    version: 1,
    userId,
    publicKeyPem: keyData.publicKeyPem,
    encryptedPrivateKey: Array.from(new Uint8Array(encryptedBackup)),
    salt: Array.from(salt),
    iv: Array.from(backupIv),
    createdAt: Date.now(),
  };
  
  console.log(`[KeyManager] Key backup created for user: ${userId}`);
  return JSON.stringify(backup);
}

/**
 * Import key backup from another device
 * 
 * @param {string} backupJson - Encrypted backup JSON string
 * @param {string} backupPassword - Password to decrypt the backup
 * @param {string} userId - User's unique ID
 * @returns {Promise<boolean>} Success status
 * 
 * @example
 * const success = await importKeyBackup(backupJson, 'SecurePassword123', 'user123');
 */
export async function importKeyBackup(backupJson, backupPassword, userId) {
  console.log(`[KeyManager] Importing key backup for user: ${userId}`);
  
  try {
    const backup = JSON.parse(backupJson);
    
    // Verify backup version
    if (backup.version !== 1) {
      throw new Error('Unsupported backup version');
    }
    
    // Derive key from password
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(backupPassword);
    
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const salt = new Uint8Array(backup.salt);
    
    const backupKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    // Decrypt private key
    const iv = new Uint8Array(backup.iv);
    const encryptedData = new Uint8Array(backup.encryptedPrivateKey);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      backupKey,
      encryptedData
    );
    
    const decoder = new TextDecoder();
    const privateKeyJwk = JSON.parse(decoder.decode(decrypted));
    
    // Re-encrypt with device key and store
    const deviceKey = await getDeviceKey();
    const { encrypted, iv: deviceIv } = await encryptWithDeviceKey(privateKeyJwk, deviceKey);
    
    const db = await getDB();
    await db.put(STORE_NAME, {
      encryptedPrivateKey: encrypted,
      iv: Array.from(deviceIv),
      publicKeyPem: backup.publicKeyPem,
      userId,
      createdAt: Date.now(),
      importedAt: Date.now(),
    }, userId);
    
    console.log(`[KeyManager] Key backup successfully imported for user: ${userId}`);
    return true;
  } catch (error) {
    console.error('[KeyManager] Failed to import key backup:', error);
    return false;
  }
}

/**
 * Clear device key (use with caution - will require re-initialization)
 */
export async function clearDeviceKey() {
  console.warn('[KeyManager] Clearing device key - all stored keys will be inaccessible');
  const db = await getDB();
  await db.delete(DEVICE_KEY_STORE, 'device-key');
}

/**
 * Get encryption status for debugging
 */
export async function getEncryptionStatus(userId) {
  const db = await getDB();
  const keyData = await db.get(STORE_NAME, userId);
  const deviceKeyData = await db.get(DEVICE_KEY_STORE, 'device-key');
  
  return {
    hasUserKeys: !!keyData,
    hasDeviceKey: !!deviceKeyData,
    userId,
    keyCreatedAt: keyData?.createdAt ? new Date(keyData.createdAt).toISOString() : null,
    keyImportedAt: keyData?.importedAt ? new Date(keyData.importedAt).toISOString() : null,
  };
}
