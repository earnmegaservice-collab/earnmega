'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Lock, ChevronLeft, ChevronRight } from 'lucide-react';

interface HorPalLandingGatewayProps {
  onEnterPillar1: () => void;
  onEnterPillar2?: () => void;
  onEnterPillar3?: () => void;
}

export const promoTextBlocks = [
  {
    badge: 'OFFICIAL PLATFORM PROMO',
    headline: 'Welcome to HorPal — Where Real Connections Turn Into Real Value',
    subtitle: 'Experience HD live streaming, verified social discovery, VIP communities, and instant creator rewards.',
  },
  {
    badge: 'NEXT-GEN CREATOR ARENA',
    headline: 'Broadcast Live in HD & Monetize Your Audience Globally',
    subtitle: 'Go live with zero lag, receive animated 3D gifts in real time, and build your global fanbase.',
  },
  {
    badge: 'PILLAR 1 • SOCIAL & EARNING HUB',
    headline: 'Make Verified Friends, Chat Privately & Grow Together',
    subtitle: '100% real verified people, interactive group chats, voice notes, and smart AI assistance.',
  },
  {
    badge: 'THE HORPAL ECOSYSTEM',
    headline: 'One Elite Platform. Two Powerful Wealth & Social Pillars.',
    subtitle: 'Built with enterprise AI and dedicated human staff to deliver a world-class experience.',
  },
];

const promoSlides = [
  { id: 1, type: 'video', src: 'https://rbyoqehpntitdjztnmbe.supabase.co/storage/v1/object/public/public-assets/gemini_generated_video_d176d608.mp4' },
  { id: 2, type: 'video', src: 'https://rbyoqehpntitdjztnmbe.supabase.co/storage/v1/object/public/public-assets/gemini_generated_video_88322b33.mp4' },
  { id: 3, type: 'video', src: 'https://rbyoqehpntitdjztnmbe.supabase.co/storage/v1/object/public/public-assets/gemini_generated_video_74257962.mp4' },
  { id: 4, type: 'image', src: 'https://rbyoqehpntitdjztnmbe.supabase.co/storage/v1/object/public/public-assets/1793877659965.jpg' },
  { id: 5, type: 'image', src: 'https://rbyoqehpntitdjztnmbe.supabase.co/storage/v1/object/public/public-assets/1793877634662.jpg' },
];

