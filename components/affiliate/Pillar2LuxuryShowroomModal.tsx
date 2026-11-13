'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Crown,
  Trophy,
  Lock,
  Copy,
  ExternalLink,
  ArrowRight,
  Zap,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Link2,
  GraduationCap,
  Award,
  CheckCircle2,
  X,
  Flame,
  Eye,
  DollarSign,
  Share2,
  CalendarClock,
} from 'lucide-react';
const safeTap = (fn: () => void) => ({
  onClick: (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  },
});

interface Pillar2LuxuryShowroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterNow: (featureName?: string) => void;
}

const LIVE_CONVERSION_TOASTS = [
  '🔥 Kwame A. in Kumasi just earned GH₵ 184.00 commission!',
  '💎 Ama O. in Accra just unlocked the Gold Earner Trophy (GH₵ 5,200+ earned)!',
  '⚡ Kofi M. in Takoradi just earned GH₵ 200.00 from AI Automation Agency Blueprint!',
  '🚀 Abena S. in Tema just received GH₵ 1,420.00 Friday Instant Paystack Payout!',
  '🔥 Emmanuel T. in Lagos just earned GH₵ 160.00 commission via WhatsApp Status link!',
  '👑 Nana Y. in Sunyani just closed 3 sales in 1 hour (+GH₵ 480.00 Verified Commission)!',
];

const SHOWROOM_PRODUCTS = [
  {
    id: 'prod_1',
    title: 'TikTok & Reels Viral Monetization Blueprint',
    category: 'Creator Economy',
    priceGhs: 150,
    commissionGhs: 120,
    tag: '🔥 #1 Best Seller',
    salesCount: '1,420+ Sales',
    gradient: 'from-emerald-500/25 via-teal-500/15 to-amber-500/20',
  },
  {
    id: 'prod_2',
    title: 'AI Automation & ChatGPT Cashflow Masterclass',
    category: 'Artificial Intelligence',
    priceGhs: 230,
    commissionGhs: 184,
    tag: '⚡ High Ticket 50%',
    salesCount: '980+ Sales',
    gradient: 'from-amber-500/25 via-yellow-500/15 to-emerald-500/20',
  },
  {
    id: 'prod_3',
    title: 'WhatsApp Status Closing & High-Conversion Funnel',
    category: 'Sales & Marketing',
    priceGhs: 120,
    commissionGhs: 96,
    tag: '💎 Fast Mover',
    salesCount: '2,150+ Sales',
    gradient: 'from-emerald-500/25 via-green-500/15 to-teal-500/20',
  },
  {
    id: 'prod_4',
    title: 'Mini-Importation & China-to-Africa E-Commerce',
    category: 'Global Trade',
    priceGhs: 200,
    commissionGhs: 160,
    tag: '🌍 Global Demand',
    salesCount: '870+ Sales',
    gradient: 'from-amber-500/25 via-orange-500/15 to-emerald-500/20',
  },
  {
    id: 'prod_5',
    title: 'Faceless YouTube Automation Empire',
    category: 'YouTube Growth',
    priceGhs: 250,
    commissionGhs: 200,
    tag: '👑 Top Commission',
    salesCount: '1,110+ Sales',
    gradient: 'from-emerald-500/25 via-cyan-500/15 to-amber-500/20',
  },
  {
    id: 'prod_6',
    title: 'No-Code SaaS & Mobile Web App Builder',
    category: 'Tech & Dev',
    priceGhs: 220,
    commissionGhs: 176,
    tag: '🚀 High Retention',
    salesCount: '640+ Sales',
    gradient: 'from-teal-500/25 via-emerald-500/15 to-amber-500/20',
  },
  {
    id: 'prod_7',
    title: 'Remote USD Freelancing & Upwork Domination',
    category: 'Remote Work',
    priceGhs: 180,
    commissionGhs: 144,
    tag: '💵 USD Earner',
    salesCount: '1,340+ Sales',
    gradient: 'from-amber-500/25 via-emerald-500/15 to-teal-500/20',
  },
  {
    id: 'prod_8',
    title: 'Smartphone Video Editing & CapCut Pro Studio',
    category: 'Content Creation',
    priceGhs: 100,
    commissionGhs: 80,
    tag: '📱 Easy Entry',
    salesCount: '2,890+ Sales',
    gradient: 'from-emerald-500/25 via-lime-500/15 to-amber-500/20',
  },
  {
    id: 'prod_9',
    title: 'Digital Real Estate & High-Yield Affiliate Scaling',
    category: 'Wealth Scaling',
    priceGhs: 240,
    commissionGhs: 192,
    tag: '🏆 Executive Pick',
    salesCount: '790+ Sales',
    gradient: 'from-amber-500/30 via-yellow-500/15 to-emerald-500/25',
  },
];

