'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-zinc-950 text-zinc-100 p-6 text-center font-sans">
      {/* Brand Logo */}
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-3xl shadow-2xl mb-6">
        EM
      </div>
      
      {/* Title & Tagline */}
      <h1 className="text-2xl font-bold tracking-tight mb-2">Earnmega</h1>
      <p className="text-sm text-zinc-400 mb-8 max-w-xs">
        Global social hub. Real-time chat, secure connections, and rewarding experiences.
      </p>

      {/* Navigation Button */}
      <Link
        href="/chat"
        className="w-full max-w-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
      >
        Launch App →
      </Link>
    </div>
  );
}
