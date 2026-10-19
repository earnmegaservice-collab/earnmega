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

    const uniqueChannel = `public-notifications-${Date.now()}`;
    const channel = supabase.channel(uniqueChannel)
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
            initial={{ opacity: 0, y: -30, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, scale: 0.95, filter: "blur(10px)" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute top-20 right-4 w-[340px] max-h-[500px] overflow-y-auto bg-neutral-950/80 backdrop-blur-[60px] border border-white/10 rounded-[2rem] shadow-[0_40px_100px_rgba(0,0,0,0.9)] z-[999] p-2 flex flex-col"
          >
            <div className="flex justify-between items-center px-5 py-4 border-b border-white/5">
               <h3 className="text-white font-black text-lg tracking-tight">Activity</h3>
               <div className="flex flex-row items-center gap-3">
                  <button onClick={markAllAsRead} className="text-[11px] uppercase tracking-widest text-indigo-400 font-bold hover:text-indigo-300 transition-colors">Mark Read</button>
                  <button onClick={() => onClose?.()} className="text-white/60 hover:text-white"><X size={16}/></button>
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
                <div className="flex flex-col gap-1 p-2">
                  {notifications.map((notif, idx) => (
                    <motion.div
                      key={notif.id}
                      variants={{
                        hidden: { opacity: 0, x: 20 },
                        show: { opacity: 1, x: 0 }
                      }}
                      className={`relative flex items-start gap-4 p-4 rounded-2xl transition-all ${notif.is_read ? 'hover:bg-white/5' : 'bg-indigo-500/10 border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.1)]'}`}
                    >
                      {!notif.is_read && <div className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] animate-pulse" />}
                      <div className="flex flex-col flex-1 pl-4">
                        <span className="text-sm font-bold text-white leading-tight">Notification</span>
                        <span className="text-xs text-white/50 mt-1">{notif.content}</span>
                        <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider mt-2">{new Date(notif.created_at).toLocaleString()}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