export const HorPalLandingGateway: React.FC<HorPalLandingGatewayProps> = ({
  onEnterPillar1,
  onEnterPillar2,
  onEnterPillar3,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    const handleFirstInteraction = () => {
      setHasInteracted(true);
      setIsVideoMuted(false);
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
    window.addEventListener('click', handleFirstInteraction, { once: true });
    window.addEventListener('touchstart', handleFirstInteraction, { once: true });

    // Remember global mute state
    const savedMute = sessionStorage.getItem('horpal_hero_muted');
    if (savedMute !== null) {
      setIsVideoMuted(savedMute === 'true');
      if (savedMute === 'false') setHasInteracted(true);
    }

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuted = !isVideoMuted;
    setIsVideoMuted(newMuted);
    setHasInteracted(true);
    sessionStorage.setItem('horpal_hero_muted', newMuted.toString());
  };

  useEffect(() => {
    const handleVisibility = () => {
      setIsPaused(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    if (isPaused) return;

    let timer: NodeJS.Timeout;
    const currentMedia = promoSlides[currentSlide];

    if (currentMedia.type === 'image') {
      timer = setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % promoSlides.length);
      }, 5000);
    } else {
      // Safety timeout for video in case onEnded doesn't fire
      timer = setTimeout(() => {
         setCurrentSlide((prev) => (prev + 1) % promoSlides.length);
      }, 12000);
    }

    return () => clearTimeout(timer);
  }, [currentSlide, isPaused]);

  // Handle video play logic manually to ensure only one plays and try/catch is used
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (index === currentSlide) {
        video.currentTime = 0;
        video.play().catch(err => console.warn('Autoplay prevented:', err));
      } else {
        video.pause();
      }
    });
  }, [currentSlide, isPaused]);

  const handleVideoEnded = () => {
    setCurrentSlide((prev) => (prev + 1) % promoSlides.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (touchStart - touchEnd > 75) {
      setCurrentSlide((prev) => (prev + 1) % promoSlides.length);
    }
    if (touchStart - touchEnd < -75) {
      setCurrentSlide((prev) => (prev - 1 + promoSlides.length) % promoSlides.length);
    }
  };

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % promoSlides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + promoSlides.length) % promoSlides.length);

  return (
    <div className="min-h-screen bg-[#050508] text-white font-sans overflow-x-hidden selection:bg-amber-500/30">
      {/* 1. TOP LUXURY GLASS HEADER */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-[#050508]/80 backdrop-blur-2xl border-b border-white/10 z-50 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <span className="text-black font-black text-lg tracking-tighter">HP</span>
            </div>
            <span className="text-xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-white to-white/70 hidden sm:block">
              HORPAL
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span>
            <span className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase">LIVE GLOBAL NETWORK</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-white/60">
            <a href="#pillars" className="hover:text-white transition-colors">Pillars</a>
            <a href="#why" className="hover:text-white transition-colors">Why Entry Pass</a>
            <a href="#how" className="hover:text-white transition-colors">How It Works</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>
          <button
            onClick={onEnterPillar1}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all transform hover:scale-105"
          >
            Enter Pillar 1 &rarr;
          </button>
        </div>
      </header>

      {/* 2. MAIN HERO CAROUSEL */}
      <section className="pt-24 px-4 md:px-8 max-w-7xl mx-auto relative">
        {/* Ambient Glow */}
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-amber-500/20 blur-[100px] rounded-full pointer-events-none transition-colors duration-1000"></div>

        <div
          className="relative w-full h-[48vh] sm:h-[55vh] max-h-[600px] rounded-[32px] overflow-hidden shadow-[0_20px_60px_-15px_rgba(233,185,73,0.15)] bg-black group border border-amber-400/30 ring-1 ring-white/5"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-0"
            >
              {promoSlides[currentSlide].type === 'video' ? (
                <video
                  ref={(el) => { if (el) videoRefs.current[currentSlide] = el; }}
                  src={promoSlides[currentSlide].src}
                  muted={isVideoMuted}
                  playsInline
                  preload="auto"
                  onEnded={handleVideoEnded}
                  className="w-full h-full object-cover"
                  poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                />
              ) : (
                <img
                  src={promoSlides[currentSlide].src}
                  alt="HorPal Luxury Media"
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              )}

              {/* Minimal Bottom Vignette for Progress Bar Visibility */}
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>

              {/* Audio Toggle */}
              {promoSlides[currentSlide].type === 'video' && (
                <button
                  onClick={toggleMute}
                  aria-label={isVideoMuted ? "Unmute video" : "Mute video"}
                  className="absolute top-6 right-6 p-3 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 transition-all z-20 shadow-lg"
                >
                  {isVideoMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Keyboard & Mouse Navigation (Accessibility & Desktop) */}
          <div className="absolute inset-y-0 left-4 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
            <button onClick={prevSlide} className="p-3 rounded-full bg-black/20 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20 transition-all"><ChevronLeft size={24} /></button>
          </div>
          <div className="absolute inset-y-0 right-4 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
            <button onClick={nextSlide} className="p-3 rounded-full bg-black/20 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20 transition-all"><ChevronRight size={24} /></button>
          </div>

          {/* Progress Indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20 w-full max-w-sm px-8">
            {promoSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${
                  idx === currentSlide ? 'bg-[#E9B949] w-8' : 'bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 2.1 PILLAR ACCESS BUTTONS */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center w-full max-w-2xl mx-auto z-10 relative">
          <button
            onClick={onEnterPillar1}
            className="group relative w-full sm:flex-1 min-h-[56px] rounded-full bg-[#0A0A0F]/80 backdrop-blur-xl border border-[#E9B949]/30 hover:border-[#E9B949] flex items-center justify-center gap-3 px-6 py-3 transition-all duration-300 active:scale-[0.98] shadow-[0_0_15px_rgba(233,185,73,0.1)] hover:shadow-[0_0_25px_rgba(233,185,73,0.2)] overflow-hidden"
          >
            {/* Sweep effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"></div>

            <div className="w-8 h-8 rounded-full border border-[#E9B949]/40 bg-[#E9B949]/10 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E9B949" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <span className="font-sans font-bold text-white text-base tracking-wide">Global Chat</span>
          </button>

          <button
            onClick={() => {
              localStorage.setItem('horpal_target_pillar', '2');
              if (onEnterPillar2) {
                onEnterPillar2();
              } else {
                window.location.href = '/affiliate';
              }
            }}
            className="group relative w-full sm:flex-1 min-h-[56px] rounded-full bg-[#0A0A0F]/80 backdrop-blur-xl border border-emerald-500/30 hover:border-emerald-500 flex items-center justify-center gap-3 px-6 py-3 transition-all duration-300 active:scale-[0.98] shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_25px_rgba(16,185,129,0.2)] overflow-hidden"
          >
             {/* Sweep effect */}
             <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"></div>

            <div className="w-8 h-8 rounded-full border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            </div>
            <span className="font-sans font-bold text-white text-base tracking-wide">Affiliate Marketing</span>
          </button>

          <button
            onClick={() => {
              localStorage.setItem('horpal_target_pillar', '3');
              if (onEnterPillar3) {
                onEnterPillar3();
              } else {
                window.location.href = '/horpal-ai';
              }
            }}
            className="relative w-full flex items-center justify-center gap-3 py-4 px-6 rounded-full bg-[#0E0F14] border border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.15)] active:scale-[0.99] transition-all"
          >
            <span className="relative z-10 flex items-center justify-center w-9 h-9 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L14.8 9.2L22 12L14.8 14.8L12 22L9.2 14.8L2 12L9.2 9.2L12 2Z" />
              </svg>
            </span>
            <span className="relative z-10 text-white font-bold text-base tracking-wide">
              horpal.ai
            </span>
          </button>
        </div>

        {/* 3. LIVE SOCIAL PROOF TICKER */}
        <div className="mt-8 py-3 px-6 rounded-2xl bg-[#1A1A24]/40 border border-white/5 backdrop-blur-sm overflow-hidden flex whitespace-nowrap hover:bg-[#1A1A24]/60 transition-colors">
          <motion.div
            animate={{ x: [0, -1000] }}
            transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
            whileHover={{ animationPlayState: 'paused' }}
            className="flex gap-12 items-center text-sm font-medium text-[#E9B949]/80 tracking-wide font-sans"
          >
            <span>⚡ 100% Bot-Free Verified Community</span>
            <span>💎 Real-Time Live Arena Gift Rewards</span>
            <span>🤖 Powered by Enterprise AI + 24/7 Human Specialists</span>
            <span>🔒 Secured & Verified Global Infrastructure</span>
            <span>⚡ 100% Bot-Free Verified Community</span>
            <span>💎 Real-Time Live Arena Gift Rewards</span>
          </motion.div>
        </div>
      </section>

      {/* 3.5 HIGHLIGHT CARDS (Relocated Promo Text) */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {promoTextBlocks.map((block, idx) => (
            <div key={idx} className="p-8 rounded-3xl bg-[#1A1A24] border border-[#E9B949]/20 hover:border-[#E9B949]/50 transition-colors shadow-lg relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-br from-[#E9B949]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <span className="inline-block px-3 py-1 bg-white/5 border border-[#E9B949]/30 rounded-full text-[10px] font-bold tracking-widest text-[#E9B949] mb-6 uppercase">
                {block.badge}
              </span>
              <h3 className="text-xl sm:text-2xl font-serif font-black mb-3 text-white leading-snug">
                {block.headline}
              </h3>
              <p className="text-white/60 text-sm sm:text-base font-sans leading-relaxed">
                {block.subtitle}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. DUAL-PILLAR COMMAND DECK */}
      <section id="pillars" className="py-12 md:py-24 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-black mb-4">Choose Your HorPal Pillar</h2>
          <p className="text-white/60 text-lg">One elite platform. Two powerful paths to social and financial growth.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* PILLAR 1 CARD (ACTIVE) */}
          <div
            onClick={onEnterPillar1}
            className="group relative flex flex-col justify-between p-8 rounded-3xl bg-[#050508] border border-[#E9B949]/40 shadow-[0_0_40px_rgba(233,185,73,0.15)] hover:shadow-[0_0_60px_rgba(233,185,73,0.25)] transition-all cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-pink-500/5 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="relative z-10">
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  PILLAR 1 • LIVE & ACTIVE
                </span>
                <span className="px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-bold border border-white/20">
                  SOCIAL & CREATOR ENGINE
                </span>
              </div>

              <h3 className="text-3xl font-black mb-4 text-white">Make Friends and Earn</h3>
              <p className="text-white/70 mb-8 leading-relaxed">
                Connect with verified people worldwide, chat in real-time 1-on-1 and VIP groups, broadcast in the HD Live Arena, share status stories, and earn real rewards from gifts and engagement.
              </p>

              <ul className="space-y-3 mb-10">
                {['Global Discovery & Matching', 'HD Live Streaming & 3D Gifts', 'WhatsApp-Style VIP Group Chats', '24/7 Premium AI Companion'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-white/90">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <button className="relative z-10 w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-700 text-white font-bold shadow-[0_0_20px_rgba(245,158,11,0.4)] group-hover:scale-[1.02] transition-transform">
              Enter Make Friends & Earn &rarr;
            </button>
          </div>

          {/* PILLAR 2 CARD (INERT) */}
          <div className="relative flex flex-col justify-between p-8 rounded-3xl bg-[#1A1A24]/70 border border-white/10 opacity-90 overflow-hidden shadow-xl">
            <div className="relative z-10">
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                  PILLAR 2 • LIVE NOW
                </span>
                <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-xs font-bold border border-zinc-700">
                  ACTIVE ECOSYSTEM
                </span>
              </div>

              <h3 className="text-3xl font-black mb-4 text-zinc-400">Affiliate Marketing</h3>
              <p className="text-zinc-500 mb-8 leading-relaxed">
                Promote high-converting digital products, unlock automated commission splits, access executive masterclasses, and scale your affiliate income with real-time analytics.
              </p>

              <ul className="space-y-3 mb-10">
                {['Automated Commission Engine', 'High-Ticket Digital Marketplace', 'Real-Time Weekly Payout Desk', 'Executive Partner Training'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-zinc-600">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs">•</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => {
                localStorage.setItem('horpal_target_pillar', '2');
                if (onEnterPillar2) {
                  onEnterPillar2();
                } else {
                  window.location.href = '/affiliate';
                }
              }}
              className="relative z-10 w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black border border-amber-400/50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-105 transition-transform"
            >
              Enter Pillar 2 &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* 5. WHY ENTRY PASS */}
      <section id="why" className="py-24 bg-[#0D0D14] border-y border-white/5 px-4 md:px-8 relative">
        <div className="absolute inset-0 bg-[url('https://rbyoqehpntitdjztnmbe.supabase.co/storage/v1/object/public/public-assets/noise.png')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-serif font-black mb-6">Built for Quality, Powered by Paid AI & Real Human Workers.</h2>
            <p className="text-white/60 text-lg max-w-3xl mx-auto leading-relaxed">
              Unlike free apps that sell your data, flood your screen with ads, and leave you talking to bots, HorPal uses your small entry fee to fund real intelligence, real human staff, and real creator payouts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {[
              {
                title: "Enterprise AI Compute (High-Quality Answers 24/7)",
                desc: "We pay directly for top-tier commercial AI models and neural servers so that every question you ask inside HorPal is answered instantly, accurately, and in extraordinary quality—with zero daily limits or generic responses.",
                icon: "🧠", color: "from-blue-500/20 to-purple-500/20"
              },
              {
                title: "Dedicated Human Workers & 24/7 Moderation Staff",
                desc: "We pay real full-time workers, identity verification reviewers, live stream moderators, and support specialists who work around the clock to assist members, review reports, and keep the community safe.",
                icon: "👥", color: "from-amber-500/20 to-orange-500/20"
              },
              {
                title: "HD Live Video Servers & Global Cloud Infrastructure",
                desc: "Your entry pass funds high-speed WebRTC video relays, encrypted real-time chat databases, and cloud media storage so your live streams, videos, and voice notes run smoothly without lag.",
                icon: "📡", color: "from-emerald-500/20 to-teal-500/20"
              },
              {
                title: "100% Scam-Free, Bot-Free Verified Community",
                desc: "A paid entry gate immediately stops fake accounts, spam bots, and time-wasters at the door. Every person you meet inside Pillar 1 is a serious, verified human being ready to connect and build.",
                icon: "🛡️", color: "from-rose-500/20 to-pink-500/20"
              }
            ].map((card, i) => (
              <div key={i} className="p-6 rounded-3xl bg-zinc-900/50 border border-white/10 hover:bg-zinc-800/50 transition-colors">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-2xl mb-4 border border-white/10`}>
                  {card.icon}
                </div>
                <h4 className="text-lg font-bold mb-3">{card.title}</h4>
                <p className="text-sm text-white/60 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-[#1A1A24] p-8 sm:p-12 rounded-3xl border border-white/5 shadow-2xl">
            <h4 className="text-sm font-bold text-white/80 mb-8 uppercase tracking-widest text-center">Fund Allocation Breakdown</h4>
            <div className="h-4 sm:h-5 rounded-full bg-black flex overflow-hidden mb-8 shadow-inner ring-1 ring-white/10">
              <div className="h-full bg-[#A8741A] transition-all duration-1000 ease-out" style={{ width: '35%' }} title="35% Enterprise AI Engines & High-Speed Cloud Servers"></div>
              <div className="h-full bg-[#E9B949] transition-all duration-1000 ease-out" style={{ width: '30%' }} title="30% Paid Human Workers, Support & Safety Moderators"></div>
              <div className="h-full bg-[#F6E3A1] transition-all duration-1000 ease-out" style={{ width: '25%' }} title="25% Creator Rewards, Bonuses & Community Ecosystem"></div>
              <div className="h-full bg-[#5D6B78] transition-all duration-1000 ease-out" style={{ width: '10%' }} title="10% Identity Verification & Bank-Grade Security"></div>
            </div>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-xs sm:text-sm text-white/70 font-medium">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#A8741A] shadow-sm"></span>35% AI & Cloud Servers</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#E9B949] shadow-sm"></span>30% Human Workers & Support</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#F6E3A1] shadow-sm"></span>25% Creator Rewards Ecosystem</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#5D6B78] shadow-sm"></span>10% Security & Verification</div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. HOW IT WORKS */}
      <section id="how" className="py-24 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-5xl font-serif font-black mb-4">How Make Friends & Earn Works</h2>
          <p className="text-white/60 text-lg">Four simple steps to join the elite global network.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connecting line for desktop */}
          <div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-[#E9B949]/50 to-transparent z-0"></div>

          {[
            { step: '1', title: 'Tap "Make Friends and Earn"', desc: 'Create your account and unlock your verified member access.' },
            { step: '2', title: 'Complete Your 6-Photo Profile', desc: 'Stand out in the global discovery feed and match with real people.' },
            { step: '3', title: 'Chat, Join VIP Groups & Go Live', desc: 'Build real friendships, host interactive live streams, and share stories.' },
            { step: '4', title: 'Receive Gifts & Earn Rewards', desc: 'Collect virtual gifts from supporters and grow your balance inside the app.' }
          ].map((item, i) => (
            <div key={i} className="relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#050508] border border-[#E9B949]/40 shadow-[0_0_0_4px_rgba(233,185,73,0.1)] flex items-center justify-center text-2xl sm:text-3xl font-serif font-black text-[#E9B949] mb-6 relative">
                {item.step}
                <div className="absolute inset-0 rounded-full bg-[#E9B949]/10 blur-xl -z-10"></div>
              </div>
              <h4 className="text-xl font-bold mb-3">{item.title}</h4>
              <p className="text-sm text-white/60">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. COMPARISON & FAQ */}
      <section id="faq" className="py-24 bg-zinc-950 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-serif font-black mb-4">Why HorPal Beats Ordinary Free Social Apps</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
            {/* Ordinary Apps */}
            <div className="p-8 rounded-3xl bg-zinc-900 border border-red-500/20">
              <h3 className="text-xl font-bold text-red-400 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">✕</span>
                Ordinary Free Apps
              </h3>
              <ul className="space-y-4">
                {['Full of fake bots & scammers', 'No human customer support', 'Unpaid/dumb chatbots', 'Intrusive ads everywhere'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-400">
                    <span className="text-red-500 text-sm">✕</span> {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* HorPal */}
            <div className="p-8 rounded-3xl bg-[#1A1A24] border border-[#E9B949] relative overflow-hidden shadow-[0_0_30px_rgba(233,185,73,0.15)]">
              <div className="absolute inset-0 bg-gradient-to-br from-[#E9B949]/5 to-transparent pointer-events-none"></div>
              <div className="absolute top-0 right-0 px-4 py-1 bg-[#E9B949] text-black text-[10px] font-black tracking-widest rounded-bl-xl shadow-sm">ELITE STANDARD</div>
              <h3 className="text-xl font-bold text-[#E9B949] mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#E9B949]/20 flex items-center justify-center text-[#E9B949]">✓</span>
                HorPal Pillar 1
              </h3>
              <ul className="space-y-4">
                {['100% Verified Real Members', 'Paid Human Workers & 24/7 Moderators', 'Paid Premium AI Answering Every Question', 'Direct Live & Chat Earning System'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white">
                    <span className="text-amber-500 text-sm">✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* FAQ Accordion - Simplified static version for now */}
          <div className="space-y-4 mb-20">
            {[
              {
                q: "Why do I pay a small entry fee to join HorPal?",
                a: "Your entry fee directly funds our high-speed global servers, our paid premium AI that answers your questions 24/7 without limits, and our real human workers who moderate and support the community. This paid gate also immediately blocks bots, scammers, and time-wasters, ensuring 100% of the people you meet are real and verified."
              },
              {
                q: "What happens as soon as I tap Make Friends and Earn?",
                a: "You will instantly be taken to the secure login/signup page. Once you create your account and complete the quick verification, you'll immediately unlock full access to Pillar 1—including global discovery, VIP group chats, HD live streaming, and earning capabilities."
              },
              {
                q: "When will Pillar 2 (Affiliate Marketing) be available?",
                a: "Pillar 1 is 100% live and active right now. Pillar 2 is currently in development and locked. We are building the automated commission engine and high-ticket marketplace, which will be released in an upcoming major update."
              }
            ].map((faq, i) => (
              <div key={i} className="p-6 rounded-2xl bg-[#1A1A24] border border-[#E9B949]/30 hover:border-[#E9B949]/50 transition-colors cursor-pointer group">
                <h4 className="text-lg font-bold text-white mb-2 flex justify-between items-center group-hover:text-[#E9B949] transition-colors">{faq.q} <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#E9B949]/50 group-hover:text-[#E9B949]"><polyline points="6 9 12 15 18 9"></polyline></svg></h4>
                <p className="text-white/60 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>

          {/* Final CTA */}
          <div className="p-12 rounded-3xl bg-[#1A1A24] border border-[#E9B949]/40 text-center relative overflow-hidden shadow-[0_0_50px_rgba(233,185,73,0.15)]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#E9B949]/20 via-transparent to-transparent opacity-60 blur-2xl"></div>
            <h2 className="text-3xl sm:text-4xl font-serif font-black mb-6 relative z-10 text-white">Ready to Join the Elite Network?</h2>
            <button
              onClick={onEnterPillar1}
              className="relative z-10 px-8 py-4 rounded-full bg-[#E9B949] hover:bg-[#F6E3A1] text-black font-black text-lg shadow-[0_0_30px_rgba(233,185,73,0.4)] hover:shadow-[0_0_40px_rgba(233,185,73,0.6)] hover:scale-105 transition-all duration-300"
            >
              Start Now — Enter Make Friends & Earn &rarr;
            </button>
          </div>
        </div>
      </section>

      <footer className="py-8 text-center border-t border-white/5 text-white/40 text-sm">
        <p>&copy; {new Date().getFullYear()} HorPal. All rights reserved.</p>
      </footer>
    </div>
  );
};
