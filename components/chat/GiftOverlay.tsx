'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

type GiftEvent = {
  id: string;
  sender_id: string;
  recipient_id: string;
  gift_name: string;
  gift_cost: number;
  gift_image?: string;
};

export default function GiftOverlay() {
  const { user } = useAuth();
  const [activeGift, setActiveGift] = useState<GiftEvent | null>(null);
  const [serpentBitePhase, setSerpentBitePhase] = useState(false);
  const [imgError, setImgError] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // ==========================================
  // 🔊 PROCEDURAL CINEMATIC 3D SOUND ENGINE
  // ==========================================
  const playGiftSFX = useCallback((giftName: string, cost: number) => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;
      const isSerpent = giftName.includes('serpent') || giftName.includes('snake') || giftName.includes('dragon') || giftName.includes('viper');
      const isGod = cost >= 2000 || giftName.includes('god');

      if (isSerpent) {
        // Viper Hiss (Filtered White Noise) + Violent Jaw Snap Impact
        const bufferSize = ctx.sampleRate * 2.2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(3200, now);
        filter.frequency.exponentialRampToValueAtTime(1200, now + 1.3);

        const hissGain = ctx.createGain();
        hissGain.gain.setValueAtTime(0.01, now);
        hissGain.gain.linearRampToValueAtTime(0.35, now + 0.4);
        hissGain.gain.exponentialRampToValueAtTime(0.01, now + 1.35);

        whiteNoise.connect(filter);
        filter.connect(hissGain);
        hissGain.connect(ctx.destination);
        whiteNoise.start(now);
        whiteNoise.stop(now + 1.4);

        // Lunge Sub-Bass Strike at 1.35s
        const strikeOsc = ctx.createOscillator();
        const strikeGain = ctx.createGain();
        strikeOsc.type = 'sawtooth';
        strikeOsc.frequency.setValueAtTime(190, now + 1.35);
        strikeOsc.frequency.exponentialRampToValueAtTime(28, now + 1.9);

        strikeGain.gain.setValueAtTime(0, now);
        strikeGain.gain.setValueAtTime(0.5, now + 1.35);
        strikeGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

        strikeOsc.connect(strikeGain);
        strikeGain.connect(ctx.destination);
        strikeOsc.start(now + 1.35);
        strikeOsc.stop(now + 2.05);
      } else if (isGod) {
        // Heavenly Celestial Choir Chord + Earth-Shattering Sub-Bass Thunder
        const freqs = [65.41, 130.81, 196.0, 261.63, 329.63, 392.0, 523.25];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = idx < 2 ? 'sawtooth' : 'sine';
          osc.frequency.setValueAtTime(f, now);
          osc.frequency.linearRampToValueAtTime(f * 1.005, now + 5.5);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(idx < 2 ? 0.22 : 0.12, now + 0.3);
          gain.gain.setValueAtTime(idx < 2 ? 0.2 : 0.1, now + 3.5);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 6.5);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 6.6);
        });
      } else if (cost >= 1000) {
        // Royal / Cosmic Bass Drop + Harmonic Shimmer
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 1.8);
        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 2.1);
      } else {
        // Crystalline Magical Chime Sweep
        [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.08);
          gain.gain.setValueAtTime(0.18, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 1.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 1.3);
        });
      }
    } catch (err) {
      // Ignore audio block errors if user hasn't interacted yet
    }
  }, []);

  useEffect(() => {
    const handleGiftEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { giftData, senderId, receiverId } = customEvent.detail;

      // 🔒 SECURITY GATE: ONLY THE RECEIVER SEES THE ANIMATION
      if (!user || user.id !== receiverId) return;

      const normalizedName = (giftData.name || '').toLowerCase();
      const cost = Number(giftData.cost) || 10;

      const newGift: GiftEvent = {
        id: Date.now().toString(),
        sender_id: senderId,
        recipient_id: receiverId || '',
        gift_name: normalizedName,
        gift_cost: cost,
        gift_image: giftData.image
      };

      setImgError(false);
      setSerpentBitePhase(false);
      setActiveGift(newGift);
      playGiftSFX(normalizedName, cost);

      const isSerpent =
        normalizedName.includes('serpent') ||
        normalizedName.includes('snake') ||
        normalizedName.includes('dragon') ||
        normalizedName.includes('viper');
      const isGod = cost >= 2000 || normalizedName.includes('god');

      // Trigger Serpent Lunge Bite at 1.35 seconds
      if (isSerpent) {
        setTimeout(() => {
          setSerpentBitePhase(true);
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([400, 40, 700, 50, 300]);
          }
        }, 1350);
      }

      // Advanced Sensory Engine (Haptics)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        if (isGod) {
          navigator.vibrate([800, 80, 1000, 80, 1200, 80, 1500]);
        } else if (isSerpent) {
          navigator.vibrate([150, 60, 150, 60, 200]);
        } else if (cost === 10) {
          navigator.vibrate([80, 40, 120]);
        } else if (cost === 50) {
          navigator.vibrate([120, 60, 120, 60, 250]);
        } else if (cost === 500) {
          navigator.vibrate([250, 50, 250, 50, 450]);
        } else if (cost === 1000) {
          navigator.vibrate([450, 80, 600, 80, 800]);
        } else if (cost === 1500) {
          navigator.vibrate([600, 80, 700, 80, 1100]);
        }
      }

      // Unmount timer (8.5s for Mythic God Mode, 7.2s for others)
      const durationMs = isGod ? 8500 : 7200;
      const timerId = setTimeout(() => {
        setActiveGift((current) => (current?.id === newGift.id ? null : current));
        setSerpentBitePhase(false);
      }, durationMs);

      (window as any).__giftTimer = timerId;
    };

    window.addEventListener('gift_received_local', handleGiftEvent);
    return () => {
      window.removeEventListener('gift_received_local', handleGiftEvent);
      if ((window as any).__giftTimer) clearTimeout((window as any).__giftTimer);
    };
  }, [user, playGiftSFX]);

  if (typeof document === 'undefined' || !activeGift) return null;

  const isSerpentGift =
    activeGift.gift_name.includes('serpent') ||
    activeGift.gift_name.includes('snake') ||
    activeGift.gift_name.includes('dragon') ||
    activeGift.gift_name.includes('viper');

  const isCoffeeGift = activeGift.gift_cost === 10 && !isSerpentGift;
  const isRoseGift = activeGift.gift_cost === 50;
  const isDiamondGift = activeGift.gift_cost === 500;
  const isCrownGift = activeGift.gift_cost === 1000;
  const isGalaxyGift = activeGift.gift_cost === 1500;
  const isGodGift = activeGift.gift_cost >= 2000 || activeGift.gift_name.includes('god');

  return createPortal(
    <AnimatePresence>
      {activeGift && (
        <motion.div
          key={activeGift.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
        >
          {/* =========================================================================
              🐍 TIER 1A: CYBER SERPENT STRIKE (10 Coins - 4K Jump-Scare Bite & Shatter)
             ========================================================================= */}
          {isSerpentGift && (
            <motion.div
              animate={
                serpentBitePhase
                  ? {
                      x: [-35, 35, -30, 30, -20, 20, -10, 10, 0],
                      y: [-25, 25, -20, 20, -12, 12, 0]
                    }
                  : { x: 0, y: 0 }
              }
              transition={{ duration: 0.55, ease: 'easeInOut' }}
              className="absolute inset-0 flex items-center justify-center overflow-hidden bg-slate-950/90 backdrop-blur-2xl"
              style={{ perspective: 1200 }}
            >
              {/* Blinding Cyan/Emerald Venom Strobe on Bite Impact */}
              <AnimatePresence>
                {serpentBitePhase && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: [1, 0.2, 0.9, 0] }}
                    transition={{ duration: 0.65 }}
                    className="absolute inset-0 z-50 bg-gradient-to-tr from-cyan-400 via-emerald-300 to-amber-300 mix-blend-screen"
                  />
                )}
              </AnimatePresence>

              {/* Cyberpunk Neon Vortex Grid Background */}
              <motion.div
                animate={{ rotateZ: 360, scale: [1, 1.2, 1] }}
                transition={{ rotateZ: { duration: 18, repeat: Infinity, ease: 'linear' }, scale: { duration: 3, repeat: Infinity } }}
                className="absolute w-[52rem] h-[52rem] rounded-full bg-[radial-gradient(circle,_rgba(6,182,212,0.35)_0%,_rgba(16,185,129,0.15)_40%,_transparent_70%)] blur-2xl"
              />

              {/* Floating Cyber Runes (Left & Right Pillars like the Artwork) */}
              <motion.div
                initial={{ opacity: 0, x: -80 }}
                animate={{ opacity: [0.4, 1, 0.5], x: 0 }}
                transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
                className="absolute left-4 top-1/4 border-2 border-amber-400/80 bg-amber-950/40 px-2 py-6 rounded shadow-[0_0_30px_rgba(251,191,36,0.7)] text-amber-300 font-mono text-xs tracking-widest writing-vertical-rl"
              >
                ⚡ CYBER VIPER ⚡
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 80 }}
                animate={{ opacity: [0.4, 1, 0.5], x: 0 }}
                transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse', delay: 0.3 }}
                className="absolute right-4 top-1/4 border-2 border-cyan-400/80 bg-cyan-950/40 px-2 py-6 rounded shadow-[0_0_30px_rgba(34,211,238,0.7)] text-cyan-300 font-mono text-xs tracking-widest writing-vertical-rl"
              >
                ☠️ LETHAL BITE ☠️
              </motion.div>

              {/* 4K Serpent Core: Coils smoothly then LUNGES VIOLENTLY at 1.35s */}
              <motion.div
                initial={{ scale: 0.3, rotateZ: -15, z: -400, opacity: 0 }}
                animate={
                  serpentBitePhase
                    ? {
                        scale: [0.85, 3.8, 3.2],
                        rotateX: [15, -10, 0],
                        rotateZ: [-8, 10, -4, 0],
                        opacity: 1
                      }
                    : {
                        scale: [0.4, 1.08, 0.96, 1.05],
                        rotateY: [-18, 18, -12],
                        rotateZ: [0, 4, -4, 0],
                        opacity: 1
                      }
                }
                transition={
                  serpentBitePhase
                    ? { duration: 0.24, type: 'spring', stiffness: 450, damping: 14 }
                    : { duration: 1.35, ease: 'easeInOut' }
                }
                className="relative z-30 flex items-center justify-center transform-gpu"
              >
                {/* Glowing Electric Orb Core */}
                <motion.div
                  animate={{ scale: [1, 1.35, 1], rotateZ: -360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="absolute w-40 h-40 rounded-full bg-[radial-gradient(circle,_#ffffff_0%,_#22d3ee_45%,_#3b82f6_75%,_transparent_100%)] shadow-[0_0_90px_25px_rgba(34,211,238,0.95)] mix-blend-screen z-20 pointer-events-none"
                />

                {/* 4K Artwork Card with HDR Neon Bloom */}
                {!imgError ? (
                  <div className="relative w-80 h-80 sm:w-96 sm:h-96 rounded-3xl overflow-hidden shadow-[0_0_120px_rgba(6,182,212,0.9)] border-2 border-cyan-300/60">
                    <img
                      src={activeGift.gift_image || '/cyber-serpent.png'}
                      alt="Cyber Serpent"
                      onError={() => setImgError(true)}
                      className="w-full h-full object-cover contrast-125 brightness-110 saturate-150"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-cyan-500/20 mix-blend-overlay" />
                  </div>
                ) : (
                  /* High-Definition Procedural Cyber Dragon Fallback if image isn't uploaded yet */
                  <div className="relative w-80 h-80 rounded-full flex items-center justify-center bg-[radial-gradient(circle,_#083344_0%,_#020617_80%)] border-4 border-cyan-400 shadow-[0_0_100px_#06b6d4]">
                    <div className="text-[110px] drop-shadow-[0_0_40px_rgba(34,211,238,1)]">🐉</div>
                  </div>
                )}

                {/* UNHINGED FANGS & FLICKERING LASER TONGUE OVERLAY ON BITE */}
                <AnimatePresence>
                  {serpentBitePhase && (
                    <motion.svg
                      initial={{ scale: 0.2, opacity: 0 }}
                      animate={{ scale: [0.5, 1.35, 1.15], opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      viewBox="0 0 300 300"
                      className="absolute inset-0 w-full h-full z-40 drop-shadow-[0_0_35px_rgba(34,211,238,1)]"
                    >
                      {/* Upper Cyber Fangs */}
                      <polygon points="75,30 105,135 125,45" fill="#e0f2fe" stroke="#22d3ee" strokeWidth="4" />
                      <polygon points="225,30 195,135 175,45" fill="#e0f2fe" stroke="#22d3ee" strokeWidth="4" />
                      {/* Lower Cyber Fangs */}
                      <polygon points="90,260 115,180 130,250" fill="#fef08a" stroke="#f59e0b" strokeWidth="4" />
                      <polygon points="210,260 185,180 170,250" fill="#fef08a" stroke="#f59e0b" strokeWidth="4" />
                      {/* Flickering Forked Viper Tongue */}
                      <motion.path
                        animate={{ d: [
                          "M150,150 Q150,210 130,265 M150,210 L170,265",
                          "M150,150 Q160,215 120,275 M155,215 L180,275",
                          "M150,150 Q140,210 135,260 M145,210 L165,260"
                        ]}}
                        transition={{ duration: 0.12, repeat: Infinity }}
                        stroke="#f43f5e"
                        strokeWidth="7"
                        strokeLinecap="round"
                        fill="none"
                        className="drop-shadow-[0_0_20px_#f43f5e]"
                      />
                    </motion.svg>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* SHATTERED SCREEN GLASS & VENom CRACKS ON BITE IMPACT */}
              <AnimatePresence>
                {serpentBitePhase && (
                  <motion.div
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center"
                  >
                    <svg viewBox="0 0 1000 1000" className="w-full h-full opacity-90 drop-shadow-[0_0_20px_rgba(34,211,238,0.95)]">
                      <g stroke="#67e8f9" strokeWidth="3.5" fill="none">
                        <path d="M500,500 L200,100 M500,500 L850,150 M500,500 L950,550 M500,500 L750,920 M500,500 L250,880 M500,500 L50,450" />
                        <path d="M350,300 L550,240 L680,350 L620,620 L380,690 L260,480 Z" strokeWidth="2" />
                        <path d="M250,170 L450,120 L780,220 L820,500 L680,820 L320,810 L140,560 Z" strokeWidth="1.5" />
                      </g>
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* HUD Title Banner */}
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="absolute bottom-12 z-50 px-6 py-2.5 rounded-full bg-slate-950/90 border border-cyan-400/80 shadow-[0_0_40px_rgba(34,211,238,0.8)]"
              >
                <span className="text-cyan-300 font-extrabold tracking-widest text-sm uppercase">
                  🐍 CYBER SERPENT STRIKE • 10 COINS
                </span>
              </motion.div>
            </motion.div>
          )}

          {/* =========================================================================
              ☕ TIER 1B: COFFEE (10 Coins - 4K Golden Crema & Volumetric Aroma Surge)
             ========================================================================= */}
          {isCoffeeGift && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-amber-950/40 backdrop-blur-md"
            >
              {/* Expanding Golden Warmth Rings */}
              {[1, 2, 3].map((ring) => (
                <motion.div
                  key={`coffee-ring-${ring}`}
                  initial={{ scale: 0.4, opacity: 0.8 }}
                  animate={{ scale: 3.8, opacity: 0 }}
                  transition={{ duration: 2.6, repeat: Infinity, delay: ring * 0.7, ease: 'easeOut' }}
                  className="absolute w-44 h-44 rounded-full border-2 border-amber-400/50 shadow-[0_0_40px_rgba(245,158,11,0.5)]"
                />
              ))}

              <motion.div
                initial={{ y: '80vh', scale: 0.4, rotateZ: -12 }}
                animate={{ y: [null, -20, 0], scale: [0.4, 1.15, 1], rotateZ: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                className="relative flex flex-col items-center justify-center"
              >
                {/* Glowing Golden Coaster Halo */}
                <motion.div
                  animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -bottom-6 w-52 h-12 bg-amber-500/50 rounded-[100%] blur-2xl"
                />

                {/* 3D Double-Walled Luxury Espresso Glass */}
                <div className="w-40 h-52 bg-white/10 backdrop-blur-3xl border-2 border-amber-200/40 rounded-b-[52px] rounded-t-2xl relative flex flex-col items-center shadow-[0_25px_80px_rgba(245,158,11,0.6),inset_0_0_30px_rgba(255,255,255,0.25)]">
                  {/* Cup Handle */}
                  <div className="absolute -right-11 top-10 w-14 h-28 border-[8px] border-amber-200/30 rounded-r-3xl backdrop-blur-md shadow-[0_0_25px_rgba(251,191,36,0.3)]" />

                  {/* Rich Espresso & Golden Crema Foam Layer */}
                  <div className="w-[92%] h-[88%] absolute bottom-2 rounded-b-[46px] rounded-t-lg overflow-hidden bg-gradient-to-t from-[#1c0a00] via-[#5c2406] to-[#d97706] shadow-[inset_0_-15px_30px_rgba(0,0,0,0.9)]">
                    {/* Swirling Golden Crema Top */}
                    <motion.div
                      animate={{ x: [-20, 20, -20] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-full h-7 bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-400 blur-[1px] opacity-95"
                    />
                  </div>
                </div>

                {/* Volumetric Golden Steam Plumes */}
                <div className="absolute -top-36 flex space-x-4">
                  {[1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={`steam-${i}`}
                      animate={{
                        y: [0, -160],
                        x: [0, i % 2 === 0 ? 35 : -35, 0],
                        opacity: [0, 0.75, 0],
                        scale: [0.8, 3.5]
                      }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', delay: i * 0.45 }}
                      className="w-6 h-16 bg-gradient-to-t from-amber-200/50 to-white/40 rounded-full blur-md"
                    />
                  ))}
                </div>
              </motion.div>

              {/* Floating Golden Aroma Sparks */}
              {[...Array(35)].map((_, i) => (
                <motion.div
                  key={`aroma-${i}`}
                  initial={{ y: 150, x: (Math.random() - 0.5) * 350, opacity: 0, scale: 0 }}
                  animate={{
                    y: -500,
                    x: (Math.random() - 0.5) * 500,
                    opacity: [0, 1, 0],
                    scale: [0, 1.4, 0]
                  }}
                  transition={{ duration: 2.5 + Math.random() * 2, repeat: Infinity, delay: Math.random() }}
                  className="absolute w-2.5 h-2.5 bg-amber-300 rounded-full shadow-[0_0_15px_#fbbf24]"
                />
              ))}
            </motion.div>
          )}

          {/* =========================================================================
              🌹 TIER 2: ROSE (50 Coins - 4K Velvet Bloom & Crimson Petal Tornado)
             ========================================================================= */}
          {isRoseGift && (
            <motion.div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-rose-950/50 backdrop-blur-lg">
              {/* Romantic Heartbeat Pulsing Aura */}
              <motion.div
                animate={{ scale: [1, 1.35, 1.1, 1.45, 1], opacity: [0.4, 0.8, 0.5, 0.9, 0.4] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute w-[28rem] h-[28rem] bg-[radial-gradient(circle,_rgba(244,63,94,0.55)_0%,_transparent_70%)] rounded-full blur-2xl mix-blend-screen"
              />

              {/* 3D Blooming Velvet Rose */}
              <motion.div
                initial={{ scale: 0, rotateZ: -45, y: 120 }}
                animate={{ scale: [0, 1.35, 1.1], rotateZ: [0, 5, -5, 0], y: 0 }}
                transition={{ duration: 1.2, type: 'spring', bounce: 0.5 }}
                className="relative z-20 flex flex-col items-center drop-shadow-[0_0_65px_rgba(225,29,72,1)]"
              >
                {/* Glowing Emerald Stem & Leaves */}
                <div className="absolute top-28 w-3.5 h-56 bg-gradient-to-b from-emerald-500 via-green-700 to-emerald-950 rounded-full -z-10 shadow-[0_0_25px_rgba(16,185,129,0.7)]" />
                <div className="absolute top-44 -left-10 w-12 h-6 bg-gradient-to-tr from-emerald-800 to-emerald-400 rounded-tl-full rounded-br-full -rotate-12" />
                <div className="absolute top-52 -right-10 w-12 h-6 bg-gradient-to-tl from-emerald-800 to-emerald-400 rounded-tr-full rounded-bl-full rotate-12" />

                {/* Multi-Layered 3D Velvet Petals */}
                <div className="relative w-56 h-56 flex items-center justify-center">
                  <motion.div
                    animate={{ rotateZ: 360 }}
                    transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_#fb7185,_#be123c,_#4c0519)] rounded-[42%_58%_45%_55%] shadow-[inset_0_-12px_35px_rgba(0,0,0,0.85),0_0_40px_rgba(244,63,94,0.8)]"
                  />
                  <motion.div
                    animate={{ rotateZ: -360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-4 bg-[radial-gradient(circle_at_40%_40%,_#fda4af,_#e11d48,_#881337)] rounded-[55%_45%_60%_40%] rotate-45 shadow-[inset_0_6px_25px_rgba(0,0,0,0.75)]"
                  />
                  <div className="absolute inset-10 bg-[radial-gradient(circle_at_50%_50%,_#ffe4e6,_#f43f5e,_#9f1239)] rounded-[48%_52%_50%_50%] -rotate-12 shadow-[inset_0_-8px_20px_rgba(0,0,0,0.6)]" />
                  <div className="absolute inset-16 bg-[radial-gradient(circle,_#fff1f2,_#e11d48)] rounded-full shadow-[0_0_30px_#ffffff]" />
                </div>
              </motion.div>

              {/* Swirling Tornado of 50 Crimson Petals & Golden Embers */}
              {[...Array(55)].map((_, i) => {
                const isPetal = i % 2 === 0;
                return (
                  <motion.div
                    key={`rose-particle-${i}`}
                    initial={{
                      y: 450,
                      x: (Math.random() - 0.5) * 500,
                      opacity: 0,
                      scale: 0,
                      rotateZ: 0
                    }}
                    animate={{
                      y: -850,
                      x: [
                        (Math.random() - 0.5) * 400,
                        (Math.random() - 0.5) * 700,
                        (Math.random() - 0.5) * 400
                      ],
                      opacity: [0, 1, 1, 0],
                      scale: [0, isPetal ? 1.4 : 0.9, 0],
                      rotateZ: Math.random() * 720
                    }}
                    transition={{ duration: 3 + Math.random() * 2.5, ease: 'easeOut' }}
                    className={
                      isPetal
                        ? 'absolute w-5 h-6 bg-gradient-to-br from-rose-400 via-rose-600 to-rose-900 rounded-tl-full rounded-br-full shadow-[0_0_15px_rgba(244,63,94,0.9)]'
                        : 'absolute w-2.5 h-2.5 bg-amber-300 rounded-full shadow-[0_0_18px_4px_rgba(252,211,77,0.95)] mix-blend-screen'
                    }
                  />
                );
              })}
            </motion.div>
          )}

          {/* =========================================================================
              💎 TIER 3: DIAMOND (500 Coins - 4K Prism Refraction & Crystal Shatter Rain)
             ========================================================================= */}
          {isDiamondGift && (
            <motion.div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-slate-950/75 backdrop-blur-xl">
              {/* Blinding Core Optical Flare */}
              <motion.div
                animate={{ scale: [1, 1.8, 1.2], opacity: [0.7, 1, 0.7] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                className="absolute w-96 h-96 bg-[radial-gradient(circle,_#ffffff_0%,_#38bdf8_40%,_transparent_70%)] rounded-full blur-2xl mix-blend-screen"
              />

              {/* Spinning Rainbow Prism Laser Rays */}
              <motion.div
                animate={{ rotateZ: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                className="absolute w-[1000px] h-[1000px] bg-[conic-gradient(from_0deg,_transparent_0deg,_rgba(56,189,248,0.35)_15deg,_rgba(232,121,249,0.35)_30deg,_transparent_50deg,_transparent_180deg,_rgba(56,189,248,0.35)_195deg,_rgba(232,121,249,0.35)_210deg,_transparent_230deg)] mix-blend-screen"
              />

              {/* 3D Levitating Multi-Faceted Diamond */}
              <motion.div style={{ perspective: 2000 }} className="z-20">
                <motion.div
                  initial={{ scale: 0, rotateY: 0 }}
                  animate={{
                    scale: [0, 1.35, 1.1],
                    rotateY: 360,
                    rotateX: [15, 35, 15],
                    rotateZ: [-10, 10, -10]
                  }}
                  transition={{
                    scale: { duration: 0.8, type: 'spring' },
                    rotateY: { repeat: Infinity, duration: 4.5, ease: 'linear' },
                    rotateX: { repeat: Infinity, duration: 3, ease: 'easeInOut' }
                  }}
                  className="relative w-64 h-64 transform-gpu drop-shadow-[0_0_80px_rgba(56,189,248,1)]"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div
                    className="absolute inset-0 bg-gradient-to-br from-white via-cyan-200 to-blue-500/60 border-[3px] border-white shadow-[0_0_100px_#ffffff]"
                    style={{ clipPath: 'polygon(50% 0%, 100% 28%, 50% 100%, 0% 28%)', transform: 'translateZ(40px)' }}
                  />
                  <div
                    className="absolute inset-0 bg-fuchsia-400/40 border border-fuchsia-200 mix-blend-screen"
                    style={{ clipPath: 'polygon(50% 0%, 100% 28%, 50% 100%, 0% 28%)', transform: 'translateZ(32px) translateX(-8px)' }}
                  />
                  <div
                    className="absolute inset-0 bg-cyan-300/50 border border-cyan-100 mix-blend-screen"
                    style={{ clipPath: 'polygon(50% 0%, 100% 28%, 50% 100%, 0% 28%)', transform: 'translateZ(32px) translateX(8px)' }}
                  />
                </motion.div>
              </motion.div>

              {/* Raining 4K Reflective Diamond Shards */}
              {[...Array(65)].map((_, i) => (
                <motion.div
                  key={`diamond-shard-${i}`}
                  initial={{ y: -200, x: (Math.random() - 0.5) * 700, opacity: 1, scale: Math.random() * 1.4 + 0.4 }}
                  animate={{
                    y: 900,
                    x: (Math.random() - 0.5) * 900,
                    rotateZ: Math.random() * 1080,
                    rotateY: Math.random() * 1080,
                    opacity: [0, 1, 1, 0]
                  }}
                  transition={{ duration: 2 + Math.random() * 1.8, ease: 'easeIn' }}
                  className="absolute w-5 h-7 bg-gradient-to-b from-white via-cyan-200 to-blue-400 shadow-[0_0_20px_#ffffff]"
                  style={{ clipPath: 'polygon(50% 0%, 100% 35%, 50% 100%, 0% 35%)' }}
                />
              ))}
            </motion.div>
          )}

          {/* =========================================================================
              👑 TIER 4: CROWN (1000 Coins - Heavy Solid-Gold Slam & Bullion Rain)
             ========================================================================= */}
          {isCrownGift && (
            <motion.div
              animate={{ y: [0, -20, 20, -12, 12, 0] }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-black/80 backdrop-blur-xl"
            >
              {/* Massive Golden Sonic Shockwave */}
              <motion.div
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: [0, 5.5, 9], opacity: [1, 0.8, 0] }}
                transition={{ duration: 1.4, delay: 0.25, ease: 'easeOut' }}
                className="absolute w-64 h-64 border-[16px] border-amber-300 rounded-full shadow-[0_0_120px_rgba(251,191,36,1)]"
              />

              {/* Sky-Piercing Royal Light Pillar */}
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: [0, 1.4, 0.8, 0], opacity: [0, 1, 0.8, 0] }}
                transition={{ duration: 2.2, delay: 0.15 }}
                className="absolute w-96 h-[200vh] bg-gradient-to-r from-transparent via-amber-200/60 to-transparent blur-xl mix-blend-screen"
              />

              {/* 3D Solid Gold Imperial Crown */}
              <motion.div
                initial={{ y: -900, scale: 1.8, rotateX: 40 }}
                animate={{ y: [null, 0, -35, 0], scale: [1.8, 1, 1.12, 1.05], rotateX: 0 }}
                transition={{ duration: 0.65, ease: 'easeOut' }}
                className="relative z-20"
              >
                <div className="relative w-72 h-52 flex items-end drop-shadow-[0_25px_110px_rgba(251,191,36,1)]">
                  <div className="w-full h-14 bg-[linear-gradient(to_right,#92400e,#fef08a,#d97706,#fef08a,#92400e)] rounded-full absolute bottom-0 border-y-4 border-yellow-100 shadow-[inset_0_-10px_25px_rgba(0,0,0,0.85)] z-20">
                    <div className="absolute top-1/2 left-1/4 w-5 h-5 bg-rose-600 rounded-full shadow-[0_0_20px_#f43f5e,inset_0_0_6px_white] -translate-y-1/2" />
                    <div className="absolute top-1/2 left-1/2 w-7 h-7 bg-emerald-400 rounded-full shadow-[0_0_25px_#10b981,inset_0_0_8px_white] -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute top-1/2 right-1/4 w-5 h-5 bg-blue-500 rounded-full shadow-[0_0_20px_#3b82f6,inset_0_0_6px_white] -translate-y-1/2" />
                  </div>
                  <div className="w-20 h-40 bg-[linear-gradient(to_bottom,#fef08a,#d97706,#78350f)] absolute bottom-8 left-0 [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
                  <div className="w-28 h-48 bg-[linear-gradient(to_bottom,#ffffff,#fbbf24,#78350f)] absolute bottom-8 left-1/2 -translate-x-1/2 [clip-path:polygon(50%_0,100%_100%,0_100%)] shadow-[0_0_70px_rgba(255,255,255,0.9)] z-10" />
                  <div className="w-20 h-40 bg-[linear-gradient(to_bottom,#fef08a,#d97706,#78350f)] absolute bottom-8 right-0 [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
                </div>
              </motion.div>

              {/* 110 Spinning 3D Gold Bullion & Coins Raining */}
              {[...Array(110)].map((_, i) => (
                <motion.div
                  key={`gold-coin-${i}`}
                  initial={{ y: -100, x: 0, opacity: 1, scale: Math.random() * 1.4 + 0.5 }}
                  animate={{
                    y: 950,
                    x: (Math.random() - 0.5) * 950,
                    rotateY: Math.random() * 1080,
                    rotateZ: Math.random() * 720,
                    opacity: [1, 1, 0]
                  }}
                  transition={{ duration: 1.6 + Math.random() * 1.4, delay: 0.25, ease: 'easeIn' }}
                  className="absolute w-5 h-5 rounded-full bg-[radial-gradient(circle,#fef08a,#d97706)] border border-yellow-100 shadow-[0_0_15px_rgba(251,191,36,0.95)]"
                />
              ))}
            </motion.div>
          )}

          {/* =========================================================================
              🌌 TIER 5: GALAXY (1500 Coins - Black Hole Vortex & Supernova Detonation)
             ========================================================================= */}
          {isGalaxyGift && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black"
              style={{ perspective: 900 }}
            >
              {/* Supernova Detonation Flash at 3.2s */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0, 1, 0] }}
                transition={{ duration: 4, times: [0, 0.7, 0.78, 1] }}
                className="absolute inset-0 z-50 bg-white mix-blend-screen"
              />

              {/* Hyperspeed Warp Star Streaks */}
              <motion.div
                animate={{ scale: [0.8, 2.4], rotateZ: 180 }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0"
              >
                {[...Array(75)].map((_, i) => {
                  const angle = Math.random() * 360;
                  return (
                    <div
                      key={`warp-star-${i}`}
                      className="absolute w-40 h-[2px] bg-gradient-to-r from-transparent via-cyan-200 to-white"
                      style={{
                        top: '50%',
                        left: '50%',
                        transform: `rotate(${angle}deg) translateX(${80 + Math.random() * 450}px)`
                      }}
                    />
                  );
                })}
              </motion.div>

              <div className="relative flex items-center justify-center transform-gpu">
                {/* Event Horizon Singularity */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.3, 0.9, 1.5] }}
                  transition={{ duration: 4, ease: 'easeInOut' }}
                  className="absolute w-52 h-52 bg-black rounded-full shadow-[0_0_120px_40px_rgba(217,70,239,0.9),inset_0_0_50px_#ffffff] border-2 border-fuchsia-300/60 z-20"
                />

                {/* Relativistic Accretion Disk */}
                <motion.div
                  animate={{ rotateZ: -360, scale: [1, 1.2, 1] }}
                  transition={{ rotateZ: { duration: 6, repeat: Infinity, ease: 'linear' }, scale: { duration: 2, repeat: Infinity } }}
                  className="absolute w-96 h-96 rounded-full bg-[conic-gradient(from_0deg,#f43f5e,#d946ef,#3b82f6,#06b6d4,#f43f5e)] blur-2xl opacity-90 mix-blend-screen z-10"
                />

                {/* 3D Orbital Plasma Rings */}
                <motion.div
                  initial={{ rotateX: 72, rotateY: 22, scale: 0 }}
                  animate={{ rotateZ: 360, scale: 1.15 }}
                  transition={{ rotateZ: { duration: 2.5, repeat: Infinity, ease: 'linear' }, scale: { duration: 1 } }}
                  className="absolute w-[38rem] h-[38rem] rounded-full border-[10px] border-l-fuchsia-300 border-r-cyan-300 border-y-transparent shadow-[0_0_90px_25px_rgba(217,70,239,0.9)] z-30"
                />
              </div>
            </motion.div>
          )}

          {/* =========================================================================
              ⚡🔥 TIER 6: GOD MODE AURA (2000 Coins - 4K Mythic Celestial Finisher)
             ========================================================================= */}
          {isGodGift && (
            <motion.div
              animate={{
                x: [-18, 18, -14, 14, -22, 22, -8, 8, 0],
                y: [-14, 14, -18, 18, -10, 10, 0]
              }}
              transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black"
              style={{ perspective: 1400 }}
            >
              {/* 1. Initial Blinding Golden Heaven Flash */}
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: [1, 0.9, 0] }}
                transition={{ duration: 1.1, ease: 'easeOut' }}
                className="absolute inset-0 z-50 bg-gradient-to-b from-white via-amber-200 to-amber-500 mix-blend-screen pointer-events-none"
              />

              {/* 2. Spinning Volumetric Celestial God-Rays */}
              <motion.div
                animate={{ rotateZ: 360, scale: [1, 1.25, 1] }}
                transition={{ rotateZ: { duration: 22, repeat: Infinity, ease: 'linear' }, scale: { duration: 3, repeat: Infinity } }}
                className="absolute w-[1200px] h-[1200px] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(251,191,36,0.45)_12deg,rgba(254,240,138,0.7)_20deg,transparent_35deg,transparent_90deg,rgba(245,158,11,0.5)_105deg,transparent_125deg,transparent_180deg,rgba(254,240,138,0.65)_195deg,transparent_215deg,transparent_270deg,rgba(251,191,36,0.45)_285deg,transparent_305deg)] mix-blend-screen"
              />

              {/* 3. Six Erupting Vertical Solar Fire Pillars */}
              <div className="absolute inset-x-0 bottom-0 h-full flex justify-around items-end opacity-80 pointer-events-none">
                {[...Array(6)].map((_, idx) => (
                  <motion.div
                    key={`pillar-${idx}`}
                    initial={{ height: '0%', opacity: 0 }}
                    animate={{ height: ['20%', '100%', '75%', '100%'], opacity: [0.4, 0.95, 0.6, 0.9] }}
                    transition={{ duration: 1.4 + idx * 0.2, repeat: Infinity, repeatType: 'mirror' }}
                    className="w-8 sm:w-12 bg-gradient-to-t from-orange-600 via-amber-400 to-transparent blur-md mix-blend-screen"
                  />
                ))}
              </div>

              {/* 4. Repeating Golden Sonic-Boom Shockwaves */}
              {[0, 1.2, 2.4, 3.6].map((delay, idx) => (
                <motion.div
                  key={`god-wave-${idx}`}
                  initial={{ scale: 0.2, opacity: 1 }}
                  animate={{ scale: 6.5, opacity: 0 }}
                  transition={{ duration: 2.2, delay, repeat: Infinity, ease: 'easeOut' }}
                  className="absolute w-56 h-56 rounded-full border-[8px] border-amber-300 shadow-[0_0_90px_#fbbf24] z-20 pointer-events-none"
                />
              ))}

              {/* 5. 4K Living God Mode Entity (3D Breathing, Expanding Wings & HDR Bloom) */}
              <motion.div
                initial={{ scale: 0.4, y: 120, rotateX: 25 }}
                animate={{
                  scale: [0.7, 1.18, 1.06, 1.22, 1.12],
                  y: [40, -18, 8, -22, 0],
                  rotateX: [20, 0, -6, 0],
                  rotateY: [-8, 8, -8]
                }}
                transition={{ duration: 4.5, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
                className="relative z-30 flex items-center justify-center transform-gpu"
              >
                {/* Sacred Rotating Halo Behind the Entity */}
                <motion.div
                  animate={{ rotateZ: -360, scale: [1, 1.12, 1] }}
                  transition={{ rotateZ: { duration: 10, repeat: Infinity, ease: 'linear' }, scale: { duration: 2, repeat: Infinity } }}
                  className="absolute -inset-12 rounded-full border-4 border-dashed border-yellow-200/90 shadow-[0_0_120px_30px_rgba(251,191,36,0.95)]"
                />

                {/* Animated Giant Golden-Fire Wings Expanding Outward */}
                <motion.svg
                  animate={{ scaleX: [0.92, 1.18, 0.95], scaleY: [0.95, 1.08, 0.95] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  viewBox="0 0 600 400"
                  className="absolute w-[150%] max-w-none h-auto -z-10 drop-shadow-[0_0_55px_rgba(251,191,36,1)]"
                >
                  <path
                    d="M300,220 C210,80 80,40 10,90 C60,150 110,190 50,240 C130,240 190,260 300,270 Z"
                    fill="url(#godWingGrad)"
                  />
                  <path
                    d="M300,220 C390,80 520,40 590,90 C540,150 490,190 550,240 C470,240 410,260 300,270 Z"
                    fill="url(#godWingGrad)"
                  />
                  <defs>
                    <linearGradient id="godWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="45%" stopColor="#fde047" />
                      <stop offset="100%" stopColor="#ea580c" />
                    </linearGradient>
                  </defs>
                </motion.svg>

                {/* The 4K God Mode Artwork Card with Intense HDR Radiance */}
                {!imgError ? (
                  <div className="relative w-80 h-96 sm:w-96 sm:h-[28rem] rounded-3xl overflow-hidden border-4 border-yellow-100 shadow-[0_0_160px_40px_rgba(251,191,36,1)]">
                    <img
                      src={activeGift.gift_image || '/God aura.png'}
                      alt="God Mode Aura"
                      onError={() => setImgError(true)}
                      className="w-full h-full object-cover contrast-125 brightness-110 saturate-150"
                    />
                    {/* Pulsing Solar Core Flare Over the Staff & Chest */}
                    <motion.div
                      animate={{ opacity: [0.3, 0.85, 0.3], scale: [0.95, 1.15, 0.95] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                      className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,_rgba(255,255,255,0.8)_0%,_rgba(251,191,36,0.4)_35%,_transparent_65%)] mix-blend-screen"
                    />
                  </div>
                ) : (
                  /* Ultra-HD Procedural Celestial Archangel Fallback */
                  <div className="relative w-80 h-96 rounded-3xl flex flex-col items-center justify-center bg-[radial-gradient(circle,_#fef08a_0%,_#f59e0b_45%,_#451a03_100%)] border-4 border-white shadow-[0_0_160px_40px_rgba(251,191,36,1)]">
                    <div className="text-[120px] drop-shadow-[0_0_50px_#ffffff]">⚡👑⚡</div>
                  </div>
                )}
              </motion.div>

              {/* 6. Rising Solar Fire Embers & Levitating Celestial Debris (90 Particles) */}
              {[...Array(90)].map((_, i) => (
                <motion.div
                  key={`god-ember-${i}`}
                  initial={{
                    y: 550,
                    x: (Math.random() - 0.5) * 900,
                    opacity: 0,
                    scale: Math.random() * 1.8 + 0.5
                  }}
                  animate={{
                    y: -950,
                    x: (Math.random() - 0.5) * 950,
                    opacity: [0, 1, 1, 0],
                    rotateZ: Math.random() * 720
                  }}
                  transition={{
                    duration: 2 + Math.random() * 2.5,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                    ease: 'easeOut'
                  }}
                  className={
                    i % 4 === 0
                      ? 'absolute w-3.5 h-5 bg-gradient-to-t from-amber-700 via-amber-400 to-yellow-100 shadow-[0_0_20px_#fde047]'
                      : 'absolute w-2.5 h-2.5 rounded-full bg-yellow-100 shadow-[0_0_20px_5px_#f59e0b] mix-blend-screen'
                  }
                />
              ))}

              {/* Mythic HUD Announcement Banner */}
              <motion.div
                initial={{ scale: 0, y: 60 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
                className="absolute bottom-10 z-50 px-8 py-3 rounded-full bg-gradient-to-r from-amber-950/95 via-yellow-900/95 to-amber-950/95 border-2 border-yellow-200 shadow-[0_0_60px_rgba(251,191,36,1)]"
              >
                <span className="text-yellow-100 font-black tracking-[0.2em] text-sm sm:text-base uppercase drop-shadow-[0_0_12px_#ffffff]">
                  ⚡ MYTHIC GOD MODE UNLEASHED • 2,000 COINS ⚡
                </span>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
