"use client";

import React, { useState, useEffect, useRef, useReducer, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface LiveGiftPayload {
  id: string;
  senderId: string;
  senderUsername: string;
  senderAvatar?: string;
  giftId: string;
  giftName: string;
  giftIcon: string;
  coinValue: number;
  comboCount?: number;
  totalValue: number;
  timestamp?: number;
}

// Fixed Gift Tiers Constants
export const LIVE_GIFT_TIERS = {
  ROSE: { id: 'rose', name: 'The Rose', cost: 1, icon: '🌹' },
  NEON_HEART: { id: 'neon_heart', name: 'The Neon Heart', cost: 10, icon: '💖' },
  DIAMOND: { id: 'diamond', name: 'The Diamond', cost: 50, icon: '💎' },
  ROCKET: { id: 'rocket', name: 'The Rocket', cost: 500, icon: '🚀' },
  UNIVERSE: { id: 'universe', name: 'The EarnMega Universe', cost: 5000, icon: '🌌' }
};

interface LiveGiftOverlayProps {
  incomingGift?: LiveGiftPayload | null;
  onTakeoverChange?: (isTakeoverActive: boolean) => void;
}

interface TrackAItem extends LiveGiftPayload {
  key: string;
}

interface TrackBItem extends LiveGiftPayload {
  key: string;
}

export default function LiveGiftOverlay({ incomingGift, onTakeoverChange }: LiveGiftOverlayProps) {
  // Track A state (Max 5 items, lower-left column)
  const [trackAQueue, setTrackAQueue] = useState<LiveGiftPayload[]>([]);
  const [activeTrackA, setActiveTrackA] = useState<TrackAItem[]>([]);

  // Track B state (Mega gifts: 500 and 5000)
  const [trackBQueue, setTrackBQueue] = useState<LiveGiftPayload[]>([]);
  const [activeTrackB, setActiveTrackB] = useState<TrackBItem | null>(null);

  // Takeover status to freeze Track A queue processing
  const [isTakeoverActive, setIsTakeoverActive] = useState<boolean>(false);

  // Process incoming gifts into appropriate queues
  const processGift = useCallback((gift: LiveGiftPayload) => {
    if (gift.coinValue >= 500) {
      setTrackBQueue((prev) => [...prev, gift]);
    } else {
      setTrackAQueue((prev) => [...prev, gift]);
    }
  }, []);

  // Sync prop changes
  const prevGiftIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (incomingGift && incomingGift.id !== prevGiftIdRef.current) {
      prevGiftIdRef.current = incomingGift.id;
      processGift(incomingGift);
    }
  }, [incomingGift, processGift]);

  // Global window event listener for incoming gifts
  useEffect(() => {
    const handleCustomGiftEvent = (e: CustomEvent<LiveGiftPayload>) => {
      if (e.detail) {
        processGift(e.detail);
      }
    };
    window.addEventListener('live_gift_received' as any, handleCustomGiftEvent as EventListener);
    return () => {
      window.removeEventListener('live_gift_received' as any, handleCustomGiftEvent as EventListener);
    };
  }, [processGift]);

  // Track B (Mega Gifts) processing manager
  useEffect(() => {
    if (!activeTrackB && trackBQueue.length > 0) {
      const nextMegaGift = trackBQueue[0];
      setTrackBQueue((prev) => prev.slice(1));
      setActiveTrackB({ ...nextMegaGift, key: `${nextMegaGift.id}_${Date.now()}` });
      setIsTakeoverActive(true);
      onTakeoverChange?.(true);
    }
  }, [activeTrackB, trackBQueue, onTakeoverChange]);

  // Track A queue processing manager (pauses when Takeover is active)
  useEffect(() => {
    if (isTakeoverActive) return;

    if (trackAQueue.length > 0 && activeTrackA.length < 5) {
      const nextGift = trackAQueue[0];
      setTrackAQueue((prev) => prev.slice(1));
      const newItem: TrackAItem = { ...nextGift, key: `${nextGift.id}_${Date.now()}_${Math.random()}` };
      setActiveTrackA((prev) => [...prev, newItem]);
    }
  }, [trackAQueue, activeTrackA, isTakeoverActive]);

  // Remove Track A item on animation complete
  const handleTrackAComplete = (key: string) => {
    setActiveTrackA((prev) => prev.filter((item) => item.key !== key));
  };

  // Remove Track B item and restore Takeover state
  const handleTrackBComplete = () => {
    setActiveTrackB(null);
    if (trackBQueue.length === 0) {
      setIsTakeoverActive(false);
      onTakeoverChange?.(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] pointer-events-none select-none overflow-hidden w-[100vw] h-[100dvh]">
      {/* TRACK A: Lower-left staggered physics column for 1, 10, 50 Coin Gifts */}
      <div className="absolute bottom-28 left-4 flex flex-col-reverse gap-3 z-30 max-w-[340px] pointer-events-none">
        <AnimatePresence mode="popLayout">
          {activeTrackA.map((gift) => (
            <TrackAGiftCard key={gift.key} gift={gift} onComplete={() => handleTrackAComplete(gift.key)} />
          ))}
        </AnimatePresence>
      </div>

      {/* TRACK B: Global Stream Takeover Mega Gifts (500 Rocket, 5000 EarnMega Universe) */}
      <AnimatePresence>
        {activeTrackB && (
          <TrackBMegaGift gift={activeTrackB} onComplete={handleTrackBComplete} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================================
 * TRACK A CARD RENDERING ENGINE (1, 10, 50 Coins)
 * ============================================================================ */

interface TrackAGiftCardProps {
  gift: TrackAItem;
  onComplete: () => void;
}

function TrackAGiftCard({ gift, onComplete }: TrackAGiftCardProps) {
  const isDiamond = gift.coinValue >= 50;
  const [showShockwave, setShowShockwave] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      layout
      initial={
        isDiamond
          ? { y: -300, opacity: 0, scale: 1.3 }
          : { x: -120, opacity: 0, scale: 0.8 }
      }
      animate={
        isDiamond
          ? { y: 0, opacity: 1, scale: 1 }
          : { x: 0, opacity: 1, scale: 1 }
      }
      exit={{ y: -40, opacity: 0, scale: 0.8 }}
      transition={
        isDiamond
          ? { type: 'spring', mass: 1.5, stiffness: 350, damping: 18 }
          : { type: 'spring', mass: 1.2, stiffness: 200, damping: 15 }
      }
      onAnimationComplete={() => {
        if (isDiamond) {
          setShowShockwave(true);
        }
      }}
      className="relative will-change-transform transform-gpu"
    >
      {/* Shockwave effect for 50 Coin Diamond */}
      {isDiamond && showShockwave && (
        <motion.div
          initial={{ scale: 1, opacity: 1 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full border-2 border-white pointer-events-none z-0 shadow-[0_0_20px_#00f3ff]"
        />
      )}

      {/* Glassmorphism Card Container */}
      <div
        className={`relative z-10 flex items-center gap-3 p-2 pr-5 rounded-full backdrop-blur-2xl border transition-all ${
          isDiamond
            ? 'bg-gradient-to-r from-cyan-950/80 via-black/80 to-blue-950/80 border-cyan-400/50 shadow-[0_0_25px_rgba(6,182,212,0.5)]'
            : gift.coinValue >= 10
            ? 'bg-gradient-to-r from-fuchsia-950/70 via-black/70 to-rose-950/70 border-fuchsia-400/40 shadow-[0_8px_32px_rgba(236,72,153,0.3)]'
            : 'bg-white/10 border-white/15 shadow-[0_8px_32px_rgba(255,255,255,0.1)]'
        }`}
      >
        {/* Sender Avatar */}
        <div className="relative shrink-0">
          <img
            src={
              gift.senderAvatar ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${gift.senderUsername}`
            }
            alt={gift.senderUsername}
            className="w-10 h-10 rounded-full object-cover border border-white/30 bg-neutral-900 shadow-md"
          />
          {isDiamond && (
            <div className="absolute inset-0 rounded-full border border-cyan-400 animate-ping opacity-75" />
          )}
        </div>

        {/* User Metadata */}
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-black text-white truncate drop-shadow-md tracking-tight">
            @{gift.senderUsername}
          </span>
          <span
            className={`text-[10px] font-bold truncate ${
              isDiamond
                ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                : gift.coinValue >= 10
                ? 'text-fuchsia-300'
                : 'text-amber-300'
            }`}
          >
            Sent {gift.giftName}
          </span>
        </div>

        {/* Floating Icon with Sine Wave Animation */}
        <motion.div
          animate={{ y: ['-8%', '8%'] }}
          transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          className="text-3xl ml-1 shrink-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
        >
          {gift.giftIcon}
        </motion.div>

        {/* Combo Multiplier */}
        {(gift.comboCount || 1) > 1 && (
          <motion.span
            key={gift.comboCount}
            initial={{ scale: 2.2, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 12 }}
            className="text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500 drop-shadow-[0_2px_10px_rgba(245,158,11,0.9)] ml-1"
          >
            x{gift.comboCount}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}

/* ============================================================================
 * TRACK B MEGA GIFT TAKEOVER ENGINE (500 Rocket & 5000 EarnMega Universe)
 * ============================================================================ */

interface TrackBMegaGiftProps {
  gift: TrackBItem;
  onComplete: () => void;
}

function TrackBMegaGift({ gift, onComplete }: TrackBMegaGiftProps) {
  const isUniverse = gift.coinValue >= 5000;

  useEffect(() => {
    const duration = isUniverse ? 6000 : 4500;
    const timer = setTimeout(() => {
      onComplete();
    }, duration);
    return () => clearTimeout(timer);
  }, [isUniverse, onComplete]);

  return (
    <div className="fixed inset-0 z-[999999] pointer-events-none select-none flex items-center justify-center overflow-hidden">
      {isUniverse ? (
        <UniverseTakeover gift={gift} />
      ) : (
        <RocketTakeover gift={gift} />
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * 500 COIN ROCKET TAKEOVER
 * ---------------------------------------------------------------------------- */

function RocketTakeover({ gift }: { gift: TrackBItem }) {
  // Particles state for rocket tail smoke/fire
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    let pId = 0;
    const interval = setInterval(() => {
      pId++;
      setParticles((prev) => [
        ...prev.slice(-15),
        { id: pId, x: Math.random() * 20 - 10, y: Math.random() * 20 - 10 }
      ]);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        x: [0, -4, 4, -2, 2, 0]
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="relative w-full h-full flex items-center justify-center will-change-transform transform-gpu"
    >
      {/* Diagonal Flying Rocket */}
      <motion.div
        initial={{ x: '-30vw', y: '80vh', scale: 0.6, rotate: 35 }}
        animate={{ x: '110vw', y: '-30vh', scale: 1.4, rotate: 35 }}
        transition={{ duration: 3.2, ease: [0.15, 0.85, 0.35, 1.2] }}
        className="absolute z-50 flex items-center gap-3 will-change-transform transform-gpu"
      >
        {/* Fire/Smoke particles emitter trailing behind rocket */}
        <div className="relative">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ scale: 1, opacity: 0.9 }}
              animate={{ scale: 0, opacity: 0, x: p.x - 40, y: p.y + 40 }}
              transition={{ duration: 0.6 }}
              className="absolute w-6 h-6 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-orange-400 blur-xs"
            />
          ))}
          <span className="text-8xl drop-shadow-[0_0_35px_rgba(245,158,11,0.9)]">🚀</span>
        </div>
      </motion.div>

      {/* Cinematic Banner Overlay */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: -50 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 250, damping: 20 }}
        className="z-40 bg-gradient-to-r from-zinc-950/90 via-rose-950/90 to-amber-950/90 backdrop-blur-2xl border-2 border-amber-400/60 rounded-3xl p-6 px-10 flex items-center gap-6 shadow-[0_0_80px_rgba(245,158,11,0.6)]"
      >
        <img
          src={
            gift.senderAvatar ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${gift.senderUsername}`
          }
          className="w-16 h-16 rounded-full border-2 border-amber-400 object-cover shadow-2xl bg-neutral-900"
        />
        <div className="flex flex-col">
          <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 drop-shadow-md">
            @{gift.senderUsername}
          </span>
          <span className="text-2xl font-black text-white tracking-wide uppercase drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]">
            Launched {gift.giftName}!
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ----------------------------------------------------------------------------
 * 5000 COIN EARNMEGA UNIVERSE TAKEOVER
 * ---------------------------------------------------------------------------- */

function UniverseTakeover({ gift }: { gift: TrackBItem }) {
  const [showFlash, setShowFlash] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFlash(true);
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[999999] flex flex-col items-center justify-between pointer-events-none select-none bg-black/70 backdrop-blur-3xl overflow-hidden will-change-transform transform-gpu"
    >
      {/* Letterbox Bars */}
      <motion.div
        initial={{ y: '-100%' }}
        animate={{ y: 0 }}
        exit={{ y: '-100%' }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="w-full h-20 bg-black border-b border-amber-500/30 z-50 shrink-0"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="w-full h-20 bg-black border-t border-amber-500/30 z-50 shrink-0"
      />

      {/* Massive Center Galaxy / Planet Asset */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
        <motion.div
          initial={{ scale: 0.1, opacity: 0, rotate: -45 }}
          animate={{ scale: [0.1, 1.25, 1], opacity: 1, rotate: 0 }}
          transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex items-center justify-center"
        >
          {/* Ambient Outer Aura Glow */}
          <div className="absolute w-[380px] h-[380px] rounded-full bg-gradient-to-tr from-fuchsia-600 via-indigo-600 to-amber-400 opacity-60 blur-3xl animate-pulse" />

          {/* Rotating Cosmic Rings */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            className="absolute w-[320px] h-[320px] rounded-full border-2 border-dashed border-amber-300/40"
          />

          {/* Galaxy Emoji / Visual Center */}
          <div className="text-[140px] z-10 drop-shadow-[0_0_60px_rgba(245,158,11,0.9)]">
            🌌
          </div>
        </motion.div>

        {/* Gold Foil Animated Typography */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="flex flex-col items-center mt-6 z-40 text-center px-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <img
              src={
                gift.senderAvatar ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${gift.senderUsername}`
              }
              className="w-12 h-12 rounded-full border-2 border-amber-400 object-cover shadow-xl bg-neutral-900"
            />
            <span className="text-xl font-bold text-amber-200 tracking-wider">
              @{gift.senderUsername}
            </span>
          </div>

          <h1
            className="text-3xl md:text-5xl font-black tracking-tight uppercase drop-shadow-[0_4px_25px_rgba(251,191,36,0.8)]"
            style={{
              background: 'linear-gradient(110deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'goldShine 3s linear infinite'
            }}
          >
            GIFTED THE UNIVERSE!
          </h1>
        </motion.div>
      </div>

      {/* Climax White Flash Screen Implosion */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="fixed inset-0 bg-white z-[1000000] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Inline Styles for Gold Shine Animation Keyframes */}
      <style jsx>{`
        @keyframes goldShine {
          0% {
            background-position: 0% center;
          }
          100% {
            background-position: 200% center;
          }
        }
      `}</style>
    </motion.div>
  );
}
