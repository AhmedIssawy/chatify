import express from "express";
import { protectRoute, adminOnly } from "../middleware/auth.middleware.js";
import {
  createGroup,
  getAllGroups,
  getUserGroups,
  getGroupById,
  updateGroupSettings,
  addGroupMembers,
  removeGroupMember,
  deleteGroup,
  getGroupMessages,
  sendGroupMessage,
} from "../controllers/group.controller.js";

const router = express.Router();

// Admin-only routes
router.post("/", protectRoute, adminOnly, createGroup);
router.get("/all", protectRoute, adminOnly, getAllGroups);
router.patch("/:id/settings", protectRoute, adminOnly, updateGroupSettings);
router.post("/:id/members", protectRoute, adminOnly, addGroupMembers);
router.delete("/:id/members/:memberId", protectRoute, adminOnly, removeGroupMember);
router.delete("/:id", protectRoute, adminOnly, deleteGroup);

// Member routes (members can view and send messages)
router.get("/user", protectRoute, getUserGroups);
router.get("/:id", protectRoute, getGroupById);
router.get("/:id/messages", protectRoute, getGroupMessages);
router.post("/:id/messages", protectRoute, sendGroupMessage);

export default router;
