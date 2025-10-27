import ChatWidget from "../components/ChatWidget";
import { useAuthStore } from "../store/useAuthStore";

function HomePage() {
  const { authUser } = useAuthStore();

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
            {authUser?.isAdmin && (
              <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                Admin
              </div>
            )}
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
    </div>
  );
}

export default HomePage;
