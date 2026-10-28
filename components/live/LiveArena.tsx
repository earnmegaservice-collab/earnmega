'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LiveKitRoom,
  VideoTrack,
  RoomAudioRenderer,
  useTracks,
  useLocalParticipant,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';
import { supabase } from '../../utils/supabase';

// ============================================================================
// TYPES & FIXED LUXURY GIFT CATALOG
// ============================================================================
type ArenaStage = 'lobby' | 'setup' | 'countdown' | 'live';
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
    tagline: 'Glass Holograph',
  },
  {
    id: 'neon_heart_10',
    name: 'The Neon Heart',
    icon: '💖',
    coins: 10,
    tier: 'standard',
    accent: 'from-fuchsia-500/30 to-purple-600/30 border-fuchsia-400/40',
    tagline: 'Pulse Glow',
  },
  {
    id: 'diamond_50',
    name: 'The Diamond',
    icon: '💎',
    coins: 50,
    tier: 'kinetic',
    accent: 'from-cyan-400/30 to-blue-600/30 border-cyan-300/60',
    tagline: 'Kinetic Shockwave',
  },
  {
    id: 'rocket_500',
    name: 'The Rocket',
    icon: '🚀',
    coins: 500,
    tier: 'rocket',
    accent: 'from-orange-500/30 to-amber-500/30 border-amber-400/60',
    tagline: 'Screen Shake + Trail',
  },
  {
    id: 'universe_5000',
    name: 'The EarnMega Universe',
    icon: '🌌',
    coins: 5000,
    tier: 'universe',
    accent: 'from-amber-400/40 via-yellow-500/30 to-purple-700/40 border-amber-300',
    tagline: 'Full-Screen Takeover',
  },
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
  status: 'active' | 'ended';
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
  onBack?: () => void;
}

const CATEGORIES = [
  { id: 'All', label: 'All', icon: null },
  { id: 'Just Chatting', label: 'Just Chatting', icon: Flame },
  { id: 'Music & Talent', label: 'Music & Talent', icon: Music },
  { id: 'VIP Lounge', label: 'VIP Lounge', icon: Diamond },
  { id: 'Talk & Debate', label: 'Talk & Debate', icon: MessageSquare },
  { id: 'Gaming', label: 'Gaming', icon: Gamepad2 },
];

