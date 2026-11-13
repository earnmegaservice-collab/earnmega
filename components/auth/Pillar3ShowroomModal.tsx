'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Code2,
  TrendingUp,
  Cpu,
  GraduationCap,
  Zap,
  Lock,
  X,
  ArrowRight,
  Terminal,
  BarChart3,
  Send,
  FileCode2,
  CheckCircle2,
  Crown,
} from 'lucide-react';
import { useModalBackHandler } from '../../utils/useModalBackHandler';

interface Pillar3ShowroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlanAndUnlock: (tier?: 'weekly' | 'pro' | 'premium') => void;
}

const LIVE_CODE_SNIPPET = `// ⚡ Earnmega Neural Ultra 4.0 — Autonomous FinTech Escrow Engine
import { NextResponse } from 'next/server';
import { verifyPaystackSignature, executeAtomicLedgerSplit } from '@/lib/neural-vault';

export async function POST(req: Request) {
  const payload = await req.json();
  const isVerified = await verifyPaystackSignature(req.headers, payload);
  if (!isVerified) return NextResponse.json({ error: 'Invalid HMAC' }, { status: 401 });

  // Instant 0.4ms multi-currency settlement & smart revenue routing
  const receipt = await executeAtomicLedgerSplit({
    reference: payload.data.reference,
    grossAmountGhs: payload.data.amount / 100,
    creatorAllocation: 0.80,
    instantMoMoDisbursement: true,
  });

  return NextResponse.json({
    status: 'SETTLED_INSTANTLY',
    txHash: receipt.ledgerHash,
    settledAt: new Date().toISOString(),
  });
}`;

const WEALTH_BLUEPRINT_STEPS = [
  {
    week: 'Week 1',
    title: 'High-Ticket Offer & AI Funnel Architecture',
    metric: 'GH₵ 8,500',
    pct: 28,
    detail: 'Deploy automated WhatsApp + TikTok neural hook scripts targeting 4.8% conversion.',
  },
  {
    week: 'Week 2',
    title: 'Viral Faceless Short-Form Ad Matrix',
    metric: 'GH₵ 19,200',
    pct: 52,
    detail: 'Scale 3 AI-generated video hooks across Ghana, Nigeria, UK & Diaspora audiences.',
  },
  {
    week: 'Week 3',
    title: 'Automated DM Closer & Upsell Engine',
    metric: 'GH₵ 34,800',
    pct: 76,
    detail: 'Activate 24/7 objection-handling sequences + GH₵ 200 VIP bundle order bumps.',
  },
  {
    week: 'Week 4',
    title: 'GH₵ 50,000+/Mo Recurring Scaling Loop',
    metric: 'GH₵ 54,600',
    pct: 100,
    detail: 'Compound affiliate army + automated retention sequences with 84% net margin.',
  },
];

const PERSONA_CHIPS = [
  { id: 'neural_ultra', label: 'Neural Ultra 4.0', icon: Sparkles, badge: 'FLAGSHIP', color: 'from-cyan-400 to-blue-600' },
  { id: 'code_master', label: 'Code Master', icon: Code2, badge: 'ARCHITECT', color: 'from-purple-400 to-indigo-600' },
  { id: 'exam_genius', label: 'Exam Genius', icon: GraduationCap, badge: 'A+ TUTOR', color: 'from-emerald-400 to-teal-600' },
  { id: 'viral_ad', label: 'Viral Ad Scriptwriter', icon: TrendingUp, badge: 'HIGH ROI', color: 'from-amber-400 to-orange-600' },
];

const SHOWROOM_PROMPTS = [
  '💻 Build a full-stack SaaS with Paystack & Supabase Auth in 60 seconds',
  '📈 Write a GH₵ 50,000/month WhatsApp & TikTok launch strategy',
  '🎓 Solve complex University Calculus, Law & Medical exam questions step-by-step',
  '🎬 Generate 10 viral TikTok/Reels ad scripts that convert cold viewers',
];

