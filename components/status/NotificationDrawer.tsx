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
  user_id: string;
  type: 'status_unlock' | 'status_like' | 'gift';
  message: string;
  created_at: Date;
  read: boolean;
}

export default function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    const currentUserId = user.id;

    let channel: any = null;
    try {
      const channelName =
        'status-chat-events-' + currentUserId + '-' + Math.random().toString(36).substring(2, 9);
      channel = supabase
        .channel(channelName)
        .on('broadcast', { event: 'status_unlocked' }, (payload) => {
          if (payload?.payload?.creatorId === currentUserId) {
            addNotification({
              id: Date.now().toString(),
              user_id: currentUserId,
              type: 'status_unlock',
              message: `Someone paid 10 coins to view your status!`,
              created_at: new Date(),
              read: false,
            });
          }
        })
        .on('broadcast', { event: 'status_liked' }, (payload) => {
          if (payload?.payload?.creatorId === currentUserId) {
            addNotification({
              id: Date.now().toString(),
              user_id: currentUserId,
              type: 'status_like',
              message: `Someone liked your status!`,
              created_at: new Date(),
              read: false,
            });
          }
        })
        .on('broadcast', { event: 'gift_sent' }, (payload) => {
          // Strictly require recipientId === currentUserId so no other user's gifts leak
          if (payload?.payload?.recipientId === currentUserId) {
            addNotification({
              id: Date.now().toString(),
              user_id: currentUserId,
              type: 'gift',
              message: `You received a ${payload.payload.giftData?.name || 'special'} gift!`,
              created_at: new Date(),
              read: false,
            });
          }
        })
        .subscribe();
    } catch (err) {
      console.warn('Realtime fallback to polling:', err);
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const addNotification = (notif: AppNotification) => {
    if (!user?.id || notif.user_id !== user.id) return;
    setNotifications((prev) => [notif, ...prev]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'status_unlock':
        return <Unlock size={18} className="text-yellow-400" />;
      case 'status_like':
        return <Heart size={18} className="text-pink-500 fill-pink-500" />;
      case 'gift':
        return <Gift size={18} className="text-emerald-400" />;
      default:
        return null;
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
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white p-2 transition-colors rounded-full hover:bg-white/10"
              >
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
                notifications
                  .filter((n) => n.user_id === user?.id)
                  .map((notif) => (
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
                        <p className="text-sm text-gray-200 font-medium leading-snug">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1">
                          {notif.created_at.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
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
