import Group from "../models/Group.js";
import GroupMessage from "../models/GroupMessage.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// Create a new group (Admin only)
export const createGroup = async (req, res) => {
  try {
    const { name, description, memberIds, groupPic } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ message: "At least one member is required" });
    }

    // Verify all members exist
    const members = await User.find({ _id: { $in: memberIds } });
    if (members.length !== memberIds.length) {
      return res.status(400).json({ message: "One or more members not found" });
    }

    let uploadedGroupPic = "";
    if (groupPic) {
      const uploadResponse = await cloudinary.uploader.upload(groupPic);
      uploadedGroupPic = uploadResponse.secure_url;
    }

    // Ensure admin creator is included in members
    const allMemberIds = [...new Set([...memberIds, req.user._id.toString()])];

    const group = new Group({
      name: name.trim(),
      description: description?.trim() || "",
      groupPic: uploadedGroupPic,
      members: allMemberIds,
      admins: [req.user._id], // Creator is admin
      createdBy: req.user._id,
    });

    await group.save();
    await group.populate("members", "fullName email profilePic");
    await group.populate("createdBy", "fullName email");
    await group.populate("admins", "fullName email");

    // Notify all members about the new group (including creator)
    allMemberIds.forEach((memberId) => {
      const memberSocketId = getReceiverSocketId(memberId.toString());
      if (memberSocketId) {
        io.to(memberSocketId).emit("newGroup", group);
      }
    });

    res.status(201).json(group);
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all groups for admin
export const getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find({ isActive: true })
      .populate("members", "fullName email profilePic")
      .populate("createdBy", "fullName email")
      .populate("admins", "fullName email")
      .sort({ createdAt: -1 });

    res.status(200).json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get groups where user is a member
