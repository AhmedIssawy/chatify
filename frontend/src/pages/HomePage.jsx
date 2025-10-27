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
            
            {/* Right side: Admin Badge + Actions */}
            <div className="flex items-center gap-3">
              {authUser?.isAdmin && (
                <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                  Admin
                </div>
              )}
              
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
            Welcome to Chatify
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Your modern chat support platform. Connect with our support team anytime, anywhere.
          </p>
        </div>
      </div>

      {/* Chat Widget - Always visible */}
      <ChatWidget />

      {/* Profile Modal */}
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </div>
  );
}

export default HomePage;
