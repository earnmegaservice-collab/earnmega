'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, X, Eye, Radio, Flame, Heart } from 'lucide-react';
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

const getNotificationUI = (type: string) => {
  switch (type) {
    case 'status_view':
      return {
        icon: <Eye size={18} className="text-pink-400" />,
        colorClass: 'pink',
        bgClass: 'bg-pink-500/10',
        borderClass: 'border-pink-500/20',
        shadowClass: 'shadow-[0_0_30px_rgba(244,114,182,0.1)]',
        pulseClass: 'bg-pink-500 shadow-[0_0_10px_rgba(244,114,182,0.8)]'
      };
    case 'live_stream':
      return {
        icon: <Radio size={18} className="text-red-400" />,
        colorClass: 'red',
        bgClass: 'bg-red-500/10',
        borderClass: 'border-red-500/20',
        shadowClass: 'shadow-[0_0_30px_rgba(248,113,113,0.1)]',
        pulseClass: 'bg-red-500 shadow-[0_0_10px_rgba(248,113,113,0.8)]'
      };
    case 'match':
      return {
        icon: <Flame size={18} className="text-fuchsia-400" />,
        colorClass: 'fuchsia',
        bgClass: 'bg-fuchsia-500/10',
        borderClass: 'border-fuchsia-500/20',
        shadowClass: 'shadow-[0_0_30px_rgba(232,121,249,0.1)]',
        pulseClass: 'bg-fuchsia-500 shadow-[0_0_10px_rgba(232,121,249,0.8)]'
      };
    case 'system':
    default:
      return {
        icon: <Bell size={18} className="text-indigo-400" />,
        colorClass: 'indigo',
        bgClass: 'bg-indigo-500/10',
        borderClass: 'border-indigo-500/20',
        shadowClass: 'shadow-[0_0_30px_rgba(99,102,241,0.1)]',
        pulseClass: 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]'
      };
  }
};

export default function NotificationDrawer({ isOpen, onClose }: { isOpen?: boolean, onClose?: () => void }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);

  const toggleMute = async () => {
    if (!user) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    isMutedRef.current = newMuted;
    await supabase.from('profiles').update({ notifications_muted: newMuted }).eq('id', user.id);
  };

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
      // Fetch both notifications and profile mute preference in parallel
      const [notifRes, profileRes] = await Promise.all([
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('profiles')
          .select('notifications_muted')
          .eq('id', user.id)
          .single()
      ]);

      if (!notifRes.error && notifRes.data) {
        setNotifications(notifRes.data);
        setUnreadCount(notifRes.data.filter(n => !n.is_read).length);
      }

      if (!profileRes.error && profileRes.data) {
        const muted = !!profileRes.data.notifications_muted;
        setIsMuted(muted);
        isMutedRef.current = muted;
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

        if (!isMutedRef.current) {
          const audio = new Audio('/sounds/notification.mp3');
          audio.play().catch(e => console.log('Audio autoplay blocked'));

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
        }
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
               <div className="flex items-center gap-2">
                 <h3 className="text-white font-black text-lg tracking-tight">Activity</h3>
                 {!isMuted && unreadCount > 0 && (
                   <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                     {unreadCount}
                   </span>
                 )}
               </div>
               <div className="flex flex-row items-center gap-3">
                  <button onClick={toggleMute} className="text-white/60 hover:text-white transition-colors" title={isMuted ? "Unmute Notifications" : "Mute Notifications"}>
                    {isMuted ? <BellOff size={16} /> : <Bell size={16} />}
                  </button>
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
                  {notifications.map((notif, idx) => {
                    const ui = getNotificationUI(notif.type);
                    return (
                      <motion.div
                        key={notif.id}
                        variants={{
                          hidden: { opacity: 0, x: 20 },
                          show: { opacity: 1, x: 0 }
                        }}
                        className={`relative flex items-start gap-4 p-4 rounded-2xl transition-all ${notif.is_read ? 'hover:bg-white/5' : `${ui.bgClass} ${ui.borderClass} ${ui.shadowClass}`}`}
                      >
                        {!notif.is_read && <div className={`absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${ui.pulseClass} animate-pulse`} />}
                        <div className={`p-2 rounded-full ${ui.bgClass} flex items-center justify-center`}>
                          {ui.icon}
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className="text-xs text-white/70">{notif.content}</span>
                          <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider mt-2">{new Date(notif.created_at).toLocaleString()}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
