'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  CheckCircle,
  Eye,
  Sparkles,
  Lock,
  ArrowRight,
  Tv,
  Bot,
  Radar,
  Coins,
  PhoneCall,
  Globe,
  X,
  Play,
  RotateCcw,
} from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';
import toast from 'react-hot-toast';

interface GlobalChatAccessGateProps {
  isOpen: boolean;
  onSuccess: (reference: string) => void;
  onLoginClick: () => void;
  onClose?: () => void;
}

const VIP_FEATURES = [
  {
    icon: Tv,
    color: 'from-amber-400 to-amber-600',
    title: '4K Ultra-HD Live Streaming Arena',
    desc: 'Broadcast to thousands or watch worldwide creators with zero lag and animated 3D gifts.',
  },
  {
    icon: Bot,
    color: 'from-fuchsia-400 to-purple-600',
    title: 'Next-Gen Neural AI Companions',
    desc: '24/7 Smart Personal AI Concierge & smart AI Friends answering anything with ultra accuracy.',
  },
  {
    icon: Radar,
    color: 'from-cyan-400 to-blue-600',
    title: 'Live Spatial GPS Radar',
    desc: 'Real-time nearby match discovery and interactive location proximity radar with privacy control.',
  },
  {
    icon: Coins,
    color: 'from-yellow-400 to-amber-500',
    title: 'Instant Coin-to-Cash Creator Vault',
    desc: 'Receive gifts in 1-on-1 DMs and Live Streams with direct instant GH₵ cash-out to MoMo or bank.',
  },
  {
    icon: PhoneCall,
    color: 'from-emerald-400 to-teal-600',
    title: 'Encrypted HD Video & Voice Calling',
    desc: 'Crystal-clear peer-to-peer and group calls with state-of-the-art WebRTC audio/video relay.',
  },
  {
    icon: Globe,
    color: 'from-rose-400 to-red-600',
    title: 'Lifetime Verified Global Membership',
    desc: 'Verified badge, lifetime ecosystem access, zero ads, zero recurring entry fees forever.',
  },
];

