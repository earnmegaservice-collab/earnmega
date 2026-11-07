'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Lock, ChevronLeft, ChevronRight } from 'lucide-react';

interface HorPalLandingGatewayProps {
  onEnterPillar1: () => void;
}

const carouselSlides = [
  {
    type: 'video',
    url: 'https://rbyoqehpntitdjztnmbe.supabase.co/storage/v1/object/public/public-assets/promo.mp4',
    badge: 'OFFICIAL PLATFORM PROMO',
    headline: 'Welcome to HorPal — Where Real Connections Turn Into Real Value',
    subtitle: 'Experience HD live streaming, verified social discovery, VIP communities, and instant creator rewards.',
  },
  {
    type: 'video',
    url: 'https://rbyoqehpntitdjztnmbe.supabase.co/storage/v1/object/public/public-assets/gemini_generated_video_74257962.mp4',
    badge: 'NEXT-GEN CREATOR ARENA',
    headline: 'Broadcast Live in HD & Monetize Your Audience Globally',
    subtitle: 'Go live with zero lag, receive animated 3D gifts in real time, and build your global fanbase.',
  },
  {
    type: 'image',
    url: 'https://rbyoqehpntitdjztnmbe.supabase.co/storage/v1/object/public/public-assets/file_0000000009b08211b57dd97f6fc9d336.png',
    badge: 'PILLAR 1 • SOCIAL & EARNING HUB',
    headline: 'Make Verified Friends, Chat Privately & Grow Together',
    subtitle: '100% real verified people, interactive group chats, voice notes, and smart AI assistance.',
  },
  {
    type: 'image',
    url: 'https://rbyoqehpntitdjztnmbe.supabase.co/storage/v1/object/public/public-assets/file_00000000006082438fdf286c8d7920d7.png',
    badge: 'THE HORPAL ECOSYSTEM',
    headline: 'One Elite Platform. Two Powerful Wealth & Social Pillars.',
    subtitle: 'Built with enterprise AI and dedicated human staff to deliver a world-class experience.',
  },
];

