'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Sparkles,
  Zap,
  Diamond,
  Flame,
  Star,
  Award,
  Shield,
} from 'lucide-react';
import { supabase } from '../../utils/supabase';

// ============================================================================
// UNIVERSAL TYPES & PAYLOAD NORMALIZER (ZERO TYPESCRIPT CONFLICTS)
// ============================================================================
export interface RawGiftPayload {
  id?: string;
  stream_id?: string;
  streamId?: string;
  sender_id?: string;
  senderId?: string;
  sender_username?: string;
  senderUsername?: string;
  sender_avatar?: string;
  senderAvatar?: string;
  gift_id?: string;
  giftId?: string;
  gift_name?: string;
  giftName?: string;
  gift_icon?: string;
  giftIcon?: string;
  coin_value?: number;
  coinValue?: number;
  combo_count?: number;
  comboCount?: number;
  totalValue?: number;
}

export interface NormalizedGiftEvent {
  uid: string;
  streamId: string;
  senderId: string;
  senderUsername: string;
  senderAvatar: string;
  giftId: string;
  giftName: string;
  giftIcon: string;
  coinValue: number;
  comboCount: number;
  totalCoins: number;
  tier: 'rose' | 'heart' | 'diamond' | 'rocket' | 'universe';
  timestamp: number;
}

export interface LiveGiftOverlayProps {
  streamId?: string;
  incomingGift?: RawGiftPayload | null;
  localIncomingGift?: RawGiftPayload | null;
}

function normalizeGiftPayload(raw: RawGiftPayload): NormalizedGiftEvent {
  const coinValue = Number(raw.coin_value ?? raw.coinValue ?? 1);
  const comboCount = Number(raw.combo_count ?? raw.comboCount ?? 1);
  const giftId = String(raw.gift_id ?? raw.giftId ?? 'rose_1').toLowerCase();
  const giftName = String(raw.gift_name ?? raw.giftName ?? 'Luxury Gift');

  let tier: NormalizedGiftEvent['tier'] = 'rose';
  if (coinValue >= 5000 || giftId.includes('universe')) {
    tier = 'universe';
  } else if (coinValue >= 500 || giftId.includes('rocket')) {
    tier = 'rocket';
  } else if (coinValue >= 50 || giftId.includes('diamond')) {
    tier = 'diamond';
  } else if (coinValue >= 10 || giftId.includes('heart')) {
    tier = 'heart';
  }

  let defaultIcon = '🌹';
  if (tier === 'heart') defaultIcon = '💖';
  if (tier === 'diamond') defaultIcon = '💎';
  if (tier === 'rocket') defaultIcon = '🚀';
  if (tier === 'universe') defaultIcon = '🌌';

  const senderUsername =
    raw.sender_username || raw.senderUsername || 'VIP Patron';

  return {
    uid: raw.id || `gift-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    streamId: String(raw.stream_id ?? raw.streamId ?? ''),
    senderId: String(raw.sender_id ?? raw.senderId ?? senderUsername),
    senderUsername,
    senderAvatar:
      raw.sender_avatar ||
      raw.senderAvatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(senderUsername)}`,
    giftId,
    giftName,
    giftIcon: raw.gift_icon || raw.giftIcon || defaultIcon,
    coinValue,
    comboCount,
    totalCoins: raw.totalValue ?? coinValue * comboCount,
    tier,
    timestamp: Date.now(),
  };
}

