'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle
} from 'react';
import { createPortal } from 'react-dom';
import {
  LiveKitRoom,
  VideoTrack,
  RoomAudioRenderer,
  useTracks,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useConnectionState
} from '@livekit/components-react';
import { Track, RoomEvent, ConnectionState, VideoQuality } from 'livekit-client';
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
  Clock,
  Trash2,
  Hand,
  Volume2
} from 'lucide-react';
import { supabase } from '../../utils/supabase';

// ============================================================================
// TYPES & FIXED LUXURY GIFT CATALOG
// ============================================================================
type ArenaStage = 'lobby' | 'setup' | 'countdown' | 'live' | 'ended';
type UserRole = 'host' | 'viewer';
type MicRequestStatus = 'idle' | 'pending' | 'accepted';

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
  status?: 'active' | 'live' | 'ended';
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

interface MicSpeakerRequest {
  userId: string;
  username: string;
  avatarUrl: string;
  requestedAt: number;
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

const DEFAULT_LIVEKIT_URL = 'wss://earnmega-mbwh7c26.livekit.cloud';

const CATEGORIES = [
  { id: 'All', label: 'All', icon: null },
  { id: 'Just Chatting', label: 'Just Chatting', icon: Flame },
  { id: 'Music & Talent', label: 'Music & Talent', icon: Music },
  { id: 'VIP Lounge', label: 'VIP Lounge', icon: Diamond },
  { id: 'Talk & Debate', label: 'Talk & Debate', icon: MessageSquare },
  { id: 'Gaming', label: 'Gaming', icon: Gamepad2 }
];

// ============================================================================
// MASTER TIER GPU-ACCELERATED GIFT OVERLAY ENGINE (TRACK A & TRACK B)
// ============================================================================
export interface GiftOverlayHandle {
  triggerGift: (gift: LiveGiftEvent) => void;
}

const MasterLiveGiftOverlay = forwardRef<
  GiftOverlayHandle,
  { streamId?: string }
>(({ streamId }, ref) => {
  const [trackAQueue, setTrackAQueue] = useState<LiveGiftEvent[]>([]);
  const [activeTrackA, setActiveTrackA] = useState<LiveGiftEvent[]>([]);
  const [megaQueue, setMegaQueue] = useState<LiveGiftEvent[]>([]);
  const [activeMega, setActiveMega] = useState<LiveGiftEvent | null>(null);
  const [universeFlash, setUniverseFlash] = useState<boolean>(false);
  const processedIdsRef = useRef<Set<string>>(new Set());

  const enqueueGift = useCallback((gift: LiveGiftEvent) => {
    if (!gift || !gift.id) return;
    if (processedIdsRef.current.has(gift.id)) return;
    processedIdsRef.current.add(gift.id);

    const totalCoins = (gift.coin_value || 1) * (gift.combo_count || 1);
    if (
      totalCoins >= 500 ||
      gift.gift_id?.includes('rocket') ||
      gift.gift_id?.includes('universe')
    ) {
      setMegaQueue((prev) => [...prev, gift]);
    } else {
      setTrackAQueue((prev) => [...prev, gift]);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    triggerGift: (gift: LiveGiftEvent) => {
      enqueueGift(gift);
    }
  }));

  // Also listen to Supabase 'live_gifts' table inserts as a backup channel
  useEffect(() => {
    if (!streamId) return;
    const channel = supabase
      .channel(`live_gifts_db_${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_gifts',
          filter: `stream_id=eq.${streamId}`
        },
        (payload) => {
          const newGift = payload.new as LiveGiftEvent;
          if (newGift) {
            enqueueGift({
              ...newGift,
              id: newGift.id || `db-${Date.now()}-${Math.random()}`
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, enqueueGift]);

  // Process Track B (Mega Gifts >= 500 Coins pause Track A)
  useEffect(() => {
    if (!activeMega && megaQueue.length > 0) {
      const nextMega = megaQueue[0];
      setMegaQueue((prev) => prev.slice(1));
      setActiveMega(nextMega);
      const duration = nextMega.coin_value >= 5000 ? 4800 : 3200;
      const flashTimer =
        nextMega.coin_value >= 5000
          ? setTimeout(() => setUniverseFlash(true), duration - 450)
          : null;
      const clearTimer = setTimeout(() => {
        setUniverseFlash(false);
        setActiveMega(null);
      }, duration);
      return () => {
        if (flashTimer) clearTimeout(flashTimer);
        clearTimeout(clearTimer);
      };
    }
  }, [activeMega, megaQueue]);

  // Process Track A (Up to 4 simultaneous standard/kinetic gifts on lower-left)
  useEffect(() => {
    if (activeMega) return;
    if (activeTrackA.length < 4 && trackAQueue.length > 0) {
      const nextGift = trackAQueue[0];
      setTrackAQueue((prev) => prev.slice(1));
      setActiveTrackA((prev) => [...prev, nextGift]);
      setTimeout(() => {
        setActiveTrackA((prev) => prev.filter((item) => item.id !== nextGift.id));
      }, 3000);
    }
  }, [activeTrackA, trackAQueue, activeMega]);

  const isRocket =
    activeMega && activeMega.coin_value >= 500 && activeMega.coin_value < 5000;
  const isUniverse = activeMega && activeMega.coin_value >= 5000;

  return (
    <motion.div
      animate={
        isRocket
          ? { x: [0, -8, 8, -5, 5, 0], y: [0, 4, -4, 0] }
          : { x: 0, y: 0 }
      }
      transition={{ duration: 0.45 }}
      className="pointer-events-none absolute inset-0 z-[9999] overflow-hidden"
    >
      {/* TRACK A: LOWER-LEFT HOLOGRAPHIC & KINETIC DIAMOND STREAM */}
      <div className="absolute bottom-60 left-3 flex flex-col gap-2.5 w-[280px]">
        <AnimatePresence>
          {!activeMega &&
            activeTrackA.map((gift) => {
              const isDiamond = gift.coin_value >= 50;
              return (
                <motion.div
                  key={gift.id}
                  initial={
                    isDiamond
                      ? { y: -140, scale: 0.5, rotateX: 80, opacity: 0 }
                      : { x: -260, y: 30, scale: 0.85, opacity: 0 }
                  }
                  animate={{ x: 0, y: 0, scale: 1, rotateX: 0, opacity: 1 }}
                  exit={{ y: -25, scale: 0.8, opacity: 0 }}
                  transition={{
                    type: 'spring',
                    mass: 1.1,
                    stiffness: 220,
                    damping: 16
                  }}
                  className={`relative flex items-center justify-between rounded-full p-1.5 pr-4 backdrop-blur-2xl border transform-gpu ${
                    isDiamond
                      ? 'bg-cyan-950/60 border-cyan-300/70 shadow-[0_0_30px_rgba(34,211,238,0.65)]'
                      : 'bg-white/10 border-white/25 shadow-[0_8px_32px_rgba(255,46,147,0.3)]'
                  }`}
                >
                  {isDiamond && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0.9 }}
                      animate={{ scale: 2.6, opacity: 0 }}
                      transition={{ duration: 0.45, ease: 'easeOut' }}
                      className="pointer-events-none absolute inset-0 rounded-full border-2 border-cyan-300"
                    />
                  )}

                  <div className="flex items-center gap-2.5">
                    <img
                      src={
                        gift.sender_avatar ||
                        'https://api.dicebear.com/7.x/avataaars/svg?seed=Gifter'
                      }
                      alt={gift.sender_username}
                      className="h-9 w-9 rounded-full object-cover ring-2 ring-pink-400"
                    />
                    <div className="flex flex-col">
                      <span className="max-w-[110px] truncate text-xs font-black text-white">
                        {gift.sender_username}
                      </span>
                      <span className="text-[10px] font-bold text-amber-300">
                        sent {gift.gift_name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <motion.span
                      animate={{ y: ['-10%', '10%'], rotate: [0, 8, -8, 0] }}
                      transition={{
                        duration: 1.4,
                        repeat: Infinity,
                        repeatType: 'reverse',
                        ease: 'easeInOut'
                      }}
                      className="text-3xl drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]"
                    >
                      {gift.gift_icon}
                    </motion.span>
                    <span className="text-lg font-black italic bg-gradient-to-b from-yellow-200 via-amber-400 to-orange-500 bg-clip-text text-transparent drop-shadow">
                      x{gift.combo_count || 1}
                    </span>
                  </div>
                </motion.div>
              );
            })}
        </AnimatePresence>
      </div>

      {/* TRACK B (500 COINS): THE ROCKET DIAGONAL LAUNCH */}
      <AnimatePresence>
        {isRocket && activeMega && (
          <motion.div
            key={activeMega.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-sm"
          >
            <motion.div
              initial={{ x: -240, y: 380, scale: 0.4, rotate: 35 }}
              animate={{
                x: [null, 0, 260],
                y: [null, 0, -420],
                scale: [0.4, 1.5, 1.1]
              }}
              transition={{ duration: 2.6, ease: 'easeInOut' }}
              className="relative flex flex-col items-center"
            >
              <span className="text-8xl drop-shadow-[0_0_45px_rgba(251,146,60,0.95)]">
                🚀
              </span>
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 1, scale: 1, x: 0, y: 20 }}
                  animate={{
                    opacity: 0,
                    scale: 0,
                    x: (i % 2 === 0 ? -1 : 1) * (15 + i * 6),
                    y: 70 + i * 14
                  }}
                  transition={{ duration: 0.7, repeat: 3, delay: i * 0.06 }}
                  className="absolute top-16 h-3.5 w-3.5 rounded-full bg-gradient-to-t from-red-500 via-orange-400 to-yellow-200 shadow-[0_0_12px_#f97316]"
                />
              ))}
            </motion.div>

            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 60 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="absolute bottom-44 rounded-2xl bg-gradient-to-r from-orange-600/90 via-amber-500/90 to-pink-600/90 p-0.5 shadow-[0_0_40px_rgba(249,115,22,0.8)]"
            >
              <div className="flex items-center gap-3 rounded-2xl bg-black/80 backdrop-blur-2xl px-5 py-3">
                <span className="text-3xl">🚀</span>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-widest text-amber-300">
                    SUPERSONIC LAUNCH
                  </p>
                  <p className="text-sm font-black text-white">
                    @{activeMega.sender_username} launched The Rocket!
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TRACK B (5000 COINS): EARNMEGA UNIVERSE FULL-SCREEN CINEMATIC TAKEOVER */}
      <AnimatePresence>
        {isUniverse && activeMega && (
          <motion.div
            key={activeMega.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-3xl"
          >
            <motion.div
              initial={{ y: '-100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-100%' }}
              transition={{ duration: 0.5 }}
              className="absolute top-0 inset-x-0 h-16 bg-black border-b border-amber-400/30 z-20"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.5 }}
              className="absolute bottom-0 inset-x-0 h-16 bg-black border-t border-amber-400/30 z-20"
            />

            {Array.from({ length: 20 }).map((_, idx) => {
              const angle = (idx / 20) * Math.PI * 2;
              const distance = 130 + (idx % 3) * 45;
              return (
                <motion.div
                  key={idx}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                  animate={{
                    x: Math.cos(angle) * distance,
                    y: Math.sin(angle) * distance,
                    scale: [0, 1.3, 0],
                    opacity: [1, 1, 0]
                  }}
                  transition={{ duration: 2.8, delay: 0.3, ease: 'easeOut' }}
                  className="absolute text-lg"
                >
                  {idx % 2 === 0 ? '✨' : '💎'}
                </motion.div>
              );
            })}

            <motion.div
              initial={{ scale: 0.1, rotate: -90, opacity: 0 }}
              animate={{
                scale: [0.1, 1.25, 1],
                rotate: [0, 180, 360],
                opacity: 1
              }}
              transition={{ duration: 3.6, ease: 'easeOut' }}
              className="relative flex h-56 w-56 items-center justify-center rounded-full bg-gradient-to-tr from-purple-700/40 via-pink-500/30 to-amber-400/40 shadow-[0_0_120px_rgba(251,191,36,0.75)] border border-amber-300/50"
            >
              <span className="text-8xl drop-shadow-[0_0_40px_rgba(255,255,255,0.95)]">
                🌌
              </span>
            </motion.div>

            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.85 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.35, duration: 0.6 }}
              className="mt-8 text-center px-6 z-30"
            >
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 border border-amber-300/50 px-4 py-1 text-[11px] font-black uppercase tracking-[0.25em] text-amber-200 mb-2">
                <Crown className="h-3.5 w-3.5 text-amber-400" />
                WORLD-CLASS PATRON
              </div>
              <h2
                style={{
                  backgroundImage:
                    'linear-gradient(110deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
                className="text-2xl font-black tracking-tight drop-shadow-[0_4px_20px_rgba(251,191,36,0.5)]"
              >
                @{activeMega.sender_username} GIFTED THE UNIVERSE!
              </h2>
              <p className="mt-1 text-xs font-bold text-white/80">
                5,000 Coins • Ultimate Arena Takeover
              </p>
            </motion.div>

            <AnimatePresence>
              {universeFlash && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45 }}
                  className="absolute inset-0 z-50 bg-white"
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
MasterLiveGiftOverlay.displayName = 'MasterLiveGiftOverlay';

// ============================================================================
// REALTIME LIVEKIT BRIDGE (HD VIDEO, 48KHZ CLEAR AUDIO, LIKES, GIFTS & MIC)
// ============================================================================
export interface LiveKitBridgeRef {
  sendPacket: (payload: Record<string, any>) => Promise<void>;
  broadcastEnd: (duration: string, peakViewers: number) => Promise<void>;
  unlockAudio: () => void;
}

const LiveKitRoomBridge = forwardRef<
  LiveKitBridgeRef,
  {
    role: UserRole;
    localStream: MediaStream | null;
    isMicMuted: boolean;
    isCamOff: boolean;
    isAcceptedSpeaker: boolean;
    hostId?: string;
    hostUsername?: string;
    onViewerCountChange: (count: number) => void;
    onHostEnded: (duration?: string, peak?: number) => void;
    onPacketReceived: (packet: Record<string, any>) => void;
  }
>(
  (
    {
      role,
      localStream,
      isMicMuted,
      isCamOff,
      isAcceptedSpeaker,
      hostId,
      hostUsername,
      onViewerCountChange,
      onHostEnded,
      onPacketReceived
    },
    ref
  ) => {
    const room = useRoomContext();
    const { localParticipant } = useLocalParticipant();
    const connectionState = useConnectionState();
    const participants = useParticipants();
    const publishedVideoTrackRef = useRef<MediaStreamTrack | null>(null);

    useImperativeHandle(ref, () => ({
      sendPacket: async (payload: Record<string, any>) => {
        if (localParticipant && connectionState === ConnectionState.Connected) {
          try {
            const encoded = new TextEncoder().encode(JSON.stringify(payload));
            await localParticipant.publishData(encoded, { reliable: true });
          } catch (err) {
            console.warn('Data packet publish warning:', err);
          }
        }
      },
      broadcastEnd: async (duration: string, peakViewers: number) => {
        if (localParticipant && connectionState === ConnectionState.Connected) {
          try {
            const encoded = new TextEncoder().encode(
              JSON.stringify({ type: 'HOST_ENDED_LIVE', duration, peakViewers })
            );
            await localParticipant.publishData(encoded, { reliable: true });
          } catch {}
        }
      },
      unlockAudio: () => {
        if (room) {
          room.startAudio().catch(() => {});
        }
      }
    }));

    // Unlock browser audio output as soon as room connects
    useEffect(() => {
      if (room && connectionState === ConnectionState.Connected) {
        room.startAudio().catch(() => {});
      }
    }, [room, connectionState]);

    // Track remote viewer count accurately
    useEffect(() => {
      const viewers = participants.filter((p) => {
        const id = p.identity || '';
        if (hostId && (id === hostId || id === `host_${hostId}` || id.includes(hostId))) {
          return false;
        }
        if (hostUsername && id === hostUsername) {
          return false;
        }
        return true;
      });
      onViewerCountChange(viewers.length);
    }, [participants, hostId, hostUsername, onViewerCountChange]);

    // Host HD 720p/1080p Video Track Publisher (3.0 Mbps, No Simulcast Blur)
    useEffect(() => {
      if (
        role !== 'host' ||
        connectionState !== ConnectionState.Connected ||
        !localParticipant
      ) {
        return;
      }

      let isCancelled = false;

      const publishHighDefVideo = async () => {
        try {
          const videoTrack = localStream?.getVideoTracks()?.[0];
          if (videoTrack && videoTrack.readyState === 'live') {
            try {
              videoTrack.contentHint = 'motion';
            } catch {}

            if (
              publishedVideoTrackRef.current &&
              publishedVideoTrackRef.current !== videoTrack
            ) {
              await localParticipant
                .unpublishTrack(publishedVideoTrackRef.current, false)
                .catch(() => {});
              publishedVideoTrackRef.current = null;
            }

            const existingPub = localParticipant.getTrackPublication(
              Track.Source.Camera
            );
            if (!existingPub) {
              await localParticipant.publishTrack(videoTrack, {
                name: 'camera',
                source: Track.Source.Camera,
                simulcast: false,
                videoEncoding: {
                  maxBitrate: 3_000_000,
                  maxFramerate: 30
                }
              });
              if (!isCancelled) {
                publishedVideoTrackRef.current = videoTrack;
              }
            }
          } else {
            await localParticipant.setCameraEnabled(!isCamOff, {
              resolution: { width: 1280, height: 720, frameRate: 30 }
            });
          }
        } catch (err) {
          console.warn('HD video publish fallback:', err);
          try {
            await localParticipant.setCameraEnabled(!isCamOff);
          } catch {}
        }
      };

      publishHighDefVideo();

      return () => {
        isCancelled = true;
      };
    }, [role, connectionState, localParticipant, localStream, isCamOff]);

    // Host camera mute/unmute toggle
    useEffect(() => {
      if (role === 'host' && localStream) {
        localStream.getVideoTracks().forEach((t) => {
          t.enabled = !isCamOff;
        });
      }
    }, [role, localStream, isCamOff]);

    // Studio-Clear 48kHz Audio Control for BOTH Host AND Accepted Viewer Speaker
    useEffect(() => {
      if (connectionState !== ConnectionState.Connected || !localParticipant) return;

      const shouldPublishAudio =
        (role === 'host' && !isMicMuted) ||
        (role === 'viewer' && isAcceptedSpeaker && !isMicMuted);

      if (!shouldPublishAudio) {
        localParticipant.setMicrophoneEnabled(false).catch(() => {});
        return;
      }

      localParticipant
        .setMicrophoneEnabled(true, {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        })
        .catch(() => {
          // If screen recorder is holding the mic, keep video running smoothly without crashing
        });
    }, [role, isAcceptedSpeaker, isMicMuted, connectionState, localParticipant]);

    // Listen for all incoming DataChannel packets & Host disconnect
    useEffect(() => {
      if (!room) return;

      const handleData = (payload: Uint8Array) => {
        try {
          const data = JSON.parse(new TextDecoder().decode(payload));
          if (data.type === 'HOST_ENDED_LIVE') {
            onHostEnded(data.duration, data.peakViewers);
          } else {
            onPacketReceived(data);
          }
        } catch {}
      };

      const handleParticipantDisconnected = (participant: any) => {
        const id = participant?.identity || '';
        if (
          role === 'viewer' &&
          ((hostId &&
            (id === hostId || id === `host_${hostId}` || id.includes(hostId))) ||
            (hostUsername && id === hostUsername))
        ) {
          onHostEnded();
        } else if (id) {
          onPacketReceived({
            type: 'PARTICIPANT_LEFT',
            identity: id
          });
        }
      };

      room.on(RoomEvent.DataReceived, handleData);
      room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

      return () => {
        room.off(RoomEvent.DataReceived, handleData);
        room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      };
    }, [room, role, hostId, hostUsername, onHostEnded, onPacketReceived]);

    return null;
  }
);
LiveKitRoomBridge.displayName = 'LiveKitRoomBridge';

// ============================================================================
// VIEWER VIDEO STAGE (FORCES HIGH QUALITY HD SUBSCRIPTION)
// ============================================================================
function ViewerVideoStage({ beautyMode }: { beautyMode: boolean }) {
  const subscribedTracks = useTracks(
    [Track.Source.Camera, Track.Source.Unknown],
    { onlySubscribed: true }
  );
  const allTracks = useTracks(
    [Track.Source.Camera, Track.Source.Unknown],
    { onlySubscribed: false }
  );

  const remoteTrack =
    subscribedTracks.find(
      (t) => !t.participant.isLocal && t.publication?.track
    ) ||
    allTracks.find(
      (t) =>
        !t.participant.isLocal &&
        t.publication?.track &&
        t.publication.kind === Track.Kind.Video
    );

  // Force LiveKit SFU to send HIGH video quality layer and full framerate to viewer
  useEffect(() => {
    const pub: any = remoteTrack?.publication;
    if (pub) {
      try {
        pub.setSubscribed?.(true);
        pub.setVideoQuality?.(VideoQuality.HIGH);
        pub.setVideoFPS?.(30);
      } catch {}
    }
  }, [remoteTrack]);

  if (remoteTrack) {
    return (
      <div className="relative h-full w-full bg-[#070709] overflow-hidden">
        <VideoTrack
          trackRef={remoteTrack as any}
          className={`h-full w-full object-cover transition-all duration-500 ${
            beautyMode ? 'brightness-105 contrast-105 saturate-110' : ''
          }`}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-[#12091d] via-[#09090d] to-black">
      <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-pink-500/10 border border-pink-500/30">
        <div className="absolute inset-0 rounded-full border-2 border-pink-500 animate-ping opacity-30" />
        <Radio className="h-10 w-10 text-pink-500 animate-pulse" />
      </div>
      <p className="mt-4 text-sm font-medium text-white/70 tracking-wide">
        Connecting High-Definition Stream...
      </p>
    </div>
  );
}

// ============================================================================
// MAIN LIVE ARENA COMPONENT
// ============================================================================
export default function LiveArena({ currentUser, onClose, onBack }: LiveArenaProps) {
  const [isMounted, setIsMounted] = useState(false);
  const isInitializingRef = useRef<boolean>(false);
  const viewerLeavingIntentionallyRef = useRef<boolean>(false);
  const processedPacketIdsRef = useRef<Set<string>>(new Set());

  const [user, setUser] = useState(
    currentUser || {
      id: 'default-user-id',
      username: 'MegaCreator',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=EarnMega',
      coin_balance: 50000
    }
  );

  // Core Stage Machine
  const [stage, setStage] = useState<ArenaStage>('lobby');
  const [role, setRole] = useState<UserRole>('viewer');
  const [livekitToken, setLivekitToken] = useState<string>('');
  const [livekitServerUrl, setLivekitServerUrl] = useState<string>(
    process.env.NEXT_PUBLIC_LIVEKIT_URL || DEFAULT_LIVEKIT_URL
  );
  const [liveDuration, setLiveDuration] = useState<string>('00:00');
  const [endedAtFormatted, setEndedAtFormatted] = useState<string>('');
  const [streamStartMs, setStreamStartMs] = useState<number | null>(null);
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [peakViewers, setPeakViewers] = useState<number>(0);

  // Lobby State
  const [activeStreams, setActiveStreams] = useState<LiveStreamRecord[]>([]);
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

  // Gift Drawer & Instant Animation Ref
  const [isGiftDrawerOpen, setIsGiftDrawerOpen] = useState<boolean>(false);
  const [selectedGiftId, setSelectedGiftId] = useState<string>('rose_1');
  const [quickRoseCombo, setQuickRoseCombo] = useState<number>(0);
  const [coinPopTrigger, setCoinPopTrigger] = useState<boolean>(false);
  const giftOverlayRef = useRef<GiftOverlayHandle>(null);

  // Viewer Mic / Co-Host Request State (Private to Host until Accepted)
  const [micRequestStatus, setMicRequestStatus] = useState<MicRequestStatus>('idle');
  const [pendingMicRequests, setPendingMicRequests] = useState<MicSpeakerRequest[]>([]);
  const [activeSpeakers, setActiveSpeakers] = useState<MicSpeakerRequest[]>([]);

  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const liveHostVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const livekitBridgeRef = useRef<LiveKitBridgeRef>(null);
  const realtimeEventChannelRef = useRef<any>(null);

  const handleViewerCountChange = useCallback((count: number) => {
    setViewerCount(count);
    setPeakViewers((prev) => Math.max(prev, count));
  }, []);

  // --------------------------------------------------------------------------
  // CAMERA STREAM LIFECYCLE (KEPT CONTINUOUS FOR HOST FROM SETUP -> LIVE)
  // --------------------------------------------------------------------------
  const stopCameraTracks = useCallback(() => {
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
    if (liveHostVideoRef.current) {
      liveHostVideoRef.current.srcObject = null;
    }
    setLocalStream(null);
  }, []);

  const removeGhostStream = useCallback(
    async (streamId: string, hostId?: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setActiveStreams((prev) => prev.filter((s) => s.id !== streamId));
      try {
        await supabase.from('live_streams').delete().eq('id', streamId);
        if (hostId) {
          await supabase.from('live_streams').delete().eq('host_id', hostId);
        }
      } catch {}
    },
    []
  );

  // --------------------------------------------------------------------------
  // UNIFIED PACKET RECEIVER (DEDUPLICATED ACROSS LIVEKIT & SUPABASE BROADCAST)
  // --------------------------------------------------------------------------
  const spawnVisualHeartOnly = useCallback(() => {
    const colors = ['#FF2E93', '#00F5D4', '#FFD700', '#FF5E00', '#9B5DE5'];
    const newHeart: FloatingHeart = {
      id: Date.now() + Math.random(),
      xOffset: Math.floor(Math.random() * 60) - 30,
      color: colors[Math.floor(Math.random() * colors.length)]
    };
    setFloatingHearts((prev) => [...prev.slice(-18), newHeart]);
  }, []);

  const handleIncomingArenaPacket = useCallback(
    (packet: Record<string, any>) => {
      if (!packet || !packet.type) return;

      // Deduplicate packets received over both LiveKit DataChannel and Supabase Broadcast
      if (packet.packetId) {
        if (processedPacketIdsRef.current.has(packet.packetId)) return;
        processedPacketIdsRef.current.add(packet.packetId);
      }

      // Ignore self-echo for likes/gifts/comments that were already applied optimistically
      if (
        packet.senderId &&
        packet.senderId === user.id &&
        (packet.type === 'LIVE_LIKE' ||
          packet.type === 'LIVE_GIFT' ||
          packet.type === 'LIVE_COMMENT')
      ) {
        return;
      }

      switch (packet.type) {
        case 'LIVE_LIKE': {
          setLikeCount((prev) => prev + 1);
          spawnVisualHeartOnly();
          break;
        }

        case 'LIVE_GIFT': {
          const giftEvt = packet.gift as LiveGiftEvent;
          if (giftEvt) {
            giftOverlayRef.current?.triggerGift(giftEvt);
            const totalCost = (giftEvt.coin_value || 1) * (giftEvt.combo_count || 1);
            setCurrentStream((prev) =>
              prev
                ? {
                    ...prev,
                    gift_goal_current: (prev.gift_goal_current || 0) + totalCost,
                    total_coins_earned: (prev.total_coins_earned || 0) + totalCost
                  }
                : null
            );
            setComments((prev) => {
              const msgId = `gift-msg-${giftEvt.id}`;
              if (prev.some((c) => c.id === msgId)) return prev;
              return [
                ...prev.slice(-60),
                {
                  id: msgId,
                  username: giftEvt.sender_username,
                  content: `sent ${giftEvt.gift_icon} ${giftEvt.gift_name} x${
                    giftEvt.combo_count || 1
                  }!`,
                  is_system: true
                }
              ];
            });
          }
          break;
        }

        case 'LIVE_COMMENT': {
          if (packet.comment) {
            setComments((prev) => {
              if (prev.some((c) => c.id === packet.comment.id)) return prev;
              return [...prev.slice(-60), packet.comment];
            });
          }
          break;
        }

        case 'MIC_REQUEST': {
          // ONLY the Host receives and stores pending mic requests
          if (roleRef.current === 'host' && packet.requester) {
            const req: MicSpeakerRequest = packet.requester;
            setPendingMicRequests((prev) => {
              if (prev.some((r) => r.userId === req.userId)) return prev;
              return [...prev, req];
            });
          }
          break;
        }

        case 'MIC_CANCEL': {
          if (roleRef.current === 'host' && packet.userId) {
            setPendingMicRequests((prev) =>
              prev.filter((r) => r.userId !== packet.userId)
            );
          }
          break;
        }

        case 'MIC_ACCEPTED': {
          if (packet.speaker) {
            const spk: MicSpeakerRequest = packet.speaker;
            setActiveSpeakers((prev) => {
              if (prev.some((s) => s.userId === spk.userId)) return prev;
              return [...prev, spk];
            });
            if (spk.userId === user.id) {
              setMicRequestStatus('accepted');
              setIsMicMuted(false);
              toast.success('Host accepted your request! Your mic is now LIVE.');
            }
          }
          break;
        }

        case 'MIC_DECLINED': {
          if (packet.targetUserId === user.id) {
            setMicRequestStatus('idle');
            toast('Host declined your mic request.');
          }
          break;
        }

        case 'MIC_REMOVED': {
          if (packet.targetUserId) {
            setActiveSpeakers((prev) =>
              prev.filter((s) => s.userId !== packet.targetUserId)
            );
            if (packet.targetUserId === user.id) {
              setMicRequestStatus('idle');
              setIsMicMuted(true);
              toast('Your mic session has ended.');
            }
          }
          break;
        }

        case 'PARTICIPANT_LEFT': {
          if (packet.identity) {
            setPendingMicRequests((prev) => prev.filter((r) => r.userId !== packet.identity));
            setActiveSpeakers((prev) => prev.filter((s) => s.userId !== packet.identity));
          }
          break;
        }
      }
    },
    [user.id, spawnVisualHeartOnly]
  );

  // Dispatch packet across BOTH LiveKit DataChannel & Supabase Broadcast
  const dispatchArenaPacket = useCallback(
    async (payload: Record<string, any>) => {
      const packetId = `pkt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      processedPacketIdsRef.current.add(packetId);
      const fullPayload = { ...payload, packetId, senderId: user.id };

      if (livekitBridgeRef.current) {
        await livekitBridgeRef.current.sendPacket(fullPayload);
      }
      if (realtimeEventChannelRef.current) {
        try {
          realtimeEventChannelRef.current.send({
            type: 'broadcast',
            event: 'arena-packet',
            payload: fullPayload
          });
        } catch {}
      }
    },
    [user.id]
  );

  // --------------------------------------------------------------------------
  // HOST BROADCAST INITIALIZATION
  // --------------------------------------------------------------------------
  const initializeHostBroadcast = useCallback(async () => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    let activeUserId = user.id;
    let activeUsername = user.username || 'Creator';
    let activeAvatar = user.avatar_url;

    if (!activeUserId || activeUserId === 'default-user-id') {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          activeUserId = authData.user.id;
          const { data: prof } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', activeUserId)
            .maybeSingle();
          if (prof?.username) activeUsername = prof.username;
          if (prof?.avatar_url) activeAvatar = prof.avatar_url;

          setUser((prev) => ({
            ...prev,
            id: activeUserId,
            username: activeUsername,
            avatar_url: activeAvatar
          }));
        }
      } catch {}
    }

    // Canonical room name based on host_id so Host and Viewers ALWAYS match
    const roomId = `live_${activeUserId}`;
    const finalTitle = streamTitle.trim() || `${activeUsername}'s VIP Live`;
    let insertedStreamDbId: string | null = null;
    const nowIso = new Date().toISOString();

    try {
      await supabase.from('live_streams').delete().eq('host_id', activeUserId);

      const insertPayload = {
        host_id: activeUserId,
        host_username: activeUsername,
        host_avatar: activeAvatar,
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
        started_at: nowIso
      };

      const { data, error } = await supabase
        .from('live_streams')
        .insert([insertPayload])
        .select()
        .single();

      if (error) {
        const fallbackPayload = {
          host_id: activeUserId,
          host_username: activeUsername,
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
    } catch (err) {
      console.error('Stream DB initialization warning:', err);
    }

    const activeHostStream: LiveStreamRecord = {
      id: insertedStreamDbId || roomId,
      host_id: activeUserId,
      host_username: activeUsername,
      host_avatar: activeAvatar,
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
      started_at: nowIso
    };
    setCurrentStream(activeHostStream);

    try {
      const hostIdentity = `host_${activeUserId}`;
      const res = await fetch(
        `/api/livekit?room=${encodeURIComponent(roomId)}&username=${encodeURIComponent(
          hostIdentity
        )}&role=host`
      );
      const data = await res.json();
      if (!res.ok || !data.token) {
        throw new Error(data?.error || 'Failed to fetch LiveKit token');
      }
      setLivekitServerUrl(data.wsUrl || data.url || DEFAULT_LIVEKIT_URL);
      setLivekitToken(data.token);
      setComments([
        {
          id: 'welcome-sys',
          username: 'EarnMega AI',
          content:
            'Welcome to EarnMega Live Arena! Tap gifts to test animations for FREE or request the mic to speak.',
          is_system: true
        }
      ]);
    } catch (err: any) {
      console.error('[LIVEKIT PIPELINE] Host Token Error:', err);
      toast.error(err?.message || 'LiveKit token warning');
    } finally {
      isInitializingRef.current = false;
    }
  }, [user, streamTitle, setupCategory, giftGoal, allowCohost]);

  // --------------------------------------------------------------------------
  // HOST START STREAM WORKFLOW
  // --------------------------------------------------------------------------
  const handleStartCountdown = () => {
    setConnectionError(null);
    setLiveDuration('00:00');
    setStreamStartMs(null);
    setViewerCount(0);
    setPeakViewers(0);
    setLikeCount(0);
    setPendingMicRequests([]);
    setActiveSpeakers([]);
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
    stopCameraTracks();
    setRole('viewer');
    roleRef.current = 'viewer';
    setMicRequestStatus('idle');
    setPendingMicRequests([]);
    setActiveSpeakers([]);
    setLikeCount(0);
    setCurrentStream(stream);
    setLiveDuration('00:00');
    setViewerCount(stream.viewer_count || 1);
    setPeakViewers(stream.viewer_count || 1);
    setStreamStartMs(
      stream.started_at || stream.created_at
        ? new Date((stream.started_at || stream.created_at) as string).getTime()
        : Date.now()
    );

    // Canonical room name based on host_id so Host and Viewer always connect to the exact same room
    const actualRoomName = `live_${stream.host_id || (stream as any).user_id}`;
    const viewerIdentity = `viewer_${user.username || 'user'}_${Math.random()
      .toString(36)
      .substring(2, 7)}`;

    try {
      // Request with role=host on the token endpoint so the viewer has permission to publish DataPackets & Co-Host Audio when accepted
      const res = await fetch(
        `/api/livekit?room=${encodeURIComponent(actualRoomName)}&username=${encodeURIComponent(
          viewerIdentity
        )}&role=host`
      );
      const data = await res.json();
      if (!res.ok || !data.token) {
        throw new Error(data?.error || 'No token returned from server.');
      }
      setLivekitServerUrl(data.wsUrl || data.url || DEFAULT_LIVEKIT_URL);
      setLivekitToken(data.token);
    } catch (err: any) {
      console.error('[LIVEKIT PIPELINE] Viewer Token Error:', err);
      toast.error(err?.message || 'Could not connect to stream.');
      setCurrentStream(null);
      return;
    }

    const joinComment: LiveComment = {
      id: `join-${Date.now()}-${user.id.slice(0, 4)}`,
      username: user.username,
      content: 'joined the LIVE',
      is_system: true
    };
    setComments([joinComment]);
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
  // INTERACTIVE ACTIONS (CHAT, SYNCED LIKES, FREE GIFTS, MIC REQUESTS)
  // --------------------------------------------------------------------------
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !currentStream) return;
    const text = commentInput.trim();
    setCommentInput('');
    const tempMsg: LiveComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      username: user.username,
      avatar_url: user.avatar_url,
      content: text,
      badge_level: 14
    };
    setComments((prev) => [...prev.slice(-60), tempMsg]);

    await dispatchArenaPacket({
      type: 'LIVE_COMMENT',
      comment: tempMsg
    });

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

  // Synced Like Action: Shows on Viewer AND Host screen in real time
  const spawnFloatingHeart = useCallback(() => {
    livekitBridgeRef.current?.unlockAudio();
    setLikeCount((prev) => prev + 1);
    spawnVisualHeartOnly();
    dispatchArenaPacket({
      type: 'LIVE_LIKE',
      username: user.username
    });
  }, [spawnVisualHeartOnly, dispatchArenaPacket, user.username]);

  // 100% Free Gift Dispatch (Zero Paywall, Plays Animation on Both Screens)
  const handleDispatchGift = async (gift: GiftTierItem, comboCount = 1) => {
    if (!currentStream) return;
    livekitBridgeRef.current?.unlockAudio();
    const totalCost = gift.coins * comboCount;

    setCoinPopTrigger(true);
    setTimeout(() => setCoinPopTrigger(false), 550);

    const giftEvent: LiveGiftEvent = {
      id: `gift-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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

    // 1. Trigger local animation & goal update immediately via imperative ref
    giftOverlayRef.current?.triggerGift(giftEvent);
    setCurrentStream((prev) =>
      prev
        ? {
            ...prev,
            gift_goal_current: (prev.gift_goal_current || 0) + totalCost,
            total_coins_earned: (prev.total_coins_earned || 0) + totalCost
          }
        : null
    );
    setComments((prev) => [
      ...prev.slice(-60),
      {
        id: `gift-sys-${giftEvent.id}`,
        username: user.username,
        content: `sent ${gift.icon} ${gift.name} x${comboCount}!`,
        is_system: true
      }
    ]);

    // 2. Broadcast over LiveKit DataChannel + Supabase Broadcast so Host & all Viewers see the animation immediately
    await dispatchArenaPacket({
      type: 'LIVE_GIFT',
      gift: giftEvent
    });

    // 3. Best-effort DB persistence (never blocks animation)
    try {
      await supabase.from('live_gifts').insert([
        {
          stream_id: currentStream.id,
          sender_id: user.id,
          sender_username: user.username,
          sender_avatar: user.avatar_url,
          gift_id: gift.id,
          gift_name: gift.name,
          gift_icon: gift.icon,
          coin_value: gift.coins,
          combo_count: comboCount
        }
      ]);
    } catch {}
  };

  const handleQuickRoseGift = () => {
    const nextCombo = quickRoseCombo + 1;
    setQuickRoseCombo(nextCombo);
    handleDispatchGift(LUXURY_GIFT_CATALOG[0], 1);
  };

  // --------------------------------------------------------------------------
  // VIEWER MIC REQUEST & HOST ACCEPT/DECLINE WORKFLOW
  // --------------------------------------------------------------------------
  const handleToggleMicRequest = async () => {
    livekitBridgeRef.current?.unlockAudio();
    if (micRequestStatus === 'idle') {
      const reqPayload: MicSpeakerRequest = {
        userId: user.id,
        username: user.username,
        avatarUrl: user.avatar_url,
        requestedAt: Date.now()
      };
      setMicRequestStatus('pending');
      await dispatchArenaPacket({
        type: 'MIC_REQUEST',
        requester: reqPayload
      });
      toast.success('Mic request sent privately to Host');
    } else if (micRequestStatus === 'pending') {
      setMicRequestStatus('idle');
      await dispatchArenaPacket({
        type: 'MIC_CANCEL',
        userId: user.id
      });
      toast('Mic request cancelled');
    } else if (micRequestStatus === 'accepted') {
      setMicRequestStatus('idle');
      setIsMicMuted(true);
      setActiveSpeakers((prev) => prev.filter((s) => s.userId !== user.id));
      await dispatchArenaPacket({
        type: 'MIC_REMOVED',
        targetUserId: user.id
      });
      toast('You left the mic');
    }
  };

  const handleHostAcceptMicRequest = async (req: MicSpeakerRequest) => {
    setPendingMicRequests((prev) => prev.filter((r) => r.userId !== req.userId));
    setActiveSpeakers((prev) => {
      if (prev.some((s) => s.userId === req.userId)) return prev;
      return [...prev, req];
    });
    await dispatchArenaPacket({
      type: 'MIC_ACCEPTED',
      speaker: req
    });
    toast.success(`Accepted @${req.username} to speak live!`);
  };

  const handleHostDeclineMicRequest = async (req: MicSpeakerRequest) => {
    setPendingMicRequests((prev) => prev.filter((r) => r.userId !== req.userId));
    await dispatchArenaPacket({
      type: 'MIC_DECLINED',
      targetUserId: req.userId
    });
  };

  const handleHostRemoveSpeaker = async (targetUserId: string) => {
    setActiveSpeakers((prev) => prev.filter((s) => s.userId !== targetUserId));
    await dispatchArenaPacket({
      type: 'MIC_REMOVED',
      targetUserId
    });
  };

  // --------------------------------------------------------------------------
  // END OR LEAVE STREAM
  // --------------------------------------------------------------------------
  const handleEndOrLeaveStream = async () => {
    if (role === 'host') {
      if (livekitBridgeRef.current) {
        try {
          await livekitBridgeRef.current.broadcastEnd(liveDuration, peakViewers);
        } catch {}
      }
      stopCameraTracks();

      try {
        await supabase.from('live_streams').delete().eq('host_id', currentStream?.host_id || user.id);
        if (currentStreamDbId || currentStream?.id) {
          await supabase.from('live_streams').delete().eq('id', currentStreamDbId || currentStream?.id);
        }
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
      viewerLeavingIntentionallyRef.current = true;
      if (micRequestStatus !== 'idle') {
        await dispatchArenaPacket({
          type: 'MIC_REMOVED',
          targetUserId: user.id
        });
      }
      setMicRequestStatus('idle');
      setLivekitToken('');
      setCurrentStream(null);
      setCurrentStreamDbId(null);
      setStage('lobby');
    }
  };

  const handleHostEnded = useCallback((durationStr?: string, peak?: number) => {
    if (roleRef.current === 'viewer' && !viewerLeavingIntentionallyRef.current) {
      if (durationStr) setLiveDuration(durationStr);
      if (peak !== undefined) setPeakViewers(peak);

      setEndedAtFormatted(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
      setMicRequestStatus('idle');
      setLivekitToken('');
      setStage('ended');
    }
  }, []);

  // Canonical Supabase Realtime Broadcast Channel for Likes, Gifts, Comments & Mic Requests
  useEffect(() => {
    if (stage !== 'live' || !currentStream) return;

    const canonicalRoomKey = `live_${currentStream.host_id}`;

    const eventChannel = supabase
      .channel(`arena_sync_${canonicalRoomKey}`, {
        config: {
          broadcast: { self: false, ack: false }
        }
      })
      .on('broadcast', { event: 'arena-packet' }, (payload) => {
        if (payload?.payload) {
          handleIncomingArenaPacket(payload.payload);
        }
      })
      .subscribe();

    realtimeEventChannelRef.current = eventChannel;

    return () => {
      realtimeEventChannelRef.current = null;
      supabase.removeChannel(eventChannel);
    };
  }, [stage, currentStream, handleIncomingArenaPacket]);

  // Viewer stream-end listener
  useEffect(() => {
    if (stage !== 'live' || role !== 'viewer' || !currentStream) return;

    const streamId = currentStream.id;

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
      .subscribe();

    const pollInterval = setInterval(async () => {
      if (!streamId || String(streamId).startsWith('live_')) return;
      try {
        const { data, error } = await supabase
          .from('live_streams')
          .select('*')
          .eq('id', streamId)
          .maybeSingle();

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
      const streamId = currentStreamDbIdRef.current || currentStream?.id;
      const currentRole = roleRef.current;
      if (currentRole === 'host') {
        if (streamId) {
          supabase.from('live_streams').delete().eq('id', streamId);
        }
        supabase.from('live_streams').delete().eq('host_id', currentStream?.host_id || user.id);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user.id, currentStream]);

  useEffect(() => {
    async function initUser() {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user && !currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, coin_balance, coins')
          .eq('id', authData.user.id)
          .maybeSingle();
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
                : 50000
          });
        } else {
          setUser((prev) => ({
            ...prev,
            id: authData.user.id
          }));
        }
      }
    }
    initUser();
  }, [currentUser]);

  // Fetch active streams & enrich missing avatars from 'profiles'
  useEffect(() => {
    const fetchStreams = async () => {
      try {
        const { data, error } = await supabase.from('live_streams').select('*');
        if (error || !data) return;

        const validStreams = data.filter(
          (s: any) => s.status !== 'ended' && s.is_live !== false
        );

        const hostIds = Array.from(
          new Set(validStreams.map((s: any) => s.host_id).filter(Boolean))
        );
        const avatarMap: Record<string, string> = {};

        if (hostIds.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, avatar_url')
            .in('id', hostIds);
          if (profs) {
            profs.forEach((p: any) => {
              if (p.avatar_url) avatarMap[p.id] = p.avatar_url;
            });
          }
        }

        const enriched: LiveStreamRecord[] = validStreams.map((s: any) => ({
          ...s,
          host_username: s.host_username || 'Creator',
          host_avatar:
            s.host_avatar ||
            avatarMap[s.host_id] ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
              s.host_username || s.host_id || 'Host'
            )}`,
          title: s.title || `${s.host_username || 'Creator'}'s VIP Live`,
          category: s.category || 'Just Chatting'
        }));

