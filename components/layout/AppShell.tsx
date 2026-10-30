'use client';

import React, { useState, useEffect } from 'react';
import { SpatialRadarModal } from '../location/SpatialRadarModal';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  Radar,
  MessageCircle,
  Radio,
  User,
  Bell,
  Coins,
  X,
  Heart,
  Store,
  Flame
} from 'lucide-react';
import GiftOverlay from '../chat/GiftOverlay';
import { useAuth } from '../../context/AuthContext';
import { useGlobalNotifications } from '../../context/NotificationContext';
import NotificationDrawer from '../notifications/NotificationDrawer';
import { supabase } from '../../utils/supabase';
import { ProfileCompletionModal } from '../profile/ProfileCompletionModal';
import HelpBotModal from '../chat/HelpBotModal';
import { Bot } from 'lucide-react';


interface AppShellProps {
  children: React.ReactNode;
  activeTab: 'explore' | 'find' | 'chats' | 'status' | 'profile' | 'live';
  setActiveTab: (tab: 'explore' | 'find' | 'chats' | 'status' | 'profile' | 'live') => void;
  coinBalance: number;
  unreadCount?: number;
  onOpenStore?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeTab,
  setActiveTab,
  coinBalance,
  unreadCount: initialUnreadCount = 0,
  onOpenStore,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const { user } = useAuth();
  const { unreadCount } = useGlobalNotifications();
  const [bellShake, setBellShake] = useState(false);
  const [isHelpBotOpen, setIsHelpBotOpen] = useState(false);

  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [profileImages, setProfileImages] = useState<string[]>([]);


  useEffect(() => {
    if (!user || !user?.id) return;

    const checkProfileCompletion = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('profile_images')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        const images = data.profile_images || [];
        setProfileImages(images);
        if (images.length < 6) {
          setIsCompletionModalOpen(true);
        }
      }
    };