export default function GlobalChatAccessGate({
  isOpen,
  onSuccess,
  onLoginClick,
  onClose,
}: GlobalChatAccessGateProps) {
  const [email, setEmail] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewSlide, setPreviewSlide] = useState(0);
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const initializePayment = usePaystackPayment(paymentConfig || {
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
    email: 'user@example.com',
    amount: 5000,
  });

  const triggerPayment = () => {
    const payEmail = email.trim() || 'guest_' + Date.now() + '@earnmega.com';
    const reference = `pass_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    setPaymentConfig({
      reference,
      email: payEmail,
      amount: 50 * 100, // 5000 pesewas = GH₵ 50.00
      currency: 'GHS',
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
      metadata: {
        payment_type: 'GLOBAL_CHAT_PASS',
        target_pillar: '1',
        amount_ghs: 50,
      },
    });
  };

  useEffect(() => {
    if (paymentConfig) {
      initializePayment({
        onSuccess: async (ref: any) => {
          setIsVerifying(true);
          try {
            const referenceId = ref.reference || paymentConfig.reference;
            const res = await fetch('/api/paystack/verify-global-pass', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                reference: referenceId,
                email: paymentConfig.email,
              }),
            });
            const data = await res.json();
            if (data.success) {
              toast.success('Payment Verified! ✅ Welcome to Global Chat.');
              onSuccess(referenceId);
            } else {
              toast.error(data.error || 'Verification failed. Please contact support.');
            }
          } catch (e: any) {
            console.error('Pass verification error:', e);
            toast.error('Payment verification failed.');
          } finally {
            setIsVerifying(false);
            setPaymentConfig(null);
          }
        },
        onClose: () => {
          setPaymentConfig(null);
        },
      });
    }
  }, [paymentConfig, initializePayment, onSuccess]);

  // Preview simulation auto-cycle
  useEffect(() => {
    if (!showPreview) return;
    const interval = setInterval(() => {
      setPreviewSlide((prev) => (prev + 1) % 4);
    }, 3500);
    return () => clearInterval(interval);
  }, [showPreview]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xl overflow-y-auto">
      {/* Background cinematic aura */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-tr from-amber-500/10 via-purple-600/5 to-emerald-500/10" />

      {/* Main Gate Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-4xl bg-[#09090F] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(245,158,11,0.25)] text-white my-auto overflow-hidden z-10"
      >
        {/* Close Button if optional */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition"
          >
            <X size={20} />
          </button>
        )}

        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold tracking-wide uppercase shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            <Sparkles size={14} className="text-amber-400 animate-spin" />
            Standard Lifetime Access Gate
          </div>

          <button
            onClick={onLoginClick}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-4 transition"
          >
            Already Paid? Log In &rarr;
          </button>
        </div>

        {/* Headline & Subheadline */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h1 className="text-2xl sm:text-4xl font-serif font-black tracking-tight text-white mb-3">
            Unlock Earnmega Global Chat —{' '}
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
              Lifetime Standard Pass
            </span>
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 font-medium leading-relaxed">
            Pay Once & For All. Never Pay Entry Again. Instant Lifetime Access to the Global
            Social & AI Ecosystem for only{' '}
            <span className="text-white font-bold underline decoration-amber-400 decoration-2">
              GH₵ 50.00
            </span>
            .
          </p>
        </div>

        {/* 6 Glowing VIP Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-8">
          {VIP_FEATURES.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="relative p-4 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-amber-500/40 transition-all duration-300 group flex flex-col justify-between"
              >
                <div>
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feat.color} flex items-center justify-center text-white mb-3 shadow-md group-hover:scale-105 transition-transform`}
                  >
                    <Icon size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1.5 leading-snug">{feat.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Optional Email input */}
        <div className="max-w-md mx-auto mb-6">
          <label className="block text-xs font-mono text-zinc-400 uppercase tracking-widest mb-1.5 text-center">
            Your Email for Instant Pass Delivery
          </label>
          <input
            type="email"
            placeholder="e.g. yourname@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/20 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-400 transition"
          />
        </div>

        {/* Action Buttons: Pay GH₵ 50 & View Inside App */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto mb-6">
          <button
            onClick={triggerPayment}
            disabled={isVerifying}
            className="w-full sm:w-auto flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-black font-black text-sm tracking-wide shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <ShieldCheck size={18} className="text-black" />
            {isVerifying ? 'VERIFYING PAYMENT...' : 'Unlock Lifetime Access — GH₵ 50.00'}
          </button>

          <button
            onClick={() => setShowPreview(true)}
            className="w-full sm:w-auto py-4 px-6 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <Eye size={18} className="text-amber-400" />
            👁️ View Inside App
          </button>
        </div>

        {/* Footer note */}
        <div className="text-center text-xs text-zinc-500">
          <span>🔒 256-Bit Bank Grade Encryption • Processed securely via Paystack Ghana (MoMo & Card)</span>
        </div>
      </motion.div>

      {/* FULL-SCREEN INTERACTIVE RECORDING PREVIEW MODAL */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between"
          >
            {/* Top Non-Functional Recording Banner */}
            <div className="sticky top-0 z-30 w-full bg-red-950/80 border-b border-red-500/40 px-4 py-3 flex items-center justify-between backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs sm:text-sm font-black font-mono tracking-wider text-red-200 uppercase">
                  🔴 APP PREVIEW RECORDING — Pay GH₵ 50 Once For Full Interactive Access
                </span>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 text-xs font-bold"
              >
                Exit Preview ✕
              </button>
            </div>

            {/* Click-intercepted non-functional viewport */}
            <div
              onClick={() => {
                toast('🔒 Recording Mode — Pay GH₵ 50 to unlock interactive access.', {
                  icon: '💳',
                });
                setShowPreview(false);
                triggerPayment();
              }}
              className="flex-1 overflow-hidden relative cursor-pointer flex items-center justify-center p-4 select-none"
            >
              {/* Simulated Screen Carousel */}
              <div className="w-full max-w-md h-[580px] bg-neutral-950 border border-white/10 rounded-3xl overflow-hidden relative shadow-2xl flex flex-col">
                {/* Simulated App Header */}
                <div className="p-4 bg-zinc-900 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center font-bold text-black text-xs">
                      EM
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Earnmega Global Chat</div>
                      <div className="text-[10px] text-emerald-400">● 14,280 Verified Online</div>
                    </div>
                  </div>
                  <div className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    GH₵ 50 LIFETIME
                  </div>
                </div>

                {/* Simulated Content Based on Slide */}
                <div className="flex-1 p-4 relative overflow-hidden flex flex-col justify-center">
                  {previewSlide === 0 && (
                    <motion.div
                      key="slide0"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-3"
                    >
                      <div className="text-xs font-mono uppercase text-amber-400 tracking-wider">
                        [1/4] Discovery Feed & Matches
                      </div>
                      <div className="h-44 rounded-2xl bg-gradient-to-br from-purple-900/60 to-black border border-purple-500/30 p-4 flex flex-col justify-end">
                        <div className="text-sm font-bold text-white">Jessica Antwi, 24 • Accra</div>
                        <div className="text-xs text-zinc-300">"Graphic designer & digital creator ✨"</div>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/5 flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Match Compatibility: 98%</span>
                        <span className="text-xs text-emerald-400 font-bold">Verified Human</span>
                      </div>
                    </motion.div>
                  )}

                  {previewSlide === 1 && (
                    <motion.div
                      key="slide1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-3"
                    >
                      <div className="text-xs font-mono uppercase text-red-400 tracking-wider">
                        [2/4] 4K Live Stream Arena
                      </div>
                      <div className="h-44 rounded-2xl bg-gradient-to-br from-red-950 to-black border border-red-500/30 p-4 relative flex flex-col justify-between">
                        <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-black w-fit">
                          LIVE NOW
                        </span>
                        <div className="text-center text-amber-300 font-bold text-xs animate-bounce">
                          🎁 Diamond Gift Received (+500 Coins)
                        </div>
                        <div className="text-xs text-zinc-300">Kojo Broadcast: "Welcome everyone!"</div>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/5 text-xs text-zinc-400">
                        HD WebRTC Video • Realtime 3D Gift Overlays
                      </div>
                    </motion.div>
                  )}

                  {previewSlide === 2 && (
                    <motion.div
                      key="slide2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-3"
                    >
                      <div className="text-xs font-mono uppercase text-cyan-400 tracking-wider">
                        [3/4] Spatial GPS Radar
                      </div>
                      <div className="h-44 rounded-2xl bg-gradient-to-br from-cyan-950 to-black border border-cyan-500/30 flex items-center justify-center relative overflow-hidden">
                        <div className="w-32 h-32 rounded-full border border-cyan-500/40 animate-ping absolute" />
                        <div className="w-16 h-16 rounded-full border border-cyan-400 flex items-center justify-center text-xs font-bold text-cyan-300">
                          Radar Sweep
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/5 text-xs text-zinc-400">
                        Find members within 2km, 5km, or 10km radius.
                      </div>
                    </motion.div>
                  )}

                  {previewSlide === 3 && (
                    <motion.div
                      key="slide3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-3"
                    >
                      <div className="text-xs font-mono uppercase text-fuchsia-400 tracking-wider">
                        [4/4] 24/7 Neural AI Friends
                      </div>
                      <div className="h-44 rounded-2xl bg-gradient-to-br from-fuchsia-950 to-black border border-fuchsia-500/30 p-4 flex flex-col justify-between">
                        <div className="text-xs text-purple-300">
                          AI Friend: "I can help summarize discussions, give advice, or practice a language!"
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">Ultra-fast neural response</div>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/5 text-xs text-zinc-400">
                        Pinned AI Companion + Floating Concierge
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Tap to Unlock Watermark */}
                <div className="p-3 bg-amber-500/10 border-t border-amber-500/20 text-center">
                  <span className="text-xs text-amber-300 font-bold">
                    👉 Tap Anywhere to Pay GH₵ 50 & Unlock Full Interactive Access
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="p-4 bg-zinc-900 border-t border-white/10 flex items-center justify-between max-w-md mx-auto w-full">
              <span className="text-xs text-zinc-400">Preview Mode (Non-interactive)</span>
              <button
                onClick={() => {
                  setShowPreview(false);
                  triggerPayment();
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-black text-xs hover:bg-amber-400 transition"
              >
                Pay GH₵ 50 Now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
