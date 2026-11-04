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
       const oscillator = audioContext.createOscillator();
       const gainNode = audioContext.createGain();
       oscillator.connect(gainNode);
       gainNode.connect(audioContext.destination);
       oscillator.type = 'sine';
       oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
       oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
       gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
       gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
       oscillator.start(audioContext.currentTime);
       oscillator.stop(audioContext.currentTime + 0.5);
    } catch(e) {
       console.error("Audio chime failed", e);
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
      const relevantMsgs = msgsData.filter(m => (m.receiver_id === user.id || m.room_id) && (!m.content || !m.content.startsWith('[GROUP_CONFIG_JSON]')));
      const msgNotifs = relevantMsgs.map((msg: any) => ({
        id: `msg-${msg.id}`,
        user_id: user.id,
        actor_id: msg.sender_id,
        type: 'MESSAGE',
        content: msg.content || 'Sent you a media attachment',
        is_read: Boolean(msg.is_read),
        created_at: msg.created_at
      }));

      // Merge and sort
      combined = [...combined, ...msgNotifs];
    }

    // Sort combined by created_at descending and deduplicate by id
    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const dedupedMap = new Map();
    combined.forEach(n => {
       if (!dedupedMap.has(n.id)) {
          dedupedMap.set(n.id, n);
       }
    });

    const finalCombined = Array.from(dedupedMap.values()).slice(0, 50);

    if (finalCombined.length > 0) {
      lastSeenTimestampRef.current = Math.max(lastSeenTimestampRef.current, new Date(finalCombined[0].created_at).getTime());
    }

    setNotifications(finalCombined);
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
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as GlobalNotification;
          setNotifications((prev) => {
            const exists = prev.find(n => n.id === newNotification.id);
            if (exists) return prev;
            return [newNotification, ...prev].slice(0, 50);
          });
          setBellShake(true);
          setTimeout(() => setBellShake(false), 500);

          triggerNativeNotification('EarnMega Alert', newNotification.content || newNotification.message || 'You have a new notification', `notif-${newNotification.id}`);

          // Toast if drawer closed (simplified check since we don't track drawer state in context directly right now)
          // But since we trigger native we also trigger toast
          import('react-hot-toast').then(({ toast }) => {
              toast.success(newNotification.content || newNotification.message || 'New notification', {
                  icon: '🔔',
                  style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                  },
              });
          });

          // Restore GIFT handling
          if (newNotification.type === 'GIFT' && newNotification.content) {
             try {
               const parts = newNotification.content.split('|');
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

          if (msg.receiver_id === user.id || msg.room_id) {
             const msgNotif: GlobalNotification = {
                id: `msg-${msg.id}`,
                user_id: user.id,
                actor_id: msg.sender_id,
                type: 'MESSAGE',
                content: msg.content ? 'New message: ' + msg.content : 'Sent you a media attachment',
                is_read: false,
                created_at: msg.created_at || new Date().toISOString()
             };

             setNotifications((prev) => {
                const exists = prev.find(n => n.id === msgNotif.id);
                if (exists) return prev;
                return [msgNotif, ...prev].slice(0, 50);
             });

             setBellShake(true);
             setTimeout(() => setBellShake(false), 500);

             if (document.visibilityState === 'hidden' || window.location.pathname !== '/chats') {
                triggerNativeNotification('New Message on EarnMega', msg.content || 'Sent you a media attachment', `msg-${msg.id}`);
             }
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
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{ notifications, markAsRead, markAllAsRead, unreadCount, bellShake, setBellShake, triggerNativeNotification, requestPushPermission, permissionStatus, refreshNotifications: fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useGlobalNotifications() {
  return useContext(NotificationContext);
}
