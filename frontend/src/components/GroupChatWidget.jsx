import { useState, useEffect, useRef } from "react";
import { X, Send, Paperclip, Users, Image as ImageIcon } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useGroupStore } from "../store/useGroupStore";
import toast from "react-hot-toast";

function GroupChatWidget({ isOpen, onClose }) {
  const { authUser } = useAuthStore();
  const {
    groups,
    selectedGroup,
    setSelectedGroup,
    groupMessages,
    getUserGroups,
    getGroupMessages,
    sendGroupMessage,
    subscribeToGroupMessages,
    unsubscribeFromGroupMessages,
  } = useGroupStore();

  const [messageText, setMessageText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const messageEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch user's groups when widget opens
  useEffect(() => {
    if (isOpen) {
      setIsLoadingGroups(true);
      getUserGroups()
        .then(() => setIsLoadingGroups(false))
        .catch(() => setIsLoadingGroups(false));
    }
  }, [isOpen, getUserGroups]);

  // Fetch messages when a group is selected
  useEffect(() => {
    if (selectedGroup?._id) {
      getGroupMessages(selectedGroup._id);
      subscribeToGroupMessages();
    }

    return () => {
      if (selectedGroup?._id) {
        unsubscribeFromGroupMessages();
      }
    };
  }, [selectedGroup, getGroupMessages, subscribeToGroupMessages, unsubscribeFromGroupMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupMessages]);

  // Handle send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!messageText.trim() && !imagePreview) || !selectedGroup) return;

    const formData = {
      text: messageText.trim(),
      image: imagePreview,
    };

    try {
      await sendGroupMessage(selectedGroup._id, formData);
      setMessageText("");
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Format time
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 right-0 md:bottom-6 md:right-[27rem] w-full md:w-96 h-[100vh] md:h-[600px] bg-white dark:bg-slate-800 md:rounded-2xl shadow-2xl flex flex-col overflow-hidden z-[90] border-t md:border border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">
              {selectedGroup ? selectedGroup.name : "Group Chats"}
            </h3>
            <p className="text-xs text-white/80">
              {selectedGroup
                ? `${selectedGroup.members?.length || 0} members`
                : `${groups.length} groups`}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {!selectedGroup ? (
          /* Group List */
          <div className="flex-1 overflow-y-auto">
            {isLoadingGroups ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <Users className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
                <p className="text-slate-600 dark:text-slate-400">
                  You're not in any groups yet
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                  Wait for an admin to add you to a group
                </p>
              </div>
            ) : (
              <div className="p-2">
                {groups.map((group) => (
                  <button
                    key={group._id}
                    onClick={() => setSelectedGroup(group)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-left"
                  >
                    {/* Group Avatar */}
                    <div className="relative flex-shrink-0">
                      {group.groupPic ? (
                        <img
                          src={group.groupPic}
                          alt={group.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Group Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {group.name}
                        </h4>
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs rounded-full">
                          GROUP
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                        {group.description || `${group.members?.length || 0} members`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Chat Area */
          <div className="flex-1 flex flex-col">
            {/* Back Button */}
            <div className="p-2 border-b border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setSelectedGroup(null)}
                className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
              >
                ← Back to groups
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {groupMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 font-medium">
                    No messages yet
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                    Be the first to send a message!
                  </p>
                </div>
              ) : (
                groupMessages.map((msg) => {
                  const isOwnMessage = msg.senderId?._id === authUser?._id;
                  return (
                    <div
                      key={msg._id}
                      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] ${
                          isOwnMessage
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                        } rounded-2xl px-4 py-2`}
                      >
                        {/* Sender Name (if not own message) */}
                        {!isOwnMessage && (
                          <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">
                            {msg.senderId?.fullName || "Unknown"}
                          </p>
                        )}

                        {/* Message Image */}
                        {msg.image && (
                          <img
                            src={msg.image}
                            alt="Shared"
                            className="rounded-lg mb-2 max-w-full"
                          />
                        )}

                        {/* Message Text */}
                        {msg.text && <p className="break-words">{msg.text}</p>}

                        {/* Timestamp */}
                        <p
                          className={`text-xs mt-1 ${
                            isOwnMessage ? "text-white/80" : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messageEndRef} />
            </div>

            {/* Image Preview */}
            {imagePreview && (
              <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700">
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-20 rounded-lg"
                  />
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Attach Image"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                />

                <button
                  type="submit"
                  disabled={!messageText.trim() && !imagePreview}
                  className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default GroupChatWidget;