export const HorPalLandingGateway: React.FC<HorPalLandingGatewayProps> = ({ onEnterPillar1 }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }
    if (touchStart - touchEnd < -75) {
      setCurrentSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length);
    }
  };

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length);

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
      <section className="pt-24 px-4 md:px-8 max-w-7xl mx-auto">
        <div
          className="relative w-full h-[420px] sm:h-[500px] rounded-3xl overflow-hidden shadow-2xl bg-black group"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              {carouselSlides[currentSlide].type === 'video' ? (
                <video
                  ref={(el) => { if (el) videoRefs.current[currentSlide] = el; }}
                  src={carouselSlides[currentSlide].url}
                  autoPlay
                  loop
                  muted={isVideoMuted}
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={carouselSlides[currentSlide].url}
                  alt={carouselSlides[currentSlide].headline}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Gradient Overlay for Text Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-8 sm:p-12">
                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-xs font-bold tracking-widest text-white mb-4 w-fit">
                  {carouselSlides[currentSlide].badge}
                </span>
                <h2 className="text-3xl sm:text-5xl font-black mb-3 leading-tight text-white drop-shadow-lg max-w-3xl">
                  {carouselSlides[currentSlide].headline}
                </h2>
                <p className="text-white/80 text-sm sm:text-lg max-w-2xl drop-shadow-md">
                  {carouselSlides[currentSlide].subtitle}
                </p>
              </div>

              {/* Audio Toggle for Videos */}
              {carouselSlides[currentSlide].type === 'video' && (
                <button
                  onClick={() => setIsVideoMuted(!isVideoMuted)}
                  className="absolute top-6 right-6 p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-colors z-20"
                >
                  {isVideoMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Controls */}
          <div className="absolute inset-y-0 left-4 flex items-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <button onClick={prevSlide} className="p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white hover:bg-white/20"><ChevronLeft size={24} /></button>
          </div>
          <div className="absolute inset-y-0 right-4 flex items-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <button onClick={nextSlide} className="p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white hover:bg-white/20"><ChevronRight size={24} /></button>
          </div>

          {/* Progress Indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20 w-full max-w-md px-4">
            {carouselSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${
                  idx === currentSlide ? 'bg-amber-400 w-8' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 3. LIVE SOCIAL PROOF TICKER */}
        <div className="mt-6 py-3 px-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm overflow-hidden flex whitespace-nowrap">
          <motion.div
            animate={{ x: [0, -1000] }}
            transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
            className="flex gap-12 items-center text-sm font-medium text-amber-200/80 tracking-wide"
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

      {/* 4. DUAL-PILLAR COMMAND DECK */}
      <section id="pillars" className="py-24 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-black mb-4">Choose Your HorPal Pillar</h2>
          <p className="text-white/60 text-lg">One elite platform. Two powerful paths to social and financial growth.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* PILLAR 1 CARD (ACTIVE) */}
          <div
            onClick={onEnterPillar1}
            className="group relative flex flex-col justify-between p-8 rounded-3xl bg-gradient-to-b from-zinc-900 to-black border border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.18)] hover:shadow-[0_0_80px_rgba(245,158,11,0.3)] transition-all cursor-pointer overflow-hidden"
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
          <div className="relative flex flex-col justify-between p-8 rounded-3xl bg-zinc-950/70 border border-emerald-500/20 opacity-90 overflow-hidden">
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
                window.location.href = '/affiliate';
              }}
              className="relative z-10 w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black border border-amber-400/50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-105 transition-transform"
            >
              Enter Pillar 2 &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* 5. WHY ENTRY PASS */}
      <section id="why" className="py-24 bg-black/50 border-y border-white/5 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-black mb-6">Built for Quality, Powered by Paid AI & Real Human Workers.</h2>
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

          <div className="bg-zinc-900/80 p-8 rounded-3xl border border-white/10">
            <h4 className="text-sm font-bold text-white/80 mb-6 uppercase tracking-wider text-center">Fund Allocation Breakdown</h4>
            <div className="h-4 rounded-full bg-zinc-800 flex overflow-hidden mb-6">
              <div className="h-full bg-blue-500" style={{ width: '35%' }} title="35% Enterprise AI Engines & High-Speed Cloud Servers"></div>
              <div className="h-full bg-amber-500" style={{ width: '30%' }} title="30% Paid Human Workers, Support & Safety Moderators"></div>
              <div className="h-full bg-emerald-500" style={{ width: '25%' }} title="25% Creator Rewards, Bonuses & Community Ecosystem"></div>
              <div className="h-full bg-rose-500" style={{ width: '10%' }} title="10% Identity Verification & Bank-Grade Security"></div>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-xs text-white/60 font-medium">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span>35% AI & Cloud Servers</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"></span>30% Human Workers & Support</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span>25% Creator Rewards Ecosystem</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-rose-500"></span>10% Security & Verification</div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. HOW IT WORKS */}
      <section id="how" className="py-24 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-5xl font-black mb-4">How Make Friends & Earn Works</h2>
          <p className="text-white/60 text-lg">Four simple steps to join the elite global network.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connecting line for desktop */}
          <div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-amber-500/5 via-amber-500/50 to-amber-500/5 z-0"></div>

          {[
            { step: '1', title: 'Tap "Make Friends and Earn"', desc: 'Create your account and unlock your verified member access.' },
            { step: '2', title: 'Complete Your 6-Photo Profile', desc: 'Stand out in the global discovery feed and match with real people.' },
            { step: '3', title: 'Chat, Join VIP Groups & Go Live', desc: 'Build real friendships, host interactive live streams, and share stories.' },
            { step: '4', title: 'Receive Gifts & Earn Rewards', desc: 'Collect virtual gifts from supporters and grow your balance inside the app.' }
          ].map((item, i) => (
            <div key={i} className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-black border-4 border-[#050508] shadow-[0_0_0_2px_rgba(245,158,11,0.3)] flex items-center justify-center text-3xl font-black text-amber-500 mb-6 relative">
                {item.step}
                <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl -z-10"></div>
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
            <h2 className="text-3xl sm:text-5xl font-black mb-4">Why HorPal Beats Ordinary Free Social Apps</h2>
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
            <div className="p-8 rounded-3xl bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-4 py-1 bg-amber-500 text-black text-[10px] font-black tracking-widest rounded-bl-xl">ELITE STANDARD</div>
              <h3 className="text-xl font-bold text-amber-400 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">✓</span>
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
              <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h4 className="text-lg font-bold text-white mb-2">{faq.q}</h4>
                <p className="text-white/60 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>

          {/* Final CTA */}
          <div className="p-12 rounded-3xl bg-gradient-to-r from-amber-600/20 via-pink-600/20 to-purple-600/20 border border-amber-500/30 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent opacity-50 blur-2xl"></div>
            <h2 className="text-3xl sm:text-4xl font-black mb-6 relative z-10">Ready to Join the Elite Network?</h2>
            <button
              onClick={onEnterPillar1}
              className="relative z-10 px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-lg shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:scale-105 transition-transform"
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
