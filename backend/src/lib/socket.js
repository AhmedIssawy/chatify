import { Server } from "socket.io";
import http from "http";
import express from "express";
import { ENV } from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";
import { permanentlyDeleteChat } from "../controllers/message.controller.js";
import Message from "../models/Message.js";
import cloudinary from "./cloudinary.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [ENV.CLIENT_URL],
    credentials: true,
  },
});

// apply authentication middleware to all socket connections
io.use(socketAuthMiddleware);

// we will use this function to check if the user is online or not
export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// this is for storing online users
const userSocketMap = {}; // {userId:socketId}

// Track admin disconnect timers
const adminDisconnectTimers = {}; // {adminId: timeoutId}

// Helper function to delete all chats for an admin
async function deleteAllAdminChats(adminId, adminName) {
  try {
    console.log(`Deleting all chats for admin: ${adminId} (${adminName})`);

    // Find all messages where admin is sender or receiver
    const messages = await Message.find({
      $or: [{ senderId: adminId }, { receiverId: adminId }],
    });

    // Get unique user IDs that admin has chatted with
    const affectedUserIds = [
      ...new Set(
        messages.map((msg) =>
          msg.senderId.toString() === adminId.toString()
            ? msg.receiverId.toString()
            : msg.senderId.toString()
        )
      ),
    ];

    // Delete images from Cloudinary
    const imageUrls = messages
      .filter((msg) => msg.image)
      .map((msg) => msg.image);

    let deletedImages = 0;
    for (const imageUrl of imageUrls) {
      try {
        // Extract public_id from Cloudinary URL
        const urlParts = imageUrl.split("/");
        const fileWithExtension = urlParts[urlParts.length - 1];
        const publicId = fileWithExtension.split(".")[0];

        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
          deletedImages++;
        }
      } catch (imageError) {
        console.error("Error deleting image from Cloudinary:", imageError);
      }
    }

    // Delete all messages
    const deleteResult = await Message.deleteMany({
      $or: [{ senderId: adminId }, { receiverId: adminId }],
    });

    console.log(
      `Permanently deleted ${deleteResult.deletedCount} messages and ${deletedImages} images for admin ${adminId}`
    );

    // Notify all affected users
    affectedUserIds.forEach((userId) => {
      const socketId = getReceiverSocketId(userId);
      if (socketId) {
        io.to(socketId).emit("chatPermanentlyDeleted", {
          adminId: adminId.toString(),
          adminName,
          reason: "admin_disconnected",
          timestamp: new Date().toISOString(),
          deletedCount: deleteResult.deletedCount,
        });
      }
    });

    return {
      success: true,
      deletedCount: deleteResult.deletedCount,
      deletedImages,
      affectedUsers: affectedUserIds.length,
    };
  } catch (error) {
    console.error("Error in deleteAllAdminChats:", error);
    throw error;
  }
}

io.on("connection", (socket) => {
  console.log("A user connected", socket.user.fullName);

  const userId = socket.userId;
  const isAdmin = socket.user.isAdmin;

  userSocketMap[userId] = socket.id;

  // io.emit() is used to send events to all connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Handle admin manually leaving a chat with a specific user
  socket.on("adminLeavingChat", async ({ userId: targetUserId }) => {
    if (!isAdmin) {
      console.log("Non-admin user tried to use adminLeavingChat");
      return;
    }

    try {
      console.log(
        `Admin ${socket.user.fullName} manually leaving chat with user ${targetUserId}`
      );

      const result = await permanentlyDeleteChat(userId, targetUserId);

      // Notify the user their chat was deleted
      const targetSocketId = getReceiverSocketId(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("chatPermanentlyDeleted", {
          adminId: userId.toString(),
          adminName: socket.user.fullName,
          reason: "admin_left_chat",
          timestamp: new Date().toISOString(),
          deletedCount: result.deletedCount,
        });
      }

      // Confirm to admin
      socket.emit("chatDeleted", {
        success: true,
        userId: targetUserId,
        deletedCount: result.deletedCount,
        deletedImages: result.deletedImages,
      });
    } catch (error) {
      console.error("Error in adminLeavingChat:", error);
      socket.emit("chatDeleted", {
        success: false,
        error: "Failed to delete chat",
      });
    }
  });

  // Handle admin manually terminating all chats
  socket.on("terminateAllChats", async () => {
    if (!isAdmin) {
      console.log("Non-admin user tried to use terminateAllChats");
      return;
    }

    try {
      console.log(
        `Admin ${socket.user.fullName} manually terminating all chats`
      );

      // Cancel any existing timer
      if (adminDisconnectTimers[userId]) {
        clearTimeout(adminDisconnectTimers[userId]);
        delete adminDisconnectTimers[userId];
      }

      const result = await deleteAllAdminChats(userId, socket.user.fullName);

      // Confirm to admin
      socket.emit("allChatsTerminated", {
        success: true,
        ...result,
      });
    } catch (error) {
      console.error("Error in terminateAllChats:", error);
      socket.emit("allChatsTerminated", {
        success: false,
        error: "Failed to terminate chats",
      });
    }
  });

  // Handle user joining a group room
  socket.on("joinGroup", (groupId) => {
    socket.join(`group_${groupId}`);
    console.log(`User ${socket.user.fullName} joined group ${groupId}`);
  });

  // Handle user leaving a group room
  socket.on("leaveGroup", (groupId) => {
    socket.leave(`group_${groupId}`);
    console.log(`User ${socket.user.fullName} left group ${groupId}`);
  });

  // Handle typing in group
  socket.on("groupTyping", ({ groupId, isTyping }) => {
    socket.to(`group_${groupId}`).emit("groupUserTyping", {
      userId,
      userName: socket.user.fullName,
      isTyping,
    });
  });

  // with socket.on we listen for events from clients
  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.user.fullName);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // If admin disconnects, immediately delete all chats (no grace period)
    if (isAdmin) {
      console.log(
        `Admin ${socket.user.fullName} disconnected. Immediately deleting all chats...`
      );

      // Cancel any existing timer
      if (adminDisconnectTimers[userId]) {
        clearTimeout(adminDisconnectTimers[userId]);
        delete adminDisconnectTimers[userId];
      }

      // Immediately delete all chats without waiting
      deleteAllAdminChats(userId, socket.user.fullName)
        .then(() => {
          console.log(`Successfully deleted all chats for admin ${userId}`);
        })
        .catch((error) => {
          console.error(
            `Error deleting chats for admin ${userId}:`,
            error
          );
        });
    }
  });
});

export { io, app, server };
