'use client';

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import {
  LiveKitRoom,
  VideoTrack,
  RoomAudioRenderer,
  useTracks,
  useLocalParticipant,
  useParticipants,
  useRoomContext
} from '@livekit/components-react';
import { Track, RoomEvent } from 'livekit-client';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  Video,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  RefreshCw,
  Sparkles,
  X,
  Search,
  Flame,
  Music,
  MessageSquare,
  Gamepad2,
  Diamond,
  Heart,
  Gift,
  Share2,
  Send,
  Users,
  Crown,
  Trophy,
  Plus,
  Check,
  Radio,
  Coins,
  Zap,
  Clock
} from 'lucide-react';
import LiveGiftOverlay from './LiveGiftOverlay';
import { supabase } from '../../utils/supabase';

// ============================================================================
// TYPES & FIXED LUXURY GIFT CATALOG
// ============================================================================
type ArenaStage = 'lobby' | 'setup' | 'countdown' | 'live' | 'ended';
type UserRole = 'host' | 'viewer';

export interface GiftTierItem {
  id: string;
  name: string;
  icon: string;
  coins: number;
  tier: 'standard' | 'kinetic' | 'rocket' | 'universe';
  accent: string;
  tagline: string;
}

export const LUXURY_GIFT_CATALOG: GiftTierItem[] = [
  {
    id: 'rose_1',
    name: 'The Rose',
    icon: '🌹',
    coins: 1,
    tier: 'standard',
    accent: 'from-rose-500/30 to-pink-600/30 border-rose-400/40',
    tagline: 'Glass Holograph'
  },
  {
    id: 'neon_heart_10',
    name: 'The Neon Heart',
    icon: '💖',
    coins: 10,
    tier: 'standard',
    accent: 'from-fuchsia-500/30 to-purple-600/30 border-fuchsia-400/40',
    tagline: 'Pulse Glow'
  },
  {
    id: 'diamond_50',
    name: 'The Diamond',
    icon: '💎',
    coins: 50,
    tier: 'kinetic',
    accent: 'from-cyan-400/30 to-blue-600/30 border-cyan-300/60',
    tagline: 'Kinetic Shockwave'
  },
  {
    id: 'rocket_500',
    name: 'The Rocket',
    icon: '🚀',
    coins: 500,
    tier: 'rocket',
    accent: 'from-orange-500/30 to-amber-500/30 border-amber-400/60',
    tagline: 'Screen Shake + Trail'
  },
  {
    id: 'universe_5000',
    name: 'The EarnMega Universe',
    icon: '🌌',
    coins: 5000,
    tier: 'universe',
    accent: 'from-amber-400/40 via-yellow-500/30 to-purple-700/40 border-amber-300',
    tagline: 'Full-Screen Takeover'
  }
];

interface LiveGiftEvent {
  id: string;
  stream_id: string;
  sender_id: string;
  sender_username: string;
  sender_avatar?: string;
  gift_id: string;
  gift_name: string;
  gift_icon: string;
  coin_value: number;
  combo_count: number;
}

interface LiveStreamRecord {
  id: string;
  host_id: string;
  host_username: string;
  host_avatar: string;
  title: string;
  category: string;
  gift_goal_target: number;
  gift_goal_current: number;
  total_coins_earned: number;
  viewer_count: number;
  allow_cohost: boolean;
  status: 'active' | 'live' | 'ended';
  room_id?: string;
  livekit_room_name?: string;
  is_live?: boolean;
  started_at?: string;
  created_at?: string;
}

interface LiveComment {
  id: string;
  username: string;
  avatar_url?: string;
  content: string;
  is_system?: boolean;
  badge_level?: number;
}

interface FloatingHeart {
  id: number;
  xOffset: number;
  color: string;
}

interface LiveArenaProps {
  currentUser?: {
    id: string;
    username: string;
    avatar_url: string;
    coin_balance: number;
  };
  onClose?: () => void;
  onBack?: () => void;
}

const CATEGORIES = [
  { id: 'All', label: 'All', icon: null },
  { id: 'Just Chatting', label: 'Just Chatting', icon: Flame },
  { id: 'Music & Talent', label: 'Music & Talent', icon: Music },
  { id: 'VIP Lounge', label: 'VIP Lounge', icon: Diamond },
  { id: 'Talk & Debate', label: 'Talk & Debate', icon: MessageSquare },
  { id: 'Gaming', label: 'Gaming', icon: Gamepad2 }
];

// ============================================================================
// INNER LIVEKIT CONTROLLER FOR HOST (HARDWARE FAULT-TOLERANT)
// ============================================================================
export interface HostPublisherRef {
  broadcastEnd: (duration: string, peakViewers: number) => Promise<void>;
}

const HostLiveKitController = forwardRef<
  HostPublisherRef,
  {
    isMicMuted: boolean;
    isCamOff: boolean;
    facingMode: 'user' | 'environment';
  }
>(({ isMicMuted, isCamOff, facingMode }, ref) => {
  const { localParticipant } = useLocalParticipant();

  useImperativeHandle(ref, () => ({
    broadcastEnd: async (duration: string, peakViewers: number) => {
      if (localParticipant) {
        try {
          const payload = new TextEncoder().encode(
            JSON.stringify({ type: 'HOST_ENDED_LIVE', duration, peakViewers })
          );
          await localParticipant.publishData(payload, { reliable: true });
        } catch (err) {
          console.warn('Failed to publish end packet:', err);
        }
      }
    }
  }));

  // Enable Camera and Microphone independently so a mic conflict (e.g. screen recorder) never blocks video
  useEffect(() => {
    if (!localParticipant) return;
    let isCancelled = false;

    const syncTracks = async () => {
      try {
        await localParticipant.setCameraEnabled(!isCamOff, {
          facingMode,
          resolution: { width: 1280, height: 720, frameRate: 30 }
        });
      } catch (camErr) {
        if (!isCancelled) console.warn('Host camera enable warning:', camErr);
      }

      try {
        await localParticipant.setMicrophoneEnabled(!isMicMuted);
      } catch (micErr) {
        if (!isCancelled) console.warn('Host mic warning (continuing with video):', micErr);
      }
    };

    syncTracks();
    return () => {
      isCancelled = true;
    };
  }, [localParticipant, isCamOff, isMicMuted, facingMode]);

  return null;
});
HostLiveKitController.displayName = 'HostLiveKitController';

// ============================================================================
// VIEWER DATA & HOST DISCONNECT LISTENER
// ============================================================================
function ViewerDataListener({
  onHostEnded,
  hostId,
  hostUsername
}: {
  onHostEnded: (duration?: string, peak?: number) => void;
  hostId?: string;
  hostUsername?: string;
}) {
  const room = useRoomContext();

  useEffect(() => {
    if (!room) return;

    const handleData = (payload: Uint8Array) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === 'HOST_ENDED_LIVE') {
          onHostEnded(data.duration, data.peakViewers);
        }
      } catch {}
    };

    const handleParticipantDisconnected = (participant: any) => {
      if (
        (hostId && participant.identity === hostId) ||
        (hostUsername && participant.identity === hostUsername) ||
        (hostId && participant.identity?.includes(hostId))
      ) {
        onHostEnded();
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

    return () => {
      room.off(RoomEvent.DataReceived, handleData);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    };
  }, [room, onHostEnded, hostId, hostUsername]);

  return null;
}

