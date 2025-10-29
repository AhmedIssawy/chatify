# 🧪 WhatsApp-Style Encryption Test Plan

## Test Status: ✅ READY TO TEST

## What Changed

### ✨ NEW: Automatic, Persistent Encryption
Your encryption now works exactly like WhatsApp:
- **No password prompts** — encryption just works
- **Persists across refreshes** — no re-login needed
- **Automatic key management** — generates, stores, restores automatically
- **Multi-device support** — export/import backups

---

## Quick Test (5 minutes)

### 1. Test Signup Flow
```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

**Steps:**
1. Open http://localhost:5173
2. Sign up with new account
3. ✅ **Expected**: Toast shows "Account created! 🔒 End-to-end encryption enabled"
4. Open browser DevTools → Console
5. ✅ **Expected**: See `[KeyManager] Keys initialized and stored for user: <userId>`
6. ✅ **Expected**: See `[Auth] ✅ Encryption keys initialized and registered`

### 2. Test Message Encryption
1. Open two browser windows (or use incognito for second user)
2. Login as User A, open chat with User B
3. Send message: "Test encrypted message"
4. ✅ **Expected**: Green lock icon appears in header
5. ✅ **Expected**: Green banner shows "🔒 End-to-end encrypted"
6. Check console: `[Chat] Message encrypted automatically`
7. Switch to User B window
8. ✅ **Expected**: Message appears decrypted
9. Send reply from User B
10. ✅ **Expected**: User A receives and reads decrypted message

### 3. Test Persistence (THE BIG TEST! 🎯)
1. While logged in as User A with chat open
2. Press F5 (refresh page)
3. ✅ **Expected**: Page reloads, auto-login works
4. ✅ **Expected**: Console shows `[KeyManager] Restoring keys for user: <userId>`
5. ✅ **Expected**: Console shows `[Auth] ✅ Encryption keys restored - encryption active!`
6. ✅ **Expected**: Green lock still appears
7. ✅ **Expected**: Can read old encrypted messages
8. Send new message
9. ✅ **Expected**: Still encrypts automatically

**🎉 IF THIS WORKS, YOU HAVE WHATSAPP-STYLE ENCRYPTION!**

### 4. Test IndexedDB Persistence
1. Open DevTools → Application → Storage → IndexedDB
2. ✅ **Expected**: See database `chatify-encryption-db`
3. Expand database
4. ✅ **Expected**: See two stores: `encryption-keys` and `device-keys`
5. Click `encryption-keys`
6. ✅ **Expected**: See entry with your userId
7. ✅ **Expected**: See fields: `encryptedPrivateKey`, `iv`, `publicKeyPem`
8. Click `device-keys`
9. ✅ **Expected**: See entry `device-key` with AES key JWK

---

## Full Test Suite (20 minutes)

### Test 1: New User Flow ✅
- [ ] Sign up
- [ ] Keys auto-generated (check console)
- [ ] Encryption enabled immediately
- [ ] Green lock appears
- [ ] Can send encrypted message
- [ ] No password prompt

### Test 2: Returning User Flow ✅
- [ ] Log in
- [ ] Keys auto-restored (check console)
- [ ] Encryption enabled immediately
- [ ] Can read old encrypted messages
- [ ] Can send new encrypted messages
- [ ] No password prompt

### Test 3: Page Refresh Flow ✅
- [ ] Refresh page while logged in
- [ ] Auth check runs automatically
- [ ] Keys restored from IndexedDB
- [ ] Encryption stays active
- [ ] Old messages still readable
- [ ] New messages still encrypt

### Test 4: Cross-Browser Tab Sync ✅
- [ ] Open app in Tab 1, login
- [ ] Open app in Tab 2 (same browser)
- [ ] Tab 2 auto-loads user from session cookie
- [ ] Tab 2 auto-restores encryption keys
- [ ] Both tabs can encrypt/decrypt

### Test 5: Multi-Device Export/Import ✅
- [ ] Open "Encryption Backup" (need to add button in UI)
- [ ] Click "Export Keys"
- [ ] Enter backup password
- [ ] Download backup file
- [ ] Open app in incognito/different browser
- [ ] Login with same account
- [ ] Open "Encryption Backup"
- [ ] Click "Import Keys"
- [ ] Upload backup file
- [ ] Enter backup password
- [ ] Keys imported successfully
- [ ] Old messages readable in new browser

### Test 6: Logout Flow ✅
- [ ] Click logout
- [ ] Keys deleted from IndexedDB
- [ ] Device key remains
- [ ] Login again
- [ ] New keys generated
- [ ] Old messages show "[🔒 Message encrypted]"

### Test 7: Error Handling ✅
- [ ] Manually delete keys from IndexedDB
- [ ] Refresh page
- [ ] Keys not found, fallback works
- [ ] Encrypted messages show fallback text
- [ ] Can still send new messages (unencrypted)

### Test 8: Network Error Handling ✅
- [ ] Disconnect network
- [ ] Try to send message
- [ ] Error handled gracefully
- [ ] Reconnect network
- [ ] Retry sending works

---

## Console Log Reference

### Expected Logs on Signup
```
[KeyManager] Initializing keys for user: 6721...
[KeyManager] Keys initialized and stored for user: 6721...
[Auth] Initializing new encryption keys...
[Auth] ✅ Encryption keys initialized and registered
```

### Expected Logs on Login (with existing keys)
```
[Auth] Attempting to restore encryption keys...
[KeyManager] Restoring keys for user: 6721...
[KeyManager] Keys successfully restored for user: 6721...
[Auth] ✅ Encryption keys restored - encryption active!
```

### Expected Logs on Login (no existing keys)
```
[Auth] Attempting to restore encryption keys...
[KeyManager] Restoring keys for user: 6721...
[KeyManager] No keys found for user: 6721...
[Auth] No keys found - will initialize on first use
[Auth] Initializing new encryption keys...
[KeyManager] Initializing keys for user: 6721...
[KeyManager] Keys initialized and stored for user: 6721...
[Auth] ✅ Encryption keys initialized and registered
```

### Expected Logs on Page Refresh
```
[Auth] Attempting to restore encryption keys...
[KeyManager] Restoring keys for user: 6721...
[KeyManager] Keys successfully restored for user: 6721...
[Auth] ✅ Encryption keys restored - encryption active!
```

### Expected Logs on Send Message
```
[Chat] Message encrypted automatically
```

### Expected Logs on Receive Message
```
[Chat] Cannot decrypt: encryption not available  (if keys not loaded)
[Chat] Failed to decrypt message: [error details]  (if decryption fails)
```

---

## DevTools Inspection

### Check Encryption Status
```javascript
// In browser console
const { authUser, encryptionKeys, isEncryptionEnabled } = useAuthStore.getState();

