import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import {
  initializeKeys,
  restoreKeys,
  hasKeys,
  deleteKeys,
  exportKeyBackup,
  importKeyBackup,
} from "../lib/keyManager";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:3000" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  isSigningUp: false,
  isLoggingIn: false,
  socket: null,
  onlineUsers: [],
  isEncryptionEnabled: false, // Auto-enabled when keys are loaded
  encryptionKeys: null, // Stores { publicKey, privateKey, publicKeyPem } in memory
  hasEncryptionKey: false, // Flag to indicate if user has encryption keys

  /**
   * Automatically restore encryption keys from IndexedDB
   * Called on app mount and after login
   * This is the WhatsApp-style automatic restoration
   */
  restoreEncryptionKeys: async () => {
    const { authUser } = get();
    if (!authUser) return false;

    try {
      console.log('[Auth] Attempting to restore encryption keys...');
      const keys = await restoreKeys(authUser._id);
      
      if (keys) {
        set({
          encryptionKeys: keys,
          hasEncryptionKey: true,
          isEncryptionEnabled: true,
        });
        console.log('[Auth] ✅ Encryption keys restored - encryption active!');
        return true;
      }
      
      console.log('[Auth] No keys found - will initialize on first use');
      return false;
    } catch (error) {
      console.error('[Auth] Failed to restore keys:', error);
      return false;
    }
  },

  /**
   * Initialize encryption keys for new user
   * Called automatically on signup or first login
   */
  initializeEncryptionKeys: async () => {
    const { authUser } = get();
    if (!authUser) {
      console.error('[Auth] Cannot initialize keys - no auth user');
      return false;
    }

    try {
      console.log('[Auth] Initializing new encryption keys...');
      const keys = await initializeKeys(authUser._id);
      
      // Upload public key to server
      await axiosInstance.post("/keys/register", {
        userId: authUser._id,
        publicKeyPem: keys.publicKeyPem,
        keyId: "v1",
      });
      
      set({
        encryptionKeys: keys,
        hasEncryptionKey: true,
        isEncryptionEnabled: true,
      });
      
      console.log('[Auth] ✅ Encryption keys initialized and registered');
      return true;
    } catch (error) {
      console.error('[Auth] Failed to initialize keys:', error);
      return false;
    }
  },

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });

      // SIMPLIFIED: Skip encryption initialization
      // Encryption disabled for now
      console.log('[Auth] Encryption disabled - messages work as plaintext');

      get().connectSocket();
    } catch (error) {
      console.log("Error in authCheck:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  /**
   * Toggles encryption on/off (for user preference)
   */
  toggleEncryption: () => {
    set({ isEncryptionEnabled: !get().isEncryptionEnabled });
  },

  /**
   * Export encrypted backup for multi-device support
   */
  exportEncryptionBackup: async (backupPassword) => {
    const { authUser } = get();
    if (!authUser) {
      toast.error("No authenticated user");
      return null;
    }

    try {
      const backup = await exportKeyBackup(authUser._id, backupPassword);
      toast.success("Backup created successfully");
      return backup;
    } catch (error) {
      console.error('[Auth] Failed to export backup:', error);
      toast.error("Failed to create backup");
      return null;
    }
  },

  /**
   * Import backup from another device
   */
  importEncryptionBackup: async (backupJson, backupPassword) => {
    const { authUser } = get();
    if (!authUser) {
      toast.error("No authenticated user");
      return false;
    }

    try {
      const success = await importKeyBackup(backupJson, backupPassword, authUser._id);
      if (success) {
        await get().restoreEncryptionKeys();
        toast.success("Backup imported successfully");
        return true;
      }
      toast.error("Failed to import backup");
      return false;
    } catch (error) {
      console.error('[Auth] Failed to import backup:', error);
      toast.error("Failed to import backup");
      return false;
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });

      get().connectSocket();

      // SIMPLIFIED: No encryption setup
      toast.success("Account created successfully");
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });

      get().connectSocket();

      // SIMPLIFIED: No encryption setup
      toast.success("Logged in successfully");
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      const { authUser } = get();
      
      // Delete keys from IndexedDB
      if (authUser) {
        await deleteKeys(authUser._id);
      }
      
      await axiosInstance.post("/auth/logout");
      
      set({
        authUser: null,
        encryptionKeys: null,
        hasEncryptionKey: false,
        isEncryptionEnabled: false,
      });
      
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error("Error logging out");
      console.log("Logout error:", error);
    }
  },

  updateProfile: async (data) => {
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("Error in update profile:", error);
      toast.error(error.response.data.message);
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      withCredentials: true, // this ensures cookies are sent with the connection
    });

    socket.connect();

    set({ socket });

    // listen for online users event
    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });
  },

  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },
}));
