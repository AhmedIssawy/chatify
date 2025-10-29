/**
 * Keys Controller
 * 
 * Handles public key registration and retrieval for end-to-end encryption.
 * 
 * SECURITY NOTES:
 * - Backend NEVER stores or accepts private keys
 * - Public keys are validated for correct PEM format
 * - Rate limiting should be applied at the route level
 */

import User from "../models/User.js";
import { validatePublicKeyPem } from "../lib/utils.js";

/**
 * POST /api/keys/register
 * 
 * Registers or updates a user's public key for encryption.
 * 
 * Request Body:
 * {
 *   userId: string,
 *   publicKeyPem: string,
 *   keyId?: string (optional, defaults to "v1")
 * }
 * 
 * Response:
 * {
 *   ok: true,
 *   message: "Public key registered successfully"
 * }
 * 
 * Example Input:
 * {
 *   "userId": "507f1f77bcf86cd799439011",
 *   "publicKeyPem": "-----BEGIN PUBLIC KEY-----\nMIIBIj...\n-----END PUBLIC KEY-----",
 *   "keyId": "v1"
 * }
 */
export const registerPublicKey = async (req, res) => {
  try {
    const { userId, publicKeyPem, keyId = "v1" } = req.body;

    // Validate required fields
    if (!userId || !publicKeyPem) {
      return res.status(400).json({
        ok: false,
        message: "userId and publicKeyPem are required",
      });
    }

    // Validate public key format
    if (!validatePublicKeyPem(publicKeyPem)) {
      return res.status(400).json({
        ok: false,
        message: "Invalid public key format. Must be PEM-encoded RSA public key.",
      });
    }

    // SECURITY: Ensure we're not accepting private keys
    if (publicKeyPem.includes("PRIVATE KEY")) {
      return res.status(400).json({
        ok: false,
        message: "Private keys are not accepted. Only public keys should be sent.",
      });
    }

    // Verify user exists and is authenticated
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({
        ok: false,
        message: "Unauthorized: Cannot register public key for another user",
      });
    }

    // Update user's public key
    const user = await User.findByIdAndUpdate(
      userId,
      {
        publicKeyPem,
        keyId,
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        ok: false,
        message: "User not found",
      });
    }

    // Do NOT log the public key in production (privacy consideration)
    console.log(`Public key registered for user ${userId} (keyId: ${keyId})`);

    res.status(200).json({
      ok: true,
      message: "Public key registered successfully",
      keyId,
    });
  } catch (error) {
    console.error("Error in registerPublicKey:", error.message);
    res.status(500).json({
      ok: false,
      message: "Internal server error",
    });
  }
};

/**
 * GET /api/keys/:userId
 * 
 * Retrieves a user's public key for encryption.
 * 
 * Response:
 * {
 *   userId: string,
 *   publicKeyPem: string,
 *   keyId: string
 * }
 * 
 * Example Output:
 * {
 *   "userId": "507f1f77bcf86cd799439011",
 *   "publicKeyPem": "-----BEGIN PUBLIC KEY-----\nMIIBIj...\n-----END PUBLIC KEY-----",
 *   "keyId": "v1"
 * }
 */
export const getPublicKey = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        ok: false,
        message: "userId is required",
      });
    }

    // Fetch user's public key
    const user = await User.findById(userId).select("publicKeyPem keyId");

    if (!user) {
      return res.status(404).json({
        ok: false,
        message: "User not found",
      });
    }

    if (!user.publicKeyPem) {
      return res.status(404).json({
        ok: false,
        message: "Public key not found for this user. User needs to register their key.",
      });
    }

    res.status(200).json({
      userId: user._id.toString(),
      publicKeyPem: user.publicKeyPem,
      keyId: user.keyId || "v1",
    });
  } catch (error) {
    console.error("Error in getPublicKey:", error.message);
    res.status(500).json({
      ok: false,
      message: "Internal server error",
    });
  }
};

/**
 * GET /api/keys/batch
 * 
 * Retrieves public keys for multiple users (useful for group chats).
 * 
 * Query: ?userIds=id1,id2,id3
 * 
 * Response:
 * {
 *   keys: [
 *     { userId: string, publicKeyPem: string, keyId: string },
 *     ...
 *   ]
 * }
 */
export const getBatchPublicKeys = async (req, res) => {
  try {
    const { userIds } = req.query;

    if (!userIds) {
      return res.status(400).json({
        ok: false,
        message: "userIds query parameter is required (comma-separated)",
      });
    }

    const userIdArray = userIds.split(",").map((id) => id.trim());

    if (userIdArray.length > 50) {
      return res.status(400).json({
        ok: false,
        message: "Maximum 50 users per batch request",
      });
    }

    const users = await User.find({
      _id: { $in: userIdArray },
    }).select("publicKeyPem keyId");

    const keys = users
      .filter((user) => user.publicKeyPem) // Only include users with registered keys
      .map((user) => ({
        userId: user._id.toString(),
        publicKeyPem: user.publicKeyPem,
        keyId: user.keyId || "v1",
      }));

    res.status(200).json({
      keys,
    });
  } catch (error) {
    console.error("Error in getBatchPublicKeys:", error.message);
    res.status(500).json({
      ok: false,
      message: "Internal server error",
    });
  }
};