    checkProfileCompletion();
  }, [user]);

  useEffect(() => {
    if (!user || !user?.id) return;

    // Fetch initial unread count
    const fetchUnreadCount = async () => {
      const { data, count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', user?.id)
        .eq('is_read', false);

      if (!error && data) {

        // App-Open Supernova: Check for unread gift notifications in the queue
        const unreadGifts = (data || []).filter(n => n.type === 'GIFT');
        if ((unreadGifts || []).length > 0) {
           // Instantly trigger cinematic 3D gift animation globally for the first unread gift
           // To avoid overlapping, we just show the most recent one or queue them.
           // For simplicity, trigger the first one.
           const latestGift = unreadGifts[0];
           if (latestGift.content) {
             try {
               const parts = latestGift.content.split('|');
               if ((parts || []).length >= 3) {
                 const giftData = { name: parts[0], cost: parseInt(parts[1]) };
                 const senderId = (parts || []).length > 3 ? parts[3] : '';
                 const customEvent = new CustomEvent('gift_received_local', {
                   detail: { giftData: giftData, senderId: senderId, receiverId: user?.id }
                 });
                 // Small delay to allow portal to mount
                 setTimeout(() => window.dispatchEvent(customEvent), 500);

                 // Mark as read so it doesn't trigger on next load
                 await supabase.from('notifications').update({ is_read: true }).eq('id', latestGift.id);
               }
             } catch(e) {
               console.error("Error parsing queued gift notification", e);
             }
           }
        }
      }
    };

    fetchUnreadCount();

    // The Global Render Queue & Notification Matrix Active Bell
    const uniqueChannel = `appshell-notifications-${Date.now()}`;
    const notificationChannel = supabase
      .channel(uniqueChannel)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user?.id}`
      }, (payload) => {
        const newNotif = payload.new;

        // Update the active bell badge

        // Trigger Framer Motion shake animation
        setBellShake(true);
        setTimeout(() => setBellShake(false), 500);

        // App-Open Supernova: Check if the notification is a gift and trigger local visual feedback
        // The Global Render Queue is technically implicitly handled here:
        // If they were offline, the database queue stored it.
        // Now that they are online (and received this via realtime if they just came online,
        // or fetched initially), we could trigger it.
        // For now, if a real-time 'INSERT' comes in for a gift, we trigger the overlay.
        if (newNotif.type === 'GIFT' && newNotif.content) {
           try {
             // Expecting content like: GIFT:Rose:50:sender_id
             const parts = newNotif.content.split('|');
             if ((parts || []).length >= 3) {
               const giftData = { name: parts[0], cost: parseInt(parts[1]) };
               const senderId = (parts || []).length > 3 ? parts[3] : '';

               // Dispatch custom event to App-Open Supernova GiftOverlay
               const customEvent = new CustomEvent('gift_received_local', {
                 detail: { giftData: giftData, senderId: senderId, receiverId: user?.id }
               });
               window.dispatchEvent(customEvent);
             }
           } catch(e) {
             console.error("Error parsing gift notification", e);
           }
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user?.id}`
      }, (payload) => {
         // If marked as read, recalculate or decrement (to simplify, let's just refetch)
         fetchUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
    };
  }, [user]);


  return (
    <div className="relative min-h-screen w-full bg-[#070709] text-white selection:bg-purple-500/30 overflow-x-hidden font-sans">
      <GiftOverlay />

      {/* 1. FIXED TOP HEADER */}
      {activeTab !== 'live' && (
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
            <button onClick={onOpenStore} type="button" className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-amber-400/30 shadow-[0_0_12px_rgba(251,191,36,0.15)] touch-manipulation cursor-pointer hover:bg-white/[0.1] transition-colors">
              <Coins className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse pointer-events-none" />
              <span className="text-xs font-bold text-amber-300 font-mono tracking-tight pointer-events-none">
                {coinBalance.toLocaleString()}
              </span>
            </button>

            {/* Notification Bell */}
            <motion.button
              onClick={() => setShowNotifications(true)}
              animate={bellShake ? { rotate: [-10, 10, -10, 10, 0], scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.4 }}
              className="relative p-2 rounded-full bg-white/[0.05] border border-white/10 hover:border-white/20 active:scale-95 transition"
            >
              <Bell className="w-4 h-4 text-white/90" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg border border-black">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </motion.button>
          </div>
        </header>
      )}

      {/* 2. MAIN SCROLLABLE CONTENT BODY */}
      <main className={`${activeTab === 'live' ? 'p-0 pt-0 pb-0 max-w-none' : 'pt-16 pb-24 max-w-md px-3'} min-h-screen w-full mx-auto relative`}>
        {children}
      </main>

      {/* 3. FIXED BOTTOM NAVIGATION */}
      {activeTab !== 'live' && (
        <nav className="fixed bottom-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-3xl border-t border-white/[0.08] z-50 px-6 flex flex-row overflow-x-auto whitespace-nowrap scrollbar-hide snap-x pb-4 items-center justify-start gap-6">
          <button
            onClick={() => setActiveTab('explore')}
            className="relative flex flex-col items-center justify-center min-w-[56px] snap-center py-1 text-xs group"
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
            onClick={() => setActiveTab('find')}
            className="relative flex flex-col items-center justify-center min-w-[56px] snap-center py-1 text-xs group"
          >
            {activeTab === 'find' && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute -top-2 w-8 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.8)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Radar className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${activeTab === 'find' ? 'text-white' : 'text-white/40'}`} />
            <span className={`text-[10px] mt-1 font-medium tracking-tight ${activeTab === 'find' ? 'text-white font-bold' : 'text-white/40'}`}>Find</span>
          </button>


          <button
            onClick={() => setActiveTab('chats')}
            className="relative flex flex-col items-center justify-center min-w-[56px] snap-center py-1 text-xs group"
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
            type="button"
            className="relative flex flex-col items-center justify-center min-w-[56px] snap-center py-1 text-xs group touch-manipulation cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.6)] border-2 border-yellow-300/50 mb-1 group-hover:scale-105 transition-transform duration-200 pointer-events-none">
              <Store className="w-5 h-5 text-black fill-black/10 pointer-events-none" />
            </div>
            <span className="text-[10px] font-bold tracking-tight text-amber-400 pointer-events-none">Store</span>
          </button>

          <button
            onClick={() => setActiveTab("live")}
            className="relative flex flex-col items-center justify-center min-w-[56px] snap-center py-1 text-xs group"
          >
            <div className="relative">
              <Flame className="w-5 h-5 transition-transform duration-200 group-hover:scale-110 text-white/40" />
            </div>
            <span className="text-[10px] mt-1 font-medium tracking-tight text-white/40">Live</span>
          </button>

          <button
            onClick={() => setActiveTab('status')}
            className="relative flex flex-col items-center justify-center min-w-[56px] snap-center py-1 text-xs group"
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
            className="relative flex flex-col items-center justify-center min-w-[56px] snap-center py-1 text-xs group"
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
      )}

            <NotificationDrawer isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
      <SpatialRadarModal />
      <ProfileCompletionModal
        isOpen={isCompletionModalOpen}
        onClose={() => setIsCompletionModalOpen(false)}
        profileImages={profileImages}
        onUploadSuccess={(newImages) => {
          setProfileImages(newImages);
          if (newImages.length >= 6) {
            setIsCompletionModalOpen(false);
          }
        }}
      />


      {/* THE EMERALD CORE WIDGET (HELP BOT) */}
      {activeTab !== 'live' && (
        <button
          onClick={() => setIsHelpBotOpen(true)}
          className="fixed bottom-24 left-4 z-[99999] w-14 h-14 rounded-full bg-[#020202]/90 backdrop-blur-2xl border border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.4)] flex items-center justify-center hover:scale-110 transition-all cursor-pointer group"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Bot className="text-green-500 w-6 h-6" />
          </motion.div>
        </button>
      )}

      <HelpBotModal isOpen={isHelpBotOpen} onClose={() => setIsHelpBotOpen(false)} />

    </div>
  );
};