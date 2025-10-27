import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

export const getAllContacts = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.log("Error in getAllContacts:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAvailAdmin = async (req, res) => {
  // back "avail is not implemented yet"
  try {
    const availableAdmins = await User.find({ isAdmin: true })
      .select("-password")
      .lean();
    res.status(200).json(availableAdmins);
  } catch (error) {
    console.log("Error in getAvailAdmin:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const permanentlyDeleteChat = async (adminId, userId) => {
  try {
    // Find all messages between admin and user
    const messages = await Message.find({
      $or: [
        { senderId: adminId, receiverId: userId },
        { senderId: userId, receiverId: adminId },
      ],
    });

    // Delete images from Cloudinary (if any)
    const imageUrls = messages
      .filter((msg) => msg.image)
      .map((msg) => msg.image);

    // Extract public_ids from Cloudinary URLs and delete them
    for (const imageUrl of imageUrls) {
      try {
        // Extract public_id from Cloudinary URL
        // URL format: https://res.cloudinary.com/[cloud_name]/image/upload/[version]/[public_id].[format]
        const urlParts = imageUrl.split("/");
        const fileWithExtension = urlParts[urlParts.length - 1];
        const publicId = fileWithExtension.split(".")[0];

        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      } catch (imageError) {
        // Silently continue if image deletion fails
        console.error("Error deleting image from Cloudinary:", imageError);
      }
    }

    // Permanently delete ALL messages - complete removal from database
    const deleteResult = await Message.deleteMany({
      $or: [
        { senderId: adminId, receiverId: userId },
        { senderId: userId, receiverId: adminId },
      ],
    });

    console.log(
      `Permanently deleted ${deleteResult.deletedCount} messages between admin ${adminId} and user ${userId}`
    );

    return {
      success: true,
      deletedCount: deleteResult.deletedCount,
      deletedImages: imageUrls.length,
    };
  } catch (error) {
    console.error("Error in permanentlyDeleteChat:", error);
    throw error;
  }
};

export const getMessagesByUserId = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: userToChatId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!text && !image) {
      return res.status(400).json({ message: "Text or image is required." });
    }
    if (senderId.equals(receiverId)) {
      return res
        .status(400)
        .json({ message: "Cannot send messages to yourself." });
    }
    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      return res.status(404).json({ message: "Receiver not found." });
    }

    let imageUrl;
    if (image) {
      // upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getChatPartners = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // find all the messages where the logged-in user is either sender or receiver
    const messages = await Message.find({
      $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
    });

    const chatPartnerIds = [
      ...new Set(
        messages.map((msg) =>
          msg.senderId.toString() === loggedInUserId.toString()
            ? msg.receiverId.toString()
            : msg.senderId.toString()
        )
      ),
    ];

    const chatPartners = await User.find({
      _id: { $in: chatPartnerIds },
    }).select("-password");

    res.status(200).json(chatPartners);
  } catch (error) {
    console.error("Error in getChatPartners: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
