import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Paperclip, Minimize2, Trash2, AlertTriangle, Lock, LockOpen, Shield } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import EncryptionSetup from "./EncryptionSetup";

function ChatWidget() {
  const { authUser, onlineUsers, isEncryptionEnabled, encryptionKeys, hasEncryptionKey, toggleEncryption } = useAuthStore();
  const {
    selectedUser,
    setSelectedUser,
    getMessagesByUserId,
    messages,
    sendMessage,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();

  const [isOpen, setIsOpen] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [terminationNotification, setTerminationNotification] = useState(null);
  const [showEncryptionSetup, setShowEncryptionSetup] = useState(false);
  const messageEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);

  // Role-based labels
  const isAdmin = authUser?.isAdmin;
  const labels = {
    promptBubble: isAdmin
      ? "Want to reach out to users? Click the chat button to start a conversation."
      : "Need help? Click the chat button to connect with our support team.",
    header: isAdmin ? "👨‍💼 User Messages" : "💬 Support Team",
    subtext: isAdmin
      ? "Select a user to assist or follow up with."
      : "Choose an admin to chat with.",
    statusMessage: isAdmin
      ? "Stay connected and help your users in real time."
      : "Typically replies within a few minutes.",
    emptyWelcome: isAdmin ? "Welcome, Support Admin 👋" : "Welcome to Support Chat 👋",
    listHeader: isAdmin ? "Available Users" : "Available Support Agents",
    listSubtext: isAdmin ? "Click on a user to start chatting" : "Click on an agent to start chatting",
    emptyList: isAdmin ? "No users available right now" : "No agents available right now",
    buttonTooltip: isAdmin ? "Contact User" : "Contact Support",
  };

  // Fetch available users based on role
  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const endpoint = isAdmin ? "/messages/users" : "/messages/avail-admin";
      const res = await axiosInstance.get(endpoint);
      const filteredUsers = res.data.filter((user) => user._id !== authUser._id);
      setUsers(filteredUsers);
    } catch (error) {
      toast.error("Failed to load users");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Handle opening the widget with smart admin selection
  const handleOpenWidget = async () => {
    setIsOpen(true);
    setHasNewMessage(false); // Clear notification badge
    
    // Only auto-select for non-admin users
    if (!isAdmin && !selectedUser) {
      setIsLoadingUsers(true);
      
      try {
        // Check if there's a last contacted admin in localStorage
        const lastAdminId = localStorage.getItem('lastAdminId');
        
        // Fetch available admins
        const res = await axiosInstance.get("/messages/avail-admin");
        const availableAdmins = res.data.filter((user) => user._id !== authUser._id);
        setUsers(availableAdmins);
        
        let adminToSelect = null;
        
        // Try to reconnect with last contacted admin first
        if (lastAdminId) {
          adminToSelect = availableAdmins.find(admin => admin._id === lastAdminId);
        }
        
        // If last admin not found or doesn't exist, find first online admin
        if (!adminToSelect) {
          adminToSelect = availableAdmins.find(admin => onlineUsers.includes(admin._id));
        }
        
        if (adminToSelect) {
          // Save this admin as last contacted
          localStorage.setItem('lastAdminId', adminToSelect._id);
          
          setSelectedUser(adminToSelect);
          setShowUserList(false);
          getMessagesByUserId(adminToSelect._id);
          subscribeToMessages();
        } else {
          // No online admins available - show waiting message
          setShowUserList(false);
          setSelectedUser(null);
        }
      } catch (error) {
        toast.error("Failed to load admins");
        setShowUserList(true);
      } finally {
        setIsLoadingUsers(false);
      }
    } else {
      // For admin users or if user already selected, show user list
      if (!selectedUser) {
        setShowUserList(true);
        fetchUsers();
      }
    }
  };

  // Handle selecting a user
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setShowUserList(false);
    getMessagesByUserId(user._id);
    subscribeToMessages();
    
    // Save as last contacted admin for non-admin users
    if (!isAdmin) {
      localStorage.setItem('lastAdminId', user._id);
    }
  };

  // Handle closing the widget
  const handleClose = () => {
    setIsOpen(false);
    setShowUserList(false);
  };

  // Handle back to user list
  const handleBackToList = () => {
    setSelectedUser(null);
    setShowUserList(true);
    unsubscribeFromMessages();
    fetchUsers();
  };

  // Handle admin leaving chat with a user
  const handleAdminLeaveChat = () => {
    if (!isAdmin || !selectedUser) return;

    const confirmLeave = window.confirm(
      `Are you sure you want to permanently delete all messages with ${selectedUser.fullName}? This action cannot be undone.`
    );
    
    if (!confirmLeave) return;

    const { socket } = useAuthStore.getState();
    if (socket) {
      socket.emit("adminLeavingChat", { userId: selectedUser._id });
      
      // Handle response
      socket.once("chatDeleted", (data) => {
        if (data.success) {
          toast.success(`Chat with ${selectedUser.fullName} has been permanently deleted.`, {
            icon: "🗑️",
            duration: 3000,
          });
          // Go back to user list
          handleBackToList();
        } else {
          toast.error("Failed to delete chat. Please try again.");
        }
      });
    }
  };

  // Handle admin terminating all chats
  const handleTerminateAllChats = () => {
    if (!isAdmin) return;

    const confirmTerminate = window.confirm(
      "Are you sure you want to permanently delete ALL your chats? This action cannot be undone."
    );
    
    if (!confirmTerminate) return;

    const { socket } = useAuthStore.getState();
    if (socket) {
      socket.emit("terminateAllChats");
      
      // Handle response
      socket.once("allChatsTerminated", (data) => {
        if (data.success) {
          toast.success(
            `Successfully deleted ${data.deletedCount} messages from ${data.affectedUsers} chat(s).`,
            {
              icon: "🗑️",
              duration: 4000,
            }
          );
          // Reset state
          setSelectedUser(null);
          setShowUserList(true);
          fetchUsers();
        } else {
          toast.error("Failed to terminate chats. Please try again.");
        }
      });
    }
  };

  // Handle sending message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() && !imagePreview) return;

    const messageData = {
      text: messageText.trim(),
      image: imagePreview,
    };

    await sendMessage(messageData);
    setMessageText("");
    setImagePreview(null);
  };

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (messageEndRef.current && messages.length > 0) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Autofocus input when user is selected
  useEffect(() => {
    if (selectedUser && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [selectedUser]);

  // Auto-open chat when receiving a new message from another user
  useEffect(() => {
    const { socket } = useAuthStore.getState();
    if (!socket) return;

    const handleIncomingMessage = (newMessage) => {
      // Only auto-open if:
      // 1. Message is NOT from the current user
      // 2. Chat is currently closed
      if (newMessage.senderId !== authUser?._id && !isOpen) {
        // Set notification badge
        setHasNewMessage(true);
        
        // Auto-open the chat
        setIsOpen(true);
        
        // Fetch users to get the sender info
        const endpoint = isAdmin ? "/messages/users" : "/messages/avail-admin";
        axiosInstance.get(endpoint).then((res) => {
          const allUsers = res.data.filter((user) => user._id !== authUser._id);
          setUsers(allUsers);
          
          // Find the sender and auto-select them
          const sender = allUsers.find((u) => u._id === newMessage.senderId);
          if (sender) {
            setSelectedUser(sender);
            setShowUserList(false);
            getMessagesByUserId(sender._id);
            subscribeToMessages();
            
            // Save as last contacted admin for non-admin users
            if (!isAdmin) {
              localStorage.setItem('lastAdminId', sender._id);
            }
            
            // Show toast notification
            toast.success(`New message from ${sender.fullName}!`, {
              icon: "💬",
              duration: 3000,
            });
          } else {
            // If sender not found, show user list
            setShowUserList(true);
          }
        });
      }
    };

    // Listen for new messages
    socket.on("newMessage", handleIncomingMessage);

    return () => {
      socket.off("newMessage", handleIncomingMessage);
    };
  }, [isOpen, authUser, isAdmin, getMessagesByUserId, subscribeToMessages, setSelectedUser]);

  // Handle chat permanently deleted by admin
  useEffect(() => {
    const { socket } = useAuthStore.getState();
    if (!socket || isAdmin) return; // Only non-admin users need this

    const handleChatDeleted = (data) => {
      const { adminId, adminName, reason, deletedCount } = data;
      
      console.log("Chat permanently deleted:", data);

      // If currently chatting with this admin, close the chat
      if (selectedUser && selectedUser._id === adminId) {
        setSelectedUser(null);
        setShowUserList(true);
        unsubscribeFromMessages();
      }

      // Show termination notification modal
      setTerminationNotification({
        adminId,
        adminName,
        reason,
        deletedCount,
        timestamp: new Date().toISOString(),
      });

      // Also show a toast notification
      const message = reason === "admin_disconnected" 
        ? `⚡ Chat Auto-Terminated - ${adminName} went offline`
        : `${adminName} ended the chat`;
      
      toast.error(message, {
        duration: 5000,
        icon: "🗑️",
      });

      // Remove this admin from last contacted
      const lastAdminId = localStorage.getItem('lastAdminId');
      if (lastAdminId === adminId) {
        localStorage.removeItem('lastAdminId');
      }

      // Auto-close notification after 10 seconds
      setTimeout(() => {
        setTerminationNotification(null);
      }, 10000);
    };

    socket.on("chatPermanentlyDeleted", handleChatDeleted);

    return () => {
      socket.off("chatPermanentlyDeleted", handleChatDeleted);
    };
  }, [isAdmin, selectedUser, setSelectedUser, unsubscribeFromMessages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (selectedUser) {
        unsubscribeFromMessages();
      }
    };
  }, [selectedUser, unsubscribeFromMessages]);

  return (
    <>
      {/* Floating Chat Button with Prompt */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 animate-fade-in">
          {/* Prompt Bubble */}
          <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-2xl shadow-lg max-w-[240px] text-sm font-medium animate-bounce-subtle">
            {labels.promptBubble}
            <div className="absolute -bottom-1 right-6 w-3 h-3 bg-white dark:bg-slate-800 rotate-45" />
          </div>

          {/* Chat Icon Button */}
          <button
            onClick={handleOpenWidget}
            className="group bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-full p-4 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 relative"
            aria-label={labels.buttonTooltip}
            title={labels.buttonTooltip}
          >
            <MessageCircle className="w-7 h-7 group-hover:rotate-12 transition-transform" />
            
            {/* Notification Badge */}
            {hasNewMessage && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 border-2 border-white"></span>
              </span>
            )}
          </button>
        </div>
      )}

      {/* Chat Widget Panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 md:bottom-6 md:right-6 w-full md:w-[400px] h-[100vh] md:h-[600px] z-50 flex flex-col bg-white dark:bg-slate-900 md:rounded-2xl shadow-2xl animate-slide-up overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedUser && (
                <button
                  onClick={handleBackToList}
                  className="hover:bg-white/20 rounded-full p-1 transition-colors"
                  title="Back to list"
                >
                  <X className="w-5 h-5 rotate-45" />
                </button>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {selectedUser ? selectedUser.fullName : labels.header}
                </h3>
                {selectedUser ? (
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        onlineUsers.includes(selectedUser._id) ? "bg-green-400" : "bg-gray-400"
                      }`}
                    />
                    <p className="text-xs text-cyan-100">
                      {onlineUsers.includes(selectedUser._id) ? "Online" : "Offline"}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-cyan-100">{labels.statusMessage}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Encryption Status Indicator - WhatsApp style (always green when active) */}
              {selectedUser && isEncryptionEnabled && encryptionKeys && (
                <div className="flex items-center gap-1" title="Messages are end-to-end encrypted">
                  <Shield className="w-4 h-4 text-green-400" />
                </div>
              )}
              
              {/* Admin Delete Chat Button (only show when chatting with a user) */}
              {isAdmin && selectedUser && (
                <button
                  onClick={handleAdminLeaveChat}
                  className="hover:bg-red-500/20 rounded-full p-2 transition-colors"
                  title="Delete this chat permanently"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              
              {/* Admin Terminate All Button (only show in list view) */}
              {isAdmin && !selectedUser && (
                <button
                  onClick={handleTerminateAllChats}
                  className="hover:bg-red-500/20 rounded-full p-2 transition-colors flex items-center gap-1"
                  title="Delete all chats permanently"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs hidden sm:inline">Delete All</span>
                </button>
              )}
              
              <button
                onClick={handleClose}
                className="hover:bg-white/20 rounded-full p-2 transition-colors"
                title="Minimize chat"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* User List View */}
          {showUserList && !selectedUser && (
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-800">
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  {labels.listHeader}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{labels.listSubtext}</p>
              </div>

              {isLoadingUsers ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-white dark:bg-slate-700 rounded-lg p-3 animate-pulse"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-600 rounded-full" />
                        <div className="flex-1">
                          <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-3/4 mb-2" />
                          <div className="h-3 bg-slate-200 dark:bg-slate-600 rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm">{labels.emptyList}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <button
                      key={user._id}
                      onClick={() => handleSelectUser(user)}
                      className="w-full bg-white dark:bg-slate-700 rounded-lg p-3 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors flex items-center gap-3 group"
                    >
                      <div className="relative">
                        <img
                          src={user.profilePic || "/avatar.png"}
                          alt={user.fullName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                            onlineUsers.includes(user._id) ? "bg-green-500" : "bg-slate-400"
                          }`}
                        />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                          {user.fullName}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              onlineUsers.includes(user._id) ? "bg-green-500" : "bg-gray-400"
                            }`}
                          />
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {onlineUsers.includes(user._id) ? "Available now" : "Offline"}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Chat View */}
          {!showUserList && (
            <>
              {/* No Active Admins Message (for non-admin users) */}
              {!isAdmin && !selectedUser && !isLoadingUsers && (
                <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-800 animate-fade-in">
                  <div className="max-w-md text-center">
                    <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">
                      No Active Admins Right Now
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                      There are no active admins right now. You've been added to our waiting list. 
                      Once an admin becomes available, we'll send you an email at{" "}
                      <span className="font-medium text-cyan-600 dark:text-cyan-400">
                        {authUser?.email}
                      </span>
                      .
                    </p>
                    <button
                      onClick={() => {
                        setShowUserList(true);
                        fetchUsers();
                      }}
                      className="mt-4 px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full text-sm font-medium hover:shadow-lg transition-all"
                    >
                      View All Admins
                    </button>
                  </div>
                </div>
              )}
              
              {/* Loading State */}
              {isLoadingUsers && !selectedUser && (
                <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-800">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      Connecting you with an admin...
                    </p>
                  </div>
                </div>
              )}

              {/* Messages Area - Only show when user is selected */}
              {selectedUser && (
                <>
                  <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-800 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">👋</div>
                    <p className="text-slate-700 dark:text-slate-300 font-semibold mb-2">
                      {labels.emptyWelcome}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                      Start a conversation with {selectedUser.fullName}
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg._id}
                      className={`flex ${
                        msg.senderId === authUser._id ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                          msg.senderId === authUser._id
                            ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-br-sm"
                            : "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-sm shadow-sm"
                        }`}
                      >
                        {msg.image && (
                          <img
                            src={msg.image}
                            alt="Shared"
                            className="rounded-lg max-w-full h-auto mb-2"
                          />
                        )}
                        {msg.text && (
                          <div className="flex items-start gap-2">
                            {/* Show lock icon for encrypted messages or failed decryption */}
                            {(msg.isEncrypted || msg._decryptionFailed) && (
                              <Lock className={`w-3 h-3 flex-shrink-0 mt-0.5 ${
                                msg._decryptionFailed 
                                  ? "text-red-300" 
                                  : msg.senderId === authUser._id 
                                    ? "text-cyan-200" 
                                    : "text-slate-400"
                              }`} />
                            )}
                            <p className={`text-sm ${
                              msg._decryptionFailed ? "italic opacity-70" : ""
                            }`}>
                              {msg.text}
                            </p>
                          </div>
                        )}
                        <p
                          className={`text-xs mt-1 ${
                            msg.senderId === authUser._id
                              ? "text-cyan-100"
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
                  ))
                )}
                <div ref={messageEndRef} />
              </div>

              {/* Image Preview */}
              {imagePreview && (
                <div className="px-4 py-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
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

              {/* Encryption Status Banner - Always show when active (WhatsApp-style) */}
              {isEncryptionEnabled && encryptionKeys && (
                <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-xs text-green-800 dark:text-green-200">
                    <Shield className="w-3 h-3 flex-shrink-0" />
                    <p className="flex-1">🔒 End-to-end encrypted</p>
                  </div>
                </div>
              )}

              {/* Input Area */}
              <form
                onSubmit={handleSendMessage}
                className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700"
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
                    className="p-2 text-slate-400 hover:text-cyan-500 transition-colors"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    ref={messageInputRef}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    autoFocus
                    className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim() && !imagePreview}
                    className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-full hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Chat Termination Notification Modal */}
      {terminationNotification && (
        <div className="fixed bottom-0 right-0 md:bottom-6 md:right-6 w-full md:w-[400px] h-[100vh] md:h-[600px] z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm md:rounded-2xl"
            onClick={() => setTerminationNotification(null)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-gradient-to-br from-red-500 via-red-600 to-orange-600 rounded-2xl shadow-2xl w-full p-6 animate-scale-in max-h-[90%] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setTerminationNotification(null)}
              className="absolute top-3 right-3 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm animate-pulse-slow">
                <AlertTriangle className="w-10 h-10 text-white" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-white text-center mb-3">
              Chat Session Ended
            </h2>

            {/* Message */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/20">
              <p className="text-white text-center text-sm leading-relaxed">
                {terminationNotification.reason === "admin_disconnected" ? (
                  <>
                    <span className="block text-xl font-bold mb-2 text-yellow-200">⚡ AUTO-TERMINATED</span>
                    Your conversation with <span className="font-semibold">{terminationNotification.adminName}</span> has 
                    been automatically terminated. The admin went offline and all{" "}
                    <span className="font-semibold">{terminationNotification.deletedCount}</span> message
                    {terminationNotification.deletedCount !== 1 ? "s" : ""} have been permanently deleted.
                  </>
                ) : (
                  <>
                    <span className="block text-xl font-bold mb-2 text-yellow-200">✋ CHAT ENDED</span>
                    <span className="font-semibold">{terminationNotification.adminName}</span> has ended the conversation. 
                    All <span className="font-semibold">{terminationNotification.deletedCount}</span> message
                    {terminationNotification.deletedCount !== 1 ? "s" : ""} have been permanently deleted.
                  </>
                )}
              </p>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <Trash2 className="w-4 h-4 text-white/80" />
                  <p className="text-white/80 text-xs font-medium">Deleted</p>
                </div>
                <p className="text-white text-xl font-bold">{terminationNotification.deletedCount}</p>
                <p className="text-white/70 text-xs">message{terminationNotification.deletedCount !== 1 ? "s" : ""}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <MessageCircle className="w-4 h-4 text-white/80" />
                  <p className="text-white/80 text-xs font-medium">Status</p>
                </div>
                <p className="text-white text-base font-bold">Terminated</p>
                <p className="text-white/70 text-xs">Permanently</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setTerminationNotification(null);
                  setShowUserList(true);
                  fetchUsers();
                }}
                className="w-full bg-white text-red-600 rounded-lg py-2.5 px-4 font-semibold hover:bg-white/90 transition-all shadow-lg text-sm"
              >
                Find Another Admin
              </button>
              <button
                onClick={() => setTerminationNotification(null)}
                className="w-full bg-white/20 backdrop-blur-sm text-white rounded-lg py-2.5 px-4 font-semibold hover:bg-white/30 transition-all border border-white/30 text-sm"
              >
                Close
              </button>
            </div>

            {/* Timestamp */}
            <p className="text-white/60 text-xs text-center mt-3">
              Terminated at {new Date(terminationNotification.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
      )}

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        @keyframes bounce-subtle {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }

        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
      `}</style>

      {/* Encryption Setup Modal */}
      {showEncryptionSetup && (
        <EncryptionSetup
          onClose={() => setShowEncryptionSetup(false)}
          mode={hasEncryptionKey ? "unlock" : "setup"}
        />
      )}
    </>
  );
}

export default ChatWidget;
