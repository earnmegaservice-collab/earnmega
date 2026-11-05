'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';

export interface GlobalNotification {
  id: string;
  user_id?: string;
  recipient_id?: string;
  actor_id: string | null;
  actor_username?: string;
  actor_name?: string;
  actor_avatar_url?: string;
  room_id?: string;
  type: string;
  message?: string;
  content?: string;
  title?: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationContextType {
  notifications: GlobalNotification[];
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  unreadCount: number;
  bellShake: boolean;
  setBellShake: (shake: boolean) => void;
  triggerNativeNotification: (title: string, body: string, tag?: string) => void;
  requestPushPermission?: () => void;
  permissionStatus: string;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  clearAllNotifications: async () => {},
  unreadCount: 0,
  bellShake: false,
  setBellShake: () => {},
  triggerNativeNotification: () => {},
  permissionStatus: 'default',
  refreshNotifications: async () => {}
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<GlobalNotification[]>([]);
  const [bellShake, setBellShake] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const lastSeenTimestampRef = useRef<number>(Date.now());

  const profileCache = useRef<Map<string, { username: string; full_name: string; avatar_url: string }>>(new Map());
  const roomCache = useRef<Map<string, { name: string; avatar_url: string }>>(new Map());

  const requestPushPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(status => {
        setPermissionStatus(status);
        if (status === 'granted') {
           triggerNativeNotification('Outside-App Alerts Enabled! ✅', 'You will now receive alerts even when using other apps.');
        }
      });
    }
  };

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  // Helper for outside-app OS notifications
  const triggerNativeNotification = async (title: string, body: string, tag?: string) => {
    // Check if muted via localStorage
    const isMuted = user ? localStorage.getItem(`earnmega_notif_muted_${user.id}`) === 'true' : false;
    if (isMuted) return;

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const swReg = await navigator.serviceWorker.getRegistration();
        if (swReg && swReg.active) {
          swReg.showNotification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: tag || 'hubpal-' + Date.now(),
            renotify: true,
            vibrate: [200, 100, 200]
          } as any);
          swReg.active.postMessage({ type: 'SHOW_NOTIFICATION', title, body, tag: tag || 'hubpal-' + Date.now() });
        } else {
          new window.Notification(title, { body, icon: '/favicon.ico', tag: tag || 'hubpal-' + Date.now() });
        }
      } catch (e) {
        new window.Notification(title, { body, icon: '/favicon.ico', tag: tag || 'hubpal-' + Date.now() });
      }
    }

    // Play subtle audio if not muted
    try {
       const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

       // Tone 1
       const osc1 = audioContext.createOscillator();
       const gain1 = audioContext.createGain();
       osc1.connect(gain1);
       gain1.connect(audioContext.destination);
       osc1.type = 'sine';
       osc1.frequency.setValueAtTime(880, audioContext.currentTime);
       gain1.gain.setValueAtTime(0, audioContext.currentTime);
       gain1.gain.linearRampToValueAtTime(0.45, audioContext.currentTime + 0.05);
       gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
       osc1.start(audioContext.currentTime);
       osc1.stop(audioContext.currentTime + 0.2);

       // Tone 2
       const osc2 = audioContext.createOscillator();
       const gain2 = audioContext.createGain();
       osc2.connect(gain2);
       gain2.connect(audioContext.destination);
       osc2.type = 'sine';
       osc2.frequency.setValueAtTime(1318.5, audioContext.currentTime + 0.15);
       gain2.gain.setValueAtTime(0, audioContext.currentTime + 0.15);
       gain2.gain.linearRampToValueAtTime(0.45, audioContext.currentTime + 0.2);
       gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
       osc2.start(audioContext.currentTime + 0.15);
       osc2.stop(audioContext.currentTime + 0.4);
    } catch(e) {
       console.error("Audio chime failed", e);
       try {
         const fallbackAudio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='); // Stub for minimal empty WAV, browser will just ignore if invalid, but you can put a real Base64 string for a sound here
         fallbackAudio.volume = 0.5;
         fallbackAudio.play().catch(() => {});
       } catch (fallbackError) {}
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const requestPerm = () => {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(status => setPermissionStatus(status));
      }
      document.removeEventListener('click', requestPerm);
      document.removeEventListener('pointerdown', requestPerm);
    };
    if (typeof document !== 'undefined') {
       document.addEventListener('click', requestPerm);
       document.addEventListener('pointerdown', requestPerm);
    }
    return () => {
      if (typeof document !== 'undefined') {
         document.removeEventListener('click', requestPerm);
         document.removeEventListener('pointerdown', requestPerm);
      }
    }
  }, []);

  const cleanNotificationText = (raw: string) => {
    if (!raw) return '';
    let cleaned = raw;
    cleaned = cleaned.replace(/^\[REPLY:[^\]]+\]\s*/i, '');
    cleaned = cleaned.replace(/^\[FORWARDED\]\n/i, '');
    return cleaned;
  };

  const resolveProfilesAndRooms = async (combined: GlobalNotification[]) => {
    const missingProfileIds = new Set<string>();
    const missingRoomIds = new Set<string>();

    for (const notif of combined) {
      if (notif.actor_id && !profileCache.current.has(notif.actor_id)) {
        missingProfileIds.add(notif.actor_id);
      }
      if (notif.room_id && !roomCache.current.has(notif.room_id)) {
        missingRoomIds.add(notif.room_id);
      }
    }

    if (missingProfileIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', Array.from(missingProfileIds));

      if (profiles) {
        for (const p of profiles) {
          profileCache.current.set(p.id, p);
        }
      }
    }

    if (missingRoomIds.size > 0) {
      const { data: rooms } = await supabase
        .from('rooms')
        .select('id, name, avatar_url')
        .in('id', Array.from(missingRoomIds));

      if (rooms) {
        for (const r of rooms) {
          roomCache.current.set(r.id, r);
        }
      }
    }

    return combined.map(notif => {
      const p = notif.actor_id ? profileCache.current.get(notif.actor_id) : undefined;
      const r = notif.room_id ? roomCache.current.get(notif.room_id) : undefined;

      const actor_username = notif.actor_username || p?.username;
      const actor_name = notif.actor_name || p?.full_name || p?.username;
      const actor_avatar_url = p?.avatar_url;

      let title = notif.title;
      let subtitle = undefined;

      if (notif.type === 'MESSAGE' || notif.type === 'message') {
        const cleanMessage = cleanNotificationText(notif.content || '');
        if (notif.room_id) {
          title = `${actor_name || 'Someone'} in ${r?.name || 'Group'}`;
          subtitle = 'Group Chat';
        } else {
          title = actor_name || 'Someone';
          subtitle = 'Direct Message';
        }
        notif.content = cleanMessage || 'Sent you a media attachment';
      }

      return {
        ...notif,
        actor_username,
        actor_name,
        actor_avatar_url,
        title,
        subtitle
      };
    });
  };

  const fetchNotifications = async () => {
    if (!user) return;

    // 1. Fetch from notifications table
    const { data: notifsData, error: notifsError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (notifsError) {
      console.error('Error fetching notifications:', notifsError);
    }

    // 2. Fetch incoming messages to act as notifications
    const { data: msgsData, error: msgsError } = await supabase
      .from('messages')
      .select('id, sender_id, receiver_id, room_id, content, created_at, is_read')
      .neq('sender_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (msgsError) {
      console.error('Error fetching messages for notifications:', msgsError);
    }

    let combined: GlobalNotification[] = [];

    if (notifsData) {
      const normalizedNotifs = notifsData.map((raw: any) => ({
        ...raw,
        content: raw.content || raw.message || raw.title || 'New activity on your account'
      }));
      combined = [...combined, ...normalizedNotifs as GlobalNotification[]];
    }

    if (msgsData) {
      // Filter messages to only those meant for user (or group), and exclude group config
      const relevantMsgs = msgsData.filter(m => {
        if (m.sender_id === user.id) return false;
        if (!m.receiver_id && !m.room_id) return false;
        if (m.room_id && m.receiver_id && m.receiver_id !== user.id) return false; // Not strictly needed if room_id broadcasts to all

        if (!m.content) return true;
        if (m.content.startsWith('[GROUP_CONFIG_JSON]')) return false;
        if (m.content.toLowerCase().includes('updated group settings:')) return false;
        if (m.content.toLowerCase().includes('changed the group icon')) return false;
        return true;
      });

      const msgNotifs = relevantMsgs.map((msg: any) => ({
        id: `msg-${msg.id}`,
        user_id: user.id,
        actor_id: msg.sender_id,
        room_id: msg.room_id,
        type: 'MESSAGE',
        content: msg.content ? cleanNotificationText(msg.content) : 'Sent you a media attachment',
        is_read: Boolean(msg.is_read),
        created_at: msg.created_at
      }));

      // Merge and sort
      combined = [...combined, ...msgNotifs];
    }

    // Apply local storage filters for cleared and read items
    const clearedAt = Number(localStorage.getItem(`horpal_notif_cleared_at_${user.id}`) || 0);
    const lastReadAt = Number(localStorage.getItem(`horpal_notif_last_read_${user.id}`) || 0);
    let clearedIds: string[] = [];
    let readIds: string[] = [];
    try {
      clearedIds = JSON.parse(localStorage.getItem(`horpal_cleared_notif_ids_${user.id}`) || '[]');
      readIds = JSON.parse(localStorage.getItem(`horpal_read_notif_ids_${user.id}`) || '[]');
    } catch {}

    const filteredCombined = combined.filter(n => {
      const createdTime = new Date(n.created_at).getTime();
      if (createdTime <= clearedAt) return false;
      if (clearedIds.includes(n.id)) return false;
      return true;
    }).map(n => {
      const createdTime = new Date(n.created_at).getTime();
      if (createdTime <= lastReadAt || readIds.includes(n.id)) {
        n.is_read = true;
      }
      return n;
    });

    // Sort combined by created_at descending and deduplicate by id
    filteredCombined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const dedupedMap = new Map();
    filteredCombined.forEach(n => {
       if (!dedupedMap.has(n.id)) {
          dedupedMap.set(n.id, n);
       }
    });

    const finalCombined = Array.from(dedupedMap.values()).slice(0, 50);

    const resolvedCombined = await resolveProfilesAndRooms(finalCombined);

    if (resolvedCombined.length > 0) {
      lastSeenTimestampRef.current = Math.max(lastSeenTimestampRef.current, new Date(resolvedCombined[0].created_at).getTime());
    }

    setNotifications(resolvedCombined);
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    fetchNotifications();

    // Heartbeat logic to catch up when returning from background
    const handleVisibilityAndFocus = () => {
       if (document.visibilityState === 'visible') {
           fetchNotifications();
       }
    };

    document.addEventListener('visibilitychange', handleVisibilityAndFocus);
    window.addEventListener('focus', handleVisibilityAndFocus);

    const intervalId = setInterval(() => {
       if (document.visibilityState === 'hidden') {
           fetchNotifications();
       }
    }, 20000);

    const uniqueChannel = `appshell-notifications-${Date.now()}`;
    const channel = supabase
      .channel(uniqueChannel)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'statuses',
        },
        async (payload) => {
          const status = payload.new as any;
          if (status.user_id === user.id) return;

          const notif: GlobalNotification = {
            id: `status-${status.id}`,
            user_id: user.id,
            actor_id: status.user_id,
            type: 'STATUS_POSTED',
            content: status.text_content || "Posted a new photo/video status — tap to view",
            title: "updated their status",
            is_read: false,
            created_at: status.created_at || new Date().toISOString()
          };

          resolveProfilesAndRooms([notif]).then(resolved => {
            const finalNotif = resolved[0];
            finalNotif.title = `${finalNotif.actor_name || 'Someone'} updated their status`;

            setNotifications(prev => {
              const clearedAt = Number(localStorage.getItem(`horpal_notif_cleared_at_${user.id}`) || 0);
              if (new Date(finalNotif.created_at).getTime() <= clearedAt) return prev;
              const exists = prev.find(n => n.id === finalNotif.id);
              if (exists) return prev;
              return [finalNotif, ...prev].slice(0, 50);
            });
            setBellShake(true);
            setTimeout(() => setBellShake(false), 500);

            if (document.visibilityState === 'hidden' || window.location.pathname !== '/status') {
               triggerNativeNotification('EarnMega Alert', finalNotif.title || 'New status update', `status-${status.id}`);
            }
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_streams',
        },
        async (payload) => {
          const stream = payload.new as any;
          if (stream.host_id === user.id) return;
          if (stream.status !== 'live' && stream.is_live !== true) return;

          const notif: GlobalNotification = {
            id: `live-${stream.id}`,
            user_id: user.id,
            actor_id: stream.host_id,
            type: 'LIVE_STARTED',
            content: `Tap to join their live stream in Live Arena`,
            title: "is Live now!",
            is_read: false,
            created_at: stream.created_at || new Date().toISOString()
          };

          resolveProfilesAndRooms([notif]).then(resolved => {
            const finalNotif = resolved[0];
            finalNotif.title = `🔴 ${finalNotif.actor_name || 'Someone'} is Live now!`;
            finalNotif.content = `Tap to join ${finalNotif.actor_name || 'Someone'}'s live stream in Live Arena`;

            setNotifications(prev => {
              const clearedAt = Number(localStorage.getItem(`horpal_notif_cleared_at_${user.id}`) || 0);
              if (new Date(finalNotif.created_at).getTime() <= clearedAt) return prev;
              const exists = prev.find(n => n.id === finalNotif.id);
              if (exists) return prev;
              return [finalNotif, ...prev].slice(0, 50);
            });
            setBellShake(true);
            setTimeout(() => setBellShake(false), 500);

            if (document.visibilityState === 'hidden' || window.location.pathname !== '/') {
               triggerNativeNotification('EarnMega Live', finalNotif.title || 'Someone is live', `live-${stream.id}`);
            }
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as GlobalNotification;
          resolveProfilesAndRooms([newNotification]).then(resolved => {
            const finalNewNotification = resolved[0];
            setNotifications((prev) => {
              const clearedAt = Number(localStorage.getItem(`horpal_notif_cleared_at_${user.id}`) || 0);
              let clearedIds: string[] = [];
              try { clearedIds = JSON.parse(localStorage.getItem(`horpal_cleared_notif_ids_${user.id}`) || '[]'); } catch {}

              if (new Date(finalNewNotification.created_at).getTime() <= clearedAt || clearedIds.includes(finalNewNotification.id)) return prev;

              const exists = prev.find(n => n.id === finalNewNotification.id);
              if (exists) return prev;
              return [finalNewNotification, ...prev].slice(0, 50);
            });
            setBellShake(true);
            setTimeout(() => setBellShake(false), 500);

            triggerNativeNotification('EarnMega Alert', finalNewNotification.content || finalNewNotification.message || 'You have a new notification', `notif-${finalNewNotification.id}`);

            // Toast if drawer closed (simplified check since we don't track drawer state in context directly right now)
            // But since we trigger native we also trigger toast
            import('react-hot-toast').then(({ toast }) => {
                toast.success(finalNewNotification.content || finalNewNotification.message || 'New notification', {
                    icon: '🔔',
                    style: {
                      borderRadius: '10px',
                      background: '#333',
                      color: '#fff',
                    },
                });
            });

            // Restore GIFT handling
            if (finalNewNotification.type === 'GIFT' && finalNewNotification.content) {
               try {
                 const parts = finalNewNotification.content.split('|');
                 if (parts.length >= 3) {
                   const giftData = { name: parts[0], cost: parseInt(parts[1]) };
                   const senderId = parts.length > 3 ? parts[3] : '';
                   const customEvent = new CustomEvent('gift_received_local', {
                     detail: { giftData: giftData, senderId: senderId, receiverId: user?.id }
                   });
                   window.dispatchEvent(customEvent);
                 }
               } catch(e) {
                 console.error("Error parsing gift notification", e);
               }
            }
          });

        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedNotification = payload.new as GlobalNotification;
          if (updatedNotification.is_read) {
             setNotifications((prev) => prev.map(n => n.id === updatedNotification.id ? { ...n, is_read: true } : n));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const msg = payload.new as any;
          if (msg.sender_id === user.id) return;
          if (msg.content && msg.content.startsWith('[GROUP_CONFIG_JSON]')) return;
          if (msg.content && msg.content.toLowerCase().includes('updated group settings:')) return;
          if (msg.content && msg.content.toLowerCase().includes('changed the group icon')) return;

          if (msg.receiver_id === user.id || msg.room_id) {
             const cleanedContent = msg.content ? cleanNotificationText(msg.content) : 'Sent you a media attachment';
             const msgNotif: GlobalNotification = {
                id: `msg-${msg.id}`,
                user_id: user.id,
                actor_id: msg.sender_id,
                room_id: msg.room_id,
                type: 'MESSAGE',
                content: cleanedContent,
                is_read: false,
                created_at: msg.created_at || new Date().toISOString()
             };

             resolveProfilesAndRooms([msgNotif]).then(resolved => {
                const finalMsgNotif = resolved[0];
                setNotifications((prev) => {
                   const clearedAt = Number(localStorage.getItem(`horpal_notif_cleared_at_${user.id}`) || 0);
                   let clearedIds: string[] = [];
                   try { clearedIds = JSON.parse(localStorage.getItem(`horpal_cleared_notif_ids_${user.id}`) || '[]'); } catch {}

                   if (new Date(finalMsgNotif.created_at).getTime() <= clearedAt || clearedIds.includes(finalMsgNotif.id)) return prev;

                   const exists = prev.find(n => n.id === finalMsgNotif.id);
                   if (exists) return prev;
                   return [finalMsgNotif, ...prev].slice(0, 50);
                });

                setBellShake(true);
                setTimeout(() => setBellShake(false), 500);

                if (document.visibilityState === 'hidden' || window.location.pathname !== '/chats') {
                   triggerNativeNotification(finalMsgNotif.title || 'New Message on EarnMega', finalMsgNotif.content || 'Sent you a media attachment', `msg-${msg.id}`);
                }
             });
          }
        }
      )
      .subscribe();

    // Acquire a non-blocking web lock
    if (navigator.locks) {
        navigator.locks.request('hubpal_realtime_keepalive', { mode: 'shared' }, () => new Promise(() => {}));
    }

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityAndFocus);
      window.removeEventListener('focus', handleVisibilityAndFocus);
      clearInterval(intervalId);
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    if (user) {
      let readIds: string[] = [];
      try { readIds = JSON.parse(localStorage.getItem(`horpal_read_notif_ids_${user.id}`) || '[]'); } catch {}
      if (!readIds.includes(id)) {
        readIds.push(id);
        localStorage.setItem(`horpal_read_notif_ids_${user.id}`, JSON.stringify(readIds));
      }
    }

    if (id.startsWith('msg-')) {
      const realId = id.replace('msg-', '');
      await supabase.from('messages').update({ is_read: true }).eq('id', realId);
    } else {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map(n => ({ ...n, is_read: true })));

    if (user) {
      localStorage.setItem(`horpal_notif_last_read_${user.id}`, Date.now().toString());
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    }
  };

  const clearAllNotifications = async () => {
    if (!user) return;
    const ids = notifications.map(n => n.id);
    setNotifications([]);

    localStorage.setItem(`horpal_notif_cleared_at_${user.id}`, Date.now().toString());
    localStorage.setItem(`horpal_cleared_notif_ids_${user.id}`, JSON.stringify(ids));

    await supabase.from('notifications').delete().eq('user_id', user.id);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{ notifications, markAsRead, markAllAsRead, clearAllNotifications, unreadCount, bellShake, setBellShake, triggerNativeNotification, requestPushPermission, permissionStatus, refreshNotifications: fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useGlobalNotifications() {
  return useContext(NotificationContext);
}
