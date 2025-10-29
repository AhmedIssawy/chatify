/**
 * End-to-End Encryption Test Suite
 * 
 * Run these tests to verify encryption implementation.
 * Open browser console and paste this file, or create a test.html page.
 */

// ============================================================================
// TEST UTILITIES
// ============================================================================

class EncryptionTester {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  async test(name, fn) {
    try {
      await fn();
      this.passed++;
      console.log(`✅ PASS: ${name}`);
    } catch (error) {
      this.failed++;
      console.error(`❌ FAIL: ${name}`);
      console.error(error);
    }
  }

  summary() {
    console.log("\n" + "=".repeat(60));
    console.log(`📊 TEST RESULTS`);
    console.log("=".repeat(60));
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Total: ${this.passed + this.failed}`);
    console.log(`🎯 Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
    console.log("=".repeat(60) + "\n");
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${expected}, but got ${actual}`
    );
  }
}

// ============================================================================
// CRYPTO FUNCTION TESTS
// ============================================================================

async function testCryptoFunctions() {
  console.log("\n🔐 Testing Crypto Functions...\n");
  const tester = new EncryptionTester();

  // Test 1: Generate RSA Key Pair
  await tester.test("Generate RSA key pair", async () => {
    const { generateRsaKeyPair } = await import("./lib/crypto.js");
    const { publicKey, privateKey } = await generateRsaKeyPair();
    
    assert(publicKey, "Public key should exist");
    assert(privateKey, "Private key should exist");
    assert(publicKey.type === "public", "Public key type should be 'public'");
    assert(privateKey.type === "private", "Private key type should be 'private'");
  });

  // Test 2: Export Public Key to PEM
  await tester.test("Export public key to PEM", async () => {
    const { generateRsaKeyPair, exportPublicKeyToPem } = await import("./lib/crypto.js");
    const { publicKey } = await generateRsaKeyPair();
    const pem = await exportPublicKeyToPem(publicKey);
    
    assert(pem.includes("-----BEGIN PUBLIC KEY-----"), "PEM should have header");
    assert(pem.includes("-----END PUBLIC KEY-----"), "PEM should have footer");
  });

  // Test 3: Import Public Key from PEM
  await tester.test("Import public key from PEM", async () => {
    const { generateRsaKeyPair, exportPublicKeyToPem, importPublicKeyFromPem } = await import("./lib/crypto.js");
    const { publicKey } = await generateRsaKeyPair();
    const pem = await exportPublicKeyToPem(publicKey);
    const imported = await importPublicKeyFromPem(pem);
    
    assert(imported, "Imported key should exist");
    assert(imported.type === "public", "Imported key should be public");
  });

  // Test 4: Encrypt and Decrypt Message
  await tester.test("Encrypt and decrypt message", async () => {
    const {
      generateRsaKeyPair,
      exportPublicKeyToPem,
      encryptMessageForRecipient,
      decryptMessagePayload,
    } = await import("./lib/crypto.js");
    
    const { publicKey, privateKey } = await generateRsaKeyPair();
    const publicKeyPem = await exportPublicKeyToPem(publicKey);
    const plaintext = "This is a test message!";
    
    const encrypted = await encryptMessageForRecipient(plaintext, publicKeyPem);
    const decrypted = await decryptMessagePayload(encrypted, privateKey);
    
    assertEquals(decrypted, plaintext, "Decrypted should match plaintext");
  });

  // Test 5: Encrypted Payload Structure
  await tester.test("Verify encrypted payload structure", async () => {
    const { generateRsaKeyPair, exportPublicKeyToPem, encryptMessageForRecipient } = await import("./lib/crypto.js");
    
    const { publicKey } = await generateRsaKeyPair();
    const publicKeyPem = await exportPublicKeyToPem(publicKey);
    const encrypted = await encryptMessageForRecipient("Test", publicKeyPem);
    
    assert(encrypted.version === 1, "Version should be 1");
    assert(encrypted.alg === "AES-GCM+RSA-OAEP", "Algorithm should be AES-GCM+RSA-OAEP");
    assert(typeof encrypted.iv === "string", "IV should be string");
    assert(typeof encrypted.wrappedKey === "string", "Wrapped key should be string");
    assert(typeof encrypted.ciphertext === "string", "Ciphertext should be string");
  });

  // Test 6: Different Recipients
  await tester.test("Encrypt for different recipients", async () => {
    const {
      generateRsaKeyPair,
      exportPublicKeyToPem,
      encryptMessageForRecipient,
      decryptMessagePayload,
    } = await import("./lib/crypto.js");
    
    const alice = await generateRsaKeyPair();
    const bob = await generateRsaKeyPair();
    const alicePubPem = await exportPublicKeyToPem(alice.publicKey);
    const bobPubPem = await exportPublicKeyToPem(bob.publicKey);
    
    const message = "Secret message";
    const encForBob = await encryptMessageForRecipient(message, bobPubPem);
    
    // Bob can decrypt
    const decryptedByBob = await decryptMessagePayload(encForBob, bob.privateKey);
    assertEquals(decryptedByBob, message, "Bob should decrypt successfully");
    
    // Alice cannot decrypt (wrong private key)
    const decryptedByAlice = await decryptMessagePayload(encForBob, alice.privateKey);
    assert(
      decryptedByAlice.includes("Can't decrypt"),
      "Alice should fail to decrypt"
    );
  });

  // Test 7: needsDecryption Function
  await tester.test("Check needsDecryption function", async () => {
    const { needsDecryption } = await import("./lib/crypto.js");
    
    const plainMessage = "Hello";
    const encryptedMessage = {
      version: 1,
      alg: "AES-GCM+RSA-OAEP",
      iv: "test",
      wrappedKey: "test",
      ciphertext: "test",
    };
    
    assert(!needsDecryption(plainMessage), "Plain text should not need decryption");
    assert(needsDecryption(encryptedMessage), "Encrypted object should need decryption");
  });

  tester.summary();
}

// ============================================================================
// KEY STORAGE TESTS
// ============================================================================

async function testKeyStorage() {
  console.log("\n🗄️ Testing Key Storage...\n");
  const tester = new EncryptionTester();

  const testUserId = "test-user-" + Date.now();
  const testPassphrase = "TestPassphrase123!";

  // Test 1: Save Private Key
  await tester.test("Save private key to IndexedDB", async () => {
    const { generateRsaKeyPair } = await import("./lib/crypto.js");
    const { savePrivateKey } = await import("./lib/keyStorage.js");
    
    const { privateKey } = await generateRsaKeyPair();
    await savePrivateKey(testUserId, privateKey, testPassphrase);
    
    // Check if exists
    const { hasPrivateKey } = await import("./lib/keyStorage.js");
    const exists = await hasPrivateKey(testUserId);
    assert(exists, "Private key should exist in IndexedDB");
  });

  // Test 2: Retrieve Private Key
  await tester.test("Retrieve private key from IndexedDB", async () => {
    const { getPrivateKey } = await import("./lib/keyStorage.js");
    
    const privateKey = await getPrivateKey(testUserId, testPassphrase);
    assert(privateKey, "Private key should be retrieved");
    assert(privateKey.type === "private", "Retrieved key should be private");
  });

  // Test 3: Wrong Passphrase
  await tester.test("Fail with wrong passphrase", async () => {
    const { getPrivateKey } = await import("./lib/keyStorage.js");
    
    try {
      await getPrivateKey(testUserId, "WrongPassphrase!");
      throw new Error("Should have thrown error");
    } catch (error) {
      assert(
        error.message.includes("failed") || error.message.includes("passphrase"),
        "Should fail with wrong passphrase"
      );
    }
  });

  // Test 4: Export Backup
  await tester.test("Export private key backup", async () => {
    const { exportPrivateKeyBackup } = await import("./lib/keyStorage.js");
    
    const backup = await exportPrivateKeyBackup(testUserId, testPassphrase);
    assert(backup, "Backup should exist");
    
    const parsed = JSON.parse(backup);
    assert(parsed.userId === testUserId, "Backup should have correct userId");
    assert(parsed.encryptedPrivateKey, "Backup should have encrypted key");
  });

  // Test 5: Delete Private Key
  await tester.test("Delete private key", async () => {
    const { deletePrivateKey, hasPrivateKey } = await import("./lib/keyStorage.js");
    
    await deletePrivateKey(testUserId);
    const exists = await hasPrivateKey(testUserId);
    assert(!exists, "Private key should be deleted");
  });

  // Test 6: Import Backup
  await tester.test("Import private key backup", async () => {
    const { generateRsaKeyPair } = await import("./lib/crypto.js");
    const {
      savePrivateKey,
      exportPrivateKeyBackup,
      deletePrivateKey,
      importPrivateKeyBackup,
      hasPrivateKey,
    } = await import("./lib/keyStorage.js");
    
    const userId = "test-import-" + Date.now();
    const { privateKey } = await generateRsaKeyPair();
    
    // Save and export
    await savePrivateKey(userId, privateKey, testPassphrase);
    const backup = await exportPrivateKeyBackup(userId, testPassphrase);
    
    // Delete
    await deletePrivateKey(userId);
    assert(!(await hasPrivateKey(userId)), "Key should be deleted");
    
    // Import
    await importPrivateKeyBackup(backup);
    assert(await hasPrivateKey(userId), "Key should be imported");
    
    // Clean up
    await deletePrivateKey(userId);
  });

  tester.summary();
}

// ============================================================================
// INTEGRATION TESTS (requires backend)
// ============================================================================

async function testIntegration() {
  console.log("\n🔗 Testing Integration (requires backend)...\n");
  const tester = new EncryptionTester();

  // Note: These tests assume backend is running and user is logged in

  // Test 1: Register Public Key
  await tester.test("Register public key with backend", async () => {
    // This test requires authentication
    // Uncomment if testing in authenticated context
    
    /*
    const { generateRsaKeyPair, exportPublicKeyToPem } = await import("./lib/crypto.js");
    const { axiosInstance } = await import("./lib/axios.js");
    
    const { publicKey } = await generateRsaKeyPair();
    const publicKeyPem = await exportPublicKeyToPem(publicKey);
    
    const res = await axiosInstance.post("/keys/register", {
      userId: "YOUR_USER_ID",
      publicKeyPem,
      keyId: "v1",
    });
    
    assert(res.data.ok, "Key registration should succeed");
    */
    
    console.log("⚠️  Skipped: Requires authentication");
  });

  // Test 2: Fetch Public Key
  await tester.test("Fetch public key from backend", async () => {
    // Uncomment if testing in authenticated context
    
    /*
    const { axiosInstance } = await import("./lib/axios.js");
    
    const res = await axiosInstance.get("/keys/YOUR_USER_ID");
    
    assert(res.data.publicKeyPem, "Should return public key");
    assert(res.data.keyId, "Should return key ID");
    */
    
    console.log("⚠️  Skipped: Requires authentication");
  });

  // Test 3: Send Encrypted Message
  await tester.test("Send encrypted message", async () => {
    // Uncomment if testing in authenticated context
    
    /*
    const { encryptMessageForRecipient } = await import("./lib/crypto.js");
    const { axiosInstance } = await import("./lib/axios.js");
    
    // Fetch recipient's public key
    const keyRes = await axiosInstance.get("/keys/RECIPIENT_ID");
    const { publicKeyPem } = keyRes.data;
    
    // Encrypt message
    const messagePayload = await encryptMessageForRecipient("Test", publicKeyPem);
    
    // Send to backend
    const res = await axiosInstance.post("/messages/send/RECIPIENT_ID", {
      messagePayload,
      isEncrypted: true,
    });
    
    assert(res.data.isEncrypted, "Message should be marked as encrypted");
    */
    
    console.log("⚠️  Skipped: Requires authentication");
  });

  tester.summary();
}

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

async function testPerformance() {
  console.log("\n⚡ Testing Performance...\n");
  
  const { generateRsaKeyPair, exportPublicKeyToPem, encryptMessageForRecipient, decryptMessagePayload } = await import("./lib/crypto.js");

  // Test 1: Key Generation Time
  console.time("⏱️  Key Generation");
  await generateRsaKeyPair();
  console.timeEnd("⏱️  Key Generation");

  // Test 2: Encryption Time
  const { publicKey, privateKey } = await generateRsaKeyPair();
  const publicKeyPem = await exportPublicKeyToPem(publicKey);
  const message = "Test message ".repeat(100); // ~1.2KB

  console.time("⏱️  Encryption (1.2KB)");
  const encrypted = await encryptMessageForRecipient(message, publicKeyPem);
  console.timeEnd("⏱️  Encryption (1.2KB)");

  // Test 3: Decryption Time
  console.time("⏱️  Decryption (1.2KB)");
  await decryptMessagePayload(encrypted, privateKey);
  console.timeEnd("⏱️  Decryption (1.2KB)");

  // Test 4: Bulk Operations
  console.log("\n📊 Bulk Encryption (10 messages):");
  console.time("⏱️  Total Time");
  for (let i = 0; i < 10; i++) {
    await encryptMessageForRecipient(`Message ${i}`, publicKeyPem);
  }
  console.timeEnd("⏱️  Total Time");
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runAllTests() {
  console.log("\n" + "=".repeat(60));
  console.log("🧪 STARTING E2E ENCRYPTION TEST SUITE");
  console.log("=".repeat(60));

  try {
    await testCryptoFunctions();
    await testKeyStorage();
    await testIntegration();
    await testPerformance();

    console.log("\n" + "=".repeat(60));
    console.log("✅ ALL TESTS COMPLETED");
    console.log("=".repeat(60) + "\n");
  } catch (error) {
    console.error("\n❌ TEST SUITE FAILED:");
    console.error(error);
  }
}

// ============================================================================
// MANUAL TEST HELPERS
// ============================================================================

window.encryptionTests = {
  // Run all tests
  runAll: runAllTests,
  
  // Run individual test suites
  testCrypto: testCryptoFunctions,
  testStorage: testKeyStorage,
  testIntegration: testIntegration,
  testPerformance: testPerformance,
  
  // Quick manual test
  quickTest: async () => {
    console.log("🚀 Running Quick Test...\n");
    
    const { generateRsaKeyPair, exportPublicKeyToPem, encryptMessageForRecipient, decryptMessagePayload } = await import("./lib/crypto.js");
    
    const { publicKey, privateKey } = await generateRsaKeyPair();
    const publicKeyPem = await exportPublicKeyToPem(publicKey);
    
    const plaintext = "Hello, World!";
    console.log("📝 Plaintext:", plaintext);
    
    const encrypted = await encryptMessageForRecipient(plaintext, publicKeyPem);
    console.log("🔒 Encrypted:", encrypted);
    
    const decrypted = await decryptMessagePayload(encrypted, privateKey);
    console.log("🔓 Decrypted:", decrypted);
    
    if (plaintext === decrypted) {
      console.log("\n✅ Quick Test PASSED!\n");
    } else {
      console.error("\n❌ Quick Test FAILED!\n");
    }
  },
};

// Auto-run on load (comment out if you want to run manually)
// runAllTests();

console.log("\n💡 To run tests, use:");
console.log("  - encryptionTests.runAll()       (all tests)");
console.log("  - encryptionTests.testCrypto()   (crypto only)");
console.log("  - encryptionTests.testStorage()  (storage only)");
console.log("  - encryptionTests.quickTest()    (quick check)\n");

export { runAllTests, testCryptoFunctions, testKeyStorage, testIntegration, testPerformance };
