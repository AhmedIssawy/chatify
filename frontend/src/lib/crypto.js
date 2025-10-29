/**
 * End-to-End Encryption Utility Module
 * 
 * Implements hybrid encryption using:
 * - AES-256-GCM for message payload encryption
 * - RSA-OAEP (2048-bit) for AES key wrapping
 * 
 * All binary data is encoded as base64 for JSON transport.
 */

/**
 * Generates an RSA key pair for hybrid encryption.
 * Public key: used by others to encrypt messages to this user
 * Private key: used by this user to decrypt received messages
 * 
 * @returns {Promise<{publicKey: CryptoKey, privateKey: CryptoKey}>}
 * 
 * Example Output:
 * {
 *   publicKey: CryptoKey { type: "public", algorithm: { name: "RSA-OAEP", ... } },
 *   privateKey: CryptoKey { type: "private", algorithm: { name: "RSA-OAEP", ... } }
 * }
 */
export async function generateRsaKeyPair() {
  try {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048, // Can be upgraded to 3072 or 4096 for higher security
        publicExponent: new Uint8Array([1, 0, 1]), // 65537
        hash: "SHA-256",
      },
      true, // extractable
      ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
    );
    
    return keyPair;
  } catch (error) {
    console.error("Failed to generate RSA key pair:", error);
    throw new Error("Key pair generation failed");
  }
}

/**
 * Exports a public CryptoKey to PEM format for storage/transmission.
 * 
 * @param {CryptoKey} publicKey - The public key to export
 * @returns {Promise<string>} PEM-encoded public key
 * 
 * Example Output:
 * "-----BEGIN PUBLIC KEY-----\nMIIBIjANBg...\n-----END PUBLIC KEY-----"
 */
export async function exportPublicKeyToPem(publicKey) {
  try {
    const exported = await crypto.subtle.exportKey("spki", publicKey);
    const exportedAsBase64 = arrayBufferToBase64(exported);
    const pemFormatted = `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`;
    return pemFormatted;
  } catch (error) {
    console.error("Failed to export public key:", error);
    throw new Error("Public key export failed");
  }
}

/**
 * Imports a PEM-formatted public key into a CryptoKey object.
 * 
 * @param {string} publicKeyPem - PEM-encoded public key
 * @returns {Promise<CryptoKey>}
 * 
 * Example Input:
 * "-----BEGIN PUBLIC KEY-----\nMIIBIjANBg...\n-----END PUBLIC KEY-----"
 */
export async function importPublicKeyFromPem(publicKeyPem) {
  try {
    // Remove PEM header/footer and whitespace
    const pemContents = publicKeyPem
      .replace(/-----BEGIN PUBLIC KEY-----/, "")
      .replace(/-----END PUBLIC KEY-----/, "")
      .replace(/\s/g, "");
    
    const binaryDer = base64ToArrayBuffer(pemContents);
    
    const publicKey = await crypto.subtle.importKey(
      "spki",
      binaryDer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["encrypt", "wrapKey"]
    );
    
    return publicKey;
  } catch (error) {
    console.error("Failed to import public key:", error);
    throw new Error("Public key import failed");
  }
}

/**
 * Exports a private CryptoKey to PEM format for secure storage.
 * 
 * @param {CryptoKey} privateKey - The private key to export
 * @returns {Promise<string>} PEM-encoded private key
 * 
 * Example Output:
 * "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----"
 */
export async function exportPrivateKeyToPem(privateKey) {
  try {
    const exported = await crypto.subtle.exportKey("pkcs8", privateKey);
    const exportedAsBase64 = arrayBufferToBase64(exported);
    const pemFormatted = `-----BEGIN PRIVATE KEY-----\n${exportedAsBase64}\n-----END PRIVATE KEY-----`;
    return pemFormatted;
  } catch (error) {
    console.error("Failed to export private key:", error);
    throw new Error("Private key export failed");
  }
}

