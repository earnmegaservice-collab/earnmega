'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../utils/supabase';
import { Search } from 'lucide-react';
import { UserProfileDetails } from '../profile/UserProfileModal';

interface ChatListProps {
  exploreUsers: UserProfileDetails[];
  getStatusRingClass: (userId: string) => string;
  currentUserProfile: UserProfileDetails | null;
  setShowVerificationGateModal: (show: boolean) => void;
  setOtherUserProfile: (user: UserProfileDetails) => void;
}

export default function ChatList({
  exploreUsers,
  getStatusRingClass,
  currentUserProfile,
  setShowVerificationGateModal,
  setOtherUserProfile
}: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeContextId, setActiveContextId] = useState<string | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const handleClickOutside = () => setActiveContextId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

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
        <AnimatePresence>
          {filteredUsers.map((u, i) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              onClick={() => {
                if ((currentUserProfile as any)?.isVerified === false) {
                  setShowVerificationGateModal(true);
                  return;
                }
                setOtherUserProfile(u);
              }}
              onPointerDown={(e) => {
                 longPressTimerRef.current = setTimeout(() => {
                    setActiveContextId(u.id);
                    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
                 }, 500);
              }}
              onPointerUp={() => {
                 if (longPressTimerRef.current) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                 }
              }}
              onPointerCancel={() => {
                 if (longPressTimerRef.current) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                 }
              }}
              onContextMenu={(e) => { e.preventDefault(); setActiveContextId(u.id); }}
              className="flex items-center w-full p-4 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer group"
            >
              {/* Left: Avatar */}
              <div className={`relative w-14 h-14 rounded-full flex-shrink-0 bg-gradient-to-br from-indigo-500/80 to-purple-600/80 flex items-center justify-center border border-white/20 shadow-lg ${getStatusRingClass(u.id)}`}>
                {u.avatarUrl ? (
                  <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span className="text-white font-bold text-lg">{u.avatarInitials}</span>
                )}
                {u.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-black rounded-full shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                )}
              </div>

              {/* Middle: User Info & Message Preview */}
              <div className="flex-1 min-w-0 ml-4 flex flex-col justify-center">
                <div className="flex items-center space-x-1">
                  <h3 className="text-base font-bold text-white truncate drop-shadow-sm">
                    {u.name}
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

              {/* Right: Meta Info (Timestamp & Unread) */}
              <div className="flex flex-col items-end justify-center ml-2 flex-shrink-0 space-y-1.5">
                <span className="text-xs text-gray-500 font-medium">
                  {u.isOnline ? 'Now' : '1h'}
                </span>
                {/* Simulated unread count for demo purposes */}
                {i % 3 === 0 && (
                  <div className="bg-green-500 text-black font-bold h-6 w-6 rounded-full flex items-center justify-center text-[11px] shadow-[0_0_10px_rgba(34,197,94,0.4)]">
                    {i + 1}
                  </div>
                )}
              </div>

              <AnimatePresence>
                {activeContextId === u.id && (
                   <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute left-16 top-12 z-50 w-56"
                      onClick={(e) => e.stopPropagation()}
                   >
                      <div className="bg-neutral-900/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col py-1">
                         <button onClick={async (e) => { e.stopPropagation(); setActiveContextId(null); await supabase.from('conversations').update({ is_pinned: true }).eq('user_id', currentUserProfile?.id).eq('other_user_id', u.id); }} className="px-4 py-3 text-sm font-bold text-white hover:bg-white/10 flex items-center justify-between transition-colors">
                            <span>Pin Chat</span>
                         </button>
                         <button onClick={async (e) => { e.stopPropagation(); setActiveContextId(null); await supabase.from('conversations').update({ is_muted: true }).eq('user_id', currentUserProfile?.id).eq('other_user_id', u.id); }} className="px-4 py-3 text-sm font-bold text-white hover:bg-white/10 flex items-center justify-between transition-colors">
                            <span>Mute Notifications</span>
                         </button>
                         <button onClick={(e) => { e.stopPropagation(); setActiveContextId(null); }} className="px-4 py-3 text-sm font-bold text-white hover:bg-white/10 flex items-center justify-between transition-colors">
                            <span>Create Group with {u.name}</span>
                         </button>
                         <button onClick={async (e) => { e.stopPropagation(); setActiveContextId(null); await supabase.from('conversations').update({ is_deleted: true }).eq('user_id', currentUserProfile?.id).eq('other_user_id', u.id); }} className="px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-500/10 flex items-center justify-between transition-colors">
                            <span>Delete Chat</span>
                         </button>
                      </div>
                   </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          ))}
        </AnimatePresence>
        {filteredUsers.length === 0 && (
          <div className="text-center text-gray-500 mt-10 text-sm">
            No chats found.
          </div>
        )}
      </div>
    </div>
  );
}
