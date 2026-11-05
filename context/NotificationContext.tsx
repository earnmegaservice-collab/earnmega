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
  sourceLabel?: string;
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
  isMuted: boolean;
  toggleMute: () => Promise<void>;
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
  refreshNotifications: async () => {},
  isMuted: false,
  toggleMute: async () => {}
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<GlobalNotification[]>([]);
  const [bellShake, setBellShake] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    const muted = localStorage.getItem(`horpal_notif_muted_${user.id}`) === 'true' || localStorage.getItem(`earnmega_notif_muted_${user.id}`) === 'true';
    setIsMuted(muted);
    isMutedRef.current = muted;
  }, [user]);

  const toggleMute = React.useCallback(async () => {
    if (!user) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    isMutedRef.current = newMuted;
    localStorage.setItem(`horpal_notif_muted_${user.id}`, String(newMuted));
    localStorage.setItem(`earnmega_notif_muted_${user.id}`, String(newMuted));

    import('react-hot-toast').then(({ toast }) => {
      if (newMuted) {
         toast.success('🔕 Notifications muted');
      } else {
         toast.success('🔔 Notifications unmuted');
      }
    });

    try {
      await supabase.from('profiles').update({ notifications_muted: newMuted }).eq('id', user.id);
    } catch (e) {}
  }, [isMuted, user]);
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
    if (isMutedRef.current || (user && localStorage.getItem(`horpal_notif_muted_${user.id}`) === 'true')) return;

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const swReg = await navigator.serviceWorker.ready;
        if (swReg) {
          await swReg.showNotification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: tag || 'horpal-' + Date.now(),
            renotify: true,
            silent: false,
            requireInteraction: false,
            vibrate: [250, 100, 250],
            data: { url: '/' }
          } as any);
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
       if (audioContext.state === 'suspended') {
          audioContext.resume();
       }

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
       try {
         // Valid fallback chime WAV base64
         const fallbackAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAB/f39/f38=');
         fallbackAudio.volume = 0.85;
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
    cleaned = cleaned.replace(/^\[FORWARDED\]\s*/i, '');
    cleaned = cleaned.replace(/^\[GROUP_CONFIG_JSON\][\s\S]*$/, '');
    // Replace raw UUIDs if they somehow made it in (simple heuristic)
    cleaned = cleaned.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, 'User');
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
      // Try rooms first
      const { data: rooms } = await supabase
        .from('rooms')
        .select('id, name, avatar_url')
        .in('id', Array.from(missingRoomIds));

      const foundRoomIds = new Set<string>();
      if (rooms) {
        for (const r of rooms) {
          roomCache.current.set(r.id, r);
          foundRoomIds.add(r.id);
        }
      }

      // Check remaining missing in chat_groups
      const remainingRoomIds = Array.from(missingRoomIds).filter(id => !foundRoomIds.has(id));
      if (remainingRoomIds.length > 0) {
         const { data: chatGroups } = await supabase
            .from('chat_groups')
            .select('id, name, avatar_url')
            .in('id', remainingRoomIds);

         if (chatGroups) {
            for (const cg of chatGroups) {
               roomCache.current.set(cg.id, cg);
               foundRoomIds.add(cg.id);
            }
         }
      }

      // Check remaining missing as profiles
      const stillRemaining = remainingRoomIds.filter(id => !foundRoomIds.has(id));
      if (stillRemaining.length > 0) {
         const { data: groupProfiles } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .in('id', stillRemaining);
         if (groupProfiles) {
            for (const gp of groupProfiles) {
               roomCache.current.set(gp.id, { name: gp.full_name || gp.username, avatar_url: gp.avatar_url });
            }
         }
      }
    }

    return combined.map(notif => {
      let actor_username = notif.actor_username;
      let actor_name = notif.actor_name;
      let actor_avatar_url = notif.actor_avatar_url;
      let title = notif.title;
      let sourceLabel = notif.sourceLabel;

      if (notif.actor_id && profileCache.current.has(notif.actor_id)) {
        const p = profileCache.current.get(notif.actor_id)!;
        actor_username = p.username;
        actor_name = p.full_name || p.username;
        actor_avatar_url = p.avatar_url;
      }

      const senderName = actor_name || actor_username || 'Someone';
      const cleanMessage = cleanNotificationText(notif.content || '');
      let displayContent = cleanMessage;

      if (!cleanMessage) {
         if ((notif as any).image_url || notif.content?.includes('#image')) {
            displayContent = '📷 Sent a photo';
         } else if ((notif as any).audio_url || notif.content?.includes('#audio')) {
            displayContent = '🎤 Sent a voice note';
         } else if (notif.content?.includes('#video')) {
            displayContent = '🎥 Sent a video';
         } else if (notif.type === 'MESSAGE' || notif.type === 'message') {
            displayContent = 'Sent an attachment';
         }
      }

      if (notif.type === 'MESSAGE' || notif.type === 'message' || notif.id.startsWith('msg-')) {
        let roomName = '';
        if (notif.room_id && roomCache.current.has(notif.room_id)) {
          roomName = roomCache.current.get(notif.room_id)!.name;
        }

        if (roomName) {
           sourceLabel = `👥 ${roomName}`;
           title = `${senderName} sent a message in ${roomName}`;
        } else {
           sourceLabel = `💬 Direct Message`;
           title = `${senderName} sent you a message`;
        }
        notif.content = displayContent;
      } else if (notif.type === 'STATUS_POSTED') {
         sourceLabel = `📸 Status Update`;
         title = `${senderName} updated their status`;
         notif.content = displayContent || 'Posted a new status — tap to view';
      } else if (notif.type === 'LIVE_STARTED') {
         sourceLabel = `🔴 Live Arena`;
         title = `🔴 ${senderName} is Live now!`;
         notif.content = displayContent || 'Tap to join their live stream';
      } else {
         if (!sourceLabel) sourceLabel = '🔔 Notification';
         if (!title) title = `${senderName} interacted with you`;
         notif.content = displayContent;
      }

      return {
        ...notif,
        actor_username,
        actor_name,
        actor_avatar_url,
        title,
        sourceLabel
      };
    });
  };

  const fetchNotifications = React.useCallback(async () => {
    if (!user) return;

    const [notifsRes, msgsRes, statusesRes, liveRes] = await Promise.allSettled([
      supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(40),
      supabase.from('messages').select('id, sender_id, receiver_id, room_id, content, image_url, audio_url, created_at, is_read').neq('sender_id', user.id).order('created_at', { ascending: false }).limit(40),
      supabase.from('statuses').select('id, user_id, text_content, media_url, caption, created_at').neq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('live_streams').select('id, host_id, host_username, host_avatar, title, category, status, is_live, created_at, started_at').neq('host_id', user.id).order('created_at', { ascending: false }).limit(15)
    ]);

    const notifsData = notifsRes.status === 'fulfilled' ? notifsRes.value.data || [] : [];
    const msgsData = msgsRes.status === 'fulfilled' ? msgsRes.value.data || [] : [];
    const statusesData = statusesRes.status === 'fulfilled' ? statusesRes.value.data || [] : [];
    const liveData = liveRes.status === 'fulfilled' ? liveRes.value.data || [] : [];

    let combined: GlobalNotification[] = [];

    // Notifications
    combined = [...combined, ...notifsData.map(n => ({
      ...n,
      actor_id: n.actor_id || null,
      type: n.type || 'SYSTEM_ALERT',
      id: `notif-${n.id}`
    }))];

    // Messages
    const msgsAsNotifs: GlobalNotification[] = msgsData
      .filter(m => (m.receiver_id === user.id || m.room_id))
      .map(m => ({
        id: `msg-${m.id}`,
        user_id: user.id,
        actor_id: m.sender_id,
        room_id: m.room_id,
        type: 'MESSAGE',
        content: m.content || '',
        image_url: m.image_url,
        audio_url: m.audio_url,
        is_read: m.is_read || false,
        created_at: m.created_at
      } as any));
    combined = [...combined, ...msgsAsNotifs];

    // Statuses
    const statusesAsNotifs: GlobalNotification[] = statusesData.map(s => ({
      id: `status-${s.id}`,
      user_id: user.id,
      actor_id: s.user_id,
      type: 'STATUS_POSTED',
      content: s.text_content || s.caption || 'Posted a new status update — tap to view',
      is_read: false,
      created_at: s.created_at
    }));
    combined = [...combined, ...statusesAsNotifs];

    // Live Streams
    const liveAsNotifs: GlobalNotification[] = liveData
      .filter(s => s.status === 'live' || s.status === 'active' || s.is_live === true)
      .map(s => ({
        id: `live-${s.id}`,
        user_id: user.id,
        actor_id: s.host_id,
        actor_name: s.host_username,
        actor_avatar_url: s.host_avatar,
        type: 'LIVE_STARTED',
        content: s.title ? `Streaming "${s.title}" in Live Arena — tap to join` : 'Started a live stream in Live Arena — tap to join',
        is_read: false,
        created_at: s.started_at || s.created_at
      }));
    combined = [...combined, ...liveAsNotifs];

    // Filter spam
    combined = combined.filter(n => {
       const text = (n.content || '').toLowerCase();
       if (text.includes('[group_config_json]')) return false;
       if (text.includes('updated group settings:')) return false;
       if (text.includes('only admins can')) return false;
       if (text.includes('changed the group icon')) return false;
       return true;
    });

    // Dedup and Sort
    const dedupedMap = new Map<string, GlobalNotification>();
    for (const c of combined) {
      if (!dedupedMap.has(c.id)) dedupedMap.set(c.id, c);
    }

    const clearedAt = Number(localStorage.getItem(`horpal_notif_cleared_at_${user.id}`) || 0);
    let clearedIds: string[] = [];
    try { clearedIds = JSON.parse(localStorage.getItem(`horpal_cleared_notif_ids_${user.id}`) || '[]'); } catch {}

    const lastReadAt = Number(localStorage.getItem(`horpal_notif_last_read_${user.id}`) || 0);
    let readIds: string[] = [];
    try { readIds = JSON.parse(localStorage.getItem(`horpal_read_notif_ids_${user.id}`) || '[]'); } catch {}

    const finalCombined = Array.from(dedupedMap.values())
      .filter(n => {
         if (new Date(n.created_at).getTime() <= clearedAt) return false;
         if (clearedIds.includes(n.id)) return false;
         return true;
      })
      .map(n => {
         if (readIds.includes(n.id) || new Date(n.created_at).getTime() <= lastReadAt) {
            return { ...n, is_read: true };
         }
         return n;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50);

    const resolvedCombined = await resolveProfilesAndRooms(finalCombined);

    if (resolvedCombined.length > 0) {
      lastSeenTimestampRef.current = Math.max(lastSeenTimestampRef.current, new Date(resolvedCombined[0].created_at).getTime());
    }

    setNotifications(resolvedCombined);
  }, [user]);

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

    const broadcastChannel = supabase.channel('global-app-notifications')
      .on('broadcast', { event: 'status_posted' }, () => {
         fetchNotifications();
      })
      .on('broadcast', { event: 'live_started' }, () => {
         fetchNotifications();
      })
      .subscribe();

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
            content: status.text_content || status.caption || 'Posted a new status update',
            title: 'New Status',
            is_read: false,
            created_at: status.created_at || new Date().toISOString()
          };

          resolveProfilesAndRooms([notif]).then(resolved => {
            const finalNotif = resolved[0];

            setNotifications(prev => {
              const clearedAt = Number(localStorage.getItem(`horpal_notif_cleared_at_${user.id}`) || 0);
              if (new Date(finalNotif.created_at).getTime() <= clearedAt) return prev;
              const exists = prev.find(n => n.id === finalNotif.id);
              if (exists) return prev;
              return [finalNotif, ...prev].slice(0, 50);
            });

            if (!isMutedRef.current) {
                setBellShake(true);
                setTimeout(() => setBellShake(false), 500);
            }

            triggerNativeNotification('HorPal Alert', finalNotif.title || 'New status update', `status-${status.id}`);
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_streams',
        },
        async (payload) => {
          if (payload.eventType === 'DELETE') return;
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

            setNotifications(prev => {
              const clearedAt = Number(localStorage.getItem(`horpal_notif_cleared_at_${user.id}`) || 0);
              if (new Date(finalNotif.created_at).getTime() <= clearedAt) return prev;
              const exists = prev.find(n => n.id === finalNotif.id);
              if (exists) return prev;
              return [finalNotif, ...prev].slice(0, 50);
            });

            if (!isMutedRef.current) {
                setBellShake(true);
                setTimeout(() => setBellShake(false), 500);
            }

            triggerNativeNotification('HorPal Live Arena', finalNotif.title || 'Someone is live', `live-${stream.id}`);
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

            if (!isMutedRef.current) {
                setBellShake(true);
                setTimeout(() => setBellShake(false), 500);

                // Toast if drawer closed
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
            }

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

                if (!isMutedRef.current) {
                    setBellShake(true);
                    setTimeout(() => setBellShake(false), 500);
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
      supabase.removeChannel(broadcastChannel);
      document.removeEventListener('visibilitychange', handleVisibilityAndFocus);
      window.removeEventListener('focus', handleVisibilityAndFocus);
      clearInterval(intervalId);
    };
  }, [user]);

  const markAsRead = React.useCallback(async (id: string) => {
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
    } else if (id.startsWith('notif-')) {
      const realId = id.replace('notif-', '');
      await supabase.from('notifications').update({ is_read: true }).eq('id', realId);
    }
  }, [user]);

  const markAllAsRead = React.useCallback(async () => {
    const now = Date.now();
    setNotifications((prev) => prev.map(n => ({ ...n, is_read: true })));

    if (user) {
      localStorage.setItem(`horpal_notif_last_read_${user.id}`, now.toString());

      const allIds = notifications.map(n => n.id);
      let readIds: string[] = [];
      try { readIds = JSON.parse(localStorage.getItem(`horpal_read_notif_ids_${user.id}`) || '[]'); } catch {}
      const mergedReadIds = Array.from(new Set([...readIds, ...allIds]));
      localStorage.setItem(`horpal_read_notif_ids_${user.id}`, JSON.stringify(mergedReadIds));

      await Promise.allSettled([
         supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false),
         supabase.from('messages').update({ is_read: true }).eq('receiver_id', user.id).eq('is_read', false)
      ]);
    }
  }, [user, notifications]);

  const clearAllNotifications = React.useCallback(async () => {
    if (!user) return;
    const ids = notifications.map(n => n.id);
    setNotifications([]);

    localStorage.setItem(`horpal_notif_cleared_at_${user.id}`, Date.now().toString());

    let clearedIds: string[] = [];
    try { clearedIds = JSON.parse(localStorage.getItem(`horpal_cleared_notif_ids_${user.id}`) || '[]'); } catch {}
    const mergedClearedIds = Array.from(new Set([...clearedIds, ...ids]));
    localStorage.setItem(`horpal_cleared_notif_ids_${user.id}`, JSON.stringify(mergedClearedIds));

    await supabase.from('notifications').delete().eq('user_id', user.id);
  }, [user, notifications]);

  const unreadCount = React.useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);

  return (
    <NotificationContext.Provider value={{ notifications, markAsRead, markAllAsRead, clearAllNotifications, unreadCount, bellShake, setBellShake, triggerNativeNotification, requestPushPermission, permissionStatus, refreshNotifications: fetchNotifications, isMuted, toggleMute }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useGlobalNotifications() {
  return useContext(NotificationContext);
}
