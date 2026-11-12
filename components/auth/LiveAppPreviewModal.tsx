'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Radio,
  Radar,
  MessageCircle,
  Lock,
  Sparkles,
  Heart,
  X,
  Play,
  Pause,
  ShieldCheck,
  Mic,
  Send,
  Crown,
  CheckCircle2,
  MapPin,
  Gift,
  Users,
  Eye,
  Volume2,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useModalBackHandler } from '../../utils/useModalBackHandler';

export type PreviewTab = 'explore' | 'live' | 'radar' | 'chats';

interface LiveAppPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlockCheckout: () => void;
  priceLabel?: string;
}

const PREVIEW_TABS: { id: PreviewTab; label: string; shortLabel: string; icon: any }[] = [
  { id: 'explore', label: 'Explore & Find Love', shortLabel: 'Explore', icon: Flame },
  { id: 'live', label: '4K Live Arena', shortLabel: 'Live', icon: Radio },
  { id: 'radar', label: 'GPS Radar', shortLabel: 'Radar', icon: Radar },
  { id: 'chats', label: 'Global Chat & AI', shortLabel: 'Chats', icon: MessageCircle },
];

const EXPLORE_PROFILES = [
  {
    id: 'ama',
    name: 'Ama',
    age: 23,
    city: 'Accra',
    distance: '1.2 km away',
    badge: 'VIP',
    status: 'Online Now',
    voiceDuration: '0:14',
    bio: 'Creative director & rooftop jazz lover. Let us grab iced hibiscus tea in Osu.',
    photo:
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=900&auto=format&fit=crop',
    tags: ['Fashion', 'Travel', 'Voice Intros'],
  },
  {
    id: 'kofi',
    name: 'Kofi',
    age: 26,
    city: 'East Legon',
    distance: 'Online Now',
    badge: 'PRO',
    status: 'Active 1m ago',
    voiceDuration: '0:21',
    bio: 'FinTech builder & midnight Afrobeats producer. Always down for deep convos.',
    photo:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=900&auto=format&fit=crop',
    tags: ['Music', 'Tech', 'Verified'],
  },
  {
    id: 'nadia',
    name: 'Nadia',
    age: 24,
    city: 'Airport Residential',
    distance: '0.8 km away',
    badge: 'PREMIUM',
    status: 'Spark Ready',
    voiceDuration: '0:11',
    bio: 'Architect & fitness enthusiast. Love coastal drives and spontaneous dinners.',
    photo:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=900&auto=format&fit=crop',
    tags: ['Design', 'Wellness', 'Accra'],
  },
];

const LIVE_COMMENTS = [
  { user: '@ama_vibes', text: 'Dropped a Diamond gift! This 4K stream is crystal clear 💎', color: 'text-amber-300' },
  { user: '@kwame_gh', text: 'Accra nightlife tuned in live!! 🔥🔥', color: 'text-emerald-300' },
  { user: '@zara_gold', text: 'Send Crown to stage! Who else is watching from Osu? 👑', color: 'text-fuchsia-300' },
  { user: '@kojo_vip', text: 'Wait till you unlock Global Chat & DM creators directly 🚀', color: 'text-cyan-300' },
];

const RADAR_PINS = [
  {
    id: 'r1',
    name: 'Ama, 23',
    distance: '0.8 km',
    neighborhood: 'Osu • Online',
    top: '22%',
    left: '26%',
    avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=300&auto=format&fit=crop',
  },
  {
    id: 'r2',
    name: 'Kofi, 26',
    distance: '1.4 km',
    neighborhood: 'East Legon',
    top: '30%',
    left: '70%',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&auto=format&fit=crop',
  },
  {
    id: 'r3',
    name: 'Nadia, 24',
    distance: '2.4 km',
    neighborhood: 'Cantonments',
    top: '68%',
    left: '64%',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=300&auto=format&fit=crop',
  },
];