const MILESTONE_TROPHIES = [
  {
    rank: 'Bronze Rising Star',
    requirement: 'GH₵ 1,000+ Verified Commissions',
    reward: 'Verified Creator Badge + Priority Link Boost',
    status: 'UNLOCKED IN PREVIEW',
    color: 'from-amber-700/40 to-amber-500/20 border-amber-500/40 text-amber-300',
  },
  {
    rank: 'Gold Executive Earner',
    requirement: 'GH₵ 10,000+ Verified Commissions',
    reward: 'GH₵ 500 Cash Bonus + VIP Gold Plaque',
    status: 'UNLOCKED IN PREVIEW',
    color: 'from-yellow-500/40 to-amber-400/20 border-yellow-400/50 text-yellow-200',
  },
  {
    rank: 'Diamond Sovereign Partner',
    requirement: 'GH₵ 50,000+ Verified Commissions',
    reward: 'MacBook Pro / GH₵ 15,000 Executive Grant + 85% Tier',
    status: 'TOP 1% TIER',
    color: 'from-emerald-400/40 to-cyan-400/20 border-emerald-400/60 text-emerald-200',
  },
];

export default function Pillar2LuxuryShowroomModal({
  isOpen,
  onClose,
  onRegisterNow,
}: Pillar2LuxuryShowroomModalProps) {
  const [toastIndex, setToastIndex] = useState(0);
  const [interceptedFeature, setInterceptedFeature] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setToastIndex((prev) => (prev + 1) % LIVE_CONVERSION_TOASTS.length);
    }, 3600);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const triggerIntercept = (featureLabel: string) => {
    setInterceptedFeature(featureLabel);
  };

  const confirmGoToPayment = () => {
    const label = interceptedFeature || 'Full Affiliate Hub Access';
    setInterceptedFeature(null);
    onRegisterNow(label);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] bg-[#030706]/95 backdrop-blur-2xl overflow-y-auto overscroll-contain text-white"
      >
        {/* Ambient Emerald & Gold Luxury Auroras */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-28 left-1/4 w-[520px] h-[520px] bg-emerald-500/18 rounded-full blur-[150px]" />
          <div className="absolute top-1/3 -right-24 w-[460px] h-[460px] bg-amber-500/18 rounded-full blur-[150px]" />
          <div className="absolute -bottom-32 left-1/3 w-[520px] h-[520px] bg-teal-500/14 rounded-full blur-[150px]" />
        </div>

        {/* Sticky Top Showroom Bar + Live Conversion Ticker */}
        <div className="sticky top-0 z-40 bg-[#050C0A]/90 backdrop-blur-2xl border-b border-emerald-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/25 to-emerald-500/25 border border-amber-400/50 text-amber-200 text-[11px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                <Eye size={13} className="text-amber-300" />
                👁️ Luxury Showroom Preview Mode
              </span>
              <span className="hidden md:inline-block text-xs text-zinc-400 font-medium">
                Explore every console & vault below — tap any button to activate your Affiliate License.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                {...safeTap(() => onRegisterNow('Instant Affiliate Registration'))}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 via-amber-300 to-emerald-400 text-black font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.45)] hover:brightness-110 transition cursor-pointer touch-manipulation flex items-center gap-1.5"
              >
                <Crown size={14} />
                🚀 Register as an Affiliate (GH₵ 90.00)
              </button>
              <button
                type="button"
                {...safeTap(onClose)}
                className="min-h-[42px] px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-zinc-200 text-xs font-bold transition cursor-pointer touch-manipulation flex items-center gap-1"
              >
                <X size={15} />
                Exit View
              </button>
            </div>
          </div>

          {/* Animated Live Conversion Toast Strip */}
          <div className="bg-gradient-to-r from-emerald-950/90 via-amber-950/60 to-emerald-950/90 border-t border-emerald-500/25 py-2 px-4">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={toastIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-2 text-xs sm:text-sm font-black text-emerald-200"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <span>{LIVE_CONVERSION_TOASTS[toastIndex]}</span>
                </motion.div>
              </AnimatePresence>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-300/90 shrink-0 hidden sm:inline">
                LIVE PAYSTACK VERIFIED FEED
              </span>
            </div>
          </div>
        </div>

        {/* Main Showroom Container */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-6 sm:py-10 space-y-8">
          {/* 1. Simulated Top Earner Executive Console */}
          <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#071914]/95 via-[#0B1F1A]/90 to-[#1A1608]/90 border border-emerald-400/40 shadow-[0_25px_90px_rgba(16,185,129,0.22)] overflow-hidden">
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-black uppercase tracking-widest mb-3">
                  <Crown size={13} className="text-amber-300" />
                  Top Earner Executive Console • Simulated Preview
                </div>
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                  GH₵ 18,450.00{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-amber-200 to-amber-400">
                    Verified Commission This Month
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-zinc-300 mt-2 max-w-2xl leading-relaxed">
                  Every sale of HorPal Digital Academy courses pays you an instant{' '}
                  <strong className="text-emerald-300">50% direct commission</strong> straight into your verified
                  Paystack ledger. Zero inventory, zero coding—just share your custom shortlink.
                </p>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap gap-3">
                <button
                  type="button"
                  {...safeTap(() => triggerIntercept('Instant Paystack Withdrawal'))}
                  className="w-full sm:w-auto min-h-[52px] px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 text-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_12px_35px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                >
                  <Wallet size={17} />
                  Withdraw GH₵ 18,450.00
                </button>
                <button
                  type="button"
                  {...safeTap(() => triggerIntercept('Generate Affiliate Shortlink'))}
                  className="w-full sm:w-auto min-h-[52px] px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-amber-400/40 text-amber-200 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                >
                  <Share2 size={16} />
                  Copy My 50% Referral Link
                </button>
              </div>
            </div>

            {/* Executive Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6">
              {[
                {
                  label: 'Verified Commission (This Month)',
                  value: 'GH₵ 18,450.00',
                  sub: '+34.8% vs last month',
                  accent: 'text-emerald-300 border-emerald-500/35 bg-emerald-500/10',
                },
                {
                  label: 'Lifetime Verified Payouts',
                  value: 'GH₵ 64,920.00',
                  sub: '100% Settled via Paystack MoMo/Bank',
                  accent: 'text-amber-300 border-amber-500/35 bg-amber-500/10',
                },
                {
                  label: 'Closed Course Sales (50% Cut)',
                  value: '112 Verified Sales',
                  sub: 'Avg. GH₵ 164.73 per sale',
                  accent: 'text-teal-200 border-teal-500/35 bg-teal-500/10',
                },
                {
                  label: 'Shortlink Conversion Rate',
                  value: '14.6% CVR',
                  sub: '768 High-Intent Clicks',
                  accent: 'text-yellow-200 border-yellow-500/35 bg-yellow-500/10',
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  {...safeTap(() => triggerIntercept(stat.label))}
                  className={`rounded-2xl p-4 border ${stat.accent} cursor-pointer transition hover:scale-[1.01]`}
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">{stat.label}</p>
                  <p className="text-xl sm:text-2xl font-black mt-1">{stat.value}</p>
                  <p className="text-[11px] text-zinc-400 mt-1 font-medium">{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Gold & Diamond Milestone Trophies */}
          <div className="rounded-3xl p-6 sm:p-7 bg-[#08120F]/90 border border-amber-400/30 shadow-2xl">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-amber-300 flex items-center gap-1.5">
                  <Trophy size={14} /> Executive Hall of Fame
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                  Gold & Diamond Milestone Trophies
                </h2>
              </div>
              <button
                type="button"
                {...safeTap(() => triggerIntercept('Claim Milestone Trophy Rewards'))}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-200 text-xs font-black uppercase tracking-wider cursor-pointer touch-manipulation"
              >
                🏆 Claim Milestone Rewards →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {MILESTONE_TROPHIES.map((t) => (
                <div
                  key={t.rank}
                  {...safeTap(() => triggerIntercept(t.rank))}
                  className={`rounded-2xl p-5 bg-gradient-to-br ${t.color} border cursor-pointer transition hover:scale-[1.01] flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <Award size={26} />
                      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-black/40 border border-white/15">
                        {t.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-white">{t.rank}</h3>
                    <p className="text-xs font-bold opacity-90 mt-1">{t.requirement}</p>
                    <p className="text-xs text-zinc-200/90 mt-2 leading-relaxed">🎁 {t.reward}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
                    <span>Tap to View Reward Vault</span>
                    <ArrowRight size={14} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. The 9 Digital Product Vault Cards */}
          <div className="rounded-3xl p-6 sm:p-7 bg-[#07110E]/95 border border-emerald-500/30 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-300 flex items-center gap-1.5">
                  <GraduationCap size={15} /> 9 High-Converting Digital Courses • 50% Commission Vault
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                  The 9 Digital Product Vault Cards
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Tap any course below to promote for an instant 50% commission or open the 10-Module Academy Classroom.
                </p>
              </div>
              <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-black">
                Earn GH₵ 80 – GH₵ 200 Per Single Sale
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SHOWROOM_PRODUCTS.map((product) => (
                <div
                  key={product.id}
                  {...safeTap(() => triggerIntercept(`Promote "${product.title}" (Earn GH₵ ${product.commissionGhs})`))}
                  className={`rounded-2xl p-5 bg-gradient-to-br ${product.gradient} border border-white/15 hover:border-amber-400/60 transition cursor-pointer flex flex-col justify-between group`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/50 text-amber-300 border border-amber-400/30">
                        {product.tag}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-200">{product.salesCount}</span>
                    </div>

                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">{product.category}</p>
                    <h3 className="text-base font-black text-white mt-1 group-hover:text-amber-200 transition">
                      {product.title}
                    </h3>

                    <div className="mt-4 p-3 rounded-xl bg-black/45 border border-white/10 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-zinc-400 uppercase font-bold">Course Price</p>
                        <p className="text-sm font-black text-white">GH₵ {product.priceGhs}.00</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-emerald-300 uppercase font-black">Your 50% Cut</p>
                        <p className="text-base font-black text-emerald-300">+GH₵ {product.commissionGhs}.00</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      {...safeTap(() => triggerIntercept(`Copy Link for ${product.title}`))}
                      className="min-h-[40px] px-3 py-2 rounded-xl bg-emerald-400 text-black font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
                    >
                      <Copy size={13} />
                      Copy 50% Link
                    </button>
                    <button
                      type="button"
                      {...safeTap(() => triggerIntercept(`Open ${product.title} Classroom`))}
                      className="min-h-[40px] px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
                    >
                      <ExternalLink size={13} />
                      View Modules
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Link Shortener Studio & 5. Friday Instant Paystack Payout Previews */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Link Shortener Studio Preview */}
            <div
              {...safeTap(() => triggerIntercept('Link Shortener & Viral Cloaker Studio'))}
              className="rounded-3xl p-6 bg-gradient-to-br from-[#071813] to-[#0D1614] border border-emerald-400/35 shadow-xl cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-black uppercase tracking-widest">
                  <Link2 size={13} /> Link Shortener Studio
                </span>
                <span className="text-xs font-bold text-amber-300">Sub-ID Tracking Active</span>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-white">
                1-Click Branded Shortlinks for WhatsApp, TikTok & Instagram
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Automatically embeds your Affiliate ID and tracks clicks, conversions, and payouts in real time.
              </p>

              <div className="mt-4 p-3.5 rounded-2xl bg-black/60 border border-emerald-500/30 flex items-center justify-between gap-2">
                <code className="text-xs sm:text-sm text-emerald-300 font-mono truncate">
                  https://earnmega.com/affiliate?prod=prod_2&ref=VIP_EARNER
                </code>
                <span className="px-3 py-1.5 rounded-lg bg-emerald-400 text-black font-black text-xs shrink-0">
                  Copy Shortlink
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase">WhatsApp Ready</p>
                  <p className="text-xs font-black text-emerald-300 mt-0.5">Rich Preview</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase">Cookie Window</p>
                  <p className="text-xs font-black text-amber-300 mt-0.5">90-Day Attribution</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase">Commission Split</p>
                  <p className="text-xs font-black text-emerald-300 mt-0.5">50% Instant</p>
                </div>
              </div>
            </div>

            {/* Friday Instant Paystack Payout Preview */}
            <div
              {...safeTap(() => triggerIntercept('Friday Instant Paystack Payout Console'))}
              className="rounded-3xl p-6 bg-gradient-to-br from-[#191407] to-[#0B1712] border border-amber-400/40 shadow-xl cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-black uppercase tracking-widest">
                  <CalendarClock size={13} /> Friday Instant Paystack Payouts
                </span>
                <span className="text-xs font-bold text-emerald-300">MTN MoMo • Telecel • Bank</span>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-white">
                Automated Friday Settlement to Mobile Money & Local Banks
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Withdraw your verified commission balance every Friday with zero hidden delays.
              </p>

              <div className="mt-4 space-y-2">
                {[
                  { date: 'Last Friday • Paystack Settlement', amount: 'GH₵ 4,820.00', method: 'MTN Mobile Money • PAID' },
                  { date: 'Previous Friday • Paystack Settlement', amount: 'GH₵ 6,150.00', method: 'Ecobank Ghana • PAID' },
                ].map((payout) => (
                  <div
                    key={payout.date}
                    className="p-3 rounded-xl bg-black/55 border border-white/10 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{payout.date}</p>
                      <p className="text-[11px] text-emerald-400 font-semibold">{payout.method}</p>
                    </div>
                    <span className="text-sm font-black text-amber-300">{payout.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom High-Converting CTA Banner */}
          <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-emerald-500/25 via-amber-500/20 to-emerald-500/25 border border-amber-400/50 text-center space-y-4">
            <h3 className="text-xl sm:text-3xl font-black text-white">
              Ready to Unlock Your Own 50% Commission Console?
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-xl mx-auto">
              Activate your official 1-Year HorPal Pillar 2 Affiliate License for just{' '}
              <strong className="text-amber-300">GH₵ 90.00</strong> and start earning verified commissions today.
            </p>
            <button
              type="button"
              {...safeTap(() => onRegisterNow('Bottom Showroom CTA'))}
              className="min-h-[54px] px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-amber-300 to-emerald-400 text-black font-black text-sm uppercase tracking-wider shadow-[0_14px_40px_rgba(16,185,129,0.45)] hover:brightness-110 transition cursor-pointer touch-manipulation inline-flex items-center gap-2"
            >
              🚀 Register as an Affiliate (GH₵ 90.00) to Unlock Full Access
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Strict Intercept Overlay whenever any button/card inside View Mode is tapped */}
        <AnimatePresence>
          {interceptedFeature && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 12 }}
                className="w-full max-w-md rounded-3xl bg-gradient-to-b from-[#091A14] to-[#070B0E] border-2 border-amber-400/60 p-6 sm:p-7 shadow-[0_25px_90px_rgba(245,158,11,0.35)] text-center space-y-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-emerald-400 text-black flex items-center justify-center mx-auto shadow-lg">
                  <Lock size={26} />
                </div>

                <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-black uppercase tracking-widest">
                  Showroom Preview Intercepted • {interceptedFeature}
                </span>

                <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  🚀 Register as an Affiliate (GH₵ 90.00) to Unlock Full Access
                </h3>

                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  You are currently viewing the <strong className="text-emerald-300">Pillar 2 Luxury Showroom</strong>.
                  Activate your 1-Year Official Affiliate License (GH₵ 90.00) to unlock live referral links, all 9
                  Digital Academy courses, and Friday Paystack payouts!
                </p>

                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    {...safeTap(confirmGoToPayment)}
                    className="w-full min-h-[52px] py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-400 via-amber-300 to-emerald-400 text-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_12px_35px_rgba(16,185,129,0.4)] hover:brightness-110 transition cursor-pointer touch-manipulation flex items-center justify-center gap-2"
                  >
                    🚀 Register as an Affiliate (GH₵ 90.00) to Unlock Full Access
                    <ArrowRight size={16} />
                  </button>

                  <button
                    type="button"
                    {...safeTap(() => setInterceptedFeature(null))}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white text-xs font-bold transition cursor-pointer touch-manipulation"
                  >
                    Continue Browsing Showroom Preview
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