console.log('User:', authUser?._id);
console.log('Encryption Enabled:', isEncryptionEnabled);
console.log('Keys Loaded:', !!encryptionKeys);
console.log('Public Key:', encryptionKeys?.publicKeyPem?.substring(0, 50) + '...');
```

### Check IndexedDB Keys
```javascript
// In browser console
import { getEncryptionStatus } from './src/lib/keyManager.js';

const status = await getEncryptionStatus(authUser._id);
console.table(status);
```

### Manual Key Restore Test
```javascript
// In browser console
const { restoreEncryptionKeys } = useAuthStore.getState();
await restoreEncryptionKeys();
```

---

## Troubleshooting

### Issue: Keys not restoring on refresh
**Debug:**
1. Check IndexedDB in DevTools (Application → Storage)
2. Verify `encryption-keys` store has data
3. Check console for errors during restore
4. Try manual restore: `restoreEncryptionKeys()`

**Fix:**
- Clear IndexedDB and re-login
- Check browser privacy settings (third-party cookies)
- Ensure not in private browsing mode

### Issue: "Can't decrypt this message"
**Debug:**
1. Check if keys loaded: `useAuthStore.getState().encryptionKeys`
2. Check message structure: `message.isEncrypted`, `message.messagePayload`
3. Check console for decryption errors

**Fix:**
- Ensure keys exist for user
- Verify message encrypted with correct public key
- Try importing backup if keys lost

### Issue: Green lock not appearing
**Debug:**
1. Check encryption state: `useAuthStore.getState().isEncryptionEnabled`
2. Check keys loaded: `useAuthStore.getState().encryptionKeys`
3. Check ChatWidget component receives correct props

**Fix:**
- Verify keys restored successfully
- Check component re-renders after keys load

---

## Performance Benchmarks

### Key Generation
- **Expected**: 200-500ms
- **Acceptable**: < 1000ms
- **Action if slow**: Consider showing loader

### Key Restoration
- **Expected**: 50-150ms
- **Acceptable**: < 300ms
- **Action if slow**: Check IndexedDB performance

### Message Encryption
- **Expected**: 5-20ms per message
- **Acceptable**: < 50ms
- **Action if slow**: Consider batching or web workers

### Message Decryption
- **Expected**: 5-20ms per message
- **Acceptable**: < 50ms per message
- **Action if slow**: Implement lazy decryption (decrypt on scroll)

---

## Browser Compatibility

### Tested Browsers
- [ ] Chrome/Edge (Chromium) 90+
- [ ] Firefox 78+
- [ ] Safari 14+
- [ ] Brave (Chromium-based)

### Known Issues
- ❌ IE11: No Web Crypto API support (unsupported)
- ⚠️ Safari private browsing: IndexedDB may not persist
- ⚠️ Firefox strict privacy mode: May block IndexedDB

---

## Security Validation

### Manual Security Checks
- [ ] Private key never sent to server (check Network tab)
- [ ] Messages sent as encrypted payloads (check Network → Payload)
- [ ] IndexedDB stores encrypted private key (check value is ArrayBuffer)
- [ ] Device key stored securely (check it's JWK format)
- [ ] HTTPS enforced (check protocol in address bar)

### Automated Security Tests (Future)
```bash
# Run security audit
npm audit