/**
 * Imports a PEM-formatted private key into a CryptoKey object.
 * 
 * @param {string} privateKeyPem - PEM-encoded private key
 * @returns {Promise<CryptoKey>}
 * 
 * Example Input:
 * "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----"
 */
export async function importPrivateKeyFromPem(privateKeyPem) {
  try {
    const pemContents = privateKeyPem
      .replace(/-----BEGIN PRIVATE KEY-----/, "")
      .replace(/-----END PRIVATE KEY-----/, "")
      .replace(/\s/g, "");
    
    const binaryDer = base64ToArrayBuffer(pemContents);
    
    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryDer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["decrypt", "unwrapKey"]
    );
    
    return privateKey;
  } catch (error) {
    console.error("Failed to import private key:", error);
    throw new Error("Private key import failed");
  }
}

/**
 * Encrypts plaintext for a specific recipient using hybrid encryption.
 * 
 * Flow:
 * 1. Generate random AES-256-GCM key
 * 2. Generate random 12-byte IV
 * 3. Encrypt plaintext with AES-GCM
 * 4. Wrap (encrypt) the AES key with recipient's RSA public key
 * 5. Return structured payload with all encrypted components
 * 
 * @param {string} plaintext - The message to encrypt
 * @param {string} recipientPublicKeyPem - Recipient's PEM-encoded public key
 * @returns {Promise<Object>} Encrypted message payload
 * 
 * Example Input:
 * plaintext: "Hello, this is a secret message!"
 * recipientPublicKeyPem: "-----BEGIN PUBLIC KEY-----\nMIIBIj...\n-----END PUBLIC KEY-----"
 * 
 * Example Output:
 * {
 *   version: 1,
 *   alg: "AES-GCM+RSA-OAEP",
 *   iv: "rN3jK8pQmL9xT2vY",
 *   wrappedKey: "XyZ...abc==",
 *   ciphertext: "dGh...pcw=="
 * }
 */
export async function encryptMessageForRecipient(plaintext, recipientPublicKeyPem) {
  try {
    // 1. Import recipient's public key
    const recipientPublicKey = await importPublicKeyFromPem(recipientPublicKeyPem);
    
    // 2. Generate a random AES-256-GCM key (ephemeral, one-time use)
    const aesKey = await crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true, // extractable (needed for wrapping)
      ["encrypt", "decrypt"]
    );
    
    // 3. Generate random 12-byte IV for AES-GCM
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // 4. Encrypt plaintext with AES-GCM
    const encodedPlaintext = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      aesKey,
      encodedPlaintext
    );
    
    // 5. Wrap (encrypt) the AES key with recipient's RSA public key
    const wrappedKey = await crypto.subtle.wrapKey(
      "raw", // format of the key to be wrapped
      aesKey,
      recipientPublicKey,
      {
        name: "RSA-OAEP",
      }
    );
    
    // 6. Build the encrypted message payload
    const messagePayload = {
      version: 1,
      alg: "AES-GCM+RSA-OAEP",
      iv: arrayBufferToBase64(iv),
      wrappedKey: arrayBufferToBase64(wrappedKey),
      ciphertext: arrayBufferToBase64(ciphertext),
    };
    
    // Clear the AES key from memory (best effort)
    // Note: JavaScript doesn't provide guaranteed memory wiping
    
    return messagePayload;
  } catch (error) {
    console.error("Failed to encrypt message:", error);
    throw new Error("Message encryption failed");
  }
}

/**
 * Decrypts an encrypted message payload using the recipient's private key.
 * 
 * Flow:
 * 1. Validate message payload structure
 * 2. Unwrap (decrypt) the AES key using recipient's RSA private key
 * 3. Decrypt the ciphertext using the unwrapped AES key and IV
 * 4. Return plaintext
 * 
 * @param {Object} messagePayload - The encrypted message payload
 * @param {CryptoKey} recipientPrivateKey - Recipient's private key
 * @returns {Promise<string>} Decrypted plaintext
 * 
 * Example Input:
 * messagePayload: {
 *   version: 1,
 *   alg: "AES-GCM+RSA-OAEP",
 *   iv: "rN3jK8pQmL9xT2vY",
 *   wrappedKey: "XyZ...abc==",
 *   ciphertext: "dGh...pcw=="
 * }
 * 
 * Example Output:
 * "Hello, this is a secret message!"
 */