// ============================================================================
// WEB AUDIO SYNTHESIZER (ZERO EXTERNAL MP3 ASSETS REQUIRED)
// ============================================================================
function playLuxuryGiftSound(tier: NormalizedGiftEvent['tier']) {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (tier === 'rose' || tier === 'heart') {
      // Crystal Harp Chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(tier === 'rose' ? 587.33 : 659.25, now);
      osc.frequency.exponentialRampToValueAtTime(
        tier === 'rose' ? 1174.66 : 1318.51,
        now + 0.28
      );
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (tier === 'diamond') {
      // Prismatic Arpeggio Chord
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.09, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.55);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.56);
      });
    } else if (tier === 'rocket' || tier === 'universe') {
      // Sub-Bass Cinema Drop + Celestial Shimmer
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(140, now);
      sub.frequency.exponentialRampToValueAtTime(38, now + 1.4);
      subGain.gain.setValueAtTime(0.22, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      sub.connect(subGain);
      subGain.connect(ctx.destination);
      sub.start(now);
      sub.stop(now + 1.55);

      if (tier === 'universe') {
        [440, 554.37, 659.25, 880, 1108.73, 1318.51].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + 0.3 + idx * 0.08);
          gain.gain.setValueAtTime(0.07, now + 0.3 + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.0008, now + 2.8);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + 0.3 + idx * 0.08);
          osc.stop(now + 2.85);
        });
      }
    }
  } catch {
    // Ignore audio autoplay restrictions if user hasn't interacted yet
  }
}

