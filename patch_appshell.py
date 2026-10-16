import re

with open('./components/layout/AppShell.tsx', 'r') as f:
    content = f.read()

# Add useAuth hook import and fetch/subscribe logic
new_imports = """import React, { useState, useEffect } from 'react';
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
  Store
} from 'lucide-react';
import GiftOverlay from '../chat/GiftOverlay';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';"""

content = re.sub(r"import React, { useState } from 'react';.*Store\n} from 'lucide-react';\nimport GiftOverlay from '\.\./chat/GiftOverlay';", new_imports, content, flags=re.DOTALL)

# Add state and useEffect for Notification Matrix
old_component_start = """export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeTab,
  setActiveTab,
  coinBalance,
  unreadCount = 0,
  onOpenStore,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);"""

new_component_start = """export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeTab,
  setActiveTab,
  coinBalance,
  unreadCount: initialUnreadCount = 0,
  onOpenStore,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [bellShake, setBellShake] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Fetch initial unread count
    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (!error && count !== null) {
        setUnreadCount(count);
      }
    };

    fetchUnreadCount();

    // The Global Render Queue & Notification Matrix Active Bell
    const channel = supabase.channel('public:notifications:appshell')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const newNotif = payload.new;

        // Update the active bell badge
        setUnreadCount(prev => prev + 1);

        // Trigger Framer Motion shake animation
        setBellShake(true);
        setTimeout(() => setBellShake(false), 500);

        // App-Open Supernova: Check if the notification is a gift and trigger local visual feedback
        // The Global Render Queue is technically implicitly handled here:
        // If they were offline, the database queue stored it.
        // Now that they are online (and received this via realtime if they just came online,
        // or fetched initially), we could trigger it.
        // For now, if a real-time 'INSERT' comes in for a gift, we trigger the overlay.
        if (newNotif.type === 'gift' && newNotif.content) {
           try {
             // Expecting content like: GIFT:Rose:50:sender_id
             const parts = newNotif.content.split(':');
             if (parts.length >= 3) {
               const giftData = { name: parts[1], cost: parseInt(parts[2]) };
               const senderId = parts.length > 3 ? parts[3] : '';

               // Dispatch custom event to App-Open Supernova GiftOverlay
               const customEvent = new CustomEvent('gift_received_local', {
                 detail: { giftData: giftData, senderId: senderId, receiverId: user.id }
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
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
         // If marked as read, recalculate or decrement (to simplify, let's just refetch)
         fetchUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Handle clearing badge instantly when opening notifications
  const handleOpenNotifications = () => {
     setShowNotifications(true);
     setUnreadCount(0); // Optimistic clear
  };
"""

content = content.replace(old_component_start, new_component_start)

# Update the Notification Bell button
old_bell = """          {/* Notification Bell */}
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
          </button>"""

new_bell = """          {/* Notification Bell */}
          <motion.button
            onClick={handleOpenNotifications}
            animate={bellShake ? { rotate: [-10, 10, -10, 10, 0], scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.4 }}
            className="relative p-2 rounded-full bg-white/[0.05] border border-white/10 hover:border-white/20 active:scale-95 transition"
          >
            <Bell className="w-4 h-4 text-white/90" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg border border-black">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </motion.button>"""

content = content.replace(old_bell, new_bell)

with open('./components/layout/AppShell.tsx', 'w') as f:
    f.write(content)
