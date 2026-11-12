'use client';
import { formatDistanceToNow } from 'date-fns';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, X, Eye, Radio, Flame, Heart, ShieldCheck, UserPlus, Users, AlertCircle, MessageCircle, Trash2, Gift } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { useGlobalNotifications } from '../../context/NotificationContext';
import { toast } from 'react-hot-toast';

export type LegacyNotification = {
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
    case 'STATUS_VIEW':
    case 'STATUS_POSTED':
      return {
        icon: <Eye size={18} className="text-pink-400" />,
        colorClass: 'pink',
        bgClass: 'bg-pink-500/10',
        borderClass: 'border-pink-500/20',
        shadowClass: 'shadow-[0_0_30px_rgba(244,114,182,0.1)]',
        pulseClass: 'bg-pink-500 shadow-[0_0_10px_rgba(244,114,182,0.8)]'
      };
    case 'LIVE_STARTED':
    case 'live_stream':
      return {
        icon: <Radio size={18} className="text-amber-400" />,
        colorClass: 'amber',
        bgClass: 'bg-amber-500/10',
        borderClass: 'border-amber-500/20',
        shadowClass: 'shadow-[0_0_30px_rgba(251,191,36,0.1)]',
        pulseClass: 'bg-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.8)]'
      };
    case 'MATCH_FOUND':
    case 'LOVE_ACCEPTED':
    case 'match':
      return {
        icon: <Flame size={18} className="text-fuchsia-400" />,
        colorClass: 'fuchsia',
        bgClass: 'bg-fuchsia-500/10',
        borderClass: 'border-fuchsia-500/20',
        shadowClass: 'shadow-[0_0_30px_rgba(232,121,249,0.1)]',
        pulseClass: 'bg-fuchsia-500 shadow-[0_0_10px_rgba(232,121,249,0.8)]'
      };
    case 'LOVE_REQUEST':
      return {
        icon: <Heart size={18} className="text-rose-400 fill-rose-400" />,
        colorClass: 'rose',
        bgClass: 'bg-rose-500/10',
        borderClass: 'border-rose-500/20',
        shadowClass: 'shadow-[0_0_30px_rgba(251,113,133,0.1)]',
        pulseClass: 'bg-rose-500 shadow-[0_0_10px_rgba(251,113,133,0.8)]'
      };
    case 'REPORT_SUCCESS':
      return {
        icon: <ShieldCheck size={18} className="text-green-400" />,
        colorClass: 'green',
        bgClass: 'bg-green-500/10',
        borderClass: 'border-green-500/20',
        shadowClass: 'shadow-[0_0_30px_rgba(74,222,128,0.1)]',
        pulseClass: 'bg-green-500 shadow-[0_0_10px_rgba(74,222,128,0.8)]'
      };
    case 'STATUS_LIKED':
      return {
        icon: <Heart size={18} className="text-rose-400" />,
        colorClass: 'rose',
        bgClass: 'bg-rose-500/10',
        borderClass: 'border-rose-500/20',
        shadowClass: 'shadow-[0_0_30px_rgba(251,113,133,0.1)]',
        pulseClass: 'bg-rose-500 shadow-[0_0_10px_rgba(251,113,133,0.8)]'
      };
    case 'NEW_FOLLOWER':
      return {
        icon: <UserPlus size={18} className="text-sky-400" />,
        colorClass: 'sky',
        bgClass: 'bg-sky-500/10',
        borderClass: 'border-sky-500/20',
        shadowClass: 'shadow-[0_0_30px_rgba(56,189,248,0.1)]',
        pulseClass: 'bg-sky-500 shadow-[0_0_10px_rgba(56,189,248,0.8)]'
      };
    case 'GROUP_INVITE':
      return {
        icon: <Users size={18} className="text-violet-400" />,
        colorClass: 'violet',
        bgClass: 'bg-violet-500/10',
        borderClass: 'border-violet-500/20',
        shadowClass: 'shadow-[0_0_30px_rgba(167,139,250,0.1)]',
        pulseClass: 'bg-violet-500 shadow-[0_0_10px_rgba(167,139,250,0.8)]'
      };
    case 'SYSTEM_ALERT':
      return {
        icon: <AlertCircle size={18} className="text-red-500" />,
        colorClass: 'red',
        bgClass: 'bg-red-500/10',
        borderClass: 'border-red-500/20',
        shadowClass: 'shadow-[0_0_30px_rgba(239,68,68,0.1)]',
        pulseClass: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]'
      };
    case 'MESSAGE':
    case 'message':
      return {
        icon: <MessageCircle size={18} className="text-blue-400" />,
        colorClass: 'blue',
        bgClass: 'bg-blue-500/10',
        borderClass: 'border-blue-500/20',
        shadowClass: 'shadow-[0_0_30px_rgba(59,130,246,0.1)]',
        pulseClass: 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]'
      };
    case 'chat_gift':
    case 'GIFT':
      return {
        icon: <Gift size={18} className="text-amber-400" />,
        colorClass: 'amber',
        bgClass: 'bg-amber-500/10',
        borderClass: 'border-amber-500/20',
        shadowClass: 'shadow-[0_0_30px_rgba(251,191,36,0.1)]',
        pulseClass: 'bg-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.8)]'
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
  const { notifications, unreadCount, markAllAsRead, clearAllNotifications, markAsRead, refreshNotifications, requestPushPermission, permissionStatus, isMuted, toggleMute } = useGlobalNotifications();
  const [filter, setFilter] = useState<'ALL' | 'LIVE' | 'STATUS' | 'GROUPS' | 'DMS' | 'CHAT_GIFTS'>('ALL');

  useEffect(() => {
    if (isOpen) {
      // Just mark all as read when opening. The global context handles fetching on background/foreground.
      markAllAsRead?.();
    }
  }, [isOpen, markAllAsRead]);

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
            className="fixed top-16 right-3 left-3 sm:left-auto sm:right-4 sm:w-[360px] max-h-[75vh] bg-neutral-950/80 backdrop-blur-[60px] border border-white/10 rounded-[2rem] shadow-[0_40px_100px_rgba(0,0,0,0.9)] z-[9999] p-2 flex flex-col"
          >
            <div className="flex flex-col border-b border-white/5">
              <div className="flex justify-between items-center px-5 py-4 gap-2">
                 <div className="flex items-center gap-2">
                   <h3 className="text-white font-black text-lg tracking-tight">Activity</h3>
                 </div>
                 <div className="flex flex-row items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold whitespace-nowrap">Mute</span>
                      <button
                        onClick={toggleMute}
                        className={`relative inline-flex h-4 w-8 flex-shrink-0 items-center rounded-full transition-colors ${isMuted ? 'bg-amber-500' : 'bg-zinc-700'}`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isMuted ? 'translate-x-4' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    <button onClick={() => { clearAllNotifications?.(); toast.success('All notifications cleared'); }} className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1" title="Clear All">
                       <Trash2 size={13} />
                    </button>
                    <button onClick={() => onClose?.()} className="text-white/60 hover:text-white flex-shrink-0"><X size={16}/></button>
                 </div>
               </div>

               {/* Filter Pills */}
               <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
                  <button onClick={() => setFilter('ALL')} className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${filter === 'ALL' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>All</button>
                  <button onClick={() => setFilter('LIVE')} className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${filter === 'LIVE' ? 'bg-rose-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>Live 🔴</button>
                  <button onClick={() => setFilter('STATUS')} className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${filter === 'STATUS' ? 'bg-sky-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>Status 📸</button>
                  <button onClick={() => setFilter('GROUPS')} className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${filter === 'GROUPS' ? 'bg-violet-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>Groups 👥</button>
                  <button onClick={() => setFilter('DMS')} className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${filter === 'DMS' ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>DMs 💬</button>
                  <button onClick={() => setFilter('CHAT_GIFTS')} className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${filter === 'CHAT_GIFTS' ? 'bg-amber-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>Chat Gifts 🎁</button>
               </div>
             </div>

            {typeof window !== 'undefined' && 'Notification' in window && permissionStatus !== 'granted' && (
              <div
                onClick={() => requestPushPermission?.()}
                className="mx-3 mt-3 p-3 bg-gradient-to-r from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 rounded-xl cursor-pointer hover:bg-indigo-500/30 transition-all flex items-center justify-between"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-white font-bold text-sm">🔔 Enable Phone Alerts</span>
                  <span className="text-white/60 text-xs">Tap to get outside-app alerts</span>
                </div>
              </div>
            )}

            <motion.div
              className="flex-1 max-h-[400px] overflow-y-auto p-4 space-y-3"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.1 } }
              }}
              initial="hidden"
              animate="show"
            >
              {notifications.filter(n => {
                 if (user?.id && n.user_id && n.user_id !== user.id && n.recipient_id !== user.id) return false;
                 if (filter === 'ALL') return true;
                 if (filter === 'LIVE') return n.type === 'LIVE_STARTED';
                 if (filter === 'STATUS') return n.type === 'STATUS_POSTED' || n.type === 'STATUS_LIKED';
                 if (filter === 'GROUPS') return (n.type === 'MESSAGE' && n.room_id) || n.type === 'GROUP_INVITE';
                 if (filter === 'DMS') return (n.type === 'MESSAGE' && !n.room_id) || n.type === 'LOVE_REQUEST' || n.type === 'LOVE_ACCEPTED' || n.type === 'MATCH_FOUND';
                 if (filter === 'CHAT_GIFTS') return n.type === 'chat_gift' || n.type === 'GIFT';
                 return true;
              }).length === 0 ? (
                <p className="text-white/50 text-center mt-10">No notifications yet</p>
              ) : (
                <div className="flex flex-col gap-2 p-2">
                  {notifications.filter(n => {
                     if (user?.id && n.user_id && n.user_id !== user.id && n.recipient_id !== user.id) return false;
                     if (filter === 'ALL') return true;
                     if (filter === 'LIVE') return n.type === 'LIVE_STARTED';
                     if (filter === 'STATUS') return n.type === 'STATUS_POSTED' || n.type === 'STATUS_LIKED';
                     if (filter === 'GROUPS') return (n.type === 'MESSAGE' && n.room_id) || n.type === 'GROUP_INVITE';
                     if (filter === 'DMS') return (n.type === 'MESSAGE' && !n.room_id) || n.type === 'LOVE_REQUEST' || n.type === 'LOVE_ACCEPTED' || n.type === 'MATCH_FOUND';
                     if (filter === 'CHAT_GIFTS') return n.type === 'chat_gift' || n.type === 'GIFT';
                     return true;
                  }).map((notif, idx) => {
                    const ui = getNotificationUI(notif.type);
                    const displayMessage = notif.content || notif.message || 'New activity on your account';

                    let relTime = '';
                    try {
                       relTime = formatDistanceToNow(new Date(notif.created_at), { addSuffix: true });
                       relTime = relTime.replace('about ', '').replace('less than a minute ago', 'Just now');
                    } catch (e) {
                       relTime = new Date(notif.created_at).toLocaleDateString();
                    }

                    return (
                      <motion.div
                        key={notif.id}
                        variants={{
                          hidden: { opacity: 0, x: 20 },
                          show: { opacity: 1, x: 0 }
                        }}
                        className={`relative flex items-start gap-4 p-4 rounded-2xl transition-all cursor-pointer bg-zinc-950/80 backdrop-blur-xl border border-white/5 overflow-hidden group hover:bg-white/5`}
                      >
                        <div
                          className="flex flex-1 min-w-0 items-start gap-4"
                          onClick={() => {
                             markAsRead(notif.id);
                             window.dispatchEvent(new CustomEvent('horpal:navigate-notification', { detail: notif }));
                             onClose?.();
                          }}
                        >
                          <div className={`p-2 rounded-full ${ui.bgClass} flex items-center justify-center z-10 flex-shrink-0 mt-1`}>
                            {notif.actor_avatar_url ? (
                               <img src={notif.actor_avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                            ) : ui.icon}
                          </div>

                          <div className="flex flex-col flex-1 z-10 min-w-0">
                            {notif.sourceLabel && (
                               <div className="mb-1">
                                 <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/10 text-white/70">
                                   {notif.sourceLabel}
                                 </span>
                               </div>
                            )}

                            {notif.title && (
                               <span className="text-sm text-white font-bold leading-tight line-clamp-2 mb-1">
                                 {notif.title}
                               </span>
                            )}

                            <span className="text-xs text-zinc-400 line-clamp-2">
                              {displayMessage}
                            </span>

                            <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider mt-2">
                              {relTime}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                             e.stopPropagation();
                             markAsRead(notif.id); // For dismiss we just mark read, or optionally we could delete
                             // Optional: we can soft-delete by clearing just this ID if we want, but instructions said mark read / dismiss.
                          }}
                          className="text-white/20 hover:text-white/60 p-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        >
                          <X size={14} />
                        </button>
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