export const getUserGroups = async (req, res) => {
  try {
    const groups = await Group.find({
      members: req.user._id,
      isActive: true,
    })
      .populate("members", "fullName email profilePic")
      .populate("createdBy", "fullName email")
      .populate("admins", "fullName email")
      .sort({ createdAt: -1 });

    res.status(200).json(groups);
  } catch (error) {
    console.error("Error fetching user groups:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get single group details
export const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await Group.findById(id)
      .populate("members", "fullName email profilePic")
      .populate("createdBy", "fullName email")
      .populate("admins", "fullName email");

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is a member or admin
    const isMember = group.members.some(
      (member) => member._id.toString() === req.user._id.toString()
    );
    const isAdmin = req.user.isAdmin;

    if (!isMember && !isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(200).json(group);
  } catch (error) {
    console.error("Error fetching group:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update group settings (Admin only)
export const updateGroupSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, groupPic, settings } = req.body;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Update fields
    if (name) group.name = name.trim();
    if (description !== undefined) group.description = description.trim();
    
    if (groupPic) {
      const uploadResponse = await cloudinary.uploader.upload(groupPic);
      group.groupPic = uploadResponse.secure_url;
    }

    if (settings) {
      group.settings = { ...group.settings, ...settings };
    }

    await group.save();
    await group.populate("members", "fullName email profilePic");
    await group.populate("createdBy", "fullName email");
    await group.populate("admins", "fullName email");

    // Notify all members about the update
    group.members.forEach((member) => {
      const memberSocketId = getReceiverSocketId(member._id.toString());
      if (memberSocketId) {
        io.to(memberSocketId).emit("groupUpdated", group);
      }
    });

    res.status(200).json(group);
  } catch (error) {
    console.error("Error updating group:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Add members to group (Admin only)
export const addGroupMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const { memberIds } = req.body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ message: "Member IDs are required" });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check max members limit
    if (group.members.length + memberIds.length > group.settings.maxMembers) {
      return res.status(400).json({ message: "Max members limit exceeded" });
    }

    // Verify all members exist
    const members = await User.find({ _id: { $in: memberIds } });
    if (members.length !== memberIds.length) {
      return res.status(400).json({ message: "One or more members not found" });
    }

    // Add only new members
    const newMemberIds = memberIds.filter(
      (memberId) =>
        !group.members.some((m) => m.toString() === memberId.toString())
    );

    group.members.push(...newMemberIds);
    await group.save();
    await group.populate("members", "fullName email profilePic");
    await group.populate("createdBy", "fullName email");
    await group.populate("admins", "fullName email");

    // Notify new members
    newMemberIds.forEach((memberId) => {
      const memberSocketId = getReceiverSocketId(memberId.toString());
      if (memberSocketId) {
        io.to(memberSocketId).emit("addedToGroup", group);
      }
    });

    // Notify existing members
    group.members.forEach((member) => {
      const memberSocketId = getReceiverSocketId(member._id.toString());
      if (memberSocketId) {
        io.to(memberSocketId).emit("groupUpdated", group);
      }
    });

    res.status(200).json(group);
  } catch (error) {
    console.error("Error adding members:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Remove member from group (Admin only)
export const removeGroupMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Remove member
    group.members = group.members.filter(
      (m) => m.toString() !== memberId.toString()
    );

    // Also remove from admins if they were admin
    group.admins = group.admins.filter(
      (a) => a.toString() !== memberId.toString()
    );

    await group.save();
    await group.populate("members", "fullName email profilePic");
    await group.populate("createdBy", "fullName email");
    await group.populate("admins", "fullName email");

    // Notify removed member
    const memberSocketId = getReceiverSocketId(memberId);
    if (memberSocketId) {
      io.to(memberSocketId).emit("removedFromGroup", { groupId: id });
    }

    // Notify remaining members
    group.members.forEach((member) => {
      const socketId = getReceiverSocketId(member._id.toString());
      if (socketId) {
        io.to(socketId).emit("groupUpdated", group);
      }
    });

    res.status(200).json(group);
  } catch (error) {
    console.error("Error removing member:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete group (Admin only)
export const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await Group.findById(id).populate("members", "_id");
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Soft delete
    group.isActive = false;
    await group.save();

    // Delete all messages (optional - or keep for history)
    await GroupMessage.deleteMany({ groupId: id });

    // Notify all members
    group.members.forEach((member) => {
      const memberSocketId = getReceiverSocketId(member._id.toString());
      if (memberSocketId) {
        io.to(memberSocketId).emit("groupDeleted", { groupId: id });
      }
    });

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get group messages
export const getGroupMessages = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is a member or admin
    const isMember = group.members.some(
      (member) => member.toString() === req.user._id.toString()
    );
    const isAdmin = req.user.isAdmin;

    if (!isMember && !isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    const messages = await GroupMessage.find({ groupId: id })
      .populate("senderId", "fullName email profilePic")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching group messages:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Send message to group
export const sendGroupMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, image } = req.body;

    const group = await Group.findById(id).populate("members", "_id");
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is a member
    const isMember = group.members.some(
      (member) => member._id.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    // Check if member messages are allowed
    const isGroupAdmin = group.admins.some(
      (admin) => admin.toString() === req.user._id.toString()
    );
    const isSystemAdmin = req.user.isAdmin;

    if (!group.settings.allowMemberMessages && !isGroupAdmin && !isSystemAdmin) {
      return res.status(403).json({ message: "Only admins can send messages in this group" });
    }

    let imageUrl = "";
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const message = new GroupMessage({
      groupId: id,
      senderId: req.user._id,
      text,
      image: imageUrl,
    });

    await message.save();
    await message.populate("senderId", "fullName email profilePic");

    // Broadcast to all group members
    group.members.forEach((member) => {
      const memberSocketId = getReceiverSocketId(member._id.toString());
      if (memberSocketId) {
        io.to(memberSocketId).emit("newGroupMessage", message);
      }
    });

    res.status(201).json(message);
  } catch (error) {
    console.error("Error sending group message:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
