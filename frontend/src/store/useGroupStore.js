import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useGroupStore = create((set, get) => ({
  groups: [],
  selectedGroup: null,
  groupMessages: [],
  isGroupsLoading: false,
  isGroupMessagesLoading: false,

  // Fetch all groups (admin only)
  getAllGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups/all");
      set({ groups: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load groups");
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  // Fetch groups where user is a member
  getUserGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups/user");
      set({ groups: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load groups");
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  // Create a new group (admin only)
  createGroup: async (groupData) => {
    try {
      const res = await axiosInstance.post("/groups", groupData);
      set((state) => ({ groups: [res.data, ...state.groups] }));
      toast.success("Group created successfully!");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create group");
      throw error;
    }
  },

  // Update group settings (admin only)
  updateGroupSettings: async (groupId, settings) => {
    try {
      const res = await axiosInstance.patch(`/groups/${groupId}/settings`, settings);
      set((state) => ({
        groups: state.groups.map((g) => (g._id === groupId ? res.data : g)),
        selectedGroup: state.selectedGroup?._id === groupId ? res.data : state.selectedGroup,
      }));
      toast.success("Group settings updated!");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update group");
      throw error;
    }
  },

  // Add members to group (admin only)
  addGroupMembers: async (groupId, memberIds) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/members`, { memberIds });
      set((state) => ({
        groups: state.groups.map((g) => (g._id === groupId ? res.data : g)),
        selectedGroup: state.selectedGroup?._id === groupId ? res.data : state.selectedGroup,
      }));
      toast.success("Members added successfully!");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add members");
      throw error;
    }
  },

  // Remove member from group (admin only)
  removeGroupMember: async (groupId, memberId) => {
    try {
      const res = await axiosInstance.delete(`/groups/${groupId}/members/${memberId}`);
      set((state) => ({
        groups: state.groups.map((g) => (g._id === groupId ? res.data : g)),
        selectedGroup: state.selectedGroup?._id === groupId ? res.data : state.selectedGroup,
      }));
      toast.success("Member removed successfully!");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove member");
      throw error;
    }
  },

  // Delete group (admin only)
  deleteGroup: async (groupId) => {
    try {
      await axiosInstance.delete(`/groups/${groupId}`);
      set((state) => ({
        groups: state.groups.filter((g) => g._id !== groupId),
        selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup,
      }));
      toast.success("Group deleted successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete group");
      throw error;
    }
  },

  // Delete all messages in a group (admin only)
  deleteAllGroupMessages: async (groupId) => {
    try {
      await axiosInstance.delete(`/groups/${groupId}/messages`);
      set({ groupMessages: [] });
      toast.success("All messages deleted successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete messages");
      throw error;
    }
  },

  // Select a group
  setSelectedGroup: (group) => {
    set({ selectedGroup: group });
  },

  // Get group messages
  getGroupMessages: async (groupId) => {
    set({ isGroupMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/messages`);
      set({ groupMessages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isGroupMessagesLoading: false });
    }
  },

  // Send group message
  sendGroupMessage: async (groupId, messageData) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/messages`, messageData);
      // Don't add message locally - let the socket event handle it
      // This prevents duplicate messages
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
      throw error;
    }
  },

  // Subscribe to group messages
  subscribeToGroupMessages: () => {
    const { selectedGroup } = get();
    if (!selectedGroup) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // Join the group room
    socket.emit("joinGroup", selectedGroup._id);

    // Listen for new messages
    socket.on("newGroupMessage", (message) => {
      const { selectedGroup } = get();
      if (message.groupId === selectedGroup?._id) {
        set((state) => ({
          groupMessages: [...state.groupMessages, message],
        }));
      }
    });

    // Listen for group updates
    socket.on("groupUpdated", (updatedGroup) => {
      set((state) => ({
        groups: state.groups.map((g) => (g._id === updatedGroup._id ? updatedGroup : g)),
        selectedGroup: state.selectedGroup?._id === updatedGroup._id ? updatedGroup : state.selectedGroup,
      }));
    });

    // Listen for new groups
    socket.on("newGroup", (newGroup) => {
      set((state) => ({
        groups: [newGroup, ...state.groups],
      }));
      toast.success(`You've been added to group: ${newGroup.name}`);
    });

    // Listen for added to group
    socket.on("addedToGroup", (group) => {
      set((state) => ({
        groups: [group, ...state.groups],
      }));
      toast.success(`You've been added to group: ${group.name}`);
    });

    // Listen for removed from group
    socket.on("removedFromGroup", ({ groupId }) => {
      set((state) => ({
        groups: state.groups.filter((g) => g._id !== groupId),
        selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup,
      }));
      toast.info("You've been removed from a group");
    });

    // Listen for group deleted
    socket.on("groupDeleted", ({ groupId }) => {
      set((state) => ({
        groups: state.groups.filter((g) => g._id !== groupId),
        selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup,
      }));
      toast.info("A group has been deleted");
    });

    // Listen for messages cleared
    socket.on("groupMessagesCleared", ({ groupId }) => {
      const { selectedGroup } = get();
      if (selectedGroup?._id === groupId) {
        set({ groupMessages: [] });
        toast.info("All messages have been cleared by admin");
      }
    });
  },

  // Unsubscribe from group messages
  unsubscribeFromGroupMessages: () => {
    const { selectedGroup } = get();
    const socket = useAuthStore.getState().socket;
    
    if (socket && selectedGroup) {
      socket.emit("leaveGroup", selectedGroup._id);
      socket.off("newGroupMessage");
      socket.off("groupUpdated");
      socket.off("newGroup");
      socket.off("addedToGroup");
      socket.off("removedFromGroup");
      socket.off("groupDeleted");
      socket.off("groupMessagesCleared");
    }
  },
}));
