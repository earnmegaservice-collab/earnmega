'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { Phone, Video, X, Check } from 'lucide-react';
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
  const [incomingCall, setIncomingCall] = useState<{roomId: string, callerName: string, callerAvatar: string, callType: 'video' | 'audio'} | null>(null);
  const ringtoneAudioRef = useRef<HTMLAudioElement | null>(null);
  const [notifications, setNotifications] = useState<GlobalNotification[]>([]);
  const [bellShake, setBellShake] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);
  const chimeAudioRef = useRef<HTMLAudioElement | null>(null);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  const buildLoudChimeWavDataUri = () => {
    // Generate a valid 44.1kHz 16-bit mono PCM WAV Data URI
    // lasting 0.6 seconds with a crisp two-tone chime
    // (784Hz for 0.0s-0.18s followed by 1174.66Hz for 0.18s-0.58s at 0.85 amplitude with smooth exponential decay).
    const sampleRate = 44100;
    const duration = 0.6;
    const numSamples = Math.floor(sampleRate * duration);
    const audioData = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let val = 0;
      if (t < 0.18) {
        val = 0.85 * Math.sin(2 * Math.PI * 784 * t) * Math.exp(-t * 15);
      } else {
        val = 0.85 * Math.sin(2 * Math.PI * 1174.66 * (t - 0.18)) * Math.exp(-(t - 0.18) * 10);
      }
      audioData[i] = val;
    }

    const wavBuffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(wavBuffer);

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);

    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, numSamples * 2, true);

    // Write audio data
    let offset = 44;
    for (let i = 0; i < numSamples; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, audioData[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    let binary = '';
    const bytes = new Uint8Array(wavBuffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return 'data:audio/wav;base64,' + btoa(binary);
  };

  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }


  // Manage ringtone
  useEffect(() => {
    if (incomingCall) {
       ringtoneAudioRef.current = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='); // A valid loopable tone should be here ideally
       if (ringtoneAudioRef.current) {
          ringtoneAudioRef.current.loop = true;
          ringtoneAudioRef.current.play().catch(e => console.error("Audio play error", e));
       }
    } else {
       if (ringtoneAudioRef.current) {
          ringtoneAudioRef.current.pause();
          ringtoneAudioRef.current.currentTime = 0;
       }
    }
  }, [incomingCall]);

  useEffect(() => {
    // Listen to messages from the Service Worker (Block 1)
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'ACCEPT_CALL_FROM_OS') {
        const { roomId, callType } = event.data.data;
        setIncomingCall(null);
        window.dispatchEvent(new CustomEvent('horpal:join-call', { detail: { roomId, callType } }));
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

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
    if (typeof window !== 'undefined' && !chimeAudioRef.current) {
      chimeAudioRef.current = new Audio(buildLoudChimeWavDataUri());
      chimeAudioRef.current.volume = 1.0;
    }
  }, []);

  const playNotificationChime = () => {
    if (isMutedRef.current || (user && localStorage.getItem(`horpal_notif_muted_${user.id}`) === 'true')) return;

    if (chimeAudioRef.current) {
      chimeAudioRef.current.currentTime = 0;
      chimeAudioRef.current.volume = 1.0;
      chimeAudioRef.current.play().catch(() => {});
    }

    if (navigator.vibrate) {
      navigator.vibrate([300, 120, 300]);
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
    } catch(e) {}
  };

  // Helper for outside-app OS notifications
  const triggerNativeNotification = async (title: string, body: string, tag?: string, iconUrl?: string, dataPayload?: any) => {
    // Check if muted via localStorage
    if (isMutedRef.current || (user && localStorage.getItem(`horpal_notif_muted_${user.id}`) === 'true')) return;

    playNotificationChime();

    if ('Notification' in window && Notification.permission === 'granted') {
      const uniqueTag = (tag || 'horpal-alert') + '-' + Date.now();
      try {
        const swReg = await navigator.serviceWorker.getRegistration() || await navigator.serviceWorker.register('/sw.js');
        if (swReg && swReg.active) {
          swReg.active.postMessage({
            type: 'SHOW_NOTIFICATION',
            payload: {
              title,
              body,
              icon: iconUrl || '/favicon.ico',
              badge: '/favicon.ico',
              tag: uniqueTag,
              data: dataPayload || { url: '/' }
            }
          });
        } else if (swReg) {
          await swReg.showNotification(title, {
            body,
            icon: iconUrl || '/favicon.ico',
            badge: '/favicon.ico',
            tag: uniqueTag,
            renotify: true,
            silent: false,
            requireInteraction: true,
            vibrate: [300, 120, 300, 120, 400],
            data: dataPayload || { url: '/' }
          } as any);
        } else {
          new window.Notification(title, { body, icon: iconUrl || '/favicon.ico', tag: uniqueTag });
        }
      } catch (e) {
        new window.Notification(title, { body, icon: iconUrl || '/favicon.ico', tag: uniqueTag });
      }
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

      if (chimeAudioRef.current) {
        chimeAudioRef.current.muted = true;
        chimeAudioRef.current.play().then(() => {
          chimeAudioRef.current!.pause();
          chimeAudioRef.current!.currentTime = 0;
          chimeAudioRef.current!.muted = false;
        }).catch(() => {});
      }

      document.removeEventListener('click', requestPerm);
      document.removeEventListener('pointerdown', requestPerm);
      document.removeEventListener('touchstart', requestPerm);
    };
    if (typeof document !== 'undefined') {
       document.addEventListener('click', requestPerm);
       document.addEventListener('pointerdown', requestPerm);
       document.addEventListener('touchstart', requestPerm);
    }
    return () => {
      if (typeof document !== 'undefined') {
         document.removeEventListener('click', requestPerm);
         document.removeEventListener('pointerdown', requestPerm);
         document.removeEventListener('touchstart', requestPerm);
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

    if (user) {
      const storedAlertedIds = localStorage.getItem('horpal_alerted_status_live_' + user.id);
      if (storedAlertedIds) {
        try {
          notifiedIdsRef.current = new Set(JSON.parse(storedAlertedIds));
        } catch(e) {}
      }
    }

    // Background polling worker
    const workerBlob = new Blob(["setInterval(() => postMessage('tick'), 7000);"], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(workerBlob));

    const checkAlerts = async () => {
      if (!user) return;
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

      const { data: statuses } = await supabase
        .from('statuses')
        .select('*')
        .neq('user_id', user.id)
        .gte('created_at', fifteenMinsAgo)
        .order('created_at', { ascending: false })
        .limit(5);

      if (statuses) {
        for (const status of statuses) {
          const idKey = 'status-' + status.id;
          if (!notifiedIdsRef.current.has(idKey)) {
            notifiedIdsRef.current.add(idKey);
            localStorage.setItem('horpal_alerted_status_live_' + user.id, JSON.stringify(Array.from(notifiedIdsRef.current)));

            const { data: profile } = await supabase.from('profiles').select('full_name, username, avatar_url').eq('id', status.user_id).single();
            const posterName = profile?.full_name || profile?.username || 'Someone';
            const posterAvatar = profile?.avatar_url || undefined;

            const notif: GlobalNotification = {
              id: idKey,
              user_id: user.id,
              actor_id: status.user_id,
              type: 'STATUS_POSTED',
              content: status.text_content || status.caption || 'Tap to view their new status update on HorPal',
              title: `${posterName} updated their status`,
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
              triggerNativeNotification(posterName + ' updated their status', status.text_content || status.caption || 'Tap to view their new status update on HorPal', 'horpal-status-' + status.id, posterAvatar, { url: '/', type: 'STATUS_POSTED' });
            });
          }
        }
      }

      const { data: streams } = await supabase
        .from('live_streams')
        .select('*')
        .neq('host_id', user.id)
        .gte('created_at', fifteenMinsAgo)
        .order('created_at', { ascending: false })
        .limit(5);

      if (streams) {
        for (const stream of streams) {
          if (stream.status === 'ended') continue;
          const idKey = 'live-' + stream.id;
          if (!notifiedIdsRef.current.has(idKey)) {
            notifiedIdsRef.current.add(idKey);
            localStorage.setItem('horpal_alerted_status_live_' + user.id, JSON.stringify(Array.from(notifiedIdsRef.current)));

            const { data: profile } = await supabase.from('profiles').select('full_name, username, avatar_url').eq('id', stream.host_id).single();
            const hostName = profile?.full_name || profile?.username || 'Someone';
            const hostAvatar = profile?.avatar_url || undefined;

            const notif: GlobalNotification = {
              id: idKey,
              user_id: user.id,
              actor_id: stream.host_id,
              type: 'LIVE_STARTED',
              content: stream.title || 'Tap to join the live stream now',
              title: `${hostName} is Live on HorPal!`,
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
              triggerNativeNotification(hostName + ' is Live on HorPal!', stream.title || 'Tap to join the live stream now', 'horpal-live-' + stream.id, hostAvatar, { url: '/', type: 'LIVE_STARTED' });
            });
          }
        }
      }
    };

    worker.onmessage = (e) => {
      if (e.data === 'tick') {
        checkAlerts();
      }
    };

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

            // Native outside-app alert for DM Gifts
            if (finalNewNotification.type === 'chat_gift' || finalNewNotification.type === 'GIFT') {
                const title = finalNewNotification.title || `🎁 New Gift!`;
                const body = finalNewNotification.content || finalNewNotification.message || `You received a gift in DM!`;
                const tag = `horpal-gift-${finalNewNotification.id}`;
                triggerNativeNotification(title, body, tag, finalNewNotification.actor_avatar_url, { url: '/', type: 'chat_gift' });
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
      worker.terminate();
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


  useEffect(() => {
    if (!user) return;
    const callsChannel = supabase.channel('public:calls')
      .on(
        'broadcast',
        { event: 'INCOMING_CALL' },
        (payload) => {
          if (payload.payload.receiverId === user.id) {
             setIncomingCall(payload.payload);
          }
        }
      )
      .on(
        'broadcast',
        { event: 'CALL_REJECTED' },
        (payload) => {
          setIncomingCall(prev => {
              if (prev && payload.payload.roomId === prev.roomId) return null;
              return prev;
          });
        }
      )
      .subscribe();

    return () => {
       supabase.removeChannel(callsChannel);
    };
  }, [user]);

  const unreadCount = React.useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);

  return (
    <NotificationContext.Provider value={{ notifications, markAsRead, markAllAsRead, clearAllNotifications, unreadCount, bellShake, setBellShake, triggerNativeNotification, requestPushPermission, permissionStatus, refreshNotifications: fetchNotifications, isMuted, toggleMute }}>
      {children}
      {incomingCall && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#1a1a24] rounded-3xl p-6 w-full max-w-sm flex flex-col items-center shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
             {incomingCall.callerAvatar ? (
                <img src={incomingCall.callerAvatar} alt={incomingCall.callerName} className="w-24 h-24 rounded-full mb-4 object-cover border-4 border-emerald-500/30 animate-pulse" />
             ) : (
                <div className="w-24 h-24 rounded-full mb-4 bg-emerald-500/20 flex items-center justify-center border-4 border-emerald-500/30 animate-pulse">
                   <Phone className="w-10 h-10 text-emerald-400" />
                </div>
             )}
             <h2 className="text-2xl font-bold text-white mb-1">{incomingCall.callerName}</h2>
             <p className="text-gray-400 mb-8">Incoming {incomingCall.callType === 'video' ? 'Video' : 'Voice'} Call...</p>
             <div className="flex w-full justify-between gap-4">
                <button
                  onClick={() => {
                     supabase.channel('public:calls').send({
                        type: 'broadcast',
                        event: 'CALL_REJECTED',
                        payload: { roomId: incomingCall.roomId }
                     });
                     setIncomingCall(null);
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors"
                >
                  <X className="w-5 h-5" /> Decline
                </button>
                <button
                  onClick={() => {
                     const callDetail = incomingCall;
                     setIncomingCall(null);
                     window.dispatchEvent(new CustomEvent('horpal:join-call', { detail: callDetail }));
                  }}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors"
                >
                  {incomingCall.callType === 'video' ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />} Accept
                </button>
             </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useGlobalNotifications() {
  return useContext(NotificationContext);
}