        setActiveStreams(enriched);
      } catch (err) {
        console.warn('Error fetching live streams:', err);
      }
    };

    fetchStreams();

    const interval = setInterval(() => {
      if (stage === 'lobby') {
        fetchStreams();
      }
    }, 2500);

    const channel = supabase
      .channel('live_streams_lobby_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_streams' },
        () => {
          fetchStreams();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [stage]);

  // Keep Host Camera Active in HD across 'setup' -> 'countdown' -> 'live'
  useEffect(() => {
    const needsHostCamera =
      stage === 'setup' ||
      stage === 'countdown' ||
      (stage === 'live' && role === 'host');

    if (needsHostCamera) {
      let isCancelled = false;

      const ensureCamera = async () => {
        const current = localStreamRef.current;
        const currentFacing = current
          ?.getVideoTracks()?.[0]
          ?.getSettings?.()?.facingMode;

        if (
          current &&
          current.active &&
          current.getVideoTracks().some((t) => t.readyState === 'live') &&
          (!currentFacing || currentFacing === facingMode)
        ) {
          if (
            stage === 'live' &&
            liveHostVideoRef.current &&
            liveHostVideoRef.current.srcObject !== current
          ) {
            liveHostVideoRef.current.srcObject = current;
            liveHostVideoRef.current.play().catch(() => {});
          } else if (
            previewVideoRef.current &&
            previewVideoRef.current.srcObject !== current
          ) {
            previewVideoRef.current.srcObject = current;
            previewVideoRef.current.play().catch(() => {});
          }
          return;
        }

        if (current) {
          current.getTracks().forEach((t) => t.stop());
          localStreamRef.current = null;
        }

        try {
          let stream: MediaStream;
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 }
              },
              audio: false
            });
          } catch {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode },
              audio: false
            });
          }

          if (isCancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }

          localStreamRef.current = stream;
          setLocalStream(stream);

          if (previewVideoRef.current) {
            previewVideoRef.current.srcObject = stream;
            previewVideoRef.current.play().catch(() => {});
          }
          if (liveHostVideoRef.current) {
            liveHostVideoRef.current.srcObject = stream;
            liveHostVideoRef.current.play().catch(() => {});
          }
        } catch (err) {
          console.error('Camera acquisition error:', err);
          toast.error('Unable to access camera. Check browser permissions.');
        }
      };

      ensureCamera();
      return () => {
        isCancelled = true;
      };
    } else {
      stopCameraTracks();
    }
  }, [stage, role, facingMode, stopCameraTracks]);

  // 3-2-1 Countdown Lifecycle
  useEffect(() => {
    if (stage !== 'countdown') return;
    if (countdown > 1) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      const launchTimer = setTimeout(() => {
        setLiveDuration('00:00');
        setStreamStartMs(Date.now());
        setStage('live');
      }, 900);
      return () => clearTimeout(launchTimer);
    }
  }, [stage, countdown]);

  useEffect(() => {
    if (stage === 'live' && role === 'host' && !isInitializingRef.current && !livekitToken) {
      initializeHostBroadcast();
    }
  }, [stage, role, livekitToken, initializeHostBroadcast]);

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
                    <div className="flex items-center gap-1">
                      <span className="flex items-center gap-1 rounded-md bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-semibold text-white">
                        <Users className="h-3 w-3 text-pink-400" />
                        {stream.viewer_count || 1}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => removeGhostStream(stream.id, stream.host_id, e)}
                        title="Remove ended/stale stream"
                        className="flex h-5 w-5 items-center justify-center rounded-md bg-black/60 text-white/60 hover:text-rose-400 hover:bg-black/80"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
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
          ref={(el) => {
            previewVideoRef.current = el;
            if (el && localStreamRef.current && el.srcObject !== localStreamRef.current) {
              el.srcObject = localStreamRef.current;
              el.play().catch(() => {});
            }
          }}
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
                  stopCameraTracks();
                  setStage('lobby');
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-xl border border-white/15 text-white active:scale-90 transition"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() =>
                    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
                  }
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
      onClick={() => livekitBridgeRef.current?.unlockAudio()}
      onDoubleClick={role === 'viewer' ? spawnFloatingHeart : undefined}
      className="fixed inset-0 w-screen h-[100dvh] z-[2147483647] bg-[#060608] text-white flex flex-col select-none overflow-hidden"
    >
      {/* 1. HOST ALWAYS RENDERS CONTINUOUS LOCAL CAMERA LAYER SO SCREEN NEVER GOES BLACK */}
      {role === 'host' && (
        <video
          ref={(el) => {
            liveHostVideoRef.current = el;
            if (el && localStream && el.srcObject !== localStream) {
              el.srcObject = localStream;
              el.play().catch(() => {});
            }
          }}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 h-full w-full object-cover z-0 transition-all duration-500 ${
            beautyMode ? 'brightness-105 contrast-105 saturate-110' : ''
          } ${isCamOff ? 'opacity-0' : 'opacity-100'}`}
        />
      )}

      {/* 1B. LIVEKIT CLOUD HD VIDEO & 48KHZ STUDIO AUDIO ROOM */}
      {livekitToken ? (
        <LiveKitRoom
          video={false}
          audio={false}
          options={{
            adaptiveStream: false,
            dynacast: false,
            videoCaptureDefaults: {
              resolution: { width: 1280, height: 720, frameRate: 30 }
            },
            audioCaptureDefaults: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 48000,
              channelCount: 1
            },
            publishDefaults: {
              audioPreset: { maxBitrate: 96_000 },
              dtx: false,
              red: true,
              simulcast: false,
              videoEncoding: {
                maxBitrate: 3_000_000,
                maxFramerate: 30
              }
            }
          }}
          token={livekitToken}
          serverUrl={livekitServerUrl}
          connect={true}
          className={`h-full w-full ${
            role === 'host'
              ? 'pointer-events-none absolute inset-0 z-0'
              : 'relative z-0'
          }`}
        >
          <LiveKitRoomBridge
            ref={livekitBridgeRef}
            role={role}
            localStream={localStream}
            isMicMuted={isMicMuted}
            isCamOff={isCamOff}
            isAcceptedSpeaker={micRequestStatus === 'accepted'}
            hostId={currentStream?.host_id || user.id}
            hostUsername={currentStream?.host_username || user.username}
            onViewerCountChange={handleViewerCountChange}
            onHostEnded={handleHostEnded}
            onPacketReceived={handleIncomingArenaPacket}
          />
          {role === 'viewer' && <ViewerVideoStage beautyMode={beautyMode} />}
          <RoomAudioRenderer volume={1.0} />
        </LiveKitRoom>
      ) : (
        role === 'viewer' && (
          <div className="flex h-full w-full flex-col items-center justify-center bg-[#070709]">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-pink-500/10 border border-pink-500/30">
              <div className="absolute inset-0 rounded-full border-2 border-pink-500 animate-ping opacity-30" />
              <Radio className="h-10 w-10 text-pink-500 animate-pulse" />
            </div>
            <p className="mt-4 text-sm font-medium text-white/70 tracking-wide">
              Connecting High-Definition Stream...
            </p>
          </div>
        )
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/70 via-black/25 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black/85 via-black/40 to-transparent z-10" />

      {/* 2. MASTER TIER GPU GIFT OVERLAY (IMPERATIVE REF + REALTIME SYNCED) */}
      <MasterLiveGiftOverlay ref={giftOverlayRef} streamId={currentStream?.id} />

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
      <div className={`absolute left-3 right-3 z-30 flex flex-col gap-2.5 ${role === 'host' ? 'top-14' : 'top-4'}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 rounded-full bg-black/45 backdrop-blur-xl border border-white/15 p-1 pr-2.5 shadow-lg min-w-0 flex-1">
            <div className="relative h-9 w-9 shrink-0 rounded-full p-[1.5px] bg-gradient-to-tr from-pink-500 via-amber-400 to-purple-500">
              <img
                src={currentStream?.host_avatar || user.avatar_url}
                alt="Host"
                className="h-full w-full rounded-full object-cover bg-black"
              />
              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-sm bg-pink-600 px-1 text-[8px] font-black uppercase text-white">
                LIVE
              </span>
            </div>

            <div className="flex flex-col min-w-0">
              <span className="truncate text-xs font-extrabold text-white">
                {currentStream?.host_username || user.username}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300">
                <Heart className="h-2.5 w-2.5 fill-pink-500 text-pink-500" />
                {(
                  (currentStream?.total_coins_earned || 0) + likeCount
                ).toLocaleString()}
              </span>
            </div>

            {role === 'viewer' && (
              <button
                onClick={() => setIsFollowing((prev) => !prev)}
                className={`ml-1 shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-extrabold transition ${
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

          <div className="flex items-center gap-2 shrink-0">
            <motion.div
              animate={
                coinPopTrigger
                  ? { scale: [1, 1.38, 1], borderColor: '#FFD700' }
                  : { scale: 1 }
              }
              transition={{ duration: 0.35 }}
              onClick={() => setIsGiftDrawerOpen(true)}
              className="cursor-pointer flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur-xl border border-amber-400/30 px-3 py-1.5 shadow-md"
            >
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-black text-amber-300">FREE GIFTS</span>
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
                {currentStream?.gift_goal_current || 0}/
                {currentStream?.gift_goal_target || 500}
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

        {/* 3.5 HOST-ONLY PRIVATE MIC REQUEST BANNER (DOES NOT INTERRUPT STREAM OR SHOW TO VIEWERS) */}
        <AnimatePresence>
          {role === 'host' && pendingMicRequests.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex flex-col gap-1.5 mt-1"
            >
              {pendingMicRequests.map((req) => (
                <div
                  key={req.userId}
                  className="flex items-center justify-between rounded-2xl bg-black/75 backdrop-blur-2xl border border-pink-500/40 px-3.5 py-2 shadow-[0_8px_25px_rgba(0,0,0,0.6)]"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={
                        req.avatarUrl ||
                        'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest'
                      }
                      alt={req.username}
                      className="h-8 w-8 rounded-full object-cover ring-2 ring-pink-500"
                    />
                    <div>
                      <p className="text-xs font-extrabold text-white">
                        @{req.username} wants to speak
                      </p>
                      <p className="text-[10px] text-pink-300 font-semibold">
                        Private Host Request • Audio Co-Host
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleHostAcceptMicRequest(req)}
                      className="flex items-center gap-1 rounded-full bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 text-[11px] font-black text-black shadow transition active:scale-95"
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                      Accept
                    </button>
                    <button
                      onClick={() => handleHostDeclineMicRequest(req)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 hover:bg-rose-500/30 text-white/80 hover:text-rose-300 transition active:scale-95"
                      title="Cancel Request"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3.6 ACTIVE SPEAKERS PILL (SHOWS WHO IS TALKING LIVE ON STREAM) */}
        <AnimatePresence>
          {activeSpeakers.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {activeSpeakers.map((spk) => (
                <motion.div
                  key={spk.userId}
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.85, opacity: 0 }}
                  className="flex items-center gap-2 rounded-full bg-emerald-950/75 backdrop-blur-xl border border-emerald-400/50 pl-1.5 pr-3 py-1 shadow-[0_0_20px_rgba(16,185,129,0.35)]"
                >
                  <img
                    src={
                      spk.avatarUrl ||
                      'https://api.dicebear.com/7.x/avataaars/svg?seed=Speaker'
                    }
                    alt={spk.username}
                    className="h-6 w-6 rounded-full object-cover ring-1 ring-emerald-400"
                  />
                  <Volume2 className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-extrabold text-white">
                    @{spk.username}
                  </span>
                  {role === 'host' && (
                    <button
                      onClick={() => handleHostRemoveSpeaker(spk.userId)}
                      title="Remove speaker from mic"
                      className="ml-1 rounded-full bg-rose-500/30 hover:bg-rose-500/60 p-0.5 text-rose-200"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
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

          {/* Viewer Request to Speak / Active Mic Controls */}
          {micRequestStatus === 'accepted' && (
            <button
              onClick={() => setIsMicMuted((prev) => !prev)}
              className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-xl border transition ${
                isMicMuted
                  ? 'bg-red-600/90 border-red-400 text-white'
                  : 'bg-emerald-500 border-emerald-300 text-black shadow-[0_0_15px_rgba(16,185,129,0.6)]'
              }`}
              title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
            >
              {isMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}

          <button
            onClick={handleToggleMicRequest}
            className={`relative flex h-10 px-3 items-center justify-center gap-1 rounded-full backdrop-blur-xl border text-[11px] font-extrabold transition active:scale-90 ${
              micRequestStatus === 'accepted'
                ? 'bg-rose-600/90 border-rose-400 text-white'
                : micRequestStatus === 'pending'
                ? 'bg-amber-500/30 border-amber-400 text-amber-200 animate-pulse'
                : 'bg-black/55 border-white/15 text-white hover:bg-white/10'
            }`}
            title="Request to Speak on Stream"
          >
            <Hand className="h-3.5 w-3.5 text-pink-400" />
            <span>
              {micRequestStatus === 'accepted'
                ? 'Leave Mic'
                : micRequestStatus === 'pending'
                ? 'Requested'
                : 'Speak'}
            </span>
          </button>

          {/* 1-Tap Quick Rose Combo Button (Free) */}
          <button
            onClick={handleQuickRoseGift}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-rose-600/80 to-pink-500/80 backdrop-blur-xl border border-pink-300/40 shadow-[0_0_15px_rgba(244,63,94,0.5)] active:scale-90 transition"
            title="Send Quick Rose (Free)"
          >
            <span className="text-lg">🌹</span>
            {quickRoseCombo > 0 && (
              <span className="absolute -top-1.5 -right-1 rounded-full bg-amber-400 px-1.5 text-[9px] font-black text-black">
                x{quickRoseCombo}
              </span>
            )}
          </button>

          {/* Luxury Gift Box Trigger */}
          <button
            onClick={() => setIsGiftDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 text-white shadow-[0_0_20px_rgba(236,72,153,0.6)] active:scale-90 transition"
          >
            <Gift className="h-5 w-5 animate-bounce" />
          </button>

          {/* Synced Floating Like Button */}
          <button
            onClick={spawnFloatingHeart}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 backdrop-blur-xl border border-white/15 text-pink-500 active:scale-75 transition"
          >
            <Heart className="h-5 w-5 fill-pink-500" />
          </button>

          {/* Share Button */}
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

          {/* Host can also test Gifts directly */}
          <button
            onClick={() => setIsGiftDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.5)] active:scale-90 transition"
            title="Test Luxury Gifts"
          >
            <Gift className="h-4 w-4" />
          </button>

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
            onClick={() =>
              setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
            }
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

      {/* 7. BUILT-IN LUXURY 5-TIER GIFT DRAWER (PAYWALL REMOVED - 100% FREE TESTING) */}
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
                    EarnMega Luxury Gifts (Free Test Mode)
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-1">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-black text-emerald-300">
                      UNLIMITED FREE
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
                      <div className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                        <Coins className="h-3 w-3 text-amber-400" />
                        FREE ({item.coins})
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
                Send Luxury Gift Now (Free)
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
                  <span className="text-xl font-mono text-white tracking-wider">
                    {liveDuration}
                  </span>
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
                    {((currentStream?.total_coins_earned || 0) + likeCount).toLocaleString()}
                  </span>
                  <span className="text-[9px] font-bold tracking-[0.15em] text-white/50 mt-1">
                    DIAMONDS & LIKES
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