export async function decryptMessagePayload(messagePayload, recipientPrivateKey) {
  try {
    // 1. Validate payload structure
    if (!messagePayload || typeof messagePayload !== "object") {
      throw new Error("Invalid message payload: not an object");
    }
    
    if (messagePayload.alg !== "AES-GCM+RSA-OAEP") {
      throw new Error(`Unsupported algorithm: ${messagePayload.alg}`);
    }
    
    if (!messagePayload.iv || !messagePayload.wrappedKey || !messagePayload.ciphertext) {
      throw new Error("Invalid message payload: missing required fields");
    }
    
    // 2. Decode base64 fields
    const iv = base64ToArrayBuffer(messagePayload.iv);
    const wrappedKey = base64ToArrayBuffer(messagePayload.wrappedKey);
    const ciphertext = base64ToArrayBuffer(messagePayload.ciphertext);
    
    // 3. Unwrap (decrypt) the AES key using the recipient's private key
    const aesKey = await crypto.subtle.unwrapKey(
      "raw", // format of the key to be unwrapped
      wrappedKey,
      recipientPrivateKey,
      {
        name: "RSA-OAEP",
      },
      {
        name: "AES-GCM",
        length: 256,
      },
      true, // extractable (not needed for decrypt, but good practice)
      ["decrypt"]
    );
    
    // 4. Decrypt the ciphertext with AES-GCM
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      aesKey,
      ciphertext
    );
    
    // 5. Decode to string
    const plaintext = new TextDecoder().decode(decrypted);
    
    return plaintext;
  } catch (error) {
    console.error("Failed to decrypt message:", error.message);
    // Return fallback text instead of throwing (for graceful UI degradation)
    return "[🔒 Can't decrypt this message]";
  }
}

/**
 * Checks if a message text/object needs decryption.
 * 
 * @param {any} text - The message text or payload to check
 * @returns {boolean} True if the message is encrypted and needs decryption
 * 
 * Example:
 * needsDecryption("Hello") => false
 * needsDecryption({ alg: "AES-GCM+RSA-OAEP", ... }) => true
 */
export function needsDecryption(text) {
  // Check if it's an object with the expected structure
  if (typeof text === "object" && text !== null) {
    return (
      text.alg === "AES-GCM+RSA-OAEP" &&
      typeof text.wrappedKey === "string" &&
      typeof text.ciphertext === "string" &&
      typeof text.iv === "string"
    );
  }
  
  // Check if it's a stringified JSON object
  if (typeof text === "string") {
    try {
      const parsed = JSON.parse(text);
      return (
        parsed.alg === "AES-GCM+RSA-OAEP" &&
        typeof parsed.wrappedKey === "string" &&
        typeof parsed.ciphertext === "string" &&
        typeof parsed.iv === "string"
      );
    } catch {
      // Not JSON, so not encrypted
      return false;
    }
  }
  
  return false;
}

/**
 * Parses a message payload (string or object) into an object.
 * 
 * @param {string|Object} messagePayload - The payload to parse
 * @returns {Object} Parsed payload object
 */
export function parseMessagePayload(messagePayload) {
  if (typeof messagePayload === "string") {
    try {
      return JSON.parse(messagePayload);
    } catch {
      throw new Error("Invalid message payload: not valid JSON");
    }
  }
  return messagePayload;
}

// ============================================================================
// HELPER FUNCTIONS: Binary ↔ Base64 conversions
// ============================================================================

/**
 * Converts an ArrayBuffer to a base64 string.
 * 
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts a base64 string to an ArrayBuffer.
 * 
 * @param {string} base64
 * @returns {ArrayBuffer}
 */
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
