'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  MessageCircle,
  Radio,
  User,
  Bell,
  Coins,
  X,
  Heart,
  Store
} from 'lucide-react';
import GiftOverlay from '../chat/GiftOverlay';

interface AppShellProps {
  children: React.ReactNode;
  activeTab: 'explore' | 'chats' | 'status' | 'profile';
  setActiveTab: (tab: 'explore' | 'chats' | 'status' | 'profile') => void;
  coinBalance: number;
  unreadCount?: number;
  onOpenStore?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeTab,
  setActiveTab,
  coinBalance,
  unreadCount = 0,
  onOpenStore,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="relative min-h-screen w-full bg-[#070709] text-white selection:bg-purple-500/30 overflow-x-hidden font-sans">
      <GiftOverlay />

      {/* 1. FIXED TOP HEADER */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-black/60 backdrop-blur-2xl border-b border-white/[0.08] z-50 px-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(236,72,153,0.4)]">
            <span className="text-black font-black text-sm tracking-tighter">EM</span>
          </div>
          <span className="text-lg font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-white/60">
            EARNMEGA
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Realtime Coin Counter */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-amber-400/30 shadow-[0_0_12px_rgba(251,191,36,0.15)]">
            <Coins className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
            <span className="text-xs font-bold text-amber-300 font-mono tracking-tight">
              {coinBalance.toLocaleString()}
            </span>
          </div>

          {/* Notification Bell */}
          <button
            onClick={() => setShowNotifications(true)}
            className="relative p-2 rounded-full bg-white/[0.05] border border-white/10 hover:border-white/20 active:scale-95 transition"
          >
            <Bell className="w-4 h-4 text-white/90" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg border border-black">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* 2. MAIN SCROLLABLE CONTENT BODY */}
      <main className="pt-16 pb-24 min-h-screen w-full max-w-md mx-auto relative px-3">
        {children}
      </main>

      {/* 3. FIXED BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-3xl border-t border-white/[0.08] z-50 px-6 flex items-center justify-around pb-4">
        <button
          onClick={() => setActiveTab('explore')}
          className="relative flex flex-col items-center justify-center w-14 py-1 text-xs group"
        >
          {activeTab === 'explore' && (
            <motion.div
              layoutId="activeTabIndicator"
              className="absolute -top-2 w-8 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.8)]"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <Compass className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${activeTab === 'explore' ? 'text-white' : 'text-white/40'}`} />
          <span className={`text-[10px] mt-1 font-medium tracking-tight ${activeTab === 'explore' ? 'text-white font-bold' : 'text-white/40'}`}>Explore</span>
        </button>

        <button
          onClick={() => setActiveTab('chats')}
          className="relative flex flex-col items-center justify-center w-14 py-1 text-xs group"
        >
          {activeTab === 'chats' && (
            <motion.div
              layoutId="activeTabIndicator"
              className="absolute -top-2 w-8 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.8)]"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <MessageCircle className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${activeTab === 'chats' ? 'text-white' : 'text-white/40'}`} />
          <span className={`text-[10px] mt-1 font-medium tracking-tight ${activeTab === 'chats' ? 'text-white font-bold' : 'text-white/40'}`}>Chats</span>
        </button>

        {/* The Store Button (Center) */}
        <button
          onClick={onOpenStore}
          className="relative flex flex-col items-center justify-center w-14 py-1 text-xs group"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.6)] border-2 border-yellow-300/50 mb-1 group-hover:scale-105 transition-transform duration-200">
            <Store className="w-5 h-5 text-black fill-black/10" />
          </div>
          <span className="text-[10px] font-bold tracking-tight text-amber-400">Store</span>
        </button>

        <button
          onClick={() => setActiveTab('status')}
          className="relative flex flex-col items-center justify-center w-14 py-1 text-xs group"
        >
          {activeTab === 'status' && (
            <motion.div
              layoutId="activeTabIndicator"
              className="absolute -top-2 w-8 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.8)]"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <Radio className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${activeTab === 'status' ? 'text-white' : 'text-white/40'}`} />
          <span className={`text-[10px] mt-1 font-medium tracking-tight ${activeTab === 'status' ? 'text-white font-bold' : 'text-white/40'}`}>Status</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className="relative flex flex-col items-center justify-center w-14 py-1 text-xs group"
        >
          {activeTab === 'profile' && (
            <motion.div
              layoutId="activeTabIndicator"
              className="absolute -top-2 w-8 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.8)]"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <User className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${activeTab === 'profile' ? 'text-white' : 'text-white/40'}`} />
          <span className={`text-[10px] mt-1 font-medium tracking-tight ${activeTab === 'profile' ? 'text-white font-bold' : 'text-white/40'}`}>Profile</span>
        </button>
      </nav>

      {/* 4. NOTIFICATION CENTER DRAWER */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-xs bg-[#0b0c10] border-l border-white/10 z-[90] p-5 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold text-sm tracking-wide">Live Activity</h3>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1 rounded-full bg-white/5 border border-white/10"
                >
                  <X className="w-4 h-4 text-white/70" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-purple-500/20 flex items-start space-x-3">
                  <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Status Unlocked</p>
                    <p className="text-[11px] text-white/60 mt-0.5">@sarah paid 10 coins to view your latest status.</p>
                    <span className="text-[9px] text-purple-400/80 font-mono mt-1 block">2m ago</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.03] border border-rose-500/20 flex items-start space-x-3">
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                    <Heart className="w-4 h-4 fill-rose-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Status Reaction</p>
                    <p className="text-[11px] text-white/60 mt-0.5">@david liked your status update.</p>
                    <span className="text-[9px] text-white/40 font-mono mt-1 block">15m ago</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
