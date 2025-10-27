import ChatWidget from "../components/ChatWidget";

function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-800 dark:text-slate-100 mb-4">
            Welcome to Chatify
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Your modern chat support platform. Connect with our support team anytime, anywhere.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl flex items-center justify-center mb-4">
              <svg
                className="w-7 h-7 text-cyan-600 dark:text-cyan-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
              Instant Support
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Get help immediately from our available support agents with real-time messaging.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4">
              <svg
                className="w-7 h-7 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
              Secure & Private
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Your conversations are encrypted and protected. We value your privacy and security.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4">
              <svg
                className="w-7 h-7 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
              24/7 Available
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Our support team is always ready to assist you, day or night, whenever you need help.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 rounded-full px-6 py-3 shadow-lg">
            <div className="relative">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-ping absolute" />
              <div className="w-3 h-3 bg-green-500 rounded-full" />
            </div>
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              Support agents are online
            </span>
          </div>
        </div>
      </div>

      {/* Chat Widget - Always visible */}
      <ChatWidget />
    </div>
  );
}

export default HomePage;
