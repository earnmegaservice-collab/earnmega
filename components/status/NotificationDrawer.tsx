'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Unlock, Gift, Bell } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AppNotification {
  id: string;
  type: 'status_unlock' | 'status_like' | 'gift';
  message: string;
  created_at: Date;
  read: boolean;
}

export default function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!user) return;

    // Load initial notifications (mocked or from db if we had a table for it)
    // For now we will rely mostly on real-time events since we didn't migrate a notifications table.

    const channel = supabase.channel('chat-events')
      .on('broadcast', { event: 'status_unlocked' }, (payload) => {
        if (payload.payload.creatorId === user.id) {
          addNotification({
            id: Date.now().toString(),
            type: 'status_unlock',
            message: `Someone paid 10 coins to view your status!`,
            created_at: new Date(),
            read: false,
          });
        }
      })
      .on('broadcast', { event: 'status_liked' }, (payload) => {
        if (payload.payload.creatorId === user.id) {
          addNotification({
            id: Date.now().toString(),
            type: 'status_like',
            message: `Someone liked your status!`,
            created_at: new Date(),
            read: false,
          });
        }
      })
      .on('broadcast', { event: 'gift_sent' }, (payload) => {
        if (payload.payload.recipientId === user.id || payload.payload.senderId !== user.id && !payload.payload.recipientId) {
           // In actual logic gift_sent event should ideally specify recipientId, adapting based on ChatInterface.tsx implementation
           addNotification({
             id: Date.now().toString(),
             type: 'gift',
             message: `You received a ${payload.payload.giftData?.name} gift!`,
             created_at: new Date(),
             read: false,
           });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addNotification = (notif: AppNotification) => {
    setNotifications((prev) => [notif, ...prev]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'status_unlock': return <Unlock size={18} className="text-yellow-400" />;
      case 'status_like': return <Heart size={18} className="text-pink-500 fill-pink-500" />;
      case 'gift': return <Gift size={18} className="text-emerald-400" />;
      default: return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-80 max-w-[80vw] h-[100dvh] bg-white/5 backdrop-blur-3xl border-l border-white/10 shadow-2xl flex flex-col z-10"
          >
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h2 className="text-lg font-bold text-white tracking-wide">Notifications</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-white p-2 transition-colors rounded-full hover:bg-white/10">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-3">
                   <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                      <Bell size={24} className="text-white/20" />
                   </div>
                   <p className="text-sm">No new notifications</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={notif.id}
                    className="flex items-start space-x-3 p-3 bg-white/5 hover:bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center shrink-0 border border-white/5">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm text-gray-200 font-medium leading-snug">{notif.message}</p>
                      <p className="text-[10px] text-gray-500 mt-1">{notif.created_at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
