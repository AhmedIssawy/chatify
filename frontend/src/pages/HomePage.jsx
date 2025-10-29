import { useState } from "react";
import { LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ChatWidget from "../components/ChatWidget";
import ProfileModal from "../components/ProfileModal";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

function HomePage() {
  const { authUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-800 dark:text-slate-100 mb-4">
            Welcome To IT Chat
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Your modern chat support platform. Connect with our support team anytime, anywhere.
          </p>
        </div>
      </div>

      {/* Chat Widget - Bottom right for users */}
      <ChatWidget isFullScreen={false} />

      {/* Profile Modal */}
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </div>
  );
}

export default HomePage;
