'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Eye,
  Sparkles,
  Tv,
  Bot,
  Radar,
  Coins,
  PhoneCall,
  Globe,
  X,
  ArrowLeft,
  Mail,
  Lock,
  EyeOff,
  AlertTriangle,
  LogIn,
  ChevronDown,
  MapPin,
} from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';
import toast from 'react-hot-toast';
import { supabase } from '../../utils/supabase';
import LiveAppPreviewModal from './LiveAppPreviewModal';
import WorldwideCurrencyPicker from './WorldwideCurrencyPicker';
import {
  BASE_PASS_AMOUNT_GHS,
  detectCurrencyFromTimezone,
  fetchLiveGhsRates,
  formatConvertedPrice,
  getCurrencyMeta,
} from '../../utils/worldCurrencies';

interface GlobalChatAccessGateProps {
  isOpen: boolean;
  onSuccess: (reference: string) => void;
  onLoginClick: () => void;
  onPaidLoginSuccess?: (user: any, profile: any) => void;
  onUnpaidDenied?: (email: string) => void;
  onClose?: () => void;
  currentUser?: any;
  currentProfile?: any;
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

export const DENIED_GATE_EMAIL_STORAGE_KEY = 'horpal_denied_gate_email';
export const GATE_LOGIN_ATTEMPT_STORAGE_KEY = 'horpal_gate_login_attempt';

export default function GlobalChatAccessGate({
  isOpen,
  onSuccess,
  onLoginClick,
  onPaidLoginSuccess,
  onUnpaidDenied,
  onClose,
  currentUser,
  currentProfile,
}: GlobalChatAccessGateProps) {
  const [viewMode, setViewMode] = useState<'gate' | 'login'>('gate');
  const [email, setEmail] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Inline Login State (zero z-index conflicts on iOS Safari & Android Chrome)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [deniedEmailBanner, setDeniedEmailBanner] = useState<string | null>(null);
  const [pillarStatusNotice, setPillarStatusNotice] = useState<string | null>(null);

  // Worldwide Currency Converter State (anchored to GH₵ 50.00 base settlement)
  const [selectedCurrency, setSelectedCurrency] = useState<string>('GHS');
  const [liveRates, setLiveRates] = useState<Record<string, number> | null>(null);
  const [detectedCurrency, setDetectedCurrency] = useState<string>('GHS');
  const [isCurrencyPickerOpen, setIsCurrencyPickerOpen] = useState(false);

  const touchHandledRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const initializePayment = usePaystackPayment(
    paymentConfig || {
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
      email: 'user@example.com',
      amount: 5000,
    }
  );

  // Load live exchange rates + detect local timezone currency when gate opens
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setDetectedCurrency(detectCurrencyFromTimezone());
    fetchLiveGhsRates().then((rates) => {
      if (active) setLiveRates(rates);
    });
    return () => {
      active = false;
    };
  }, [isOpen]);

  // Pre-fill email & show strict 3-pillar isolation notice if logged in via Pillar 2 or Pillar 3
  useEffect(() => {
    if (!isOpen) return;
    const uEmail = currentUser?.email || currentProfile?.email || '';
    if (uEmail) {
      setEmail((prev) => prev || uEmail);
      setLoginEmail((prev) => prev || uEmail);
    }
    if (currentUser && currentProfile && currentProfile.has_paid_global_chat !== true) {
      const p2 = currentProfile.has_paid_pillar2 || currentProfile.is_pillar2_paid ? '✅' : '❌';
      const p3 =
        currentProfile.has_paid_pillar3 &&
        currentProfile.pillar3_expires_at &&
        new Date(currentProfile.pillar3_expires_at) > new Date()
          ? '✅'
          : '❌';
      setPillarStatusNotice(
        `🚫 Pillar 1 Access Required: Your account (${uEmail || 'this account'}) has [Pillar 2: ${p2}] [Pillar 3: ${p3}], but has NOT paid the GH₵ 50.00 Pillar 1 Lifetime Pass yet.`
      );
    }
  }, [isOpen, currentUser, currentProfile]);

  // Pick up any unpaid OAuth return banner stored before sign-out
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    try {
      const denied = sessionStorage.getItem(DENIED_GATE_EMAIL_STORAGE_KEY);
      if (denied) {
        setDeniedEmailBanner(denied);
        setEmail((prev) => prev || denied);
        setViewMode('gate');
      }
    } catch (_) {}
  }, [isOpen]);

  const makeSafeTap = (fn: () => void) => ({
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault();
    },
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      if (t) touchStartRef.current = { x: t.clientX, y: t.clientY };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const start = touchStartRef.current;
      const t = e.changedTouches[0];
      touchStartRef.current = null;
      if (start && t && (Math.abs(t.clientX - start.x) > 10 || Math.abs(t.clientY - start.y) > 10)) {
        return;
      }
      e.stopPropagation();
      touchHandledRef.current = Date.now();
      fn();
    },
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (Date.now() - touchHandledRef.current < 450) return;
      fn();
    },
  });

  const handleOpenCurrencyPicker = () => {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsCurrencyPickerOpen(true);
  };

  const clearDeniedBanner = () => {
    setDeniedEmailBanner(null);
    setPillarStatusNotice(null);
    try {
      sessionStorage.removeItem(DENIED_GATE_EMAIL_STORAGE_KEY);
    } catch (_) {}
  };

  const selectedMeta = getCurrencyMeta(selectedCurrency);
  const isForeignCurrency = selectedMeta.code !== 'GHS';
  const convertedPrice = formatConvertedPrice(BASE_PASS_AMOUNT_GHS, selectedMeta.code, liveRates);
  const detectedMeta = getCurrencyMeta(detectedCurrency);
  const syncedPriceLabel = isForeignCurrency
    ? `≈ ${convertedPrice.formattedWithCode} (GH₵ 50.00)`
    : 'GH₵ 50.00';

  const triggerPayment = () => {
    const payEmail =
      email.trim() ||
      currentUser?.email ||
      deniedEmailBanner ||
      'guest_' + Date.now() + '@earnmega.com';
    const reference = `pass_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    setPaymentConfig({
      reference,
      email: payEmail,
      amount: 50 * 100, // Strictly 5000 pesewas = GH₵ 50.00 settlement in GHS
      currency: 'GHS',
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
      metadata: {
        payment_type: 'GLOBAL_CHAT_PASS',
        target_pillar: '1',
        amount_ghs: 50,
        viewed_currency: selectedMeta.code,
        viewed_estimate: convertedPrice.formattedWithCode,
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
              clearDeniedBanner();
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

  const verifyPaidPassOrSack = async (authUser: any, fallbackEmail?: string) => {
    try {
      await supabase.rpc('claim_paid_passes_for_user_rpc', {
        p_user_id: authUser.id,
        p_email: authUser?.email || fallbackEmail || '',
      });
    } catch (_) {}

    const { data: profileRow, error: profileErr } = await supabase
      .from('profiles')
      .select('has_paid_global_chat, has_paid_pillar2, is_pillar2_paid, has_paid_pillar3, pillar3_expires_at, subscription_tier')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!profileErr && profileRow?.has_paid_global_chat === true) {
      clearDeniedBanner();
      try {
        localStorage.setItem('horpal_target_pillar', '1');
        localStorage.removeItem(GATE_LOGIN_ATTEMPT_STORAGE_KEY);
      } catch (_) {}
      toast.success('✅ Lifetime Global Chat Pass verified! Entering now...');
      if (onPaidLoginSuccess) {
        onPaidLoginSuccess(authUser, profileRow);
      } else {
        onLoginClick();
      }
      return;
    }

    // Strict 3-Pillar Isolation: SACK any Pillar 2 / Pillar 3 / Unpaid account trying to enter Pillar 1
    const blockedEmail = authUser?.email || fallbackEmail || 'this account';
    const p2 = profileRow?.has_paid_pillar2 || profileRow?.is_pillar2_paid ? '✅' : '❌';
    const p3 =
      profileRow?.has_paid_pillar3 &&
      profileRow?.pillar3_expires_at &&
      new Date(profileRow.pillar3_expires_at) > new Date()
        ? '✅'
        : '❌';

    setPillarStatusNotice(
      `🚫 Pillar 1 Access Required: Your account (${blockedEmail}) has [Pillar 2: ${p2}] [Pillar 3: ${p3}], but has NOT paid the GH₵ 50.00 Pillar 1 Lifetime Pass yet.`
    );

    try {
      localStorage.removeItem(GATE_LOGIN_ATTEMPT_STORAGE_KEY);
      sessionStorage.setItem(DENIED_GATE_EMAIL_STORAGE_KEY, blockedEmail);
    } catch (_) {}

    try {
      await supabase.auth.signOut();
    } catch (_) {}

    setDeniedEmailBanner(blockedEmail);
    if (authUser?.email || fallbackEmail) {
      setEmail(authUser?.email || fallbackEmail || '');
    }
    setLoginPassword('');
    setViewMode('gate');
    onUnpaidDenied?.(blockedEmail);
    toast.error(`Access Denied: ${blockedEmail} has not paid the GH₵ 50 Pillar 1 pass yet.`, {
      duration: 5000,
    });
  };

  const handleInlineLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const trimmedEmail = loginEmail.trim();
    if (!trimmedEmail || !loginPassword) {
      setLoginError('Please enter both your email and password.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: loginPassword,
      });

      if (authErr || !authData?.user) {
        setLoginError(authErr?.message || 'Invalid email or password.');
        return;
      }

      await verifyPaidPassOrSack(authData.user, trimmedEmail);
    } catch (err: any) {
      setLoginError(err?.message || 'Unable to sign in right now. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('horpal_target_pillar', '1');
        localStorage.setItem(GATE_LOGIN_ATTEMPT_STORAGE_KEY, '1');
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      try {
        localStorage.removeItem(GATE_LOGIN_ATTEMPT_STORAGE_KEY);
      } catch (_) {}
      setLoginError(err?.message || 'Google Sign-In failed.');
      setIsLoggingIn(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start sm:items-center justify-center py-6 px-3 sm:p-4 bg-black/90 backdrop-blur-xl overflow-y-auto overscroll-contain">
      {/* Background cinematic aura */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-tr from-amber-500/10 via-purple-600/5 to-emerald-500/10" />

      {/* Main Gate Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-4xl bg-[#09090F] border border-amber-500/30 rounded-3xl p-5 sm:p-8 shadow-[0_0_80px_rgba(245,158,11,0.25)] text-white my-auto overflow-hidden z-10"
      >
        {/* Close Button if optional */}
        {onClose && (
          <button
            type="button"
            {...makeSafeTap(onClose)}
            aria-label="Close access gate"
            className="absolute top-4 right-4 z-30 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition cursor-pointer touch-manipulation"
          >
            <X size={20} />
          </button>
        )}

        {viewMode === 'login' ? (
          /* ================= INLINE PAID ACCOUNT LOGIN VIEW ================= */
          <div className="max-w-md mx-auto py-2">
            <button
              type="button"
              {...makeSafeTap(() => {
                setLoginError(null);
                setViewMode('gate');
              })}
              className="min-h-[44px] px-4 py-2 mb-6 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer touch-manipulation transition"
            >
              <ArrowLeft size={16} />
              <span>← Back to GH₵ 50 Lifetime Pass</span>
            </button>

            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-bold uppercase tracking-wider mb-3">
                <ShieldCheck size={14} className="text-amber-400" />
                Lifetime Pass Verification
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-black text-white mb-1.5">
                Log In to Your Paid Account
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                Only accounts verified with the GH₵ 50 Lifetime Entry Pass will enter Global Chat.
              </p>
            </div>

            {loginError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/50 text-rose-200 text-xs sm:text-sm font-semibold flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleInlineLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                  Account Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full min-h-[48px] pl-10 pr-4 py-3 rounded-xl bg-black/70 border border-white/20 text-white placeholder-zinc-500 text-base sm:text-sm focus:outline-none focus:border-amber-400 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full min-h-[48px] pl-10 pr-12 py-3 rounded-xl bg-black/70 border border-white/20 text-white placeholder-zinc-500 text-base sm:text-sm focus:outline-none focus:border-amber-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer touch-manipulation"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full min-h-[48px] py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-black font-black text-sm tracking-wide shadow-[0_0_25px_rgba(245,158,11,0.45)] hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
              >
                <LogIn size={18} />
                <span>{isLoggingIn ? 'Verifying Lifetime Pass...' : 'Log In & Verify Paid Pass'}</span>
              </button>
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[11px] font-mono text-zinc-500 uppercase">OR</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <button
              type="button"
              disabled={isLoggingIn}
              {...makeSafeTap(handleGoogleSignIn)}
              className="w-full min-h-[48px] py-3.5 px-5 rounded-2xl bg-white text-black font-extrabold text-sm hover:bg-zinc-100 active:scale-[0.98] disabled:opacity-60 transition flex items-center justify-center gap-3 cursor-pointer touch-manipulation shadow-lg"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        ) : (
          /* ================= MAIN GH₵ 50 LIFETIME GATE VIEW ================= */
          <>
            {/* Top Badge */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pr-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold tracking-wide uppercase shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                <Sparkles size={14} className="text-amber-400 animate-spin" />
                Standard Lifetime Access Gate
              </div>
            </div>

            {/* Bold Red Sacked/Unpaid Warning Banner */}
            {(pillarStatusNotice || deniedEmailBanner) && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-950/90 border-2 border-rose-500 text-rose-100 shadow-[0_0_30px_rgba(244,63,94,0.45)] flex items-start gap-3">
                <AlertTriangle size={22} className="text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm font-bold leading-relaxed">
                  {pillarStatusNotice ? (
                    pillarStatusNotice
                  ) : (
                    <>
                      🚫 Access Denied: This account (<span className="underline text-white">{deniedEmailBanner}</span>) has
                      NOT paid the GH₵ 50 Lifetime Entry Pass yet. Please complete your one-time GH₵ 50 payment below to
                      activate Global Chat.
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Headline & Subheadline + Interactive Worldwide Currency Switcher */}
            <div className="text-center max-w-2xl mx-auto mb-7">
              <h1 className="text-2xl sm:text-4xl font-serif font-black tracking-tight text-white mb-3">
                Unlock Earnmega Global Chat —{' '}
                <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                  Lifetime Standard Pass
                </span>
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 font-medium leading-relaxed">
                Pay Once &amp; For All. Never Pay Entry Again. Instant Lifetime Access to the Global
                Social &amp; AI Ecosystem for only{' '}
                {isForeignCurrency ? (
                  <span className="inline-flex flex-wrap items-baseline justify-center gap-1.5">
                    <span className="text-amber-300 font-black text-base sm:text-lg underline decoration-amber-400 decoration-2">
                      ≈ {convertedPrice.formattedWithCode}
                    </span>
                    <span className="text-zinc-400 text-xs sm:text-sm italic">(GH₵ 50.00)</span>
                  </span>
                ) : (
                  <span className="text-white font-bold underline decoration-amber-400 decoration-2">
                    GH₵ 50.00
                  </span>
                )}
                .
              </p>

              {/* Sleek Glowing Worldwide Currency Switcher Pill Directly Under GH₵ 50.00 */}
              <div className="mt-4 flex flex-col items-center gap-2">
                <button
                  type="button"
                  {...makeSafeTap(handleOpenCurrencyPicker)}
                  className="min-h-[44px] px-4 py-2 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/50 text-amber-200 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(245,158,11,0.28)] hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer touch-manipulation"
                >
                  <span>
                    {isForeignCurrency
                      ? `🌍 Currency: ${selectedMeta.flag} ${selectedMeta.code} (≈ ${convertedPrice.formattedWithCode} • GH₵ 50.00)`
                      : '🌍 Currency: 🇬🇭 GHS (GH₵ 50.00)'}
                  </span>
                  <ChevronDown size={15} className="text-amber-300 shrink-0" />
                  <span className="hidden sm:inline text-amber-300/90 font-semibold">
                    — Tap to Convert Worldwide
                  </span>
                </button>

                {/* Auto-Detected Timezone Suggestion Chip */}
                {detectedCurrency !== 'GHS' && selectedCurrency !== detectedCurrency && (
                  <button
                    type="button"
                    {...makeSafeTap(() => setSelectedCurrency(detectedCurrency))}
                    className="min-h-[36px] px-3.5 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/45 text-emerald-300 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer touch-manipulation"
                  >
                    <MapPin size={13} className="text-emerald-400 shrink-0" />
                    <span>
                      📍 Detected currency: Convert GH₵ 50.00 to {detectedMeta.code} ({detectedMeta.symbol})
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* 6 Glowing VIP Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-7">
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

            {/* Email input for instant Paystack receipt & pass binding */}
            <div className="max-w-md mx-auto mb-5">
              <label className="block text-xs font-mono text-zinc-400 uppercase tracking-widest mb-1.5 text-center">
                Your Email for Instant Pass Delivery
              </label>
              <input
                type="email"
                placeholder="e.g. yourname@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-black/60 border border-white/20 text-white placeholder-zinc-500 text-base sm:text-sm focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            {/* Reassuring Worldwide Paystack Settlement Notice */}
            {isForeignCurrency && (
              <div className="max-w-xl mx-auto mb-4 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-400/35 text-emerald-200 text-xs text-center font-semibold leading-relaxed">
                💳 Worldwide Visa, Mastercard, Apple Pay &amp; Mobile Money accepted. Charged at GH₵ 50.00 (≈{' '}
                <span className="text-white font-black">{convertedPrice.formattedWithCode}</span> at your bank&apos;s
                live exchange rate).
              </div>
            )}

            {/* Action Buttons: Pay GH₵ 50 & View Inside App */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5 max-w-xl mx-auto mb-4">
              <button
                type="button"
                disabled={isVerifying}
                {...makeSafeTap(triggerPayment)}
                className="w-full sm:flex-1 min-h-[52px] py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-black font-black text-sm tracking-wide shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
              >
                <ShieldCheck size={18} className="text-black shrink-0" />
                <span>
                  {isVerifying
                    ? 'VERIFYING PAYMENT...'
                    : `Unlock Lifetime Access — ${syncedPriceLabel}`}
                </span>
              </button>

              <button
                type="button"
                {...makeSafeTap(() => setShowPreview(true))}
                className="w-full sm:w-auto min-h-[52px] py-3.5 px-6 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer touch-manipulation"
              >
                <Eye size={18} className="text-amber-400 shrink-0" />
                <span>👁️ View Inside App</span>
              </button>
            </div>

            {/* Big, Unmissable Mobile Secondary Button for Already Paid Users */}
            <div className="max-w-xl mx-auto mb-5 relative z-20">
              <button
                type="button"
                {...makeSafeTap(() => {
                  setLoginError(null);
                  setViewMode('login');
                })}
                className="w-full min-h-[48px] py-3.5 px-5 rounded-2xl border border-amber-400/45 bg-amber-500/10 hover:bg-amber-500/20 active:scale-[0.98] text-amber-300 font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer touch-manipulation transition shadow-[0_0_20px_rgba(245,158,11,0.12)]"
              >
                <LogIn size={17} className="text-amber-400 shrink-0" />
                <span>Already Have a Paid Account? Log In →</span>
              </button>
            </div>

            {/* Footer note */}
            <div className="text-center text-xs text-zinc-500">
              <span>🔒 256-Bit Bank Grade Encryption • Processed securely via Paystack Ghana (MoMo & Card)</span>
            </div>
          </>
        )}
      </motion.div>

      {/* ==================== SEARCHABLE WORLDWIDE CURRENCY PICKER ==================== */}
      <WorldwideCurrencyPicker
        isOpen={isCurrencyPickerOpen}
        onClose={() => setIsCurrencyPickerOpen(false)}
        selectedCode={selectedCurrency}
        onSelect={(code) => setSelectedCurrency(code)}
        liveRates={liveRates}
      />

      {/* ==================== HYPER-REALISTIC LIVE APP PREVIEW MODAL ==================== */}
      <LiveAppPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        priceLabel={syncedPriceLabel}
        onUnlockCheckout={() => {
          setShowPreview(false);
          setViewMode('gate');
          triggerPayment();
        }}
      />
    </div>
  );
}
