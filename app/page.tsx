import Link from 'next/link';

export default function WelcomeSplashScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white font-sans sm:max-w-md sm:mx-auto sm:border-x sm:border-gray-800">
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 w-full">
        {/* Logo Section */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-purple-500/30">
            <span className="text-4xl font-bold tracking-tighter text-white">EM</span>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              Earnmega
            </h1>
            <p className="mt-2 text-gray-400 text-sm font-medium tracking-wide uppercase">
              Global Social Hub
            </p>
          </div>
        </div>

        {/* Feature Highlights (Optional Visual Balance) */}
        <div className="w-full max-w-xs space-y-3 opacity-80">
          <div className="flex items-center space-x-3 text-gray-300">
            <span className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
              ⚡
            </span>
            <span className="text-sm">Real-time messaging</span>
          </div>
          <div className="flex items-center space-x-3 text-gray-300">
            <span className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
              🌍
            </span>
            <span className="text-sm">Connect globally</span>
          </div>
          <div className="flex items-center space-x-3 text-gray-300">
            <span className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
              🔒
            </span>
            <span className="text-sm">Secure interactions</span>
          </div>
        </div>
      </div>

      {/* Action Section */}
      <div className="w-full p-6 pb-12 shrink-0">
        <Link
          href="/chat"
          className="group relative flex w-full justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-sm font-bold text-white shadow-lg hover:shadow-xl hover:from-blue-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200"
        >
          <span className="relative z-10 flex items-center tracking-wide">
            Launch App
            <svg
              className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </span>
        </Link>
      </div>
    </div>
  );
}