export default function Pillar3ShowroomModal({
  isOpen,
  onClose,
  onSelectPlanAndUnlock,
}: Pillar3ShowroomModalProps) {
  const [mounted, setMounted] = useState(false);
  const [typedLength, setTypedLength] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useModalBackHandler(isOpen, onClose, 'pillar3ShowroomPreview');

  useEffect(() => {
    if (!isOpen) {
      setTypedLength(0);
      return;
    }
    const interval = window.setInterval(() => {
      setTypedLength((prev) => {
        if (prev >= LIVE_CODE_SNIPPET.length) return 40;
        return prev + 6;
      });
    }, 45);
    return () => window.clearInterval(interval);
  }, [isOpen]);

  if (!mounted) return null;

  const interceptClick = (e?: React.MouseEvent, preferredTier?: 'weekly' | 'pro' | 'premium') => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onSelectPlanAndUnlock(preferredTier);
  };

  const content = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99998] bg-[#040509]/95 backdrop-blur-2xl flex flex-col overflow-y-auto overscroll-contain text-white">
          {/* TOP STICKY SANDBOX BANNER */}
          <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-rose-950/95 via-purple-950/95 to-indigo-950/95 border-b border-rose-500/40 px-3 sm:px-6 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.85)]">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-center md:text-left">
                <span className="inline-flex h-3 w-3 rounded-full bg-rose-500 animate-ping shrink-0" />
                <p className="text-xs sm:text-sm font-black tracking-wide text-white">
                  🔴 AI STUDIO LIVE PREVIEW —{' '}
                  <span className="text-amber-300">
                    Choose Weekly (GH₵ 50), Pro (GH₵ 100), or Premium (GH₵ 200) for Full Interactive Access
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto justify-center">
                <button
                  type="button"
                  onClick={(e) => interceptClick(e, 'pro')}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-black font-black text-xs sm:text-sm shadow-[0_0_25px_rgba(245,158,11,0.5)] hover:scale-[1.02] active:scale-[0.98] transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles size={15} />
                  <span>Unlock AI Studio</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose();
                  }}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <X size={15} />
                  <span>✕ Exit Preview</span>
                </button>
              </div>
            </div>
          </div>

          {/* MAIN SHOWROOM COMMAND CENTER */}
          <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
            {/* Hero Title */}
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-[11px] font-mono uppercase tracking-widest mb-3">
                <Cpu size={13} className="animate-pulse" />
                EARNMEGA NEURAL AI STUDIO • INTERACTIVE CURIOSTY SHOWROOM
              </div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-cyan-200 to-amber-300 bg-clip-text text-transparent">
                Experience 24/7 Executive Intelligence, Code Architecture &amp; Wealth Strategy
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-2">
                Tap any model, prompt card, or workspace panel below to select your pass and unlock full interactive command.
              </p>
            </div>

            {/* PANEL 3: AI PERSONA & MODEL BAR */}
            <div
              onClick={(e) => interceptClick(e)}
              className="p-4 rounded-3xl bg-[#0B0D16]/90 border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.12)] cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                  <Zap size={13} /> Panel 3 • Active Neural Persona &amp; Model Selector Bar
                </span>
                <span className="text-[11px] text-amber-300 font-bold flex items-center gap-1 group-hover:underline">
                  <Lock size={12} /> Tap any model to unlock →
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {PERSONA_CHIPS.map((chip, idx) => {
                  const Icon = chip.icon;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={(e) => interceptClick(e)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        idx === 0
                          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.25)]'
                          : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 hover:border-cyan-400/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${chip.color} flex items-center justify-center text-white shrink-0 shadow-md`}
                        >
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-black text-white truncate">{chip.label}</div>
                          <div className="text-[10px] font-mono text-cyan-300 uppercase">{chip.badge}</div>
                        </div>
                      </div>
                      <ArrowRight size={15} className="text-zinc-400 group-hover:text-white shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SPLIT-SCREEN COMMAND CENTER: PANEL 1 (CODE ARCHITECT) & PANEL 2 (WEALTH STRATEGIST) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* PANEL 1: LIVE CODE & APP ARCHITECT */}
              <div
                onClick={(e) => interceptClick(e)}
                className="rounded-3xl bg-[#090B12] border border-purple-500/35 shadow-[0_0_45px_rgba(168,85,247,0.15)] overflow-hidden flex flex-col cursor-pointer group hover:border-purple-400 transition"
              >
                <div className="px-5 py-3.5 bg-gradient-to-r from-purple-950/70 via-indigo-950/50 to-transparent border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Terminal size={17} className="text-purple-400" />
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                        Panel 1 • Live Code &amp; App Architect
                      </h3>
                      <p className="text-[11px] text-purple-300/80">
                        Auto-Synthesizing Next.js 16 + FinTech Smart Contract Escrow
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono font-bold animate-pulse">
                    ● TYPING LIVE
                  </span>
                </div>

                <div className="p-5 font-mono text-xs sm:text-[13px] leading-relaxed text-cyan-200 bg-[#06070C] flex-1 min-h-[290px] overflow-x-auto relative">
                  <pre className="whitespace-pre-wrap break-words">
                    <code>{LIVE_CODE_SNIPPET.slice(0, typedLength)}</code>
                    <span className="inline-block w-2 h-4 bg-cyan-400 ml-0.5 animate-pulse align-middle" />
                  </pre>

                  <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <FileCode2 size={14} /> Zero-Bug TypeScript • Ready to Copy &amp; Deploy
                    </span>
                    <span className="text-purple-300 font-bold group-hover:underline">
                      Tap to generate your own app code →
                    </span>
                  </div>
                </div>
              </div>

              {/* PANEL 2: EXECUTIVE WEALTH & BUSINESS STRATEGIST */}
              <div
                onClick={(e) => interceptClick(e)}
                className="rounded-3xl bg-[#090B12] border border-amber-500/35 shadow-[0_0_45px_rgba(245,158,11,0.15)] overflow-hidden flex flex-col cursor-pointer group hover:border-amber-400 transition"
              >
                <div className="px-5 py-3.5 bg-gradient-to-r from-amber-950/70 via-yellow-950/40 to-transparent border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <BarChart3 size={17} className="text-amber-400" />
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                        Panel 2 • Executive Wealth &amp; Business Strategist
                      </h3>
                      <p className="text-[11px] text-amber-300/80">
                        Step-by-Step GH₵ 50,000/Month Digital Launch Blueprint
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-mono font-bold">
                    ROI SIMULATOR
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between gap-4 bg-[#06070C]">
                  <div className="space-y-3.5">
                    {WEALTH_BLUEPRINT_STEPS.map((s, i) => (
                      <div key={i} className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                        <div className="flex items-center justify-between text-xs font-bold mb-1">
                          <span className="text-amber-300 font-mono">
                            {s.week}: <span className="text-white font-sans">{s.title}</span>
                          </span>
                          <span className="text-emerald-400 font-mono font-black">{s.metric}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-1.5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${s.pct}%` }}
                            transition={{ duration: 1.1, delay: i * 0.15 }}
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400"
                          />
                        </div>
                        <p className="text-[11px] text-zinc-400">{s.detail}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={14} /> Includes Ad Copy, Funnel Scripts &amp; Pricing Math
                    </span>
                    <span className="text-amber-300 font-bold group-hover:underline">
                      Unlock Custom Blueprint →
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* INTERACTIVE PROMPT VAULT & MOCK INPUT (ALL INTERCEPTED TO PRICING MODAL) */}
            <div
              onClick={(e) => interceptClick(e)}
              className="p-5 rounded-3xl bg-[#0B0D16]/90 border border-white/15 hover:border-amber-400/50 transition cursor-pointer"
            >
              <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-3 flex items-center justify-between">
                <span>⚡ One-Tap Master Prompt Vault (Tap Any Prompt to Unlock Instant Execution)</span>
                <span className="text-amber-400 font-bold">Protected Showroom Mode</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                {SHOWROOM_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => interceptClick(e)}
                    className="p-3 rounded-2xl bg-white/[0.04] hover:bg-amber-500/15 border border-white/10 hover:border-amber-400/40 text-left text-xs sm:text-sm text-zinc-200 font-medium transition flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="truncate">{p}</span>
                    <ArrowRight size={14} className="text-amber-400 shrink-0" />
                  </button>
                ))}
              </div>

              {/* Mock Input Box that intercepts focus/click */}
              <div
                onClick={(e) => interceptClick(e)}
                className="w-full min-h-[54px] px-4 py-3 rounded-2xl bg-black/80 border border-cyan-500/40 flex items-center justify-between gap-3"
              >
                <input
                  type="text"
                  readOnly
                  onFocus={(e) => {
                    e.target.blur();
                    interceptClick();
                  }}
                  placeholder="Ask Earnmega AI Studio to build code, write essays, analyze markets, or generate viral scripts..."
                  className="w-full bg-transparent text-xs sm:text-sm text-zinc-300 placeholder-zinc-500 outline-none cursor-pointer"
                />
                <button
                  type="button"
                  onClick={(e) => interceptClick(e)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-black text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Send size={13} />
                  <span>Generate</span>
                </button>
              </div>
            </div>

            {/* QUICK TIER SELECTOR FOOTER BAR */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-6">
              <button
                type="button"
                onClick={(e) => interceptClick(e, 'weekly')}
                className="p-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/15 hover:border-cyan-400/50 text-left transition cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="text-[10px] font-mono uppercase text-cyan-400 font-bold">⚡ STARTER WEEKLY</div>
                  <div className="text-base font-black text-white">GH₵ 50.00 / 7 Days</div>
                </div>
                <ArrowRight size={18} className="text-cyan-400" />
              </button>

              <button
                type="button"
                onClick={(e) => interceptClick(e, 'pro')}
                className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/80 via-indigo-950/80 to-amber-950/60 border-2 border-cyan-400 text-left transition cursor-pointer flex items-center justify-between shadow-[0_0_25px_rgba(34,211,238,0.25)]"
              >
                <div>
                  <div className="text-[10px] font-mono uppercase text-amber-300 font-bold">
                    🔥 PRO MONTHLY • MOST POPULAR
                  </div>
                  <div className="text-base font-black text-white">GH₵ 100.00 / 30 Days</div>
                </div>
                <ArrowRight size={18} className="text-amber-300" />
              </button>

              <button
                type="button"
                onClick={(e) => interceptClick(e, 'premium')}
                className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/80 to-yellow-950/60 border border-amber-400/60 hover:border-amber-300 text-left transition cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="text-[10px] font-mono uppercase text-amber-300 font-bold flex items-center gap-1">
                    <Crown size={12} /> PREMIUM ANNUAL • SAVE 92%
                  </div>
                  <div className="text-base font-black text-white">GH₵ 200.00 / 365 Days</div>
                </div>
                <ArrowRight size={18} className="text-amber-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