const CHAT_THREADS = [
  {
    id: 'ai',
    name: '24/7 Neural AI Companion',
    subtitle: 'Ready to chat, coach, translate & brainstorm anytime ✨',
    time: 'Pinned',
    badge: 'AI FRIEND',
    unread: 0,
    online: true,
    isBot: true,
    voiceNote: null,
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Friend&backgroundColor=d946ef',
  },
  {
    id: 'grp1',
    name: 'Accra Creators & Founders VIP',
    subtitle: 'Ama: Dropping private rooftop invites tonight at 8pm 🔥',
    time: 'Just now',
    badge: 'VIP GROUP',
    unread: 12,
    online: true,
    isBot: false,
    voiceNote: null,
    avatar: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=300&auto=format&fit=crop',
  },
  {
    id: 'dm1',
    name: 'Ama Mensah',
    subtitle: 'Voice note',
    time: '2m',
    badge: 'VERIFIED',
    unread: 2,
    online: true,
    isBot: false,
    voiceNote: '0:18',
    avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=300&auto=format&fit=crop',
  },
  {
    id: 'dm2',
    name: 'Kofi Boateng',
    subtitle: 'Sent you a Love Spark ⚡ Tap to reply in HD video',
    time: '9m',
    badge: 'PRO',
    unread: 1,
    online: true,
    isBot: false,
    voiceNote: null,
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&auto=format&fit=crop',
  },
];

