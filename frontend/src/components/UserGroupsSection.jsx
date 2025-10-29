import { useState, useEffect, useRef } from "react";
import { Users, MessageCircle, X, Send, Paperclip, ArrowLeft } from "lucide-react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

function UserGroupsSection() {
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
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Load user's groups on mount
  useEffect(() => {
    getUserGroups();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [groupMessages]);

  // Subscribe to group messages when a group is selected
  useEffect(() => {
    if (selectedGroup) {
      getGroupMessages(selectedGroup._id);
      subscribeToGroupMessages();
    }
    return () => {
      unsubscribeFromGroupMessages();
    };
  }, [selectedGroup]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() && !imagePreview) return;

    try {
      await sendGroupMessage(selectedGroup._id, {
        text: messageText.trim(),
        image: imagePreview,
      });
      setMessageText("");
      setImagePreview(null);
    } catch (error) {
      // Error handled in store
    }
  };

  if (groups.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-full">
            <Users className="w-12 h-12 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          No Groups Yet
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          You haven't been added to any groups yet. Ask an admin to add you to a group!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
      <div className="flex flex-col h-[600px]">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">My Groups</h2>
                <p className="text-sm text-white/80">{groups.length} group{groups.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            {selectedGroup && (
              <button
                onClick={() => setSelectedGroup(null)}
                className="md:hidden p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Groups List */}
          <div className={`w-full md:w-80 border-r border-slate-200 dark:border-slate-700 overflow-y-auto ${selectedGroup ? 'hidden md:block' : 'block'}`}>
            {groups.map((group) => (
              <button
                key={group._id}
                onClick={() => setSelectedGroup(group)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left border-b border-slate-100 dark:border-slate-700 ${
                  selectedGroup?._id === group._id ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center border-2 border-purple-300 dark:border-purple-700">
                    {group.groupPic ? (
                      <img
                        src={group.groupPic}
                        alt={group.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {group.name}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {group.members.length} members
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col ${!selectedGroup ? 'hidden md:flex' : 'flex'}`}>
            {selectedGroup ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center border-2 border-purple-300 dark:border-purple-700">
                      {selectedGroup.groupPic ? (
                        <img
                          src={selectedGroup.groupPic}
                          alt={selectedGroup.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        {selectedGroup.name}
                        <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold rounded-full">
                          GROUP
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {selectedGroup.members.length} members
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900">
                  {groupMessages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageCircle className="w-16 h-16 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                      <p className="text-slate-600 dark:text-slate-400">
                        No messages yet. Start the conversation!
                      </p>
                    </div>
                  ) : (
                    groupMessages.map((msg) => {
                      const isOwnMessage = (msg.senderId?._id || msg.senderId) === authUser._id;
                      const senderName = msg.senderId?.fullName || "Unknown";

                      return (
                        <div
                          key={msg._id}
                          className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                              isOwnMessage
                                ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-br-sm"
                                : "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-sm shadow-sm"
                            }`}
                          >
                            {!isOwnMessage && (
                              <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">
                                {senderName}
                              </p>
                            )}
                            {msg.image && (
                              <img
                                src={msg.image}
                                alt="Shared"
                                className="rounded-lg max-w-full h-auto mb-2"
                              />
                            )}
                            {msg.text && <p className="text-sm">{msg.text}</p>}
                            <p
                              className={`text-xs mt-1 ${
                                isOwnMessage
                                  ? "text-purple-100"
                                  : "text-slate-400 dark:text-slate-500"
                              }`}
                            >
                              {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Image Preview */}
                {imagePreview && (
                  <div className="px-4 py-2 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                    <div className="relative inline-block">
                      <img src={imagePreview} alt="Preview" className="h-20 rounded-lg" />
                      <button
                        onClick={() => setImagePreview(null)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Input */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-end gap-2">
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
                      className="p-2 text-slate-400 hover:text-purple-500 transition-colors"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!messageText.trim() && !imagePreview}
                      className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <Users className="w-20 h-20 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">Select a group to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserGroupsSection;