# Check for vulnerable dependencies
npm audit fix

# Run penetration tests
# (To be implemented)
```

---

## Production Checklist

Before deploying to production:

### Backend
- [ ] HTTPS enabled and enforced
- [ ] CORS configured correctly
- [ ] Rate limiting on key registration endpoint
- [ ] Database backups enabled
- [ ] Error logging configured
- [ ] Monitor for suspicious key operations

### Frontend
- [ ] Content Security Policy (CSP) configured
- [ ] HTTPS-only cookies
- [ ] Subresource Integrity (SRI) for CDN assets
- [ ] Error tracking (Sentry, etc.)
- [ ] Analytics for encryption adoption rate

### Infrastructure
- [ ] CDN configured for static assets
- [ ] Load balancing for scalability
- [ ] Database replication
- [ ] Backup and disaster recovery plan
- [ ] Monitoring and alerting

### Documentation
- [ ] User guide published
- [ ] Security whitepaper available
- [ ] Privacy policy updated
- [ ] Terms of service updated
- [ ] Security contact published

---

## Success Metrics

### Key Performance Indicators (KPIs)
- **Encryption Adoption Rate**: % of users with encryption enabled
- **Key Persistence Rate**: % of sessions where keys restore successfully
- **Message Encryption Rate**: % of messages sent encrypted
- **Backup Creation Rate**: % of users who create backups
- **Multi-Device Usage**: % of users importing backups

### Target Metrics (Month 1)
- Encryption Adoption: > 95%
- Key Persistence: > 99%
- Message Encryption: > 90%
- Backup Creation: > 10%
- Multi-Device: > 5%

---

## Next Steps

1. **Run Quick Test** (5 min)
   - Verify signup → refresh → still encrypted
   
2. **Run Full Test Suite** (20 min)
   - Complete all test cases
   - Document any failures
   
3. **Add Backup UI** (optional)
   - Add "Encryption Backup" button to settings/menu
   - Import `EncryptionBackup` component
   - Wire up to auth store functions
   
4. **Production Deployment**
   - Complete production checklist
   - Deploy backend + frontend
   - Monitor logs and metrics
   
5. **User Education**
   - Create onboarding tour
   - Add tooltips for encryption features
   - Publish help documentation

---

**Test Date**: ___________  
**Tester**: ___________  
**Test Result**: ☐ PASS | ☐ FAIL  
**Notes**: ___________________________________________
