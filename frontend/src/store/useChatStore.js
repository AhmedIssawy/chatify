import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";
import {
  decryptMessagePayload,
  needsDecryption,
  parseMessagePayload,
  encryptMessageForRecipient,
} from "../lib/crypto";

export const useChatStore = create((set, get) => ({
  allUsers: [],
  chats: [],
  messages: [],
  activeTab: "chats",
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isSoundEnabled: JSON.parse(localStorage.getItem("isSoundEnabled")) === true,

  toggleSound: () => {
    localStorage.setItem("isSoundEnabled", !get().isSoundEnabled);
    set({ isSoundEnabled: !get().isSoundEnabled });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedUser: (selectedUser) => set({ selectedUser }),

  getAllUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ allUsers: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },
  getMyChatPartners: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/chats");
      set({ chats: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessagesByUserId: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      const messages = res.data;

      // Decrypt messages before setting state
      const decryptedMessages = await get().decryptMessages(messages);
      set({ messages: decryptedMessages });
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  /**
   * Decrypts an array of messages.
   * SIMPLIFIED: No decryption needed now (encryption disabled)
   * 
   * @param {Array} messages - Array of message objects from backend
   * @returns {Promise<Array>} Array of messages as-is
   */
  decryptMessages: async (messages) => {
    // SIMPLIFIED: Just return messages as-is
    // All messages are plaintext now
    console.log('[Chat] Messages loaded (encryption disabled)');
    return messages;
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    const { authUser } = useAuthStore.getState();

    // SIMPLIFIED: Encryption disabled for now - send as plaintext
    // Messages will work normally without encryption issues
    console.log('[Chat] Sending message as plaintext (encryption disabled)');
    
    let finalMessageData = messageData;

    const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
      _id: tempId,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      text: messageData.text, // Show plaintext in UI optimistically
      image: messageData.image,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    // Immediately update the UI by adding the message
    set({ messages: [...messages, optimisticMessage] });

    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        finalMessageData
      );

      // Decrypt the response if it's encrypted
      let finalMessage = res.data;
      if (finalMessage.isEncrypted && finalMessage.messagePayload) {
        const decryptedMessages = await get().decryptMessages([finalMessage]);
        finalMessage = decryptedMessages[0];
      }

      set({ messages: messages.concat(finalMessage) });
    } catch (error) {
      // Remove optimistic message on failure
      set({ messages: messages });
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser, isSoundEnabled } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", async (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      // Decrypt incoming message if encrypted
      let finalMessage = newMessage;
      if (newMessage.isEncrypted && newMessage.messagePayload) {
        const decryptedMessages = await get().decryptMessages([newMessage]);
        finalMessage = decryptedMessages[0];
      }

      const currentMessages = get().messages;
      set({ messages: [...currentMessages, finalMessage] });

      if (isSoundEnabled) {
        const notificationSound = new Audio("/sounds/notification.mp3");

        notificationSound.currentTime = 0; // reset to start
        notificationSound.play().catch((e) => console.log("Audio play failed:", e));
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
  },
}));