// ============================================================================
// MASTER TIER GPU-ACCELERATED GIFT OVERLAY ENGINE (TRACK A & TRACK B)
// ============================================================================
function MasterLiveGiftOverlay({
  streamId,
  localIncomingGift,
}: {
  streamId: string;
  localIncomingGift: LiveGiftEvent | null;
}) {
  const [trackAQueue, setTrackAQueue] = useState<LiveGiftEvent[]>([]);
  const [activeTrackA, setActiveTrackA] = useState<LiveGiftEvent[]>([]);
  const [megaQueue, setMegaQueue] = useState<LiveGiftEvent[]>([]);
  const [activeMega, setActiveMega] = useState<LiveGiftEvent | null>(null);
  const [universeFlash, setUniverseFlash] = useState<boolean>(false);

  const enqueueGift = useCallback((gift: LiveGiftEvent) => {
    const totalCoins = (gift.coin_value || 1) * (gift.combo_count || 1);
    if (totalCoins >= 500 || gift.gift_id.includes('rocket') || gift.gift_id.includes('universe')) {
      setMegaQueue((prev) => [...prev, gift]);
    } else {
      setTrackAQueue((prev) => [...prev, gift]);
    }
  }, []);

  // Trigger immediately when local user sends a gift
  useEffect(() => {
    if (localIncomingGift) {
      enqueueGift(localIncomingGift);
    }
  }, [localIncomingGift, enqueueGift]);

  // Listen to Supabase Realtime 'live_gifts' table inserts
  useEffect(() => {
    if (!streamId) return;

    const channel = supabase
      .channel(`live_gifts_overlay_${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_gifts',
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          const newGift = payload.new as LiveGiftEvent;
          enqueueGift({
            ...newGift,
            id: newGift.id || `rt-${Date.now()}-${Math.random()}`,
          });
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
    if (activeMega) return; // Pause Track A during Full-Screen Mega Takeover
    if (activeTrackA.length < 4 && trackAQueue.length > 0) {
      const nextGift = trackAQueue[0];
      setTrackAQueue((prev) => prev.slice(1));
      setActiveTrackA((prev) => [...prev, nextGift]);

      setTimeout(() => {
        setActiveTrackA((prev) => prev.filter((item) => item.id !== nextGift.id));
      }, 3000);
    }
  }, [activeTrackA, trackAQueue, activeMega]);

  const isRocket = activeMega && activeMega.coin_value >= 500 && activeMega.coin_value < 5000;
  const isUniverse = activeMega && activeMega.coin_value >= 5000;

  return (
    <motion.div
      animate={isRocket ? { x: [0, -8, 8, -5, 5, 0], y: [0, 4, -4, 0] } : { x: 0, y: 0 }}
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
                    damping: 16,
                  }}
                  className={`relative flex items-center justify-between rounded-full p-1.5 pr-4 backdrop-blur-2xl border transform-gpu ${
                    isDiamond
                      ? 'bg-cyan-950/60 border-cyan-300/70 shadow-[0_0_30px_rgba(34,211,238,0.65)]'
                      : 'bg-white/10 border-white/25 shadow-[0_8px_32px_rgba(255,46,147,0.3)]'
                  }`}
                >
                  {/* Kinetic Shockwave Ring for 50-Coin Diamond */}
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
                        ease: 'easeInOut',
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

      {/* TRACK B (500 COINS): THE ROCKET DIAGONAL LAUNCH + PARTICLE EMISSION */}
      <AnimatePresence>
        {isRocket && activeMega && (
          <motion.div
            key={activeMega.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-sm"
          >
            {/* Diagonal Rocket Trajectory */}
            <motion.div
              initial={{ x: -240, y: 380, scale: 0.4, rotate: 35 }}
              animate={{ x: [null, 0, 260], y: [null, 0, -420], scale: [0.4, 1.5, 1.1] }}
              transition={{ duration: 2.6, ease: 'easeInOut' }}
              className="relative flex flex-col items-center"
            >
              <span className="text-8xl drop-shadow-[0_0_45px_rgba(251,146,60,0.95)]">
                🚀
              </span>
              {/* Particle Trail */}
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 1, scale: 1, x: 0, y: 20 }}
                  animate={{
                    opacity: 0,
                    scale: 0,
                    x: (i % 2 === 0 ? -1 : 1) * (15 + i * 6),
                    y: 70 + i * 14,
                  }}
                  transition={{
                    duration: 0.7,
                    repeat: 3,
                    delay: i * 0.06,
                  }}
                  className="absolute top-16 h-3.5 w-3.5 rounded-full bg-gradient-to-t from-red-500 via-orange-400 to-yellow-200 shadow-[0_0_12px_#f97316]"
                />
              ))}
            </motion.div>

            {/* Luxury Rocket Sender Banner */}
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
            {/* Top & Bottom Cinema Letterbox Bars */}
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

            {/* 20 Exploding Star & Diamond Particles */}
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
                    opacity: [1, 1, 0],
                  }}
                  transition={{ duration: 2.8, delay: 0.3, ease: 'easeOut' }}
                  className="absolute text-lg"
                >
                  {idx % 2 === 0 ? '✨' : '💎'}
                </motion.div>
              );
            })}

            {/* Rotating 3D-Styled Galaxy Core */}
            <motion.div
              initial={{ scale: 0.1, rotate: -90, opacity: 0 }}
              animate={{
                scale: [0.1, 1.25, 1],
                rotate: [0, 180, 360],
                opacity: 1,
              }}
              transition={{ duration: 3.6, ease: 'easeOut' }}
              className="relative flex h-56 w-56 items-center justify-center rounded-full bg-gradient-to-tr from-purple-700/40 via-pink-500/30 to-amber-400/40 shadow-[0_0_120px_rgba(251,191,36,0.75)] border border-amber-300/50"
            >
              <span className="text-8xl drop-shadow-[0_0_40px_rgba(255,255,255,0.95)]">
                🌌
              </span>
            </motion.div>

            {/* Metallic Gold Foil Typography */}
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
                  WebkitTextFillColor: 'transparent',
                }}
                className="text-2xl font-black tracking-tight drop-shadow-[0_4px_20px_rgba(251,191,36,0.5)]"
              >
                @{activeMega.sender_username} GIFTED THE UNIVERSE!
              </h2>
              <p className="mt-1 text-xs font-bold text-white/80">
                5,000 Coins • Ultimate Arena Takeover
              </p>
            </motion.div>

            {/* White Supernova Implosion Flash */}
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
}

// ============================================================================
// INNER LIVEKIT VIDEO & HARDWARE CONTROLLER
// ============================================================================
function LiveKitVideoStage({
  role,
  isMicMuted,
  isCamOff,
  beautyMode,
}: {
  role: UserRole;
  isMicMuted: boolean;
  isCamOff: boolean;
  beautyMode: boolean;
}) {
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });

  useEffect(() => {
    if (role === 'host' && localParticipant) {
      localParticipant.setMicrophoneEnabled(!isMicMuted).catch(() => {});
      localParticipant.setCameraEnabled(!isCamOff).catch(() => {});
    }
  }, [role, isMicMuted, isCamOff, localParticipant]);

  return (
    <div className="relative h-full w-full bg-[#070709] overflow-hidden">
      {tracks.length === 0 ? (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-[#12091d] via-[#09090d] to-black">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-pink-500/10 border border-pink-500/30">
            <div className="absolute inset-0 rounded-full border-2 border-pink-500 animate-ping opacity-30" />
            <Radio className="h-10 w-10 text-pink-500 animate-pulse" />
          </div>
          <p className="mt-4 text-sm font-medium text-white/70 tracking-wide">
            Connecting High-Definition Stream...
          </p>
        </div>
      ) : tracks.length === 1 ? (
        <VideoTrack
          trackRef={tracks[0]}
          className={`h-full w-full object-cover transition-all duration-500 ${
            beautyMode ? 'brightness-105 contrast-105 saturate-110' : ''
          }`}
        />
      ) : (
        <div className="grid h-full w-full grid-cols-2 gap-1 pt-24 pb-36 bg-black">
          {tracks.slice(0, 4).map((trackRef, idx) => (
            <div
              key={idx}
              className="relative h-full w-full overflow-hidden rounded-xl border border-white/10"
            >
              <VideoTrack
                trackRef={trackRef}
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-2 left-2 rounded-md bg-black/60 backdrop-blur-md px-2 py-0.5 text-[11px] font-semibold text-white">
                @{trackRef.participant.identity}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN LIVE ARENA COMPONENT
// ============================================================================
export default function LiveArena({ currentUser, onBack }: LiveArenaProps) {
  const [user, setUser] = useState(
    currentUser || {
      id: 'default-user-id',
      username: 'MegaCreator',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=EarnMega',
      coin_balance: 5000,
    }
  );

  // Core 4-Stage Machine (Fixes the stuck Setup Menu bug permanently)
  const [stage, setStage] = useState<ArenaStage>('lobby');
  const [role, setRole] = useState<UserRole>('viewer');
  const [livekitToken, setLivekitToken] = useState<string>('');

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

  // Active Broadcast State
  const [currentStream, setCurrentStream] = useState<LiveStreamRecord | null>(null);
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
  const previewStreamRef = useRef<MediaStream | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // --------------------------------------------------------------------------
  // 1. FETCH ACTIVE STREAMS IN LOBBY & AUTH USER
  // --------------------------------------------------------------------------
  const fetchActiveStreams = useCallback(async () => {
    const { data } = await supabase
      .from('live_streams')
      .select('*')
      .eq('status', 'active')
      .order('viewer_count', { ascending: false });

    if (data) setActiveStreams(data as LiveStreamRecord[]);
  }, []);

  useEffect(() => {
    async function initUserAndStreams() {
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
                : 1000,
          });
        }
      }
      fetchActiveStreams();
    }

    initUserAndStreams();

    const lobbyChannel = supabase
      .channel('public:live_streams_lobby')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_streams' },
        () => fetchActiveStreams()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(lobbyChannel);
    };
  }, [currentUser, fetchActiveStreams]);

  // --------------------------------------------------------------------------
  // 2. CAMERA PREVIEW MANAGEMENT (SETUP STAGE ONLY)
  // --------------------------------------------------------------------------
  const stopPreviewCamera = useCallback(() => {
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach((track) => track.stop());
      previewStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (stage === 'setup') {
      navigator.mediaDevices
        .getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        .then((stream) => {
          previewStreamRef.current = stream;
          if (previewVideoRef.current) {
            previewVideoRef.current.srcObject = stream;
          }
        })
        .catch((err) => console.warn('Camera preview warning:', err));
    } else {
      stopPreviewCamera();
    }

    return () => stopPreviewCamera();
  }, [stage, facingMode, stopPreviewCamera]);

  // --------------------------------------------------------------------------
  // 3. HOST START STREAM WORKFLOW (3-2-1 COUNTDOWN -> LIVE STAGE)
  // --------------------------------------------------------------------------
  const handleStartCountdown = () => {
    setRole('host');
    setCountdown(3);
    setStage('countdown');
  };

  const initializeHostBroadcast = useCallback(async () => {
    const roomId = `stream_${user.id}_${Date.now()}`;
    const finalTitle = streamTitle.trim() || `${user.username}'s VIP Live`;

    const fallbackStream: LiveStreamRecord = {
      id: roomId,
      host_id: user.id,
      host_username: user.username,
      host_avatar: user.avatar_url,
      title: finalTitle,
      category: setupCategory,
      gift_goal_target: giftGoal,
      gift_goal_current: 0,
      total_coins_earned: 0,
      viewer_count: 1,
      allow_cohost: allowCohost,
      status: 'active',
    };

    const { data: insertedStream } = await supabase
      .from('live_streams')
      .insert([
        {
          host_id: user.id,
          host_username: user.username,
          host_avatar: user.avatar_url,
          title: finalTitle,
          category: setupCategory,
          gift_goal_target: giftGoal,
          gift_goal_current: 0,
          total_coins_earned: 0,
          viewer_count: 1,
          allow_cohost: allowCohost,
          status: 'active',
        },
      ])
      .select()
      .single();

    const activeRecord = (insertedStream as LiveStreamRecord) || fallbackStream;
    setCurrentStream(activeRecord);

    try {
      const res = await fetch(
        `/api/livekit?room=${encodeURIComponent(activeRecord.id)}&username=${encodeURIComponent(user.username)}`
      );
      const data = await res.json();
      if (data.token) {
        setLivekitToken(data.token);
      }
    } catch (err) {
      console.error('LiveKit token fetch error:', err);
    }

    setComments([
      {
        id: 'welcome-sys',
        username: 'EarnMega AI',
        content: 'Welcome to EarnMega Live Arena! Send gifts to climb the VIP Leaderboard.',
        is_system: true,
      },
    ]);
    setStage('live');
  }, [user, streamTitle, setupCategory, giftGoal, allowCohost]);

  useEffect(() => {
    if (stage !== 'countdown') return;

    if (countdown > 1) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      const launchTimer = setTimeout(() => {
        stopPreviewCamera();
        initializeHostBroadcast();
      }, 900);
      return () => clearTimeout(launchTimer);
    }
  }, [stage, countdown, stopPreviewCamera, initializeHostBroadcast]);

  // --------------------------------------------------------------------------
  // 4. VIEWER JOIN STREAM WORKFLOW
  // --------------------------------------------------------------------------
  const handleJoinStreamAsViewer = async (stream: LiveStreamRecord) => {
    setRole('viewer');
    setCurrentStream(stream);

    try {
      const res = await fetch(
        `/api/livekit?room=${encodeURIComponent(stream.id)}&username=${encodeURIComponent(user.username)}`
      );
      const data = await res.json();
      if (data.token) {
        setLivekitToken(data.token);
      }
    } catch (err) {
      console.error('Viewer token error:', err);
    }

    setComments([
      {
        id: `join-${Date.now()}`,
        username: user.username,
        content: 'joined the LIVE',
        is_system: true,
      },
    ]);
    setStage('live');

    await supabase.from('live_comments').insert([
      {
        stream_id: stream.id,
        user_id: user.id,
        username: user.username,
        avatar_url: user.avatar_url,
        content: 'joined the LIVE',
        is_system: true,
      },
    ]);
  };

  // --------------------------------------------------------------------------
  // 5. REALTIME CHAT & STREAM ECONOMY SUBSCRIPTIONS
  // --------------------------------------------------------------------------
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
          filter: `stream_id=eq.${currentStream.id}`,
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
          filter: `id=eq.${currentStream.id}`,
        },
        (payload) => {
          setCurrentStream((prev) =>
            prev ? { ...prev, ...(payload.new as Partial<LiveStreamRecord>) } : null
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [stage, currentStream]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // --------------------------------------------------------------------------
  // 6. INTERACTIVE ACTIONS (CHAT, HEARTS, LUXURY GIFT DISPATCH, END STREAM)
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
      badge_level: 14,
    };
    setComments((prev) => [...prev.slice(-60), tempMsg]);

    await supabase.from('live_comments').insert([
      {
        stream_id: currentStream.id,
        user_id: user.id,
        username: user.username,
        avatar_url: user.avatar_url,
        content: text,
      },
    ]);
  };

  const spawnFloatingHeart = () => {
    const colors = ['#FF2E93', '#00F5D4', '#FFD700', '#FF5E00', '#9B5DE5'];
    const newHeart: FloatingHeart = {
      id: Date.now() + Math.random(),
      xOffset: Math.floor(Math.random() * 60) - 30,
      color: colors[Math.floor(Math.random() * colors.length)],
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

    // 1. Optimistic Wallet Pop & Instant Local Animation Trigger
    const updatedBalance = user.coin_balance - totalCost;
    setUser((prev) => ({ ...prev, coin_balance: updatedBalance }));
    setCoinPopTrigger(true);
    setTimeout(() => setCoinPopTrigger(false), 550);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('coin-balance-updated', { detail: { newBalance: updatedBalance } })
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
      combo_count: comboCount,
    };

    setLocalIncomingGift(giftEvent);

    // Update stream goal bar locally
    setCurrentStream((prev) =>
      prev
        ? {
            ...prev,
            gift_goal_current: (prev.gift_goal_current || 0) + totalCost,
            total_coins_earned: (prev.total_coins_earned || 0) + totalCost,
          }
        : null
    );

    // 2. Execute Secure PostgreSQL RPC
    const { data, error } = await supabase.rpc('process_live_gift', {
      p_stream_id: currentStream.id,
      p_gift_id: gift.id,
      p_gift_name: gift.name,
      p_gift_icon: gift.icon,
      p_coin_value: gift.coins,
      p_combo_count: comboCount,
    });

    if (!error && data?.new_balance !== undefined) {
      setUser((prev) => ({ ...prev, coin_balance: data.new_balance }));
    }
  };

  const handleQuickRoseGift = () => {
    const nextCombo = quickRoseCombo + 1;
    setQuickRoseCombo(nextCombo);
    handleDispatchGift(LUXURY_GIFT_CATALOG[0], 1);
  };

  const handleEndOrLeaveStream = async () => {
    if (role === 'host' && currentStream) {
      await supabase
        .from('live_streams')
        .update({ status: 'ended' })
        .eq('id', currentStream.id);
    }
    setLivekitToken('');
    setCurrentStream(null);
    setStage('lobby');
    fetchActiveStreams();
  };

  // ==========================================================================
  // STAGE 1: THE LUXURY LIVE ARENA LOBBY
  // ==========================================================================
  if (stage === 'lobby') {
    const filteredStreams = activeStreams.filter((s) => {
      const matchesCategory =
        selectedCategory === 'All' || s.category === selectedCategory;
      const matchesSearch =
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.host_username.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    return (
      <div className="min-h-[100dvh] w-full bg-[#060608] text-white flex flex-col select-none">
        <div className="sticky top-0 z-30 bg-[#060608]/90 backdrop-blur-xl px-4 pt-4 pb-3 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 active:scale-95 transition"
                >
                  <X className="h-5 w-5 text-white/80" />
                </button>
              )}
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

        <div className="flex-1 px-4 py-5">
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
                    alt={stream.host_username}
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
                      {stream.viewer_count}
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
                        @{stream.host_username}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================================================
  // STAGE 2 & 3: HOST CAMERA SETUP & 3-2-1 COUNTDOWN
  // ==========================================================================
  if (stage === 'setup' || stage === 'countdown') {
    return (
      <div className="relative h-[100dvh] w-screen overflow-hidden bg-black select-none">
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
                onClick={() => setStage('lobby')}
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

            <div className="absolute bottom-6 left-4 right-4 z-20 flex flex-col gap-3.5">
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
      </div>
    );
  }

  // ==========================================================================
  // STAGE 4: ACTIVE BROADCAST & VIEWER ARENA
  // ==========================================================================
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

  return (
    <div
      onDoubleClick={role === 'viewer' ? spawnFloatingHeart : undefined}
      className="relative h-[100dvh] w-screen overflow-hidden bg-black select-none"
    >
      {/* 1. LIVEKIT CLOUD HD VIDEO STREAM */}
      {livekitToken ? (
        <LiveKitRoom
          video={role === 'host'}
          audio={role === 'host'}
          token={livekitToken}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
          connect={true}
          className="h-full w-full"
        >
          <LiveKitVideoStage
            role={role}
            isMicMuted={isMicMuted}
            isCamOff={isCamOff}
            beautyMode={beautyMode}
          />
          <RoomAudioRenderer />
        </LiveKitRoom>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#09090d]">
          <div className="h-12 w-12 rounded-full border-4 border-pink-500 border-t-transparent animate-spin" />
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/70 via-black/25 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black/85 via-black/40 to-transparent z-10" />

      {/* 2. MASTER TIER GPU GIFT OVERLAY */}
      {currentStream && (
        <MasterLiveGiftOverlay
          streamId={currentStream.id}
          localIncomingGift={localIncomingGift}
        />
      )}

      {/* 3. TOP HUD: HOST CAPSULE, RANKINGS, WALLET & VIEWER PILLS */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-col gap-2.5">
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
              <span>{currentStream?.viewer_count || 1}</span>
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
                scale: [0.6, 1.25, 1],
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
      <div
        className="
          absolute bottom-20 left-3 z-20 flex max-h-[34dvh] w-[76%] flex-col
          gap-1.5 overflow-y-auto no-scrollbar pr-2
          [mask-image:linear-gradient(to_bottom,transparent_0%,black_20%,black_100%)]
        "
      >
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

          {/* 1-Tap Quick Rose Combo Button */}
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

          {/* Luxury Gift Box Trigger */}
          <button
            onClick={() => setIsGiftDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 text-white shadow-[0_0_20px_rgba(236,72,153,0.6)] active:scale-90 transition"
          >
            <Gift className="h-5 w-5 animate-bounce" />
          </button>

          {/* Floating Like Button */}
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
                    url: window.location.href,
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

              {/* 5 Fixed Gift Tiers Grid */}
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
    </div>
  );
}
