import { useState } from "react";
import { LogOut, Settings, Users, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ChatWidget from "../components/ChatWidget";
import GroupChatWidget from "../components/GroupChatWidget";
import ProfileModal from "../components/ProfileModal";
import { useAuthStore } from "../store/useAuthStore";
import { useGroupStore } from "../store/useGroupStore";
import toast from "react-hot-toast";

function HomePage() {
  const { authUser, logout } = useAuthStore();
  const { setSelectedGroup } = useGroupStore();
  const navigate = useNavigate();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showGroupWidget, setShowGroupWidget] = useState(false);

  // Handle logout
  const handleLogout = async () => {
    // Confirm logout
    const confirmLogout = window.confirm("Are you sure you want to logout?");
    if (!confirmLogout) return;

    try {
      await logout();
      // Clear localStorage items
      localStorage.removeItem('lastAdminId');
      localStorage.removeItem('isSoundEnabled');
      
      toast.success("You have been logged out successfully", {
        icon: "👋",
        duration: 3000,
      });
      navigate("/login");
    } catch (error) {
      toast.error("Failed to logout. Please try again.");
    }
  };

  // Admin sees WhatsApp-style layout, users see regular layout
  if (authUser?.isAdmin) {
    return (
      <div className="h-screen flex flex-col bg-slate-100 dark:bg-slate-900">
        {/* Top Header Bar */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm z-10">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={authUser?.profilePic || "/avatar.png"}
                  alt={authUser?.fullName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-cyan-500"
                />
                <div>
                  <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                    {authUser?.fullName}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Admin Panel
                  </p>
                </div>
              </div>
              
              {/* Right side: Actions */}
              <div className="flex items-center gap-2">
                {/* Profile Update Button */}
                <button
                  onClick={() => setIsProfileModalOpen(true)}
                  className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  title="Update Profile"
                >
                  <Settings className="w-5 h-5" />
                </button>
                
                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp-style Chat Layout */}
        <div className="flex-1 flex overflow-hidden">
          <ChatWidget isFullScreen={true} />
        </div>

        {/* Profile Modal */}
        <ProfileModal 
          isOpen={isProfileModalOpen} 
          onClose={() => setIsProfileModalOpen(false)} 
        />
      </div>
    );
  }

  // Regular user view (original layout)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* User Info Bar */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src={authUser?.profilePic || "/avatar.png"}
                alt={authUser?.fullName}
                className="w-12 h-12 rounded-full object-cover border-2 border-cyan-500"
              />
              <div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {authUser?.fullName}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {authUser?.email}
                </p>
              </div>
            </div>
            
            {/* Right side: Actions */}
            <div className="flex items-center gap-3">
              {/* Profile Update Button */}
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                title="Update Profile"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </button>
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-md"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-800 dark:text-slate-100 mb-4">
            Welcome To IT Chat
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Your modern chat support platform. Connect with our support team anytime, anywhere.
          </p>
        </div>

        {/* Welcome Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                Need Help?
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Contact our support team
              </p>
            </div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Use the chat buttons in the bottom right corner:
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                <MessageCircle className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <span className="text-slate-700 dark:text-slate-300">Direct support chat with admins</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-slate-700 dark:text-slate-300">Group chats with other members</span>
            </div>
          </div>
        </div>
      </div>

      {/* Groups Button - Fixed position with higher z-index */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("Groups button clicked, current state:", showGroupWidget);
          setShowGroupWidget(prev => !prev);
          if (showGroupWidget) {
            setSelectedGroup(null);
          }
        }}
        className="fixed bottom-[5.5rem] right-6 md:bottom-6 md:right-28 w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center z-[100]"
        title="Groups Chat"
      >
        <Users className="w-6 h-6" />
      </button>

      {/* Support Chat Widget - Bottom right (default position) */}
      <ChatWidget isFullScreen={false} showGroupsMode={false} />

      {/* Group Chat Widget - Positioned to the left of support chat */}
      <GroupChatWidget 
        isOpen={showGroupWidget} 
        onClose={() => {
          setShowGroupWidget(false);
          setSelectedGroup(null);
        }} 
      />

      {/* Profile Modal */}
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </div>
  );
}

export default HomePage;