export default function LiveAppPreviewModal({
  isOpen,
  onClose,
  onUnlockCheckout,
  priceLabel = 'GH₵ 50',
}: LiveAppPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>('explore');
  const [autoTour, setAutoTour] = useState(true);
  const [viewerCount, setViewerCount] = useState(1420);
  const [lockedActionLabel, setLockedActionLabel] = useState<string | null>(null);
  const touchHandledRef = useRef(0);

  useModalBackHandler(isOpen, onClose, 'horpalLiveAppPreview');

  // Subtle realistic auto-tour across the 4 live tabs
  useEffect(() => {
    if (!isOpen || !autoTour) return;
    const order: PreviewTab[] = ['explore', 'live', 'radar', 'chats'];
    const id = setInterval(() => {
      setActiveTab((prev) => {
        const idx = order.indexOf(prev);
        return order[(idx + 1) % order.length];
      });
    }, 5200);
    return () => clearInterval(id);
  }, [isOpen, autoTour]);

  // Subtle live viewer ticker
  useEffect(() => {
    if (!isOpen) return;
    const id = setInterval(() => {
      setViewerCount((prev) => prev + (Math.random() > 0.45 ? 3 : -2));
    }, 2200);
    return () => clearInterval(id);
  }, [isOpen]);

  if (!isOpen) return null;

  const runSafeTap = (fn: () => void) => ({
    onTouchEnd: (e: React.TouchEvent) => {
      e.stopPropagation();
      touchHandledRef.current = Date.now();
      fn();
    },
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      if (Date.now() - touchHandledRef.current < 450) return;
      fn();
    },
  });

  const handleLockedInteraction = (actionName?: string) => {
    toast.error('🔒 Preview Mode Only — Pay GH₵ 50 Once to Chat, Stream & Connect!', {
      id: 'preview-lock-toast',
      duration: 3800,
    });
    setLockedActionLabel(actionName || 'Interactive Feature');
    onUnlockCheckout();
  };

  return (
    <div className="fixed inset-0 z-[260] bg-[#040406] text-white flex flex-col overflow-hidden">
      {/* Top Sticky Glass Lock Banner */}
      <div className="sticky top-0 z-40 w-full bg-[#090910]/90 backdrop-blur-2xl border-b border-amber-500/30 px-3 sm:px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 shadow-[0_8px_32px_rgba(0,0,0,0.85)]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
              <p className="text-[11px] sm:text-xs font-extrabold tracking-wide text-amber-200 truncate">
                🔴 LIVE APP PREVIEW — Interactive Controls Locked • Pay {priceLabel} Once to Unlock Everything
              </p>
            </div>
            <button
              type="button"
              {...runSafeTap(onClose)}
              className="sm:hidden min-w-[44px] min-h-[44px] px-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-black flex items-center justify-center gap-1 shrink-0 cursor-pointer touch-manipulation"
            >
              <X size={15} />
              <span>Exit</span>
            </button>
          </div>

          <div className="flex items-center gap-2 justify-between sm:justify-end">
            <button
              type="button"
              {...runSafeTap(() => setAutoTour((v) => !v))}
              className="min-h-[40px] px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-[11px] font-bold text-zinc-300 flex items-center gap-1.5 cursor-pointer touch-manipulation"
            >
              {autoTour ? <Pause size={12} className="text-emerald-400" /> : <Play size={12} className="text-amber-400" />}
              <span>{autoTour ? 'Auto-Tour On' : 'Auto-Tour Paused'}</span>
            </button>

            <button
              type="button"
              {...runSafeTap(() => onUnlockCheckout())}
              className="min-h-[44px] px-4 py-2 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-black text-xs font-black tracking-wide shadow-[0_0_24px_rgba(245,158,11,0.55)] hover:scale-[1.02] active:scale-95 transition flex items-center gap-1.5 cursor-pointer touch-manipulation"
            >
              <ShieldCheck size={15} />
              <span>Unlock Full Access ({priceLabel})</span>
            </button>

            <button
              type="button"
              {...runSafeTap(onClose)}
              className="hidden sm:flex min-w-[44px] min-h-[44px] px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-black items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
            >
              <X size={15} />
              <span>✕ Exit Preview</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real App Top Tab Switcher */}
      <div className="bg-[#08080D] border-b border-white/10 px-3 py-2.5 shrink-0">
        <div className="max-w-4xl mx-auto grid grid-cols-4 gap-1.5 sm:gap-2">
          {PREVIEW_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                {...runSafeTap(() => {
                  setAutoTour(false);
                  setActiveTab(tab.id);
                })}
                className={`min-h-[44px] px-2 py-2 rounded-2xl text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer touch-manipulation border ${
                  active
                    ? 'bg-gradient-to-r from-amber-500/25 via-fuchsia-500/20 to-amber-500/20 border-amber-400/60 text-white shadow-[0_0_16px_rgba(245,158,11,0.25)]'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon size={14} className={active ? 'text-amber-400 shrink-0' : 'shrink-0'} />
                <span className="hidden md:inline truncate">{tab.label}</span>
                <span className="md:hidden truncate">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Realistic App Viewport */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 pb-24">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {/* TAB 1: EXPLORE & FIND LOVE */}
            {activeTab === 'explore' && (
              <motion.div
                key="explore"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
                      🔥 Explore & Find Love
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        428 ONLINE NOW
                      </span>
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Listen to real voice intros, send Spark priority likes, or connect nearby.
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {['Verified', 'Voice Intros', 'Accra'].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        {...runSafeTap(() => handleLockedInteraction(`Filter: ${chip}`))}
                        className="px-3 py-1.5 rounded-full bg-white/5 border border-white/15 text-[11px] font-bold text-zinc-300 hover:border-amber-400/50 cursor-pointer touch-manipulation"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {EXPLORE_PROFILES.map((person) => (
                    <div
                      key={person.id}
                      {...runSafeTap(() => handleLockedInteraction(`${person.name}'s Profile`))}
                      className="group relative rounded-3xl overflow-hidden bg-[#0E0E15] border border-white/15 hover:border-amber-400/50 transition shadow-2xl cursor-pointer touch-manipulation"
                    >
                      <div className="relative h-72 w-full overflow-hidden">
                        <img
                          src={person.photo}
                          alt={person.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B11] via-black/30 to-transparent" />

                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-emerald-400/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {person.status}
                          </span>
                          <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-[10px] font-black tracking-wider">
                            {person.badge}
                          </span>
                        </div>

                        <div className="absolute bottom-3 left-3 right-3">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-lg font-black text-white">
                              {person.name}, {person.age}
                            </h3>
                            <CheckCircle2 size={16} className="text-sky-400 fill-sky-400/20" />
                          </div>
                          <p className="text-xs text-zinc-200 flex items-center gap-1">
                            <MapPin size={12} className="text-amber-400" />
                            {person.city} — {person.distance}
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 space-y-3">
                        <p className="text-xs text-zinc-300 line-clamp-2">{person.bio}</p>

                        {/* Voice Intro Waveform */}
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-white/5 border border-white/10">
                          <div className="w-7 h-7 rounded-full bg-fuchsia-500/25 border border-fuchsia-400/40 flex items-center justify-center text-fuchsia-300 shrink-0">
                            <Volume2 size={14} />
                          </div>
                          <div className="flex-1 flex items-center gap-0.5 h-4">
                            {[35, 70, 50, 95, 65, 85, 45, 90, 55, 75, 40, 80].map((h, idx) => (
                              <span
                                key={idx}
                                style={{ height: `${h}%` }}
                                className="flex-1 rounded-full bg-gradient-to-t from-fuchsia-500 to-amber-400 opacity-85"
                              />
                            ))}
                          </div>
                          <span className="text-[10px] font-mono text-zinc-400">{person.voiceDuration}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            className="min-h-[42px] rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400/40 text-amber-300 text-xs font-black flex items-center justify-center gap-1"
                          >
                            <Zap size={14} /> Spark
                          </button>
                          <button
                            type="button"
                            className="min-h-[42px] rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-black flex items-center justify-center gap-1 shadow-lg"
                          >
                            <Heart size={14} fill="currentColor" /> Connect
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* TAB 2: 4K LIVE STREAM ARENA */}
            {activeTab === 'live' && (
              <motion.div
                key="live"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="relative rounded-3xl overflow-hidden border border-rose-500/35 bg-[#09070F] shadow-2xl min-h-[460px] flex flex-col justify-between cursor-pointer touch-manipulation"
                {...runSafeTap(() => handleLockedInteraction('4K Live Stream Stage'))}
              >
                <img
                  src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1400&auto=format&fit=crop"
                  alt="4K Live Stream Stage"
                  className="absolute inset-0 w-full h-full object-cover opacity-55"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/75" />

                {/* Floating 3D Hearts & Diamond Gift Animations */}
                <div className="absolute right-5 bottom-28 flex flex-col gap-3 pointer-events-none">
                  {['💎', '👑', '❤️', '🔥', '💖'].map((emoji, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        y: [0, -65, -130],
                        x: [0, i % 2 === 0 ? -10 : 10, 0],
                        opacity: [0, 1, 0],
                        scale: [0.8, 1.25, 0.9],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 3 + i * 0.45,
                        delay: i * 0.55,
                        ease: 'easeOut',
                      }}
                      className="text-2xl drop-shadow-[0_0_12px_rgba(255,255,255,0.65)]"
                    >
                      {emoji}
                    </motion.div>
                  ))}
                </div>

                {/* Top Stream HUD */}
                <div className="relative z-10 p-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 bg-black/65 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/15">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop"
                      alt="Host"
                      className="w-8 h-8 rounded-full object-cover border border-amber-400"
                    />
                    <div>
                      <p className="text-xs font-black text-white flex items-center gap-1">
                        MC Nana Live Arena <CheckCircle2 size={12} className="text-sky-400" />
                      </p>
                      <p className="text-[10px] text-amber-300 font-bold">Accra Rooftop • 4K Ultra-HD</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-[11px] font-black tracking-wider flex items-center gap-1.5 shadow-[0_0_16px_rgba(225,29,72,0.8)]">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      LIVE
                    </span>
                    <span className="px-3 py-1 rounded-full bg-black/70 border border-white/15 text-xs font-bold flex items-center gap-1.5">
                      <Eye size={13} className="text-emerald-400" />
                      {viewerCount.toLocaleString()} watching
                    </span>
                  </div>
                </div>

                {/* Bottom Comments + Gift Bar */}
                <div className="relative z-10 p-4 space-y-3">
                  <div className="max-w-md space-y-1.5">
                    {LIVE_COMMENTS.map((c, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-1.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 text-xs"
                      >
                        <span className={`font-black mr-1.5 ${c.color}`}>{c.user}:</span>
                        <span className="text-zinc-100">{c.text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <div className="flex-1 min-w-[200px] min-h-[44px] px-4 rounded-full bg-black/70 border border-white/20 flex items-center justify-between text-xs text-zinc-400">
                      <span>Say something live or request co-host...</span>
                      <Send size={14} className="text-amber-400" />
                    </div>
                    <button
                      type="button"
                      className="min-h-[44px] px-4 rounded-full bg-gradient-to-r from-fuchsia-600 to-amber-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg"
                    >
                      <Gift size={15} /> Send 💎 Gift
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: LIVE SPATIAL GPS RADAR */}
            {activeTab === 'radar' && (
              <motion.div
                key="radar"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div
                  {...runSafeTap(() => handleLockedInteraction('Live Spatial GPS Radar'))}
                  className="relative rounded-3xl bg-[#040B09] border border-emerald-500/35 p-5 overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.18)] cursor-pointer touch-manipulation"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-black text-white flex items-center gap-2">
                        📡 Live Spatial GPS Radar
                      </h2>
                      <p className="text-xs text-emerald-300/80">
                        Scanning verified HorPal members active around Accra in real time
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-mono font-bold">
                      GPS LOCKED • 5 KM
                    </span>
                  </div>

                  {/* Sonar Radar Circles */}
                  <div className="relative mx-auto w-full max-w-[340px] aspect-square rounded-full bg-[#03140F] border border-emerald-500/30 flex items-center justify-center overflow-hidden shadow-inner">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 4.5, ease: 'linear' }}
                      className="absolute inset-0 rounded-full"
                      style={{
                        background:
                          'conic-gradient(from 0deg, rgba(16,185,129,0.38) 0deg, rgba(6,182,212,0.14) 55deg, transparent 115deg, transparent 360deg)',
                      }}
                    />
                    <div className="absolute inset-8 rounded-full border border-emerald-400/25" />
                    <div className="absolute inset-16 rounded-full border border-cyan-400/25" />
                    <div className="absolute inset-24 rounded-full border border-emerald-400/30" />

                    {/* Center You Marker */}
                    <div className="relative z-10 w-10 h-10 rounded-full bg-emerald-500 text-black font-black text-[10px] flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.9)]">
                      YOU
                    </div>

                    {/* Pulsing User Avatars on Map */}
                    {RADAR_PINS.map((pin) => (
                      <div
                        key={pin.id}
                        style={{ top: pin.top, left: pin.left }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
                      >
                        <div className="relative">
                          <span className="absolute -inset-1 rounded-full bg-emerald-400/40 animate-ping" />
                          <img
                            src={pin.avatar}
                            alt={pin.name}
                            className="relative w-11 h-11 rounded-full object-cover border-2 border-emerald-400 shadow-lg"
                          />
                        </div>
                        <span className="mt-1 px-2 py-0.5 rounded-full bg-black/85 border border-emerald-400/50 text-[10px] font-black text-emerald-300 whitespace-nowrap">
                          {pin.name} • {pin.distance}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 4: GLOBAL CHAT & AI FRIENDS */}
            {activeTab === 'chats' && (
              <motion.div
                key="chats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="rounded-3xl bg-[#0A0A10] border border-white/15 overflow-hidden shadow-2xl"
              >
                <div className="px-4 py-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-amber-400" />
                    <h2 className="text-sm sm:text-base font-black">Global Chat, VIP Rooms & 24/7 AI</h2>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">END-TO-END ISOLATED</span>
                </div>

                <div className="divide-y divide-white/10">
                  {CHAT_THREADS.map((thread) => (
                    <div
                      key={thread.id}
                      {...runSafeTap(() => handleLockedInteraction(`Chat: ${thread.name}`))}
                      className="p-3.5 sm:p-4 flex items-center gap-3.5 hover:bg-white/[0.04] transition cursor-pointer touch-manipulation"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={thread.avatar}
                          alt={thread.name}
                          className="w-12 h-12 rounded-full object-cover border border-white/20"
                        />
                        {thread.online && (
                          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0A0A10]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-sm font-black text-white truncate">{thread.name}</p>
                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                                thread.isBot
                                  ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/40'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                              }`}
                            >
                              {thread.badge}
                            </span>
                          </div>
                          <span className="text-[11px] text-zinc-500 shrink-0">{thread.time}</span>
                        </div>

                        {thread.voiceNote ? (
                          <div className="mt-1.5 flex items-center gap-2 max-w-[230px] px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
                            <Mic size={12} className="text-emerald-400 shrink-0" />
                            <div className="flex-1 flex items-center gap-0.5 h-3">
                              {[40, 80, 60, 100, 50, 90, 65, 85, 45].map((h, i) => (
                                <span
                                  key={i}
                                  style={{ height: `${h}%` }}
                                  className="flex-1 bg-emerald-400 rounded-full"
                                />
                              ))}
                            </div>
                            <span className="text-[10px] font-mono text-emerald-300">{thread.voiceNote}</span>
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-400 truncate mt-0.5">{thread.subtitle}</p>
                        )}
                      </div>

                      {thread.unread > 0 && (
                        <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-amber-400 text-black text-[11px] font-black flex items-center justify-center">
                          {thread.unread}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Locked Chat Input Bar */}
                <div
                  {...runSafeTap(() => handleLockedInteraction('Send Message Input'))}
                  className="p-3 bg-black/50 border-t border-white/10 flex items-center gap-2 cursor-pointer touch-manipulation"
                >
                  <div className="flex-1 min-h-[44px] px-4 rounded-full bg-white/5 border border-white/15 flex items-center justify-between text-xs text-zinc-400">
                    <span>🔒 Unlock GH₵ 50 Lifetime Pass to send messages & voice notes...</span>
                    <Lock size={14} className="text-amber-400 shrink-0" />
                  </div>
                  <button
                    type="button"
                    className="w-11 h-11 rounded-full bg-amber-500 text-black flex items-center justify-center shrink-0"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {lockedActionLabel && (
            <div className="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-400/40 text-center text-xs font-bold text-amber-200 flex items-center justify-center gap-2">
              <Lock size={14} className="text-amber-400" />
              <span>🔒 Preview Mode Only — Pay GH₵ 50 Once to Chat, Stream & Connect!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
