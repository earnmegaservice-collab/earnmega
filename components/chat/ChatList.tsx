"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { UserProfileDetails } from '../profile/UserProfileModal';
import VerifiedTick from '../ui/VerifiedTick';

interface ChatListProps {
  exploreUsers: UserProfileDetails[];
  getStatusRingClass: (userId: string) => string;
  currentUserProfile: UserProfileDetails | null;
  setShowVerificationGateModal: (show: boolean) => void;
  setOtherUserProfile: (user: UserProfileDetails) => void;
  isLoading?: boolean;
  fetchError?: any;
}

export default function ChatList({
  exploreUsers,
  getStatusRingClass,
  currentUserProfile,
  setShowVerificationGateModal,
  setOtherUserProfile,
  isLoading,
  fetchError
}: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const router = useRouter();

  const filteredUsers = exploreUsers.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Sticky Header with Search */}
      <div className="sticky top-0 z-20 px-4 py-3 bg-black/60 backdrop-blur-xl border-b border-white/5">
        <div className="relative flex items-center">
          <Search size={18} className="absolute left-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 backdrop-blur-md rounded-full pl-10 pr-4 py-2 text-white placeholder-gray-400 outline-none border border-white/10 focus:border-white/20 transition-colors"
          />
        </div>
      </div>

      {/* Scrollable Chat List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">

        {navigationError && (
          <div className="m-4 p-4 rounded-2xl bg-red-950/50 border border-red-500/50 backdrop-blur-xl flex flex-col items-center justify-center text-center shadow-[0_0_20px_rgba(220,38,38,0.2)]">
            <span className="text-red-400 font-bold mb-2">Navigation Error</span>
            <span className="text-red-300 text-sm">{navigationError}</span>
            <button onClick={() => setNavigationError(null)} className="mt-2 text-xs bg-red-500/20 text-red-200 px-3 py-1 rounded-full border border-red-500/30">Dismiss</button>
          </div>
        )}
        {fetchError && (
          <div className="m-4 p-4 rounded-2xl bg-red-950/50 border border-red-500/50 backdrop-blur-xl flex flex-col items-center justify-center text-center shadow-[0_0_20px_rgba(220,38,38,0.2)]">
            <span className="text-red-400 font-bold mb-2">Database Error</span>
            <span className="text-red-300 text-sm">{fetchError.message || "Unknown database error"}</span>
          </div>
        )}
        <AnimatePresence>
          {filteredUsers.map((u, i) => (
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              key={u.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full relative"
            >
              <button
                onClick={(e) => {
                  try {
                    if (!u.id) {
                      throw new Error('Chat ID is missing or undefined.');
                    }
                    if ((currentUserProfile as any)?.isVerified === false) {
                      e.preventDefault();
                      setShowVerificationGateModal(true);
                      return;
                    }
                    setOtherUserProfile(u);
                    router.push('/chats/' + u.id);
                  } catch (err: any) {
                    setNavigationError(err.message || 'Failed to open chat.');
                  }


                  setOtherUserProfile(u);
                  if (u.id) {
                    router.push(`/chats/${u.id}`);
                  }

                }}
                className="flex items-center w-full p-4 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer group touch-manipulation pointer-events-auto"
              >
              {/* Left: Avatar */}
              <div className="pointer-events-none contents">
              <div className={`relative w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center shadow-lg ${
                u.tier === 'PREMIUM' ? 'p-[2px]' :
                u.tier === 'PRO' ? 'bg-gradient-to-tr from-amber-400 to-yellow-600 p-[2px]' :
                'border border-white/10 p-1 bg-white/5'
              } ${getStatusRingClass(u.id)}`}>
                {u.tier === 'PREMIUM' && (
                  <div className="absolute inset-[-2px] rounded-full bg-gradient-to-r from-amber-400 via-purple-500 to-amber-400 animate-spin-slow" />
                )}
                <div className="relative w-full h-full rounded-full bg-neutral-900 flex items-center justify-center overflow-hidden z-10">
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span className="text-white font-bold text-lg">{u.avatarInitials}</span>
                  )}
                </div>
                {u.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-black rounded-full shadow-[0_0_8px_rgba(52,211,153,0.6)] z-20" />
                )}
              </div>

              {/* Middle: User Info & Message Preview */}
              <div className="flex-1 min-w-0 ml-4 flex flex-col justify-center">
                <div className="flex items-center space-x-1">
                  <h3 className={`text-base truncate drop-shadow-sm flex items-center ${
                    u.tier === 'PREMIUM' ? 'bg-gradient-to-r from-purple-400 via-pink-500 to-amber-400 bg-[length:200%_auto] animate-pulse bg-clip-text text-transparent font-extrabold' :
                    u.tier === 'PRO' ? 'text-amber-400 font-bold' :
                    'text-neutral-200 font-bold'
                  }`}>
                    {u.name}
                    {u.isVerified && <VerifiedTick />}
                  </h3>
                  {u.tier === 'PREMIUM' && (
                    <span className="text-[8px] bg-gradient-to-r from-yellow-400 to-amber-500 text-black px-1 rounded-full font-extrabold shadow-[0_0_5px_rgba(251,191,36,0.5)] flex-shrink-0">
                      VIP
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 truncate mt-0.5">
                  Tap to chat with {u.name}
                </p>
              </div>

              </div>
              {/* Right: Meta Info (Timestamp & Unread) */}
              <div className="flex flex-col items-end justify-center ml-2 flex-shrink-0 space-y-1.5 pointer-events-none">
                <span className="text-xs text-gray-500 font-medium">
                  {u.isOnline ? 'Now' : '1h'}
                </span>
                {(u.unreadCount ?? 0) > 0 && (
                  <div className="bg-green-500 text-black font-bold h-6 min-w-6 px-1.5 rounded-full flex items-center justify-center text-[11px] shadow-[0_0_10px_rgba(34,197,94,0.4)]">
                    {u.unreadCount}
                  </div>
                )}
              </div>
 
              </button>

            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-[2rem] bg-white/[0.03] border border-white/5 backdrop-blur-3xl relative overflow-hidden shadow-2xl">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="w-14 h-14 rounded-full bg-white/10 flex-shrink-0 animate-pulse border border-white/10" />
                <div className="flex flex-col gap-2 flex-1">
                  <div className="w-1/2 h-4 rounded-full bg-white/10 animate-pulse" />
                  <div className="w-3/4 h-3 rounded-full bg-white/5 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : !fetchError && filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-xl font-bold text-white mb-2">No chats found.</h3>
            <p className="text-white/60 text-center">Your conversations will appear here.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
