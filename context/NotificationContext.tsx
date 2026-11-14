'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';
import { isConnectionRequestControlMessage } from '../utils/connectionsStore';

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
  toggleMute: async () => {},
});

const LEGACY_GLOBAL_NOTIFICATION_KEYS = [
  'notifications',
  'horpal_notifications',
  'earnmega_notifications',
  'unread_notifications',
  'global_notifications',
  'notification_cache',
];

function purgeGlobalNotificationKeys() {
  if (typeof window === 'undefined') return;
  try {
    for (const key of LEGACY_GLOBAL_NOTIFICATION_KEYS) {
      localStorage.removeItem(key);
    }
  } catch (_e) {}
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<{
    roomId: string;
    callerName: string;
    callerAvatar: string;
    callType: 'video' | 'audio';
  } | null>(null);
  const ringtoneAudioRef = useRef<HTMLAudioElement | null>(null);
  const [notifications, setNotifications] = useState<GlobalNotification[]>([]);
  const [bellShake, setBellShake] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);
  const chimeAudioRef = useRef<HTMLAudioElement | null>(null);
  const myRoomIdsRef = useRef<Set<string>>(new Set());
  const currentUserIdRef = useRef<string | null>(null);

  const buildLoudChimeWavDataUri = () => {
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

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, numSamples * 2, true);

    let offset = 44;
    for (let i = 0; i < numSamples; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, audioData[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
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

  // Purge any old global notification localStorage keys on mount & auth change
  useEffect(() => {
    purgeGlobalNotificationKeys();
  }, [user?.id]);

  // Manage ringtone
  useEffect(() => {
    if (incomingCall) {
      ringtoneAudioRef.current = new Audio(
        'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
      );
      if (ringtoneAudioRef.current) {
        ringtoneAudioRef.current.loop = true;
        ringtoneAudioRef.current.play().catch((e) => console.error('Audio play error', e));
      }
    } else {
      if (ringtoneAudioRef.current) {
        ringtoneAudioRef.current.pause();
        ringtoneAudioRef.current.currentTime = 0;
      }
    }
  }, [incomingCall]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
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
    if (!user?.id) {
      currentUserIdRef.current = null;
      myRoomIdsRef.current = new Set();
      setNotifications([]);
      return;
    }

    currentUserIdRef.current = user.id;
    const muted =
      localStorage.getItem(`earnmega_notif_muted_${user.id}`) === 'true' ||
      localStorage.getItem(`horpal_notif_muted_${user.id}`) === 'true';
    setIsMuted(muted);
    isMutedRef.current = muted;

    // Load strictly user-scoped cache first if available
    try {
      const cachedRaw = localStorage.getItem(`earnmega_notifications_${user.id}`);
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw);
        if (Array.isArray(parsed)) {
          const validScoped = parsed.filter(
            (n: any) => n && (n.user_id === user.id || n.recipient_id === user.id)
          );
          setNotifications(validScoped);
        }
      } else {
        setNotifications([]);
      }
    } catch (_e) {
      setNotifications([]);
    }
  }, [user?.id]);

  // Persist strictly scoped cache whenever notifications change for the active user
  useEffect(() => {
    if (!user?.id || currentUserIdRef.current !== user.id) return;
    try {
      const strictlyMine = notifications.filter(
        (n) => n.user_id === user.id || n.recipient_id === user.id
      );
      localStorage.setItem(
        `earnmega_notifications_${user.id}`,
        JSON.stringify(strictlyMine.slice(0, 50))
      );
    } catch (_e) {}
  }, [notifications, user?.id]);

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
    } catch (_e) {}
  }, [isMuted, user]);

  const lastSeenTimestampRef = useRef<number>(Date.now());
  const profileCache = useRef<
    Map<string, { username: string; full_name: string; avatar_url: string }>
  >(new Map());
  const roomCache = useRef<Map<string, { name: string; avatar_url: string }>>(new Map());

  const requestPushPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((status) => {
        setPermissionStatus(status);
        if (status === 'granted') {
          triggerNativeNotification(
            'Outside-App Alerts Enabled! ✅',
            'You will now receive alerts even when using other apps.'
          );
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
    if (
      isMutedRef.current ||
      (user && localStorage.getItem(`earnmega_notif_muted_${user.id}`) === 'true')
    )
      return;

    if (chimeAudioRef.current) {
      chimeAudioRef.current.currentTime = 0;
      chimeAudioRef.current.volume = 1.0;
      chimeAudioRef.current.play().catch(() => {});
    }

    if (navigator.vibrate) {
      navigator.vibrate([300, 120, 300]);
    }
  };

  const triggerNativeNotification = async (
    title: string,
    body: string,
    tag?: string,
    iconUrl?: string,
    dataPayload?: any
  ) => {
    if (
      isMutedRef.current ||
      (user && localStorage.getItem(`earnmega_notif_muted_${user.id}`) === 'true')
    )
      return;

    playNotificationChime();

    if ('Notification' in window && Notification.permission === 'granted') {
      const uniqueTag = (tag || 'horpal-alert') + '-' + Date.now();
      try {
        const swReg =
          (await navigator.serviceWorker.getRegistration()) ||
          (await navigator.serviceWorker.register('/sw.js'));
        if (swReg && swReg.active) {
          swReg.active.postMessage({
            type: 'SHOW_NOTIFICATION',
            payload: {
              title,
              body,
              icon: iconUrl || '/favicon.ico',
              badge: '/favicon.ico',
              tag: uniqueTag,
              data: dataPayload || { url: '/' },
            },
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
            data: dataPayload || { url: '/' },
          } as any);
        } else {
          new window.Notification(title, { body, icon: iconUrl || '/favicon.ico', tag: uniqueTag });
        }
      } catch (_e) {
        new window.Notification(title, { body, icon: iconUrl || '/favicon.ico', tag: uniqueTag });
      }
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const cleanNotificationText = (raw: string) => {
    if (!raw) return '';
    let cleaned = raw;
    cleaned = cleaned.replace(/^\[REPLY:[^\]]+\]\s*/i, '');
    cleaned = cleaned.replace(/^\[FORWARDED\]\s*/i, '');
    cleaned = cleaned.replace(/^\[GROUP_CONFIG_JSON\][\s\S]*$/, '');
    cleaned = cleaned.replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
      'User'
    );
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

    return combined.map((notif) => {
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
      const rawText = notif.content || notif.message || '';
      const cleanMessage = cleanNotificationText(rawText);
      let displayContent = cleanMessage;

      if (!cleanMessage) {
        if ((notif as any).image_url || rawText.includes('#image')) {
          displayContent = '📷 Sent a photo';
        } else if ((notif as any).audio_url || rawText.includes('#audio')) {
          displayContent = '🎤 Sent a voice note';
        } else if (rawText.includes('#video')) {
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
      } else if (notif.type === 'LOVE_REQUEST') {
        sourceLabel = '❤️ Love Request';
        title = title || `New Love Request from @${actor_username || senderName}`;
        notif.content = displayContent || `@${actor_username || senderName} sent you a Love request!`;
      } else if (notif.type === 'LOVE_ACCEPTED' || notif.type === 'MATCH_FOUND') {
        sourceLabel = '🎉 Connection Accepted';
        title = title || `@${actor_username || senderName} accepted your Love request!`;
        notif.content = displayContent || `@${actor_username || senderName} accepted your Love request! Tap to chat.`;
      } else if (notif.type === 'GROUP_INVITE') {
        sourceLabel = '👥 Group Invite';
        title = title || 'Added to Group';
        notif.content = displayContent;
      } else if (notif.type === 'chat_gift' || notif.type === 'GIFT') {
        sourceLabel = '🎁 Gift Received';
        title = title || `🎁 @${actor_username || senderName} sent you a gift!`;
        notif.content = displayContent;
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
        sourceLabel,
      };
    });
  };

  const fetchNotifications = React.useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    const currentUserId = user.id;

    // 1. Fetch active groups where the current user is explicitly a member
    const { data: myPartRows } = await supabase
      .from('room_participants')
      .select('room_id, is_deleted')
      .eq('user_id', currentUserId);

    const activeMyRoomIds = Array.from(
      new Set(
        (myPartRows || [])
          .filter((r: any) => r.is_deleted !== true && r.room_id)
          .map((r: any) => String(r.room_id))
      )
    );
    myRoomIdsRef.current = new Set(activeMyRoomIds);

    // 2. Strictly query notifications for THIS user ONLY (supporting both user_id and recipient_id columns)
    const [notifsByUserIdRes, notifsByRecipientIdRes, directMsgsRes, groupMsgsRes] =
      await Promise.allSettled([
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: false })
          .limit(40),
        supabase
          .from('notifications')
          .select('*')
          .eq('recipient_id', currentUserId)
          .order('created_at', { ascending: false })
          .limit(40),
        supabase
          .from('messages')
          .select(
            'id, sender_id, receiver_id, room_id, content, message_type, image_url, audio_url, created_at, is_read'
          )
          .eq('receiver_id', currentUserId)
          .neq('sender_id', currentUserId)
          .order('created_at', { ascending: false })
          .limit(30),
        activeMyRoomIds.length > 0
          ? supabase
              .from('messages')
              .select(
                'id, sender_id, receiver_id, room_id, content, message_type, image_url, audio_url, created_at, is_read'
              )
              .in('room_id', activeMyRoomIds)
              .neq('sender_id', currentUserId)
              .order('created_at', { ascending: false })
              .limit(30)
          : Promise.resolve({ data: [], error: null }),
      ]);

    const notifsByUser =
      notifsByUserIdRes.status === 'fulfilled' && !notifsByUserIdRes.value.error
        ? notifsByUserIdRes.value.data || []
        : [];
    const notifsByRecipient =
      notifsByRecipientIdRes.status === 'fulfilled' && !notifsByRecipientIdRes.value.error
        ? notifsByRecipientIdRes.value.data || []
        : [];

    const directMsgs =
      directMsgsRes.status === 'fulfilled' && !directMsgsRes.value.error
        ? directMsgsRes.value.data || []
        : [];
    const groupMsgs =
      groupMsgsRes.status === 'fulfilled' && !(groupMsgsRes.value as any).error
        ? (groupMsgsRes.value as any).data || []
        : [];

    let combined: GlobalNotification[] = [];

    // Strictly verify every notification row belongs to currentUserId
    const allRawNotifs = [...notifsByUser, ...notifsByRecipient].filter(
      (n: any) =>
        n && (n.user_id === currentUserId || n.recipient_id === currentUserId)
    );

    combined = [
      ...combined,
      ...allRawNotifs.map((n: any) => ({
        ...n,
        user_id: currentUserId,
        recipient_id: currentUserId,
        actor_id: n.actor_id || n.sender_id || null,
        content: n.content || n.message || '',
        message: n.message || n.content || '',
        is_read: Boolean(n.is_read ?? n.read ?? false),
        type: n.type || 'SYSTEM_ALERT',
        id: `notif-${n.id}`,
      })),
    ];

    // Strictly verify every message belongs to currentUserId (direct DM or member group)
    // and exclude connection request control rows
    const validMsgs = [...directMsgs, ...groupMsgs].filter((m: any) => {
      if (!m || m.sender_id === currentUserId) return false;
      if (isConnectionRequestControlMessage(m.content, m.message_type)) return false;
      const isDirectToMe = m.receiver_id === currentUserId && !m.room_id;
      const isInMyGroup = m.room_id && myRoomIdsRef.current.has(String(m.room_id));
      return isDirectToMe || isInMyGroup;
    });

    const msgsAsNotifs: GlobalNotification[] = validMsgs.map(
      (m: any) =>
        ({
          id: `msg-${m.id}`,
          user_id: currentUserId,
          recipient_id: currentUserId,
          actor_id: m.sender_id,
          room_id: m.room_id,
          type: 'MESSAGE',
          content: m.content || '',
          image_url: m.image_url,
          audio_url: m.audio_url,
          is_read: Boolean(m.is_read),
          created_at: m.created_at,
        } as any)
    );
    combined = [...combined, ...msgsAsNotifs];

    // Filter internal system config messages
    combined = combined.filter((n) => {
      const text = (n.content || n.message || '').toLowerCase();
      if (text.includes('[group_config_json]')) return false;
      if (text.includes('[connection_request:')) return false;
      if (text.includes('updated group settings:')) return false;
      if (text.includes('only admins can')) return false;
      if (text.includes('changed the group icon')) return false;
      return true;
    });

    const dedupedMap = new Map<string, GlobalNotification>();
    for (const c of combined) {
      if (!dedupedMap.has(c.id)) dedupedMap.set(c.id, c);
    }

    const clearedAt = Number(
      localStorage.getItem(`earnmega_notif_cleared_at_${currentUserId}`) ||
        localStorage.getItem(`horpal_notif_cleared_at_${currentUserId}`) ||
        0
    );
    let clearedIds: string[] = [];
    try {
      clearedIds = JSON.parse(
        localStorage.getItem(`earnmega_cleared_notif_ids_${currentUserId}`) ||
          localStorage.getItem(`horpal_cleared_notif_ids_${currentUserId}`) ||
          '[]'
      );
    } catch {}

    const lastReadAt = Number(
      localStorage.getItem(`earnmega_notif_last_read_${currentUserId}`) ||
        localStorage.getItem(`horpal_notif_last_read_${currentUserId}`) ||
        0
    );
    let readIds: string[] = [];
    try {
      readIds = JSON.parse(
        localStorage.getItem(`earnmega_read_notif_ids_${currentUserId}`) ||
          localStorage.getItem(`horpal_read_notif_ids_${currentUserId}`) ||
          '[]'
      );
    } catch {}

    const finalCombined = Array.from(dedupedMap.values())
      .filter((n) => {
        if (n.user_id !== currentUserId && n.recipient_id !== currentUserId) return false;
        if (new Date(n.created_at).getTime() <= clearedAt) return false;
        if (clearedIds.includes(n.id)) return false;
        return true;
      })
      .map((n) => {
        if (readIds.includes(n.id) || new Date(n.created_at).getTime() <= lastReadAt) {
          return { ...n, is_read: true };
        }
        return n;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50);

    const resolvedCombined = await resolveProfilesAndRooms(finalCombined);

    // Ensure user did not switch while awaiting
    if (currentUserIdRef.current !== currentUserId) return;

    if (resolvedCombined.length > 0) {
      lastSeenTimestampRef.current = Math.max(
        lastSeenTimestampRef.current,
        new Date(resolvedCombined[0].created_at).getTime()
      );
    }

    setNotifications(resolvedCombined);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    const currentUserId = user.id;
    fetchNotifications();

    const handleVisibilityAndFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityAndFocus);
    window.addEventListener('focus', handleVisibilityAndFocus);

    const handleIncomingNotificationRow = (rawRow: any) => {
      if (!rawRow) return;
      // Strict per-user check: verify payload.new.user_id === currentUser.id or recipient_id === currentUser.id
      const rowUserId = rawRow.user_id || rawRow.recipient_id;
      if (rowUserId !== currentUserId) return;

      const normalized: GlobalNotification = {
        ...rawRow,
        id: String(rawRow.id).startsWith('notif-') ? String(rawRow.id) : `notif-${rawRow.id}`,
        user_id: currentUserId,
        recipient_id: currentUserId,
        actor_id: rawRow.actor_id || rawRow.sender_id || null,
        type: rawRow.type || 'SYSTEM_ALERT',
        content: rawRow.content || rawRow.message || '',
        message: rawRow.message || rawRow.content || '',
        is_read: Boolean(rawRow.is_read ?? rawRow.read ?? false),
        created_at: rawRow.created_at || new Date().toISOString(),
      };

      resolveProfilesAndRooms([normalized]).then((resolved) => {
        if (currentUserIdRef.current !== currentUserId) return;
        const finalNewNotification = resolved[0];
        setNotifications((prev) => {
          const clearedAt = Number(
            localStorage.getItem(`earnmega_notif_cleared_at_${currentUserId}`) || 0
          );
          let clearedIds: string[] = [];
          try {
            clearedIds = JSON.parse(
              localStorage.getItem(`earnmega_cleared_notif_ids_${currentUserId}`) || '[]'
            );
          } catch {}

          if (
            new Date(finalNewNotification.created_at).getTime() <= clearedAt ||
            clearedIds.includes(finalNewNotification.id)
          )
            return prev;

          const exists = prev.find((n) => n.id === finalNewNotification.id);
          if (exists) return prev;
          return [finalNewNotification, ...prev].slice(0, 50);
        });

        if (!isMutedRef.current) {
          setBellShake(true);
          setTimeout(() => setBellShake(false), 500);
        }

        if (
          finalNewNotification.type === 'chat_gift' ||
          finalNewNotification.type === 'GIFT'
        ) {
          const meta = (rawRow as any)?.metadata || {};
          let giftName = meta.gift_name || '';
          let giftCost = Number(meta.gift_cost) || 0;
          let giftId = meta.gift_id || '';
          let messageId = meta.message_id || rawRow.id;
          const senderHandle =
            finalNewNotification.actor_username ||
            finalNewNotification.actor_name ||
            meta.sender_name ||
            'Someone';

          if (!giftName && finalNewNotification.content) {
            if (finalNewNotification.content.includes('|')) {
              const parts = finalNewNotification.content.split('|');
              giftName = parts[0] || 'Gift';
              giftCost = parseInt(parts[1], 10) || 10;
            } else {
              const match = finalNewNotification.content.match(/sent you a (.+?) \(\+?(\d+) Coins\)/i);
              if (match) {
                giftName = match[1];
                giftCost = parseInt(match[2], 10) || 10;
              }
            }
          }

          if (giftName) {
            window.dispatchEvent(
              new CustomEvent('gift_received_local', {
                detail: {
                  giftData: { id: giftId, name: giftName, cost: giftCost || 10, messageId },
                  senderId: finalNewNotification.actor_id || meta.sender_id || '',
                  receiverId: currentUserId,
                },
              })
            );
          }

          const bannerText = giftName
            ? `🎁 @${senderHandle} sent you a ${giftName} (+${giftCost} Coins)!`
            : finalNewNotification.content ||
              finalNewNotification.message ||
              `🎁 @${senderHandle} sent you a gift!`;

          // In-App Notification Banner
          import('react-hot-toast').then(({ toast }) => {
            toast.success(bannerText, {
              id: `gift-banner-${messageId}`,
              duration: 5500,
              style: {
                background: '#0f172a',
                color: '#fef08a',
                border: '1px solid rgba(251,191,36,0.5)',
                fontWeight: '800',
              },
            });
          });

          // Outside-the-App OS Push Notification via public/sw.js + Sound
          const tag = `horpal-gift-${messageId}`;
          triggerNativeNotification(
            bannerText,
            `+${giftCost || ''} Coins added to your wallet balance! Tap to view in DM.`,
            tag,
            finalNewNotification.actor_avatar_url,
            { url: '/?tab=chats', type: 'chat_gift' }
          );
        }
      });
    };

    let channel: any = null;
    try {
      const uniqueChannel = `scoped-notifications-${currentUserId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(uniqueChannel)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${currentUserId}`,
          },
          (payload) => {
            const row = payload.new as any;
            if (!row || (row.user_id !== currentUserId && row.recipient_id !== currentUserId)) return;
            handleIncomingNotificationRow(row);
          }
        )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${currentUserId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (!row || (row.recipient_id !== currentUserId && row.user_id !== currentUserId)) return;
          handleIncomingNotificationRow(row);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          if (!updated || (updated.user_id !== currentUserId && updated.recipient_id !== currentUserId))
            return;
          if (updated.is_read || updated.read) {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === `notif-${updated.id}` || n.id === updated.id
                  ? { ...n, is_read: true }
                  : n
              )
            );
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
          if (!msg || msg.sender_id === currentUserId) return;
          if (isConnectionRequestControlMessage(msg.content, msg.message_type)) return;
          if (msg.content && msg.content.startsWith('[GROUP_CONFIG_JSON]')) return;
          if (msg.content && msg.content.toLowerCase().includes('updated group settings:')) return;
          if (msg.content && msg.content.toLowerCase().includes('changed the group icon')) return;

          const isDirectToMe = msg.receiver_id === currentUserId && !msg.room_id;
          const isInMyGroup = msg.room_id && myRoomIdsRef.current.has(String(msg.room_id));

          if (isDirectToMe || isInMyGroup) {
            const giftMatch =
              typeof msg.content === 'string'
                ? msg.content.match(/^\[GIFT:(.*?):(.*?):(\d+)\](.*)/)
                : null;
            const cleanedContent = giftMatch
              ? `🎁 Sent you a ${giftMatch[2]} (+${giftMatch[3]} Coins)!`
              : msg.content
              ? cleanNotificationText(msg.content)
              : 'Sent you a media attachment';
            const msgNotif: GlobalNotification = {
              id: `msg-${msg.id}`,
              user_id: currentUserId,
              recipient_id: currentUserId,
              actor_id: msg.sender_id,
              room_id: msg.room_id,
              type: giftMatch ? 'chat_gift' : 'MESSAGE',
              content: cleanedContent,
              is_read: false,
              created_at: msg.created_at || new Date().toISOString(),
            };

            resolveProfilesAndRooms([msgNotif]).then((resolved) => {
              if (currentUserIdRef.current !== currentUserId) return;
              const finalMsgNotif = resolved[0];

              if (giftMatch && isDirectToMe) {
                const giftId = giftMatch[1];
                const giftName = giftMatch[2];
                const giftCost = Number(giftMatch[3]) || 10;
                const senderHandle =
                  finalMsgNotif.actor_username || finalMsgNotif.actor_name || 'Someone';
                const bannerText = `🎁 @${senderHandle} sent you a ${giftName} (+${giftCost} Coins)!`;

                window.dispatchEvent(
                  new CustomEvent('gift_received_local', {
                    detail: {
                      giftData: { id: giftId, name: giftName, cost: giftCost, messageId: msg.id },
                      senderId: msg.sender_id,
                      receiverId: currentUserId,
                    },
                  })
                );

                import('react-hot-toast').then(({ toast }) => {
                  toast.success(bannerText, {
                    id: `gift-banner-${msg.id}`,
                    duration: 5500,
                    style: {
                      background: '#0f172a',
                      color: '#fef08a',
                      border: '1px solid rgba(251,191,36,0.5)',
                      fontWeight: '800',
                    },
                  });
                });

                triggerNativeNotification(
                  bannerText,
                  `+${giftCost} Coins added to your wallet balance! Tap to view in DM.`,
                  `horpal-gift-${msg.id}`,
                  finalMsgNotif.actor_avatar_url,
                  { url: '/?tab=chats', type: 'chat_gift' }
                );
              }
              setNotifications((prev) => {
                const clearedAt = Number(
                  localStorage.getItem(`earnmega_notif_cleared_at_${currentUserId}`) || 0
                );
                let clearedIds: string[] = [];
                try {
                  clearedIds = JSON.parse(
                    localStorage.getItem(`earnmega_cleared_notif_ids_${currentUserId}`) || '[]'
                  );
                } catch {}

                if (
                  new Date(finalMsgNotif.created_at).getTime() <= clearedAt ||
                  clearedIds.includes(finalMsgNotif.id)
                )
                  return prev;

                const exists = prev.find((n) => n.id === finalMsgNotif.id);
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
    } catch (err) {
      console.warn('Realtime fallback to polling:', err);
    }

    let inboxBroadcastChannel: any = null;
    try {
      const inboxChannelName =
        'user_inbox_notifs_' + currentUserId + '_' + Math.random().toString(36).substring(2, 9);
      inboxBroadcastChannel = supabase
        .channel(inboxChannelName)
        .on('broadcast', { event: 'scoped_notification' }, (payload) => {
          const data = payload?.payload;
          if (!data) return;
          if (data.user_id !== currentUserId && data.recipient_id !== currentUserId) return;
          handleIncomingNotificationRow(data);
        })
        .subscribe();
    } catch (err) {
      console.warn('Realtime fallback to polling:', err);
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (inboxBroadcastChannel) supabase.removeChannel(inboxBroadcastChannel);
      document.removeEventListener('visibilitychange', handleVisibilityAndFocus);
      window.removeEventListener('focus', handleVisibilityAndFocus);
    };
  }, [user?.id, fetchNotifications]);

  const markAsRead = React.useCallback(
    async (id: string) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      if (user?.id) {
        let readIds: string[] = [];
        try {
          readIds = JSON.parse(
            localStorage.getItem(`earnmega_read_notif_ids_${user.id}`) || '[]'
          );
        } catch {}
        if (!readIds.includes(id)) {
          readIds.push(id);
          localStorage.setItem(`earnmega_read_notif_ids_${user.id}`, JSON.stringify(readIds));
        }
      }

      if (id.startsWith('msg-')) {
        const realId = id.replace('msg-', '');
        await supabase.from('messages').update({ is_read: true }).eq('id', realId);
      } else if (id.startsWith('notif-')) {
        const realId = id.replace('notif-', '');
        await Promise.allSettled([
          supabase.from('notifications').update({ is_read: true }).eq('id', realId),
          supabase.from('notifications').update({ read: true }).eq('id', realId),
        ]);
      }
    },
    [user?.id]
  );

  const markAllAsRead = React.useCallback(async () => {
    const now = Date.now();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    if (user?.id) {
      localStorage.setItem(`earnmega_notif_last_read_${user.id}`, now.toString());

      const allIds = notifications.map((n) => n.id);
      let readIds: string[] = [];
      try {
        readIds = JSON.parse(
          localStorage.getItem(`earnmega_read_notif_ids_${user.id}`) || '[]'
        );
      } catch {}
      const mergedReadIds = Array.from(new Set([...readIds, ...allIds]));
      localStorage.setItem(
        `earnmega_read_notif_ids_${user.id}`,
        JSON.stringify(mergedReadIds)
      );

      await Promise.allSettled([
        supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('is_read', false),
        supabase
          .from('notifications')
          .update({ read: true })
          .eq('recipient_id', user.id)
          .eq('read', false),
        supabase
          .from('messages')
          .update({ is_read: true })
          .eq('receiver_id', user.id)
          .eq('is_read', false),
      ]);
    }
  }, [user?.id, notifications]);

  const clearAllNotifications = React.useCallback(async () => {
    if (!user?.id) return;
    const ids = notifications.map((n) => n.id);
    setNotifications([]);

    localStorage.setItem(`earnmega_notif_cleared_at_${user.id}`, Date.now().toString());
    localStorage.removeItem(`earnmega_notifications_${user.id}`);

    let clearedIds: string[] = [];
    try {
      clearedIds = JSON.parse(
        localStorage.getItem(`earnmega_cleared_notif_ids_${user.id}`) || '[]'
      );
    } catch {}
    const mergedClearedIds = Array.from(new Set([...clearedIds, ...ids]));
    localStorage.setItem(
      `earnmega_cleared_notif_ids_${user.id}`,
      JSON.stringify(mergedClearedIds)
    );

    await Promise.allSettled([
      supabase.from('notifications').delete().eq('user_id', user.id),
      supabase.from('notifications').delete().eq('recipient_id', user.id),
    ]);
  }, [user?.id, notifications]);

  const unreadCount = React.useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        markAsRead,
        markAllAsRead,
        clearAllNotifications,
        unreadCount,
        bellShake,
        setBellShake,
        triggerNativeNotification,
        requestPushPermission,
        permissionStatus,
        refreshNotifications: fetchNotifications,
        isMuted,
        toggleMute,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useGlobalNotifications() {
  return useContext(NotificationContext);
}