// ============================================================================
// 60FPS HTML5 CANVAS COSMIC & PARTICLE SHADER ENGINE (FOR MEGA GIFTS)
// ============================================================================
function MegaCanvasShader({
  mode,
}: {
  mode: 'rocket' | 'universe';
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const cx = width / 2;
    const cy = height / 2;

    // Generate 160 3D Warp Stars & Golden Nebula Particles
    const particles = Array.from({ length: mode === 'universe' ? 170 : 100 }).map(
      () => {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * Math.max(width, height) * 0.65;
        return {
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          z: Math.random() * width,
          size: Math.random() * 2.8 + 0.8,
          angle,
          radius,
          speed: Math.random() * 0.025 + 0.008,
          color:
            mode === 'universe'
              ? ['#FFD700', '#FFF6B7', '#FF2E93', '#00F5D4', '#A855F7'][
                  Math.floor(Math.random() * 5)
                ]
              : ['#FF6B00', '#FFD700', '#FF2E93', '#FFFFFF'][
                  Math.floor(Math.random() * 4)
                ],
        };
      }
    );

    let frame = 0;
    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      // Ambient Radial Glow
      const grad = ctx.createRadialGradient(
        cx,
        cy,
        10,
        cx,
        cy,
        Math.max(width, height) * 0.65
      );
      if (mode === 'universe') {
        grad.addColorStop(0, 'rgba(251, 191, 36, 0.24)');
        grad.addColorStop(0.45, 'rgba(147, 51, 234, 0.22)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        grad.addColorStop(0, 'rgba(249, 115, 22, 0.22)');
        grad.addColorStop(0.5, 'rgba(225, 29, 72, 0.12)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Render Particles
      particles.forEach((p) => {
        if (mode === 'universe') {
          // Spiral Galaxy Vortex + Supernova Expansion after frame 65
          p.angle += p.speed;
          if (frame < 55) {
            p.radius = Math.max(12, p.radius * 0.968);
          } else {
            p.radius += (p.speed * 260) + 2.4;
          }
          const px = cx + Math.cos(p.angle) * p.radius;
          const py = cy + Math.sin(p.angle) * p.radius;

          ctx.save();
          ctx.beginPath();
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 12;
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          // High-Speed Vertical Warp Streaks for Rocket Launch
          p.y += p.speed * 420;
          if (p.y > height) {
            p.y = -20;
            p.x = Math.random() * width;
          }
          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.lineCap = 'round';
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x, p.y - 28);
          ctx.stroke();
          ctx.restore();
        }
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full z-0"
    />
  );
}

// ============================================================================
// MAIN MASTER LIVE GIFT OVERLAY COMPONENT
// ============================================================================
export default function LiveGiftOverlay({
  streamId,
  incomingGift,
  localIncomingGift,
}: LiveGiftOverlayProps) {
  // Track A: Up to 3 simultaneous lower-left combo banners
  const [trackAQueue, setTrackAQueue] = useState<NormalizedGiftEvent[]>([]);
  const [activeTrackA, setActiveTrackA] = useState<NormalizedGiftEvent[]>([]);

  // Track B: Full-screen Mega Takeovers (Rocket 500 & Universe 5000)
  const [megaQueue, setMegaQueue] = useState<NormalizedGiftEvent[]>([]);
  const [activeMega, setActiveMega] = useState<NormalizedGiftEvent | null>(null);
  const [universeSupernovaFlash, setUniverseSupernovaFlash] = useState(false);

  // World Broadcast Top Ticker for High-Value Gifts (>= 50 Coins)
  const [worldTicker, setWorldTicker] = useState<NormalizedGiftEvent | null>(
    null
  );

  const lastProcessedIdRef = useRef<string>('');
  const slotTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  // --------------------------------------------------------------------------
  // 1. UNIFIED GIFT ROUTER (COMBO STACKING + DUAL TRACK DISPATCH)
  // --------------------------------------------------------------------------
  const dispatchNormalizedGift = useCallback((gift: NormalizedGiftEvent) => {
    if (lastProcessedIdRef.current === gift.uid) return;
    lastProcessedIdRef.current = gift.uid;

    playLuxuryGiftSound(gift.tier);

    // Trigger World Broadcast Ribbon at Top of Screen for Diamond, Rocket & Universe
    if (gift.coinValue >= 50) {
      setWorldTicker(gift);
      setTimeout(() => {
        setWorldTicker((prev) => (prev?.uid === gift.uid ? null : prev));
      }, 5500);
    }

    // Route Mega Gifts (Rocket 500 / Universe 5000) to Track B
    if (gift.tier === 'rocket' || gift.tier === 'universe') {
      setMegaQueue((prev) => [...prev, gift]);
      return;
    }

    // Route Standard & Kinetic Gifts (Rose 1, Heart 10, Diamond 50) to Track A with Combo Stacking
    setActiveTrackA((prevActive) => {
      const existingIdx = prevActive.findIndex(
        (item) =>
          item.senderUsername === gift.senderUsername &&
          item.giftId === gift.giftId
      );

      // If same user is already on screen with same gift -> Increment Combo Streak!
      if (existingIdx !== -1) {
        const updated = [...prevActive];
        const currentItem = updated[existingIdx];
        const nextCombo = currentItem.comboCount + gift.comboCount;
        const mergedItem: NormalizedGiftEvent = {
          ...currentItem,
          comboCount: nextCombo,
          totalCoins: currentItem.coinValue * nextCombo,
          timestamp: Date.now(),
        };
        updated[existingIdx] = mergedItem;

        // Reset expiration timer for this combo slot
        const slotKey = `${gift.senderUsername}_${gift.giftId}`;
        if (slotTimersRef.current[slotKey]) {
          clearTimeout(slotTimersRef.current[slotKey]);
        }
        slotTimersRef.current[slotKey] = setTimeout(() => {
          setActiveTrackA((curr) =>
            curr.filter(
              (x) => `${x.senderUsername}_${x.giftId}` !== slotKey
            )
          );
        }, 3600);

        return updated;
      }

      // Otherwise if fewer than 3 active slots, mount immediately
      if (prevActive.length < 3) {
        const slotKey = `${gift.senderUsername}_${gift.giftId}`;
        if (slotTimersRef.current[slotKey]) {
          clearTimeout(slotTimersRef.current[slotKey]);
        }
        slotTimersRef.current[slotKey] = setTimeout(() => {
          setActiveTrackA((curr) =>
            curr.filter(
              (x) => `${x.senderUsername}_${x.giftId}` !== slotKey
            )
          );
        }, 3600);

        return [...prevActive, gift];
      }

      // Queue if all 3 slots are full
      setTrackAQueue((q) => [...q, gift]);
      return prevActive;
    });
  }, []);

  // --------------------------------------------------------------------------
  // 2. LISTEN TO LOCAL PROPS (`incomingGift` OR `localIncomingGift`)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const raw = incomingGift || localIncomingGift;
    if (raw) {
      dispatchNormalizedGift(normalizeGiftPayload(raw));
    }
  }, [incomingGift, localIncomingGift, dispatchNormalizedGift]);

  // --------------------------------------------------------------------------
  // 3. LISTEN TO SUPABASE REALTIME (`live_gifts` INSERT + BROADCAST)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!streamId) return;

    const channel = supabase
      .channel(`earnmega_luxury_gifts_${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_gifts',
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          if (payload.new) {
            dispatchNormalizedGift(
              normalizeGiftPayload(payload.new as RawGiftPayload)
            );
          }
        }
      )
      .on('broadcast', { event: 'live-gift' }, (payload) => {
        if (payload?.payload) {
          dispatchNormalizedGift(
            normalizeGiftPayload(payload.payload as RawGiftPayload)
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, dispatchNormalizedGift]);

  // --------------------------------------------------------------------------
  // 4. DRAIN TRACK A QUEUE WHEN SLOTS OPEN
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (activeMega) return; // Pause Track A queue while Mega Takeover is playing
    if (activeTrackA.length < 3 && trackAQueue.length > 0) {
      const nextGift = trackAQueue[0];
      setTrackAQueue((prev) => prev.slice(1));
      dispatchNormalizedGift(nextGift);
    }
  }, [activeTrackA, trackAQueue, activeMega, dispatchNormalizedGift]);

  // --------------------------------------------------------------------------
  // 5. SEQUENTIAL MEGA TAKEOVER SCHEDULER (TRACK B)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!activeMega && megaQueue.length > 0) {
      const nextMega = megaQueue[0];
      setMegaQueue((prev) => prev.slice(1));
      setActiveMega(nextMega);

      const isUniverse = nextMega.tier === 'universe';
      const totalDuration = isUniverse ? 6200 : 4100;

      const flashTimer = isUniverse
        ? setTimeout(() => setUniverseSupernovaFlash(true), 1150)
        : null;
      const flashClearTimer = isUniverse
        ? setTimeout(() => setUniverseSupernovaFlash(false), 1650)
        : null;

      const doneTimer = setTimeout(() => {
        setUniverseSupernovaFlash(false);
        setActiveMega(null);
      }, totalDuration);

      return () => {
        if (flashTimer) clearTimeout(flashTimer);
        if (flashClearTimer) clearTimeout(flashClearTimer);
        clearTimeout(doneTimer);
      };
    }
  }, [activeMega, megaQueue]);

  const isRocketActive = activeMega?.tier === 'rocket';
  const isUniverseActive = activeMega?.tier === 'universe';

  return (
    <motion.div
      animate={
        isRocketActive
          ? {
              x: [0, -10, 10, -7, 7, -4, 4, 0],
              y: [0, 6, -6, 4, -4, 0],
            }
          : { x: 0, y: 0 }
      }
      transition={{ duration: 0.65, ease: 'easeInOut' }}
      className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden select-none"
    >
      {/* ====================================================================
          TOP WORLD BROADCAST ROYAL TICKER (FOR GIFTS >= 50 COINS)
         ==================================================================== */}
      <AnimatePresence>
        {worldTicker && (
          <motion.div
            key={worldTicker.uid}
            initial={{ y: -90, opacity: 0, scale: 0.85 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -70, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="absolute top-24 inset-x-3 z-50 flex justify-center"
          >
            <div className="relative flex items-center gap-2.5 overflow-hidden rounded-full bg-gradient-to-r from-amber-500/95 via-fuchsia-600/95 to-purple-800/95 p-[1.5px] shadow-[0_0_35px_rgba(251,191,36,0.75)]">
              <div className="flex items-center gap-2.5 rounded-full bg-[#07070c]/90 backdrop-blur-2xl px-4 py-1.5">
                <Crown className="h-4 w-4 text-amber-400 animate-bounce" />
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                  @{worldTicker.senderUsername}
                </span>
                <span className="text-[11px] font-semibold text-white/85">
                  unleashed
                </span>
                <span className="text-base">{worldTicker.giftIcon}</span>
                <span className="text-xs font-black bg-gradient-to-r from-yellow-200 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                  {worldTicker.giftName} ({worldTicker.totalCoins.toLocaleString()} Coins)
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====================================================================
          TRACK A: LOWER-LEFT 3D HOLOGRAPHIC & KINETIC COMBO SLOTS
         ==================================================================== */}
      <div className="absolute bottom-52 left-3 z-30 flex flex-col gap-3 w-[305px] max-w-[86vw]">
        <AnimatePresence mode="popLayout">
          {!activeMega &&
            activeTrackA.map((gift) => {
              const isDiamond = gift.tier === 'diamond';
              const isHeart = gift.tier === 'heart';
              const slotKey = `${gift.senderUsername}_${gift.giftId}`;

              return (
                <motion.div
                  key={slotKey}
                  layout
                  initial={
                    isDiamond
                      ? { y: -150, scale: 0.4, rotateX: 75, opacity: 0 }
                      : { x: -320, scale: 0.8, opacity: 0 }
                  }
                  animate={{ x: 0, y: 0, scale: 1, rotateX: 0, opacity: 1 }}
                  exit={{ x: -120, scale: 0.75, opacity: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 260,
                    damping: 18,
                    mass: 0.9,
                  }}
                  className={`relative flex items-center justify-between rounded-full p-1.5 pr-4 backdrop-blur-2xl border transform-gpu ${
                    isDiamond
                      ? 'bg-gradient-to-r from-cyan-950/85 via-blue-950/80 to-indigo-950/85 border-cyan-300/80 shadow-[0_0_35px_rgba(34,211,238,0.75)]'
                      : isHeart
                      ? 'bg-gradient-to-r from-fuchsia-950/85 via-pink-950/80 to-purple-950/85 border-pink-400/75 shadow-[0_0_28px_rgba(236,72,153,0.65)]'
                      : 'bg-gradient-to-r from-rose-950/85 via-black/80 to-zinc-900/85 border-rose-400/60 shadow-[0_10px_30px_rgba(244,63,94,0.45)]'
                  }`}
                >
                  {/* Animated Holographic Sheen Sweep */}
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                    <motion.div
                      animate={{ x: ['-120%', '220%'] }}
                      transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                      className="h-full w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                    />
                  </div>

                  {/* Diamond Kinetic Hex Shockwave Ring */}
                  {isDiamond && (
                    <motion.div
                      key={`shock-${gift.comboCount}`}
                      initial={{ scale: 0.85, opacity: 0.95 }}
                      animate={{ scale: 2.35, opacity: 0 }}
                      transition={{ duration: 0.55, ease: 'easeOut' }}
                      className="pointer-events-none absolute inset-0 rounded-full border-2 border-cyan-300 shadow-[0_0_20px_#22d3ee]"
                    />
                  )}

                  {/* Floating Micro-Particles Around Slot */}
                  <div className="pointer-events-none absolute -top-3 right-10 flex gap-2">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        animate={{
                          y: [0, -22],
                          x: [(i - 1) * 8, (i - 1) * 16],
                          opacity: [1, 0],
                          scale: [0.6, 1.1],
                        }}
                        transition={{
                          duration: 1.1,
                          repeat: Infinity,
                          delay: i * 0.28,
                        }}
                        className="text-xs"
                      >
                        {isDiamond ? '✨' : isHeart ? '💖' : '🌸'}
                      </motion.span>
                    ))}
                  </div>

                  {/* Sender Avatar + Tier Badge */}
                  <div className="flex items-center gap-2.5 z-10">
                    <div className="relative h-10 w-10 rounded-full p-[1.5px] bg-gradient-to-tr from-amber-400 via-pink-500 to-cyan-400 shadow-md">
                      <img
                        src={gift.senderAvatar}
                        alt={gift.senderUsername}
                        className="h-full w-full rounded-full object-cover bg-black"
                      />
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black text-black shadow">
                        {isDiamond ? '💎' : '★'}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="max-w-[105px] truncate text-xs font-black tracking-wide text-white">
                          {gift.senderUsername}
                        </span>
                        {gift.comboCount >= 5 && (
                          <span className="rounded bg-gradient-to-r from-amber-400 to-red-500 px-1 py-0.2 text-[8px] font-black uppercase text-black">
                            FIRE
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-extrabold ${
                          isDiamond
                            ? 'text-cyan-300'
                            : isHeart
                            ? 'text-pink-300'
                            : 'text-amber-300'
                        }`}
                      >
                        Sent {gift.giftName}
                      </span>
                    </div>
                  </div>

                  {/* 3D Bouncing Gift Icon + Explosive Combo Counter */}
                  <div className="flex items-center gap-1.5 z-10">
                    <motion.span
                      key={`icon-${gift.timestamp}`}
                      initial={{ scale: 0.5, rotate: -20 }}
                      animate={{
                        scale: [1, 1.35, 1],
                        rotate: [0, 12, -10, 0],
                      }}
                      transition={{ duration: 0.45 }}
                      className="text-3xl drop-shadow-[0_0_16px_rgba(255,255,255,0.9)]"
                    >
                      {gift.giftIcon}
                    </motion.span>

                    <motion.div
                      key={`combo-${gift.comboCount}`}
                      initial={{ scale: 2.1, rotate: -12 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 420,
                        damping: 12,
                      }}
                      className="flex items-baseline"
                    >
                      <span className="text-xs font-black italic text-amber-300 mr-0.5">
                        x
                      </span>
                      <span
                        style={{
                          backgroundImage:
                            'linear-gradient(180deg, #FFFBEB 0%, #FDE047 45%, #F97316 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                        className="text-2xl font-black italic tracking-tighter drop-shadow-[0_2px_10px_rgba(249,115,22,0.85)]"
                      >
                        {gift.comboCount}
                      </span>
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
        </AnimatePresence>
      </div>

      {/* ====================================================================
          TRACK B (500 COINS): SUPERSONIC ORBITAL ROCKET IGNITION
         ==================================================================== */}
      <AnimatePresence>
        {isRocketActive && activeMega && (
          <motion.div
            key={activeMega.uid}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/65 backdrop-blur-md"
          >
            {/* 60FPS Warp Streak Canvas */}
            <MegaCanvasShader mode="rocket" />

            {/* Bottom Launchpad Sonic Boom Ring */}
            <motion.div
              initial={{ scale: 0.2, opacity: 0.9 }}
              animate={{ scale: [0.2, 3.2], opacity: [0.9, 0] }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
              className="absolute bottom-24 h-44 w-44 rounded-full border-4 border-orange-400 shadow-[0_0_60px_#f97316]"
            />

            {/* Supersonic Rocket S-Curve Trajectory */}
            <motion.div
              initial={{ x: -220, y: 420, scale: 0.35, rotate: 38 }}
              animate={{
                x: [-220, 0, 15, 290],
                y: [420, 20, -35, -520],
                scale: [0.35, 1.65, 1.75, 0.9],
                rotate: [38, 12, 22, 42],
              }}
              transition={{
                duration: 3.4,
                times: [0, 0.42, 0.68, 1],
                ease: 'easeInOut',
              }}
              className="relative z-20 flex flex-col items-center"
            >
              {/* Sonic Boom Vapor Cone */}
              <motion.div
                animate={{ scale: [0.9, 1.35, 0.9], opacity: [0.4, 0.85, 0.4] }}
                transition={{ duration: 0.3, repeat: Infinity }}
                className="absolute -inset-6 rounded-full bg-gradient-to-t from-orange-500/40 via-amber-300/30 to-transparent blur-md"
              />

              <span className="text-[110px] leading-none drop-shadow-[0_0_50px_rgba(251,146,60,1)]">
                🚀
              </span>

              {/* Twin Plasma Thruster Exhaust Plumes */}
              <div className="relative -mt-4 flex flex-col items-center">
                {Array.from({ length: 16 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                    animate={{
                      opacity: 0,
                      scale: 0,
                      x: (i % 2 === 0 ? -1 : 1) * (10 + i * 5),
                      y: 60 + i * 15,
                    }}
                    transition={{
                      duration: 0.55,
                      repeat: Infinity,
                      delay: i * 0.035,
                    }}
                    className="absolute h-4 w-4 rounded-full bg-gradient-to-t from-rose-600 via-orange-400 to-yellow-200 shadow-[0_0_16px_#f97316]"
                  />
                ))}
              </div>
            </motion.div>

            {/* Telemetry Commander VIP HUD Banner */}
            <motion.div
              initial={{ y: 90, scale: 0.7, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 50, scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18 }}
              className="absolute bottom-36 z-30 mx-4 rounded-3xl bg-gradient-to-r from-orange-500 via-amber-400 to-rose-600 p-[2px] shadow-[0_0_60px_rgba(249,115,22,0.85)]"
            >
              <div className="flex items-center gap-4 rounded-3xl bg-[#090910]/95 backdrop-blur-2xl px-6 py-4">
                <div className="relative h-14 w-14 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 to-rose-500">
                  <img
                    src={activeMega.senderAvatar}
                    alt={activeMega.senderUsername}
                    className="h-full w-full rounded-full object-cover bg-black"
                  />
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-orange-500 p-1 text-white shadow">
                    <Flame className="h-3.5 w-3.5 fill-white" />
                  </span>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-amber-400">
                    <Zap className="h-3.5 w-3.5 fill-amber-400" />
                    ORBITAL SUPERSONIC LAUNCH
                  </div>
                  <h3 className="text-lg font-black text-white">
                    @{activeMega.senderUsername}
                  </h3>
                  <p className="text-xs font-extrabold text-orange-300">
                    Launched {activeMega.giftName} •{' '}
                    <span className="text-amber-300">
                      {activeMega.totalCoins.toLocaleString()} Coins
                    </span>
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====================================================================
          TRACK B (5,000 COINS): THE EARNMEGA UNIVERSE SOVEREIGN SINGULARITY
         ==================================================================== */}
      <AnimatePresence>
        {isUniverseActive && activeMega && (
          <motion.div
            key={activeMega.uid}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#040309]/90 backdrop-blur-2xl"
          >
            {/* 60FPS Spiral Galaxy & Supernova Starfield Canvas */}
            <MegaCanvasShader mode="universe" />

            {/* IMAX 21:9 Cinema Letterbox Bars with Liquid Gold Trim */}
            <motion.div
              initial={{ y: '-100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-100%' }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="absolute top-0 inset-x-0 z-30 h-16 bg-black/95 border-b border-amber-400/50 shadow-[0_10px_40px_rgba(251,191,36,0.3)] flex items-center justify-center"
            >
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.35em] text-amber-300/90">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                EARNMEGA CELESTIAL SOVEREIGN BROADCAST
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              </div>
            </motion.div>

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="absolute bottom-0 inset-x-0 z-30 h-16 bg-black/95 border-t border-amber-400/50 shadow-[0_-10px_40px_rgba(251,191,36,0.3)]"
            />

            {/* 3D Gyroscopic Sacred Astrolabe Rings + Galaxy Core */}
            <div className="relative z-20 flex items-center justify-center [perspective:1000px]">
              {/* Outer Golden Gyro Ring */}
              <motion.div
                initial={{ scale: 0, rotateX: 65, rotateZ: 0, opacity: 0 }}
                animate={{
                  scale: [0.2, 1.35, 1.15],
                  rotateX: [65, 55, 65],
                  rotateZ: [0, 360],
                  opacity: 1,
                }}
                transition={{ duration: 5.5, ease: 'easeOut' }}
                className="absolute h-72 w-72 rounded-full border-2 border-dashed border-amber-300/70 shadow-[0_0_50px_rgba(251,191,36,0.5)]"
              />

              {/* Middle Cyan-Magenta Quantum Ring */}
              <motion.div
                initial={{ scale: 0, rotateY: 60, rotateZ: 0, opacity: 0 }}
                animate={{
                  scale: [0.2, 1.2, 1],
                  rotateY: [60, -60, 60],
                  rotateZ: [360, 0],
                  opacity: 1,
                }}
                transition={{ duration: 5.5, ease: 'easeOut' }}
                className="absolute h-60 w-60 rounded-full border border-fuchsia-400/70 shadow-[0_0_45px_rgba(232,121,249,0.6)]"
              />

              {/* Central Singularity Core + Descending Sovereign Crown */}
              <motion.div
                initial={{ scale: 0.05, rotate: -180, opacity: 0 }}
                animate={{
                  scale: [0.05, 0.4, 1.35, 1.1],
                  rotate: [-180, 0, 180, 360],
                  opacity: 1,
                }}
                transition={{
                  duration: 4.8,
                  times: [0, 0.22, 0.45, 1],
                  ease: 'easeOut',
                }}
                className="relative flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500/40 via-purple-600/40 to-cyan-400/40 border-2 border-amber-200/80 shadow-[0_0_120px_rgba(251,191,36,0.95)]"
              >
                <span className="text-8xl select-none drop-shadow-[0_0_45px_rgba(255,255,255,1)]">
                  🌌
                </span>
              </motion.div>

              {/* Royal Crown Hovering Above Core */}
              <motion.div
                initial={{ y: -140, scale: 0, opacity: 0 }}
                animate={{ y: -115, scale: [0, 1.3, 1], opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.8, type: 'spring' }}
                className="absolute flex flex-col items-center"
              >
                <div className="rounded-full bg-amber-400/25 p-3 border border-amber-300 shadow-[0_0_40px_#fbbf24]">
                  <Crown className="h-9 w-9 text-amber-300 fill-amber-400" />
                </div>
              </motion.div>
            </div>

            {/* Sovereign Patron Liquid Gold Foil Plaque */}
            <motion.div
              initial={{ y: 70, opacity: 0, scale: 0.82 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 1.15, duration: 0.65, type: 'spring' }}
              className="relative z-30 mt-14 mx-4 max-w-md rounded-3xl bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#AA771C] p-[2px] shadow-[0_0_80px_rgba(251,191,36,0.8)]"
            >
              <div className="flex flex-col items-center rounded-3xl bg-[#07060e]/95 backdrop-blur-2xl px-7 py-5 text-center">
                <div className="relative -mt-11 mb-2 h-16 w-16 rounded-full p-1 bg-gradient-to-tr from-amber-300 via-yellow-100 to-amber-500 shadow-[0_0_30px_#fbbf24]">
                  <img
                    src={activeMega.senderAvatar}
                    alt={activeMega.senderUsername}
                    className="h-full w-full rounded-full object-cover bg-black"
                  />
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 border border-amber-300/40 px-3.5 py-0.5 text-[10px] font-black uppercase tracking-[0.28em] text-amber-300 mb-1.5">
                  <Award className="h-3.5 w-3.5 text-amber-400" />
                  SUPREME UNIVERSE EMPEROR
                </div>

                <h2
                  style={{
                    backgroundImage:
                      'linear-gradient(110deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                  className="text-2xl font-black tracking-tight drop-shadow-[0_4px_24px_rgba(251,191,36,0.65)]"
                >
                  @{activeMega.senderUsername}
                </h2>

                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-white/90">
                  Summoned <span className="text-amber-300">The EarnMega Universe</span>
                </p>

                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500/25 via-yellow-400/25 to-amber-500/25 border border-amber-300/60 px-5 py-1.5 shadow-[0_0_25px_rgba(251,191,36,0.4)]">
                  <Diamond className="h-4 w-4 text-amber-300 fill-amber-300" />
                  <span className="text-sm font-black text-amber-200">
                    +{activeMega.totalCoins.toLocaleString()} COINS
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Supernova Blinding White Detonation Flash at 1.15s */}
            <AnimatePresence>
              {universeSupernovaFlash && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.95, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.48 }}
                  className="pointer-events-none absolute inset-0 z-50 bg-white"
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