// ============================================================================
// LIVEKIT VIDEO STAGE (NO ROGUE TIMEOUTS)
// ============================================================================
function LiveKitVideoStage({
  role,
  beautyMode,
  fallbackLocalStream
}: {
  role: UserRole;
  beautyMode: boolean;
  fallbackLocalStream: MediaStream | null;
}) {
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const fallbackVideoRef = useRef<HTMLVideoElement | null>(null);

  const localTrack = tracks.find(
    (t) => t.participant.isLocal && t.publication?.track
  );
  const remoteTrack = tracks.find(
    (t) => !t.participant.isLocal && t.publication?.track
  );

  useEffect(() => {
    if (role === 'host' && !localTrack && fallbackVideoRef.current && fallbackLocalStream) {
      if (fallbackVideoRef.current.srcObject !== fallbackLocalStream) {
        fallbackVideoRef.current.srcObject = fallbackLocalStream;
        fallbackVideoRef.current.play().catch(() => {});
      }
    }
  }, [role, localTrack, fallbackLocalStream]);

  return (
    <div className="relative h-full w-full bg-[#070709] overflow-hidden">
      {role === 'host' ? (
        localTrack ? (
          <VideoTrack
            trackRef={localTrack as any}
            className={`h-full w-full object-cover transition-all duration-500 ${
              beautyMode ? 'brightness-105 contrast-105 saturate-110' : ''
            }`}
          />
        ) : fallbackLocalStream ? (
          <video
            ref={fallbackVideoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover transition-all duration-500 ${
              beautyMode ? 'brightness-105 contrast-105 saturate-110' : ''
            }`}
          />
        ) : (
          <div className="w-full h-full bg-black" />
        )
      ) : remoteTrack ? (
        <VideoTrack
          trackRef={remoteTrack as any}
          className={`h-full w-full object-cover transition-all duration-500 ${
            beautyMode ? 'brightness-105 contrast-105 saturate-110' : ''
          }`}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-[#12091d] via-[#09090d] to-black">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-pink-500/10 border border-pink-500/30">
            <div className="absolute inset-0 rounded-full border-2 border-pink-500 animate-ping opacity-30" />
            <Radio className="h-10 w-10 text-pink-500 animate-pulse" />
          </div>
          <p className="mt-4 text-sm font-medium text-white/70 tracking-wide">
            Connecting High-Definition Stream...
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// INNER LIVEKIT TRACKER FOR VIEWER COUNT
// ============================================================================
function LiveKitTracker({
  hostId,
  hostUsername,
  onViewerCountChange
}: {
  hostId?: string;
  hostUsername?: string;
  onViewerCountChange: (count: number) => void;
}) {
  const participants = useParticipants();

  useEffect(() => {
    const viewers = participants.filter(
      (p) =>
        p.identity !== hostId &&
        p.identity !== hostUsername &&
        (!hostId || !p.identity.startsWith(hostId))
    );
    onViewerCountChange(viewers.length);
  }, [participants, hostId, hostUsername, onViewerCountChange]);

  return null;
}

// ============================================================================
// MAIN LIVE ARENA COMPONENT
// ============================================================================
export default function LiveArena({ currentUser, onClose, onBack }: LiveArenaProps) {
  const [isMounted, setIsMounted] = useState(false);
  const isInitializingRef = useRef<boolean>(false);
  const viewerLeavingIntentionallyRef = useRef<boolean>(false);

  const [user, setUser] = useState(
    currentUser || {
      id: 'default-user-id',
      username: 'MegaCreator',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=EarnMega',
      coin_balance: 5000
    }
  );

  // Core 4-Stage Machine
  const [stage, setStage] = useState<ArenaStage>('lobby');
  const [role, setRole] = useState<UserRole>('viewer');
  const [livekitToken, setLivekitToken] = useState<string>('');
  const [livekitServerUrl, setLivekitServerUrl] = useState<string>(
    process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://earnmega-mbwh7c26.livekit.cloud'
  );
  const [liveDuration, setLiveDuration] = useState<string>('00:00');
  const [endedAtFormatted, setEndedAtFormatted] = useState<string>('');
  const [streamStartMs, setStreamStartMs] = useState<number | null>(null);
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [peakViewers, setPeakViewers] = useState<number>(0);

  // Lobby State
  const [activeStreams, setActiveStreams] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Host Setup State
  const [streamTitle, setStreamTitle] = useState<string>('');
  const [setupCategory, setSetupCategory] = useState<string>('Just Chatting');
  const [giftGoal, setGiftGoal] = useState<number>(500);
  const [allowCohost, setAllowCohost] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(3);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [beautyMode, setBeautyMode] = useState<boolean>(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Active Broadcast State
  const [currentStream, setCurrentStream] = useState<LiveStreamRecord | null>(null);
  const [currentStreamDbId, setCurrentStreamDbId] = useState<string | null>(null);
  const currentStreamDbIdRef = useRef<string | null>(null);
  const roleRef = useRef<UserRole>(role);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isCamOff, setIsCamOff] = useState<boolean>(false);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [commentInput, setCommentInput] = useState<string>('');
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [likeCount, setLikeCount] = useState<number>(0);

  // Gift Drawer & Instant Animation State
  const [isGiftDrawerOpen, setIsGiftDrawerOpen] = useState<boolean>(false);
  const [selectedGiftId, setSelectedGiftId] = useState<string>('rose_1');
  const [quickRoseCombo, setQuickRoseCombo] = useState<number>(0);
  const [coinPopTrigger, setCoinPopTrigger] = useState<boolean>(false);
  const [localIncomingGift, setLocalIncomingGift] = useState<LiveGiftEvent | null>(null);

  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const hostPublisherRef = useRef<HostPublisherRef>(null);

  const handleViewerCountChange = useCallback((count: number) => {
    setViewerCount(count);
    setPeakViewers((prev) => Math.max(prev, count));
  }, []);

  // --------------------------------------------------------------------------
  // CAMERA PREVIEW RELEASE (CRITICAL FOR ANDROID HARDWARE UNLOCK)
  // --------------------------------------------------------------------------
  const stopPreviewCamera = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      localStreamRef.current = null;
    }
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }
    setLocalStream(null);
  }, []);

  // --------------------------------------------------------------------------
  // HOST BROADCAST INITIALIZATION
  // --------------------------------------------------------------------------
  const initializeHostBroadcast = useCallback(async () => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    // Ensure pre-live preview stream is 100% stopped so LiveKit can acquire hardware cleanly
    stopPreviewCamera();

    const roomId = `live_${user.id}`;
    const finalTitle = streamTitle.trim() || `${user.username}'s VIP Live`;
    let insertedStreamDbId: string | null = null;

    try {
      await supabase.from('live_streams').delete().eq('host_id', user.id);

      const insertPayload = {
        host_id: user.id,
        host_username: user.username || 'Creator',
        host_avatar: user.avatar_url,
        room_id: roomId,
        livekit_room_name: roomId,
        title: finalTitle,
        category: setupCategory,
        gift_goal_target: giftGoal,
        gift_goal_current: 0,
        total_coins_earned: 0,
        viewer_count: 1,
        allow_cohost: allowCohost,
        status: 'live',
        is_live: true,
        started_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('live_streams')
        .insert([insertPayload])
        .select()
        .single();

      if (error) {
        const fallbackPayload = {
          host_id: user.id,
          host_username: user.username || 'Creator',
          title: finalTitle,
          category: setupCategory
        };
        const { data: fallbackData } = await supabase
          .from('live_streams')
          .insert([fallbackPayload])
          .select()
          .single();

        if (fallbackData) {
          setCurrentStreamDbId(fallbackData.id);
          insertedStreamDbId = fallbackData.id;
        }
      } else if (data) {
        setCurrentStreamDbId(data.id);
        insertedStreamDbId = data.id;
      }

      fetch('/api/livekit/notifyFollowers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: user.id,
          hostName: (user as any).user_metadata?.username || user.username || 'Host'
        })
      }).catch(() => {});

      supabase.channel('global-live-arena').send({
        type: 'broadcast',
        event: 'stream-started',
        payload: { host_id: user.id }
      });
    } catch (err) {
      console.error('Stream initialization error:', err);
    }

    const fallbackStream: LiveStreamRecord = {
      id: insertedStreamDbId || roomId,
      host_id: user.id,
      host_username: user.username,
      host_avatar: user.avatar_url,
      room_id: roomId,
      livekit_room_name: roomId,
      title: finalTitle,
      category: setupCategory,
      gift_goal_target: giftGoal,
      gift_goal_current: 0,
      total_coins_earned: 0,
      viewer_count: 1,
      allow_cohost: allowCohost,
      status: 'live',
      is_live: true
    };
    setCurrentStream(fallbackStream);

    try {
      const hostIdentity = user.id || user.username;
      const res = await fetch(
        `/api/livekit?room=${encodeURIComponent(roomId)}&username=${encodeURIComponent(
          hostIdentity
        )}&role=host`
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch LiveKit token: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.wsUrl || data.url) {
        setLivekitServerUrl(data.wsUrl || data.url);
      }
      if (data.token) {
        setLivekitToken(data.token);
        setComments([
          {
            id: 'welcome-sys',
            username: 'EarnMega AI',
            content: 'Welcome to EarnMega Live Arena! Send gifts to climb the VIP Leaderboard.',
            is_system: true
          }
        ]);
      } else {
        throw new Error('No token returned');
      }
    } catch (err) {
      console.error('[LIVEKIT PIPELINE] Token Error:', err);
      setConnectionError('Token Generation Failed. Check Server API Keys.');
      toast.error('Token Generation Failed.');
    } finally {
      isInitializingRef.current = false;
    }
  }, [user, streamTitle, setupCategory, giftGoal, allowCohost, stopPreviewCamera]);

  // --------------------------------------------------------------------------
  // HOST START STREAM WORKFLOW (3-2-1 COUNTDOWN -> LIVE STAGE)
  // --------------------------------------------------------------------------
  const handleStartCountdown = () => {
    setConnectionError(null);
    setRole('host');
    roleRef.current = 'host';
    setCountdown(3);
    setStage('countdown');
  };

  // --------------------------------------------------------------------------
  // VIEWER JOIN STREAM WORKFLOW
  // --------------------------------------------------------------------------
  const handleJoinStreamAsViewer = async (stream: LiveStreamRecord) => {
    setConnectionError(null);
    viewerLeavingIntentionallyRef.current = false;
    setRole('viewer');
    roleRef.current = 'viewer';
    setCurrentStream(stream);
    setStreamStartMs(
      stream.started_at || stream.created_at
        ? new Date((stream.started_at || stream.created_at) as string).getTime()
        : Date.now()
    );

    const actualRoomName = `live_${stream.host_id || (stream as any).user_id}`;
    const viewerIdentity = `${user.username || 'viewer'}_${user.id.slice(0, 6)}`;

    try {
      const res = await fetch(
        `/api/livekit?room=${encodeURIComponent(actualRoomName)}&username=${encodeURIComponent(
          viewerIdentity
        )}&role=viewer`
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch LiveKit token: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.wsUrl || data.url) {
        setLivekitServerUrl(data.wsUrl || data.url);
      }
      if (data.token) {
        setLivekitToken(data.token);
      } else {
        throw new Error('No token returned from server.');
      }
    } catch (err) {
      console.error('[LIVEKIT PIPELINE] Viewer Token Error:', err);
      setConnectionError('Token Generation Failed. Check Server API Keys.');
      toast.error('Token Generation Failed.');
      setCurrentStream(null);
      return;
    }

    setComments([
      {
        id: `join-${Date.now()}`,
        username: user.username,
        content: 'joined the LIVE',
        is_system: true
      }
    ]);
    setStage('live');

    try {
      await supabase.from('live_comments').insert([
        {
          stream_id: stream.id,
          user_id: user.id,
          username: user.username,
          avatar_url: user.avatar_url,
          content: 'joined the LIVE',
          is_system: true
        }
      ]);
    } catch {}
  };

  // --------------------------------------------------------------------------
  // INTERACTIVE ACTIONS (CHAT, HEARTS, LUXURY GIFT DISPATCH, END/LEAVE STREAM)
  // --------------------------------------------------------------------------
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !currentStream) return;
    const text = commentInput.trim();
    setCommentInput('');
    const tempMsg: LiveComment = {
      id: `local-${Date.now()}`,
      username: user.username,
      avatar_url: user.avatar_url,
      content: text,
      badge_level: 14
    };
    setComments((prev) => [...prev.slice(-60), tempMsg]);
    try {
      await supabase.from('live_comments').insert([
        {
          stream_id: currentStream.id,
          user_id: user.id,
          username: user.username,
          avatar_url: user.avatar_url,
          content: text
        }
      ]);
    } catch {}
  };

  const spawnFloatingHeart = () => {
    const colors = ['#FF2E93', '#00F5D4', '#FFD700', '#FF5E00', '#9B5DE5'];
    const newHeart: FloatingHeart = {
      id: Date.now() + Math.random(),
      xOffset: Math.floor(Math.random() * 60) - 30,
      color: colors[Math.floor(Math.random() * colors.length)]
    };
    setLikeCount((prev) => prev + 1);
    setFloatingHearts((prev) => [...prev.slice(-18), newHeart]);
  };

  const handleDispatchGift = async (gift: GiftTierItem, comboCount = 1) => {
    if (!currentStream) return;
    const totalCost = gift.coins * comboCount;
    if (user.coin_balance < totalCost) {
      setIsGiftDrawerOpen(true);
      return;
    }

    const updatedBalance = user.coin_balance - totalCost;
    setUser((prev) => ({
      ...prev,
      coin_balance: updatedBalance
    }));
    setCoinPopTrigger(true);
    setTimeout(() => setCoinPopTrigger(false), 550);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('coin-balance-updated', {
          detail: { newBalance: updatedBalance }
        })
      );
    }

    const giftEvent: LiveGiftEvent = {
      id: `local-gift-${Date.now()}-${Math.random()}`,
      stream_id: currentStream.id,
      sender_id: user.id,
      sender_username: user.username,
      sender_avatar: user.avatar_url,
      gift_id: gift.id,
      gift_name: gift.name,
      gift_icon: gift.icon,
      coin_value: gift.coins,
      combo_count: comboCount
    };
    setLocalIncomingGift(giftEvent);

    setCurrentStream((prev) =>
      prev
        ? {
            ...prev,
            gift_goal_current: (prev.gift_goal_current || 0) + totalCost,
            total_coins_earned: (prev.total_coins_earned || 0) + totalCost
          }
        : null
    );

    try {
      const { data, error } = await supabase.rpc('process_live_gift', {
        p_stream_id: currentStream.id,
        p_gift_id: gift.id,
        p_gift_name: gift.name,
        p_gift_icon: gift.icon,
        p_coin_value: gift.coins,
        p_combo_count: comboCount
      });
      if (!error && data?.new_balance !== undefined) {
        setUser((prev) => ({
          ...prev,
          coin_balance: data.new_balance
        }));
      }
    } catch {}
  };

  const handleQuickRoseGift = () => {
    const nextCombo = quickRoseCombo + 1;
    setQuickRoseCombo(nextCombo);
    handleDispatchGift(LUXURY_GIFT_CATALOG[0], 1);
  };

  // CASE A (Host clicks END) vs CASE C (Viewer taps X to leave early)
  const handleEndOrLeaveStream = async () => {
    if (role === 'host') {
      if (hostPublisherRef.current) {
        try {
          await hostPublisherRef.current.broadcastEnd(liveDuration, peakViewers);
        } catch {}
      }
      stopPreviewCamera();

      try {
        await supabase
          .from('live_streams')
          .update({ status: 'ended', is_live: false })
          .eq('host_id', user.id);

        await supabase
          .from('live_streams')
          .delete()
          .eq('host_id', user.id);

        supabase.channel('global-live-arena').send({
          type: 'broadcast',
          event: 'stream-ended',
          payload: {
            host_id: user.id,
            duration: liveDuration,
            peakViewers
          }
        });
      } catch {}

      setLivekitToken('');
      setEndedAtFormatted(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })
      );
      setStage('ended');
    } else {
      // Viewer tapped X: leave immediately back to Lobby without showing "Broadcast Concluded"
      viewerLeavingIntentionallyRef.current = true;
      setLivekitToken('');
      setCurrentStream(null);
      setCurrentStreamDbId(null);
      setStage('lobby');
    }
  };

  // CASE B: Host ended stream while Viewer is watching
  const handleHostEnded = useCallback((durationStr?: string, peak?: number) => {
    if (roleRef.current === 'viewer' && !viewerLeavingIntentionallyRef.current) {
      if (durationStr) setLiveDuration(durationStr);
      if (peak !== undefined) setPeakViewers(peak);

      setEndedAtFormatted(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
      setLivekitToken('');
      setStage('ended');
    }
  }, []);

  // Listen for Host ending the broadcast via Realtime & Broadcast channel (safe check)
  useEffect(() => {
    if (stage !== 'live' || role !== 'viewer' || !currentStream) return;

    const streamId = currentStream.id;
    const hostId = currentStream.host_id;

    const channel = supabase
      .channel(`stream_status_${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_streams',
          filter: `id=eq.${streamId}`
        },
        (payload) => {
          if (payload.new.status === 'ended' || payload.new.is_live === false) {
            handleHostEnded();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'live_streams',
          filter: `id=eq.${streamId}`
        },
        () => {
          handleHostEnded();
        }
      )
      .on('broadcast', { event: 'stream-ended' }, (payload) => {
        if (payload?.payload?.host_id === hostId) {
          handleHostEnded(payload?.payload?.duration, payload?.payload?.peakViewers);
        }
      })
      .subscribe();

    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('live_streams')
          .select('id, status, is_live')
          .eq('host_id', hostId)
          .maybeSingle();

        // Only end if the row was explicitly marked ended or deleted after creation
        if (!error && (!data || data.status === 'ended' || data.is_live === false)) {
          handleHostEnded();
        }
      } catch {}
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [stage, role, currentStream, handleHostEnded]);

  useEffect(() => {
    currentStreamDbIdRef.current = currentStreamDbId;
  }, [currentStreamDbId]);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    setIsMounted(true);
    const handleBeforeUnload = () => {
      const streamId = currentStreamDbIdRef.current;
      const currentRole = roleRef.current;
      if (streamId && currentRole === 'host') {
        supabase
          .from('live_streams')
          .update({ status: 'ended', is_live: false })
          .eq('id', streamId);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    async function initUser() {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user && !currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, coin_balance, coins')
          .eq('id', authData.user.id)
          .single();
        if (profile) {
          setUser({
            id: profile.id,
            username: profile.username || 'MegaUser',
            avatar_url:
              profile.avatar_url ||
              'https://api.dicebear.com/7.x/avataaars/svg?seed=EarnMega',
            coin_balance:
              typeof profile.coin_balance === 'number'
                ? profile.coin_balance
                : typeof profile.coins === 'number'
                ? profile.coins
                : 1000
          });
        }
      }
    }
    initUser();
  }, [currentUser]);

  useEffect(() => {
    const fetchStreams = async () => {
      const { data } = await supabase.from('live_streams').select('*');
      if (data) {
        const liveData = data.filter((s) => s.status !== 'ended' && s.is_live !== false);
        setActiveStreams(liveData);
      }
    };
    fetchStreams();

    const interval = setInterval(() => {
      if (stage === 'lobby') {
        fetchStreams();
      }
    }, 3000);

    const channel = supabase
      .channel('global-live-arena')
      .on('broadcast', { event: 'stream-started' }, () => {
        fetchStreams();
      })
      .on('broadcast', { event: 'stream-ended' }, (payload) => {
        fetchStreams();
        if (
          roleRef.current === 'viewer' &&
          currentStream &&
          payload?.payload?.host_id === currentStream.host_id
        ) {
          handleHostEnded(payload?.payload?.duration, payload?.payload?.peakViewers);
        }
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [stage, currentStream, handleHostEnded]);

  // ONLY run preview camera during 'setup' and 'countdown' (NEVER during 'live' so LiveKit has exclusive camera access)
  useEffect(() => {
    if (stage === 'setup' || stage === 'countdown') {
      let isCancelled = false;

      const startPreview = async () => {
        if (
          localStreamRef.current &&
          localStreamRef.current.active &&
          localStreamRef.current.getVideoTracks().some((t) => t.readyState === 'live')
        ) {
          if (previewVideoRef.current && previewVideoRef.current.srcObject !== localStreamRef.current) {
            previewVideoRef.current.srcObject = localStreamRef.current;
          }
          return;
        }

        try {
          // Video-only preview in setup so we never trigger an Android microphone conflict
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode,
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          });

          if (isCancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }

          localStreamRef.current = stream;
          setLocalStream(stream);
          if (previewVideoRef.current) {
            previewVideoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.warn('Camera preview warning:', err);
        }
      };

      startPreview();
      return () => {
        isCancelled = true;
      };
    } else {
      stopPreviewCamera();
    }
  }, [stage, facingMode, stopPreviewCamera]);

  // 3-2-1 Countdown Lifecycle
  useEffect(() => {
    if (stage !== 'countdown') return;
    if (countdown > 1) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      const launchTimer = setTimeout(() => {
        stopPreviewCamera();
        setStreamStartMs(Date.now());
        setStage('live');
      }, 900);
      return () => clearTimeout(launchTimer);
    }
  }, [stage, countdown, stopPreviewCamera]);

  useEffect(() => {
    if (stage === 'live' && role === 'host' && !isInitializingRef.current && !livekitToken) {
      initializeHostBroadcast();
    }
  }, [stage, role, livekitToken, initializeHostBroadcast]);

  useEffect(() => {
    if (stage !== 'live' || !currentStream) return;
    const chatChannel = supabase
      .channel(`live_chat_${currentStream.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_comments',
          filter: `stream_id=eq.${currentStream.id}`
        },
        (payload) => {
          const newMsg = payload.new as LiveComment;
          setComments((prev) => [...prev.slice(-60), newMsg]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_streams',
          filter: `id=eq.${currentStream.id}`
        },
        (payload) => {
          const newData = payload.new as Partial<LiveStreamRecord>;
          setCurrentStream((prev) => (prev ? { ...prev, ...newData } : null));
          if (newData.status === 'ended' || newData.is_live === false) {
            handleHostEnded();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [stage, currentStream, handleHostEnded]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  useEffect(() => {
    if (stage !== 'live' || !streamStartMs) return;
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((Date.now() - streamStartMs) / 1000));
      const minutes = Math.floor(diff / 60)
        .toString()
        .padStart(2, '0');
      const seconds = (diff % 60).toString().padStart(2, '0');
      setLiveDuration(`${minutes}:${seconds}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, streamStartMs]);

  const goalProgress = currentStream
    ? Math.min(
        100,
        Math.round(
          ((currentStream.gift_goal_current || 0) /
            (currentStream.gift_goal_target || 500)) *
            100
        )
      )
    : 0;

  if (!isMounted) return null;

  // ==========================================================================
  // STAGE 1: THE LUXURY LIVE ARENA LOBBY
  // ==========================================================================
  if (stage === 'lobby') {
    const filteredStreams = activeStreams.filter((s) => {
      const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
      const matchesSearch =
        (s.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.host_username || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    const handleLobbyClose = () => {
      if (onClose) onClose();
      else if (onBack) onBack();
      else window.location.href = '/';
    };

    return createPortal(
      <div className="fixed inset-0 w-screen h-[100dvh] z-[2147483647] bg-[#060608] text-white flex flex-col select-none overflow-hidden">
        <div className="sticky top-0 z-30 bg-[#060608]/90 backdrop-blur-xl px-4 pt-4 pb-3 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleLobbyClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 active:scale-90 transition cursor-pointer"
                aria-label="Back"
              >
                <X className="h-5 w-5 text-white/80" />
              </button>
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-600" />
                </span>
                <h1 className="text-lg font-extrabold tracking-wider bg-gradient-to-r from-white via-pink-200 to-pink-500 bg-clip-text text-transparent">
                  LIVE ARENA
                </h1>
              </div>
            </div>

            <button
              onClick={() => setStage('setup')}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 px-4 py-2 text-sm font-bold text-white shadow-[0_0_20px_rgba(236,72,153,0.5)] active:scale-95 transition"
            >
              <Video className="h-4 w-4" />
              <span>Go Live</span>
            </button>
          </div>

          <div className="relative mt-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search live streams or VIP hosts..."
              className="w-full rounded-2xl bg-white/[0.04] border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-pink-500/50 focus:outline-none"
            />
          </div>

          <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition ${
                    isActive
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-[0_0_12px_rgba(219,39,119,0.4)]'
                      : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 mt-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1a1025] via-[#120d1d] to-[#1f1124] border border-pink-500/20 p-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3.5">
              <div className="relative h-12 w-12 rounded-full p-0.5 bg-gradient-to-tr from-pink-500 to-amber-400">
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  className="h-full w-full rounded-full object-cover bg-black"
                />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  Ready to broadcast?
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                </h3>
                <p className="text-xs text-white/60">
                  Stream in 1080p HD & earn instant coins on Live Arena
                </p>
              </div>
            </div>
            <button
              onClick={() => setStage('setup')}
              className="rounded-xl bg-pink-600 px-4 py-2 text-xs font-bold text-white shadow-[0_0_15px_rgba(219,39,119,0.5)] active:scale-95 transition"
            >
              Start Live
            </button>
          </div>
        </div>

        <div className="flex-1 px-4 py-5 overflow-y-auto">
          {filteredStreams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-pink-500/10 border border-pink-500/20 mb-4">
                <Video className="h-9 w-9 text-pink-500" />
              </div>
              <h2 className="text-lg font-extrabold text-white">No Active Streams</h2>
              <p className="mt-1 max-w-xs text-xs text-white/50">
                Be the first creator to go live right now and command the entire EarnMega stage.
              </p>
              <button
                onClick={() => setStage('setup')}
                className="mt-6 rounded-full bg-gradient-to-r from-pink-600 via-purple-600 to-amber-500 px-7 py-3 text-sm font-extrabold text-white shadow-[0_0_25px_rgba(236,72,153,0.5)] active:scale-95 transition"
              >
                Start Broadcasting Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredStreams.map((stream) => (
                <div
                  key={stream.id}
                  onClick={() => handleJoinStreamAsViewer(stream)}
                  className="group relative aspect-[9/13] cursor-pointer overflow-hidden rounded-2xl bg-[#121218] border border-white/10 shadow-xl"
                >
                  <img
                    src={stream.host_avatar}
                    alt={stream?.host_username || 'Host'}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40" />

                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                    <span className="flex items-center gap-1 rounded-md bg-pink-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                      LIVE
                    </span>
                    <span className="flex items-center gap-1 rounded-md bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-semibold text-white">
                      <Users className="h-3 w-3 text-pink-400" />
                      {stream.viewer_count || 0}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3">
                    <span className="inline-block rounded-full bg-white/10 backdrop-blur-md px-2 py-0.5 text-[9px] font-bold text-amber-300 mb-1">
                      {stream.category}
                    </span>
                    <h4 className="line-clamp-1 text-sm font-extrabold text-white">
                      {stream.title}
                    </h4>
                    <div className="mt-1 flex items-center gap-1.5">
                      <img
                        src={stream.host_avatar}
                        alt=""
                        className="h-4 w-4 rounded-full object-cover ring-1 ring-pink-500"
                      />
                      <span className="truncate text-xs font-medium text-white/80">
                        @{stream?.host_username || 'Creator'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  }

  // ==========================================================================
  // STAGE 2 & 3: HOST CAMERA SETUP & 3-2-1 COUNTDOWN
  // ==========================================================================
  if (stage === 'setup' || stage === 'countdown') {
    return createPortal(
      <div className="fixed inset-0 w-screen h-[100dvh] z-[2147483647] bg-[#060608] text-white overflow-hidden flex flex-col select-none">
        <video
          ref={previewVideoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover transition-all duration-500 ${
            beautyMode ? 'brightness-105 contrast-105 saturate-110' : ''
          } ${stage === 'countdown' ? 'blur-md scale-105 brightness-50' : ''}`}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/90" />

        {stage === 'setup' && (
          <>
            <div className="absolute top-5 left-4 right-4 z-20 flex items-center justify-between">
              <button
                onClick={() => {
                  stopPreviewCamera();
                  setStage('lobby');
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-xl border border-white/15 text-white active:scale-90 transition"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    stopPreviewCamera();
                    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-xl border border-white/15 text-white active:scale-90 transition"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setIsMicMuted((prev) => !prev)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-xl border transition ${
                    isMicMuted
                      ? 'bg-red-500/80 border-red-400 text-white'
                      : 'bg-black/50 border-white/15 text-white'
                  }`}
                >
                  {isMicMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                <button
                  onClick={() => setBeautyMode((prev) => !prev)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-xl border transition ${
                    beautyMode
                      ? 'bg-pink-600/80 border-pink-400 text-white shadow-[0_0_15px_rgba(236,72,153,0.6)]'
                      : 'bg-black/50 border-white/15 text-white'
                  }`}
                >
                  <Sparkles className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="absolute pb-8 bottom-0 z-50 left-4 right-4 flex flex-col gap-3.5">
              <div className="rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/15 p-3.5 shadow-2xl">
                <input
                  type="text"
                  value={streamTitle}
                  onChange={(e) => setStreamTitle(e.target.value)}
                  placeholder="Live Stream Title (e.g. Late Night Vibes & Gifts)"
                  className="w-full bg-transparent text-sm font-semibold text-white placeholder-white/50 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {CATEGORIES.filter((c) => c.id !== 'All').map((cat) => {
                  const Icon = cat.icon;
                  const active = setupCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSetupCategory(cat.id)}
                      className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${
                        active
                          ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                          : 'bg-black/60 backdrop-blur-xl text-white/80 border border-white/15'
                      }`}
                    >
                      {Icon && <Icon className="h-3.5 w-3.5 text-pink-500" />}
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-black/60 backdrop-blur-xl border border-white/15 px-4 py-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-white/50">
                    GIFT GOAL
                  </span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-amber-400" />
                    <input
                      type="number"
                      value={giftGoal}
                      onChange={(e) => setGiftGoal(Number(e.target.value) || 500)}
                      className="w-full bg-transparent text-sm font-extrabold text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-black/60 backdrop-blur-xl border border-white/15 px-4 py-3">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-white/50">
                      MULTI-GUEST
                    </span>
                    <span className="text-sm font-extrabold text-white">Co-Host</span>
                  </div>
                  <button
                    onClick={() => setAllowCohost((prev) => !prev)}
                    className={`relative h-7 w-12 rounded-full transition-colors ${
                      allowCohost ? 'bg-pink-600' : 'bg-white/20'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white transition-transform ${
                        allowCohost ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <button
                onClick={handleStartCountdown}
                className="mt-1 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-pink-600 via-fuchsia-600 to-amber-500 py-4 text-base font-black uppercase tracking-wider text-white shadow-[0_0_30px_rgba(236,72,153,0.6)] active:scale-98 transition"
              >
                <Video className="h-5 w-5 fill-white" />
                <span>GO LIVE</span>
              </button>
            </div>
          </>
        )}

        <AnimatePresence mode="wait">
          {stage === 'countdown' && (
            <motion.div
              key={countdown}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: [0.3, 1.25, 1], opacity: 1 }}
              exit={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute inset-0 z-50 flex items-center justify-center"
            >
              <div className="relative flex h-44 w-44 items-center justify-center rounded-full bg-pink-600/20 backdrop-blur-2xl border-2 border-pink-500/50 shadow-[0_0_80px_rgba(236,72,153,0.8)]">
                <span className="text-8xl font-black text-white drop-shadow-[0_4px_24px_rgba(255,255,255,0.6)]">
                  {countdown}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>,
      document.body
    );
  }

  // ==========================================================================
  // STAGE 4: ACTIVE BROADCAST & VIEWER ARENA
  // ==========================================================================
  return createPortal(
    <div
      onDoubleClick={role === 'viewer' ? spawnFloatingHeart : undefined}
      className="fixed inset-0 w-screen h-[100dvh] z-[2147483647] bg-[#060608] text-white flex flex-col select-none overflow-hidden"
    >
      {/* 1. LIVEKIT CLOUD HD VIDEO STREAM */}
      {connectionError ? (
        <div className="flex h-full w-full items-center justify-center bg-[#09090d]">
          <div className="flex flex-col items-center p-6 bg-red-900/20 border border-red-500/50 rounded-2xl backdrop-blur-xl">
            <X className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-red-400 mb-2">Connection Error</h2>
            <p className="text-sm font-medium text-red-200 text-center">{connectionError}</p>
            <button
              onClick={() => {
                setConnectionError(null);
                setStage('lobby');
              }}
              className="mt-6 px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold transition"
            >
              Return to Lobby
            </button>
          </div>
        </div>
      ) : livekitToken ? (
        <LiveKitRoom
          video={false}
          audio={false}
          options={{
            adaptiveStream: true,
            dynacast: true,
            publishDefaults: {
              dtx: true,
              red: true,
              simulcast: true
            }
          }}
          token={livekitToken}
          serverUrl={livekitServerUrl}
          connect={true}
          className="h-full w-full"
        >
          <LiveKitTracker
            hostId={currentStream?.host_id || user.id}
            hostUsername={currentStream?.host_username || user.username}
            onViewerCountChange={handleViewerCountChange}
          />
          {role === 'host' && (
            <HostLiveKitController
              ref={hostPublisherRef}
              isMicMuted={isMicMuted}
              isCamOff={isCamOff}
              facingMode={facingMode}
            />
          )}
          <LiveKitVideoStage
            role={role}
            beautyMode={beautyMode}
            fallbackLocalStream={localStream}
          />
          {role === 'viewer' && (
            <ViewerDataListener
              onHostEnded={handleHostEnded}
              hostId={currentStream?.host_id || (currentStream as any)?.user_id}
              hostUsername={currentStream?.host_username}
            />
          )}
          <RoomAudioRenderer />
        </LiveKitRoom>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-[#070709]">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-pink-500/10 border border-pink-500/30">
            <div className="absolute inset-0 rounded-full border-2 border-pink-500 animate-ping opacity-30" />
            <Radio className="h-10 w-10 text-pink-500 animate-pulse" />
          </div>
          <p className="mt-4 text-sm font-medium text-white/70 tracking-wide">
            Initializing Live Stream...
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/70 via-black/25 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black/85 via-black/40 to-transparent z-10" />

      {/* 2. MASTER TIER GPU GIFT OVERLAY */}
      {currentStream && (
        <LiveGiftOverlay streamId={currentStream.id} localIncomingGift={localIncomingGift} />
      )}

      {/* 2.5 LIVE TIMER PILL (HOST ONLY) */}
      {role === 'host' && (stage === 'live' || stage === 'ended') && (
        <div className="absolute top-4 left-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-xl">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          <span className="text-white/90 font-mono text-sm tracking-widest font-medium">
            {liveDuration}
          </span>
        </div>
      )}

      {/* 3. TOP HUD: HOST CAPSULE, RANKINGS, WALLET & VIEWER PILLS */}
      <div className="absolute top-14 left-3 right-3 z-30 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 rounded-full bg-black/45 backdrop-blur-xl border border-white/15 p-1 pr-2.5 shadow-lg">
            <div className="relative h-9 w-9 rounded-full p-[1.5px] bg-gradient-to-tr from-pink-500 via-amber-400 to-purple-500">
              <img
                src={currentStream?.host_avatar || user.avatar_url}
                alt="Host"
                className="h-full w-full rounded-full object-cover bg-black"
              />
              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-sm bg-pink-600 px-1 text-[8px] font-black uppercase text-white">
                LIVE
              </span>
            </div>

            <div className="flex flex-col">
              <span className="max-w-[95px] truncate text-xs font-extrabold text-white">
                {currentStream?.host_username || user.username}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300">
                <Heart className="h-2.5 w-2.5 fill-pink-500 text-pink-500" />
                {((currentStream?.total_coins_earned || 0) + likeCount).toLocaleString()}
              </span>
            </div>

            {role === 'viewer' && (
              <button
                onClick={() => setIsFollowing((prev) => !prev)}
                className={`ml-1 flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-extrabold transition ${
                  isFollowing
                    ? 'bg-white/15 text-white/80'
                    : 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                }`}
              >
                {isFollowing ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <motion.div
              animate={
                coinPopTrigger
                  ? { scale: [1, 1.38, 1], borderColor: '#FFD700' }
                  : { scale: 1 }
              }
              transition={{ duration: 0.35 }}
              onClick={() => role === 'viewer' && setIsGiftDrawerOpen(true)}
              className="cursor-pointer flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur-xl border border-amber-400/30 px-3 py-1.5 shadow-md"
            >
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-black text-amber-300">
                {user.coin_balance.toLocaleString()}
              </span>
            </motion.div>

            <div className="flex items-center gap-1 rounded-full bg-black/45 backdrop-blur-xl border border-white/10 px-2.5 py-1.5 text-xs font-bold text-white">
              <Users className="h-3.5 w-3.5 text-pink-400" />
              <span>{viewerCount}</span>
            </div>

            <button
              onClick={handleEndOrLeaveStream}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 backdrop-blur-xl border border-white/15 text-white active:scale-90 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Second Row HUD: Daily Ranking Badge & Luxury Gift Goal Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-pink-500/20 backdrop-blur-md border border-amber-400/30 px-3 py-1 text-[11px] font-bold text-amber-200">
            <Trophy className="h-3 w-3 text-amber-400" />
            <span>Popular LIVE • Top 5%</span>
          </div>

          <div className="flex-1 max-w-[190px] rounded-full bg-black/50 backdrop-blur-xl border border-white/10 px-3 py-1">
            <div className="flex items-center justify-between text-[9px] font-extrabold text-white/80 mb-0.5">
              <span className="flex items-center gap-1 text-pink-300">
                <Crown className="h-2.5 w-2.5 text-amber-400" /> Goal
              </span>
              <span>
                {currentStream?.gift_goal_current || 0}/{currentStream?.gift_goal_target || 500}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
              <div
                style={{ width: `${goalProgress}%` }}
                className="h-full rounded-full bg-gradient-to-r from-pink-500 via-amber-400 to-yellow-300 transition-all duration-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. FLOATING NEON HEARTS STREAM */}
      <div className="pointer-events-none absolute bottom-24 right-6 z-20 h-64 w-16">
        <AnimatePresence>
          {floatingHearts.map((heart) => (
            <motion.div
              key={heart.id}
              initial={{ opacity: 1, y: 0, x: 0, scale: 0.5 }}
              animate={{
                opacity: [1, 1, 0],
                y: -230,
                x: heart.xOffset,
                scale: [0.6, 1.25, 1]
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, ease: 'easeOut' }}
              onAnimationComplete={() =>
                setFloatingHearts((prev) => prev.filter((h) => h.id !== heart.id))
              }
              className="absolute bottom-0 right-2"
            >
              <Heart
                className="h-7 w-7 drop-shadow-[0_0_10px_rgba(255,46,147,0.8)]"
                style={{ fill: heart.color, color: heart.color }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 5. REALTIME SCROLLING CHAT STREAM */}
      <div className="absolute bottom-20 left-3 z-20 flex max-h-[34dvh] w-[76%] flex-col gap-1.5 overflow-y-auto no-scrollbar pr-2 [mask-image:linear-gradient(to_bottom,transparent_0%,black_20%,black_100%)]">
        {comments.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            className={`inline-flex items-start gap-2 self-start rounded-2xl px-3 py-1.5 text-xs backdrop-blur-md ${
              msg.is_system
                ? 'bg-pink-500/20 border border-pink-400/30 text-pink-200 font-semibold'
                : 'bg-black/40 border border-white/5 text-white'
            }`}
          >
            {!msg.is_system && (
              <span className="mt-0.5 inline-flex items-center gap-0.5 rounded bg-gradient-to-r from-indigo-500 to-purple-600 px-1.5 py-0.2 text-[9px] font-black text-white">
                <Diamond className="h-2.5 w-2.5 fill-white" />
                {msg.badge_level || 12}
              </span>
            )}
            <div className="leading-snug">
              <span className="font-bold text-white/75 mr-1.5">{msg.username}:</span>
              <span className="font-medium text-white">{msg.content}</span>
            </div>
          </motion.div>
        ))}
        <div ref={chatBottomRef} />
      </div>

      {/* 6. STRICT ROLE-BASED BOTTOM DECK (VIEWER VS HOST) */}
      {role === 'viewer' ? (
        <div className="absolute bottom-3 left-3 right-3 z-30 flex items-center gap-2">
          <form onSubmit={handleSendComment} className="relative flex-1">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Say something nice..."
              className="w-full rounded-full bg-black/55 backdrop-blur-2xl border border-white/15 pl-4 pr-10 py-2.5 text-xs font-medium text-white placeholder-white/50 focus:border-pink-500/60 focus:outline-none"
            />
            {commentInput.trim() && (
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-pink-600 text-white"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            )}
          </form>

          <button
            onClick={handleQuickRoseGift}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-rose-600/80 to-pink-500/80 backdrop-blur-xl border border-pink-300/40 shadow-[0_0_15px_rgba(244,63,94,0.5)] active:scale-90 transition"
            title="Send Quick Rose (1 Coin)"
          >
            <span className="text-lg">🌹</span>
            {quickRoseCombo > 0 && (
              <span className="absolute -top-1.5 -right-1 rounded-full bg-amber-400 px-1.5 text-[9px] font-black text-black">
                x{quickRoseCombo}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsGiftDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 text-white shadow-[0_0_20px_rgba(236,72,153,0.6)] active:scale-90 transition"
          >
            <Gift className="h-5 w-5 animate-bounce" />
          </button>

          <button
            onClick={spawnFloatingHeart}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 backdrop-blur-xl border border-white/15 text-pink-500 active:scale-75 transition"
          >
            <Heart className="h-5 w-5 fill-pink-500" />
          </button>

          <button
            onClick={() => {
              if (navigator.share) {
                navigator
                  .share({
                    title: currentStream?.title || 'EarnMega Live',
                    url: window.location.href
                  })
                  .catch(() => {});
              }
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 backdrop-blur-xl border border-white/15 text-white active:scale-90 transition"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="absolute bottom-3 left-3 right-3 z-30 flex items-center justify-between gap-2">
          <form onSubmit={handleSendComment} className="relative flex-1">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Chat with your viewers..."
              className="w-full rounded-full bg-black/55 backdrop-blur-2xl border border-white/15 pl-4 pr-9 py-2.5 text-xs font-medium text-white placeholder-white/50 focus:outline-none"
            />
            {commentInput.trim() && (
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-pink-600 text-white"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            )}
          </form>

          <button
            onClick={() => setIsMicMuted((prev) => !prev)}
            className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-xl border transition ${
              isMicMuted
                ? 'bg-red-600/90 border-red-400 text-white'
                : 'bg-black/60 border-white/15 text-white'
            }`}
          >
            {isMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>

          <button
            onClick={() => setIsCamOff((prev) => !prev)}
            className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-xl border transition ${
              isCamOff
                ? 'bg-red-600/90 border-red-400 text-white'
                : 'bg-black/60 border-white/15 text-white'
            }`}
          >
            {isCamOff ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          </button>

          <button
            onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-xl border border-white/15 text-white transition hover:bg-white/10"
            title="Flip Camera"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            onClick={() => setBeautyMode((prev) => !prev)}
            className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-xl border transition ${
              beautyMode
                ? 'bg-pink-600 border-pink-400 text-white shadow-[0_0_12px_rgba(236,72,153,0.6)]'
                : 'bg-black/60 border-white/15 text-white'
            }`}
          >
            <Sparkles className="h-4 w-4" />
          </button>

          <button
            onClick={handleEndOrLeaveStream}
            className="rounded-full bg-red-600/90 hover:bg-red-600 border border-red-400/40 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg active:scale-95 transition"
          >
            End
          </button>
        </div>
      )}

      {/* 7. BUILT-IN LUXURY 5-TIER GIFT DRAWER */}
      <AnimatePresence>
        {isGiftDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGiftDrawerOpen(false)}
              className="absolute inset-0 z-40 bg-black/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 24, stiffness: 260 }}
              className="absolute bottom-0 inset-x-0 z-50 rounded-t-3xl bg-[#0c0c12]/95 backdrop-blur-2xl border-t border-white/15 p-5 shadow-[0_-15px_50px_rgba(0,0,0,0.9)]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    EarnMega Luxury Gifts
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 rounded-full bg-amber-400/15 border border-amber-400/40 px-3 py-1">
                    <Coins className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-black text-amber-300">
                      {user.coin_balance.toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsGiftDrawerOpen(false)}
                    className="rounded-full bg-white/10 p-1.5 text-white/70 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 my-4">
                {LUXURY_GIFT_CATALOG.map((item) => {
                  const isSelected = selectedGiftId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedGiftId(item.id)}
                      className={`relative flex flex-col items-center justify-center rounded-2xl p-3 border transition transform-gpu ${
                        isSelected
                          ? `bg-gradient-to-b ${item.accent} scale-[1.03] shadow-[0_0_25px_rgba(236,72,153,0.4)]`
                          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                      }`}
                    >
                      <span className="text-3xl mb-1 drop-shadow">{item.icon}</span>
                      <span className="text-xs font-extrabold text-white line-clamp-1">
                        {item.name}
                      </span>
                      <span className="text-[9px] font-semibold text-white/50 mb-1">
                        {item.tagline}
                      </span>
                      <div className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-black text-amber-300">
                        <Coins className="h-3 w-3 text-amber-400" />
                        {item.coins.toLocaleString()}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  const chosen =
                    LUXURY_GIFT_CATALOG.find((g) => g.id === selectedGiftId) ||
                    LUXURY_GIFT_CATALOG[0];
                  handleDispatchGift(chosen, 1);
                  if (chosen.coins >= 500) setIsGiftDrawerOpen(false);
                }}
                className="w-full rounded-2xl bg-gradient-to-r from-pink-600 via-fuchsia-600 to-amber-500 py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-[0_0_25px_rgba(236,72,153,0.5)] active:scale-98 transition"
              >
                Send Luxury Gift Now
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 8. CINEMATIC STREAM END EXPERIENCE */}
      <AnimatePresence>
        {stage === 'ended' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/85 backdrop-blur-2xl animate-in fade-in duration-500"
          >
            <div className="relative w-full max-w-sm rounded-[28px] bg-gradient-to-b from-[#16161a] via-[#0d0d10] to-[#070709] border border-amber-500/25 p-7 shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_50px_rgba(245,158,11,0.12)] overflow-hidden">
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-56 h-28 bg-amber-500/20 blur-3xl pointer-events-none" />

              <div className="flex flex-col items-center">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-[11px] font-bold tracking-[0.2em] uppercase mb-5">
                  Broadcast Concluded
                </div>

                <img
                  src={currentStream?.host_avatar || user.avatar_url}
                  alt="Host"
                  className="w-20 h-20 rounded-full object-cover ring-2 ring-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.35)]"
                />

                <h3 className="text-xl font-bold text-white mt-3">
                  {currentStream?.host_username || user.username}
                </h3>

                <p className="text-xs text-zinc-400 mt-1">Ended at {endedAtFormatted}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 my-6">
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 flex flex-col items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-500 mb-2" />
                  <span className="text-xl font-mono text-white tracking-wider">{liveDuration}</span>
                  <span className="text-[9px] font-bold tracking-[0.15em] text-white/50 mt-1">
                    DURATION
                  </span>
                </div>

                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 flex flex-col items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-400 mb-2" />
                  <span className="text-xl font-bold text-white">{peakViewers}</span>
                  <span className="text-[9px] font-bold tracking-[0.15em] text-white/50 mt-1">
                    PEAK VIEWERS
                  </span>
                </div>

                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 flex flex-col items-center justify-center">
                  <Diamond className="w-5 h-5 text-amber-400 mb-2" />
                  <span className="text-xl font-bold text-white">
                    {currentStream?.total_coins_earned || 0}
                  </span>
                  <span className="text-[9px] font-bold tracking-[0.15em] text-white/50 mt-1">
                    DIAMONDS
                  </span>
                </div>

                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 flex flex-col items-center justify-center">
                  <Check className="w-5 h-5 text-purple-400 mb-2" />
                  <span className="text-[13px] font-bold text-white">COMPLETED</span>
                  <span className="text-[9px] font-bold tracking-[0.15em] text-white/50 mt-1">
                    STATUS
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setLivekitToken('');
                  setCurrentStream(null);
                  setCurrentStreamDbId(null);
                  setStage('lobby');
                }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-black font-extrabold text-sm tracking-wider uppercase shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:brightness-110 active:scale-[0.98] transition-all"
              >
                Return to Live Arena
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}
