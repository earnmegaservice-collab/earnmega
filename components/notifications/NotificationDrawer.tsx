'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

type Notification = {
  id: string;
  user_id: string;
  type: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

export default function NotificationDrawer({ isOpen, onClose }: { isOpen?: boolean, onClose?: () => void }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    const { error } = await supabase.rpc('mark_all_notifications_read', { p_user_id: user.id });

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("All caught up!");
    } else {
      toast.error("Failed to mark as read");
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    };

    fetchNotifications();

    const channel = supabase.channel('public:notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const newNotif = payload.new as Notification;
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);

        toast.custom((t) => (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-neutral-900/90 backdrop-blur-xl shadow-lg rounded-2xl pointer-events-auto flex ring-1 ring-amber-500/20`}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-white">
                    New Notification
                  </p>
                  <p className="mt-1 text-sm text-amber-400">
                    {newNotif.content}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onClose?.()}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-80 bg-neutral-950/95 backdrop-blur-3xl border-l border-white/10 z-50 flex flex-col shadow-2xl"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex flex-row items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-amber-400 hover:text-amber-300 font-medium">Mark all read</button>
                )}
                <button onClick={() => onClose?.()} className="p-2 text-white/60 hover:text-white rounded-full bg-white/5">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <motion.div
              className="flex-1 overflow-y-auto p-4 space-y-3"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.1 } }
              }}
              initial="hidden"
              animate="show"
            >
              {notifications.length === 0 ? (
                <p className="text-white/50 text-center mt-10">No notifications yet</p>
              ) : (
                notifications.map(notif => (
                  <motion.div
                    key={notif.id}
                    variants={{
                      hidden: { opacity: 0, x: 20 },
                      show: { opacity: 1, x: 0 }
                    }}
                    className={`p-3 rounded-xl border ${notif.is_read ? 'bg-white/5 border-white/5' : 'bg-amber-500/10 border-amber-500/20'}`}
                  >
                    <p className={`text-sm ${notif.is_read ? 'text-white/70' : 'text-amber-100 font-medium'}`}>{notif.content}</p>
                    <p className="text-xs text-white/40 mt-2">{new Date(notif.created_at).toLocaleString()}</p>
                  </motion.div>
                ))
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
