# Migration Guide: Old Encryption → WhatsApp-Style Encryption

## Problem: "Can't decrypt this message"

You're seeing this error because:
1. Old messages were encrypted with **old encryption keys** (password-based system)
2. You now have **new encryption keys** (WhatsApp-style, device-bound)
3. Old messages cannot be decrypted with new keys

## Solution Options

### Option 1: Clear Old Messages (Recommended)

This is the cleanest solution - start fresh with the new encryption system.

**Steps:**

1. **Backup if needed** (optional):
   - Export important conversations
   - Take screenshots if necessary

2. **Clear messages from MongoDB**:
```bash
# Connect to MongoDB
mongosh

# Use your database
use chatify

# Delete all messages
db.messages.deleteMany({})

# Verify deletion
db.messages.countDocuments()  # Should return 0
```

3. **Refresh your browser**:
   - Press F5
   - New messages will now be encrypted with new keys
   - Everything will work perfectly

### Option 2: Keep Old Messages (Show as plaintext)

If your old messages still have the `text` field in the database (plaintext), they'll display.

**Check if plaintext exists:**
```bash
mongosh
use chatify
db.messages.findOne({ isEncrypted: true })
```

**If you see `text: "hello"` in the output**, the plaintext exists and will display.

**If you see `text: null`**, the plaintext was deleted and messages are permanently encrypted with old keys (unrecoverable).

### Option 3: Delete Old Keys and Re-Initialize

Force the system to generate completely new keys:

**Steps:**

1. **Clear IndexedDB** (in browser):
   - Open DevTools (F12)
   - Go to Application → Storage → IndexedDB
   - Right-click `chatify-encryption-db` → Delete database
   - Refresh page

2. **Logout and Login**:
   - Logout from the app
   - Login again
   - New keys will be generated
   - Old messages still won't decrypt (keys don't match)

### Option 4: Migrate Old Keys (Advanced)

If you absolutely need old messages, you'd need to:
1. Export your old private key (if you still have it)
2. Manually decrypt old messages
3. Re-encrypt with new keys

**This is complex and not recommended.** Better to start fresh.

---

## Recommended Migration Path

For the best experience, follow this path:

### Step 1: Backup Important Conversations
Take screenshots or export anything you need to keep.

### Step 2: Clear Messages
```bash
mongosh
use chatify
db.messages.deleteMany({})
```

### Step 3: Clear Old Keys
```bash
# Also clear old user key registrations
db.users.updateMany({}, { $unset: { publicKeyPem: "", keyId: "" } })
```

### Step 4: Restart Application
```bash
# Stop backend (Ctrl+C)
# Stop frontend (Ctrl+C)

# Start backend
cd backend
npm run dev

# Start frontend (new terminal)
cd frontend
npm run dev
```

### Step 5: Test New Encryption
1. Open app in browser
2. Login (keys auto-generated)
3. Send a test message
4. Check console: `[Chat] ✅ Message encrypted automatically`
5. Check MongoDB: `messagePayload` should exist, `text` should be null
6. Refresh page - message still readable ✅

---

## Understanding the Change

### Old System (Password-Based)
```
User enters password on every session
→ Private key decrypted with password
→ Keys lost on page refresh
→ Messages encrypted, but plaintext also stored (backup)
```

### New System (WhatsApp-Style)
```
Keys generated once
→ Private key encrypted with device-bound AES key
→ Keys persist across sessions (IndexedDB)
→ Messages encrypted, plaintext NOT stored (true E2E)
```

**Why old messages don't work:**
- Old keys were password-based (different encryption)
- New keys are device-bound (different key pair)
- Old encrypted messages were encrypted with OLD public key
- Can't decrypt with NEW private key (different key pair)

---

## Preventing This in Future

### For Users
✅ **Create encrypted backups** regularly (see Settings → Encryption Backup)
✅ **Don't clear IndexedDB** unless you have a backup
✅ **Keep backup password safe** in case you need to restore

### For Developers
✅ **Key versioning**: Tag keys with version numbers
✅ **Migration scripts**: Provide tools to migrate between versions
✅ **Backward compatibility**: Keep old decryption code for migration period
✅ **User warnings**: Alert users before key changes

---

## FAQ

### Q: Why can't I decrypt old messages?
**A:** Old messages were encrypted with different keys. When you updated the system, new keys were generated. Encryption keys cannot be "upgraded" - they're mathematically tied to the original key pair.

### Q: Can I recover old messages?
**A:** Only if:
1. You still have your old private key AND password, OR
2. The plaintext (`text` field) still exists in MongoDB

Otherwise, they're permanently encrypted (this is actually good security!).

### Q: Why not keep both old and new keys?
**A:** Security best practice is to use one key pair. Multiple keys increase attack surface and complexity.

### Q: Will this happen again?
**A:** No. The new system is stable and persistent. Keys survive:
- Page refreshes ✅
- Browser restarts ✅
- Computer restarts ✅

You'd only lose keys if you:
- Clear browser data (IndexedDB)
- Logout (intentional)
- Use a different device (use backup/restore feature)

### Q: How do I use encryption on multiple devices?
**A:** Use the Backup/Restore feature:
1. Device A: Settings → Encryption Backup → Export Keys
2. Save backup file with password
3. Device B: Settings → Encryption Backup → Import Keys
4. Upload backup and enter password
5. ✅ Both devices can now read all messages

---

## Quick Commands Reference

### Check MongoDB Messages
```bash
mongosh
use chatify
db.messages.find().pretty()
```

### Delete All Messages
```bash
mongosh
use chatify
db.messages.deleteMany({})
```

### Clear User Keys
```bash
mongosh
use chatify
db.users.updateMany({}, { $unset: { publicKeyPem: "", keyId: "" } })
```

### Check Encryption Status
```javascript
// In browser console
const { encryptionKeys, isEncryptionEnabled } = useAuthStore.getState();
console.log('Encryption active:', isEncryptionEnabled);
console.log('Keys loaded:', !!encryptionKeys);
```

---

## Support

If you continue to see issues after following this guide:

1. **Check browser console** for detailed error messages
2. **Verify IndexedDB** has keys stored
3. **Check MongoDB** for message structure
4. **Test with new messages** (old ones may be unrecoverable)

**Need help?** Open an issue with:
- Browser console logs
- MongoDB message structure
- Steps you've already tried

---

**Recommended Action:** Clear old messages and start fresh with the new encryption system. It's the cleanest and most secure path forward! 🔒✨
