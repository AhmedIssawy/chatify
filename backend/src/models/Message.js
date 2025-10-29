import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    image: {
      type: String,
    },
    // End-to-end encryption: store encrypted message payload
    // This field contains the encrypted JSON object from the client:
    // { version, alg, iv, wrappedKey, ciphertext }
    // The backend never decrypts this; it's stored as-is
    messagePayload: {
      type: mongoose.Schema.Types.Mixed, // Can store JSON object or string
      default: null,
    },
    // Flag to indicate if message is encrypted
    isEncrypted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
