/**
 * Keys Routes
 * 
 * Routes for public key registration and retrieval (E2E encryption).
 */

import express from "express";
import {
  registerPublicKey,
  getPublicKey,
  getBatchPublicKeys,
} from "../controllers/keys.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// All key endpoints require authentication
router.post("/register", protectRoute, registerPublicKey);
router.get("/batch", protectRoute, getBatchPublicKeys);
router.get("/:userId", protectRoute, getPublicKey);

export default router;
