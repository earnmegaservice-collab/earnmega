'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  ArrowLeft,
  Mail,
  Lock,
  AlertTriangle,
  LogIn,
  ChevronDown,
  MapPin,
  Zap,
  Rocket,
  Crown,
  Check,
  User,
  Clock,
} from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';
import toast from 'react-hot-toast';
import { supabase } from '../../utils/supabase';
import WorldwideCurrencyPicker from './WorldwideCurrencyPicker';
import Pillar3ShowroomModal from './Pillar3ShowroomModal';
import {
  detectCurrencyFromTimezone,
  fetchLiveGhsRates,
  formatConvertedPrice,
  getCurrencyMeta,
} from '../../utils/worldCurrencies';
import { syncAuthenticatedUserProfile } from './HorPalAuthGate';
import { hasActivePillar3Access } from '../../utils/pillar3Access';
import { authFetch } from '../../utils/authFetch';
import {
  auditAccount,
  EntitlementRow,
  hasPillar3Access,
  purgeLegacyAccessFlags,
  startGoogleVerification,
} from '../../utils/pillarAccess';
import PillarAuditBanner, { signOutToSwitchAccount } from './PillarAuditBanner';
import PaystackReferenceRecovery from './PaystackReferenceRecovery';

export type Pillar3TierId = 'weekly' | 'pro' | 'premium';

export interface Pillar3TierOption {
  id: Pillar3TierId;
  name: string;
  shortLabel: string;
  amountGhs: number;
  pesewas: number;
  durationDays: number;
  periodLabel: string;
  badge: string;
  ribbon?: string;
  accentBorder: string;
  selectedBg: string;
  perks: string[];
}

export const PILLAR3_TIER_OPTIONS: Pillar3TierOption[] = [
  {
    id: 'weekly',
    name: '⚡ STARTER WEEKLY PASS',
    shortLabel: 'Weekly GH₵ 50',
    amountGhs: 50,
    pesewas: 5000,
    durationDays: 7,
    periodLabel: '1 Week (7 Days)',
    badge: 'QUICK ACCESS • 7 DAYS',
    accentBorder: 'border-cyan-400/50 shadow-[0_0_30px_rgba(34,211,238,0.2)]',
    selectedBg: 'from-cyan-950/60 via-[#0B0D18] to-[#090A12]',
    perks: [
      'Full Instant Access to Earnmega AI Studio for 7 Days',
      '24/7 Ultra-Fast Neural Chat & Question Answering',
      'Smart Code Generator, Essay Writer & Business Copywriter',
      'Real-Time 7-Day Countdown Timer',
    ],
  },
  {
    id: 'pro',
    name: '🚀 PRO MONTHLY PASS',
    shortLabel: 'Pro GH₵ 100',
    amountGhs: 100,
    pesewas: 10000,
    durationDays: 30,
    periodLabel: '1 Month (30 Days)',
    badge: 'PRO STUDIO • 30 DAYS',
    ribbon: '🔥 MOST POPULAR • SAVE 50% VS WEEKLY',
    accentBorder: 'border-cyan-400 ring-2 ring-amber-400/40 shadow-[0_0_45px_rgba(34,211,238,0.35)]',
    selectedBg: 'from-cyan-950/80 via-indigo-950/60 to-amber-950/30',
    perks: [
      'Everything in Weekly for a Full 30 Days',
      'Deep Reasoning & Advanced Math/Coding Architecture Mode',
      'Multi-Format Document, Exam & Strategy Breakdown',
      'Priority Zero-Queue Neural Response Speed',
      'Pro AI Studio Badge + 30-Day Live Countdown Timer',
    ],
  },
  {
    id: 'premium',
    name: '👑 PREMIUM ANNUAL PASS',
    shortLabel: 'Premium GH₵ 200',
    amountGhs: 200,
    pesewas: 20000,
    durationDays: 365,
    periodLabel: '1 Year (365 Days)',
    badge: 'VIP CROWN • 365 DAYS',
    ribbon: '💎 BEST VALUE • SAVE 92% (ONLY GH₵ 0.55/DAY)',
    accentBorder: 'border-amber-400 ring-2 ring-amber-400/40 shadow-[0_0_45px_rgba(245,158,11,0.35)]',
    selectedBg: 'from-amber-950/80 via-purple-950/50 to-[#090A12]',
    perks: [
      'Unlimited Full-Year Access (365 Days) to Earnmega AI Studio',
      'Executive AI Persona Switcher (Software Architect, Wealth Strategist, Legal/Business Analyst, Viral Marketing Director)',
      'One-Click Export Responses to Clean Markdown / Code / Study Sheets',
      'VIP Gold Crown Status & Priority Access to All New AI Models',
      '365-Day Live Countdown Timer',
    ],
  },
];

const QUICK_CURRENCY_CHIPS = [
  { code: 'GHS', flag: '🇬🇭' },
  { code: 'USD', flag: '🇺🇸' },
  { code: 'NGN', flag: '🇳🇬' },
  { code: 'GBP', flag: '🇬🇧' },
  { code: 'EUR', flag: '🇪🇺' },
  { code: 'KES', flag: '🇰🇪' },
  { code: 'ZAR', flag: '🇿🇦' },
  { code: 'XOF', flag: '🇨🇮' },
  { code: 'CAD', flag: '🇨🇦' },
];

export { hasActivePillar3Access };

interface DeniedAuditState {
  email: string;
  entitlements: EntitlementRow | null;
}

interface Pillar3AccessGateProps {
  isOpen: boolean;
  onClose?: () => void;
  currentUser?: any;
  currentProfile?: any;
  currentEntitlements?: EntitlementRow | null;
  initialDeniedAudit?: DeniedAuditState | null;
  expiredMessage?: string | null;
  isUpgradeMode?: boolean;
  onAccessGranted: (user: any, updatedProfile: any) => void;
}

export default function Pillar3AccessGate({
  isOpen,
  onClose,
  currentUser,
  currentProfile,
  currentEntitlements,
  initialDeniedAudit,
  expiredMessage,
  isUpgradeMode = false,
  onAccessGranted,
}: Pillar3AccessGateProps) {
  const [viewMode, setViewMode] = useState<'gate' | 'login' | 'setup_account'>('gate');
  const [selectedTier, setSelectedTier] = useState<Pillar3TierId>('pro');
  const [email, setEmail] = useState('');
  const [showShowroom, setShowShowroom] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Verified Pass State for Post-Payment Account Binding (when user pays before logging in)
  const [verifiedPassReceipt, setVerifiedPassReceipt] = useState<{
    reference: string;
    email: string;
    planTier: Pillar3TierId;
    amountGhs: number;
    durationDays: number;
  } | null>(null);

  // Post-Payment Setup Form State
  const [setupMode, setSetupMode] = useState<'signup' | 'existing_login'>('signup');
  const [setupFirstName, setSetupFirstName] = useState('');
  const [setupLastName, setSetupLastName] = useState('');
  const [setupUsername, setSetupUsername] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isBindingAccount, setIsBindingAccount] = useState(false);

  // Inline Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Forensic 3-Pillar Audit State (Phase 5)
  const [deniedAudit, setDeniedAudit] = useState<DeniedAuditState | null>(null);

  // Worldwide Currency Converter State (Phase 4)
  const [selectedCurrency, setSelectedCurrency] = useState<string>('GHS');
  const [liveRates, setLiveRates] = useState<Record<string, number> | null>(null);
  const [detectedCurrency, setDetectedCurrency] = useState<string>('GHS');
  const [isCurrencyPickerOpen, setIsCurrencyPickerOpen] = useState(false);

  const paySectionRef = useRef<HTMLDivElement | null>(null);
  const touchHandledRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const initializePayment = usePaystackPayment(
    paymentConfig || {
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
      email: 'user@earnmega.com',
      amount: 10000,
    }
  );

  const scrollToPaySection = () => {
    setTimeout(() => {
      paySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  };

  // Pre-fill email & audit badge if user is already logged in without Pillar 3 access
  useEffect(() => {
    if (!isOpen) return;
    purgeLegacyAccessFlags();

    const uEmail =
      initialDeniedAudit?.email || currentUser?.email || currentProfile?.email || '';
    if (uEmail) {
      setEmail((prev) => prev || uEmail);
      setLoginEmail((prev) => prev || uEmail);
    }

    if (!isUpgradeMode) {
      const liveEnt = (currentEntitlements || currentProfile) as EntitlementRow | null;
      if (initialDeniedAudit && !hasPillar3Access(initialDeniedAudit.entitlements)) {
        setDeniedAudit(initialDeniedAudit);
      } else if (currentUser && !hasPillar3Access(liveEnt)) {
        setDeniedAudit({
          email: uEmail || 'your account',
          entitlements: liveEnt || null,
        });
      }
    }
  }, [
    isOpen,
    currentUser,
    currentProfile,
    currentEntitlements,
    initialDeniedAudit,
    isUpgradeMode,
  ]);

  // Load live exchange rates + detect local currency
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

  const clearDeniedAudit = () => {
    setDeniedAudit(null);
  };

  const activeTierObj =
    PILLAR3_TIER_OPTIONS.find((t) => t.id === selectedTier) || PILLAR3_TIER_OPTIONS[1];
  const selectedMeta = getCurrencyMeta(selectedCurrency);
  const isForeignCurrency = selectedMeta.code !== 'GHS';
  const activeTierConverted = formatConvertedPrice(
    activeTierObj.amountGhs,
    selectedMeta.code,
    liveRates
  );
  const detectedMeta = getCurrencyMeta(detectedCurrency);

  const triggerPayment = () => {
    const payEmail =
      email.trim() ||
      currentUser?.email ||
      deniedAudit?.email ||
      `ai_member_${Date.now()}@earnmega.com`;

    if (!email.trim() && !currentUser?.email) {
      toast.error('Please enter your Email (Gmail) address for instant pass activation.');
      return;
    }

    const reference = `p3_${selectedTier}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 7)}`;

    setPaymentConfig({
      reference,
      email: payEmail,
      amount: activeTierObj.pesewas, // Strictly 5000, 10000, or 20000 pesewas in GHS
      currency: 'GHS',
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
      metadata: {
        payment_type: 'PILLAR3_AI_STUDIO_PASS',
        target_pillar: '3',
        plan_tier: selectedTier,
        amount_ghs: activeTierObj.amountGhs,
        duration_days: activeTierObj.durationDays,
        viewed_currency: selectedMeta.code,
        viewed_estimate: activeTierConverted.formattedWithCode,
      },
    });
  };

  useEffect(() => {
    if (!paymentConfig) return;

    initializePayment({
      onSuccess: async (ref: any) => {
        setIsVerifying(true);
        try {
          const referenceId = ref?.reference || paymentConfig.reference;
          const res = await authFetch('/api/pillar3/verify-pass', {
            method: 'POST',
            body: JSON.stringify({
              reference: referenceId,
              email: paymentConfig.email,
              planTier: selectedTier,
            }),
          });
          const data = await res.json();

          if (!res.ok || !data.success) {
            toast.error(data.error || 'Payment verification failed. Please contact support.');
            return;
          }

          clearDeniedAudit();

          // Case 1: User is already logged in -> audit live Supabase DB & enter Pillar 3 ONLY if verified
          if (currentUser?.id) {
            const liveEnt = await auditAccount(currentUser.id, paymentConfig.email).catch(
              () => null
            );
            const liveProfile = liveEnt
              ? { ...(currentProfile || {}), ...liveEnt }
              : currentProfile;

            if (!hasPillar3Access(liveEnt)) {
              toast.error('Payment recorded, verifying account license in Supabase...');
              return;
            }

            toast.success(
              `🎉 ${activeTierObj.name} Activated! Welcome to Earnmega AI Studio.`
            );
            onAccessGranted(currentUser, liveProfile);
          } else {
            // Case 2: User is not logged in yet -> show inline Create Account / Complete Setup form
            setVerifiedPassReceipt({
              reference: referenceId,
              email: paymentConfig.email,
              planTier: selectedTier,
              amountGhs: activeTierObj.amountGhs,
              durationDays: activeTierObj.durationDays,
            });
            setEmail(paymentConfig.email);
            setViewMode('setup_account');
            toast.success(
              '✅ Payment Verified! Complete your quick account setup below to enter Earnmega AI Studio.'
            );
          }
        } catch (err: any) {
          console.error('Pillar 3 pass verification error:', err);
          toast.error('Unable to verify payment right now.');
        } finally {
          setIsVerifying(false);
          setPaymentConfig(null);
        }
      },
      onClose: () => {
        setPaymentConfig(null);
      },
    });
  }, [
    paymentConfig,
    initializePayment,
    currentUser,
    currentProfile,
    selectedTier,
    activeTierObj,
    onAccessGranted,
  ]);

  const verifyPillar3LoginOrSack = async (authUser: any, fallbackEmail?: string) => {
    const cleanEmail = (authUser?.email || fallbackEmail || '').trim();
    const liveEnt = await auditAccount(authUser.id, cleanEmail).catch(() => null);

    if (hasPillar3Access(liveEnt)) {
      clearDeniedAudit();
      toast.success('✅ Pillar 3 AI Studio Pass verified! Entering now...');
      onAccessGranted(authUser, liveEnt);
      return;
    }

    // Strict 3-Pillar Isolation: SACK & BOUNCE unpaid or other-pillar users back to Paywall
    const resolvedEmail = cleanEmail || '';
    setDeniedAudit({
      email: resolvedEmail,
      entitlements: liveEnt,
    });
    if (resolvedEmail) setEmail(resolvedEmail);
    setLoginPassword('');
    setViewMode('gate');
    toast.error(
      `🚫 Pillar 3 Access Required: ${resolvedEmail || 'this account'} does not have an active Pillar 3 AI Studio pass.`,
      { duration: 5500 }
    );
    scrollToPaySection();
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

      await syncAuthenticatedUserProfile(authData.user);
      await verifyPillar3LoginOrSack(authData.user, trimmedEmail);
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
      const { error } = await startGoogleVerification(3);
      if (error) throw error;
    } catch (err: any) {
      setLoginError(err?.message || 'Google Sign-In failed.');
      setIsLoggingIn(false);
    }
  };

  const handlePostPaymentBindSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedPassReceipt) return;
    setSetupError(null);
    setIsBindingAccount(true);

    try {
      const targetEmail = (email.trim() || verifiedPassReceipt.email).toLowerCase();
      let authedUser: any = null;

      if (setupMode === 'signup') {
        const cleanFirst = setupFirstName.trim();
        const cleanLast = setupLastName.trim();
        const cleanUsername =
          setupUsername.trim().replace(/^@+/, '') || targetEmail.split('@')[0];

        if (!cleanFirst || !cleanLast) {
          throw new Error('Please enter your First Name and Last Name.');
        }
        if (setupPassword.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }

        const fullName = `${cleanFirst} ${cleanLast}`.trim();
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: targetEmail,
          password: setupPassword,
          options: {
            data: {
              full_name: fullName,
              first_name: cleanFirst,
              last_name: cleanLast,
              username: cleanUsername,
              profile_completed: true,
            },
          },
        });

        if (signUpErr) {
          // If user already exists, try signing in directly
          if (signUpErr.message?.toLowerCase().includes('already registered')) {
            const { data: signInData, error: signInErr } =
              await supabase.auth.signInWithPassword({
                email: targetEmail,
                password: setupPassword,
              });
            if (signInErr || !signInData?.user) {
              setSetupMode('existing_login');
              throw new Error(
                'This email already has an account. Enter your existing account password to bind your new Pillar 3 pass.'
              );
            }
            authedUser = signInData.user;
          } else {
            throw signUpErr;
          }
        } else {
          authedUser = signUpData?.user;
          if (!signUpData?.session) {
            const { data: autoLogin } = await supabase.auth.signInWithPassword({
              email: targetEmail,
              password: setupPassword,
            });
            if (autoLogin?.user) authedUser = autoLogin.user;
          }
        }
      } else {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password: setupPassword,
        });
        if (signInErr || !signInData?.user) {
          throw new Error(signInErr?.message || 'Invalid email or password.');
        }
        authedUser = signInData.user;
      }

      if (!authedUser?.id) {
        throw new Error('Could not establish authenticated session. Please sign in.');
      }

      await syncAuthenticatedUserProfile(authedUser);

      // Bind the verified Pillar 3 pass strictly to Pillar 3 via hardened server API
      const bindRes = await authFetch('/api/pillar3/verify-pass', {
        method: 'POST',
        body: JSON.stringify({
          reference: verifiedPassReceipt.reference,
          email: targetEmail,
          planTier: verifiedPassReceipt.planTier,
        }),
      });
      await bindRes.json().catch(() => ({}));

      const liveEnt = await auditAccount(authedUser.id, targetEmail).catch(() => null);
      if (!hasPillar3Access(liveEnt)) {
        throw new Error('Pass verified, please use Paystack Reference Recovery below to bind your receipt.');
      }

      toast.success('🚀 Account bound & Pillar 3 AI Studio unlocked!');
      onAccessGranted(authedUser, liveEnt);
    } catch (err: any) {
      setSetupError(err?.message || 'Failed to complete setup.');
    } finally {
      setIsBindingAccount(false);
    }
  };

  if (!isOpen) return null;

  const ctaButtonText = isForeignCurrency
    ? `Unlock ${activeTierObj.shortLabel} Now (≈ ${activeTierConverted.formattedWithCode})`
    : `Unlock ${activeTierObj.shortLabel} Now`;

  return (
    <div className="fixed inset-0 z-[210] flex items-start sm:items-center justify-center py-4 px-3 sm:p-5 bg-black/92 backdrop-blur-2xl overflow-y-auto overscroll-contain">
      {/* Ambient Neural Glows */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-500/12 via-purple-600/8 to-transparent" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-6xl bg-[#070810] border border-cyan-500/35 rounded-3xl p-4 sm:p-7 md:p-8 shadow-[0_0_90px_rgba(6,182,212,0.22)] text-white my-auto overflow-hidden z-10"
      >
        {/* Optional Close Button */}
        {onClose && (
          <button
            type="button"
            {...makeSafeTap(onClose)}
            aria-label="Close Pillar 3 gate"
            className="absolute top-4 right-4 z-30 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition cursor-pointer touch-manipulation"
          >
            <X size={20} />
          </button>
        )}

        {viewMode === 'setup_account' && verifiedPassReceipt ? (
          /* ================= POST-PAYMENT INLINE ACCOUNT BINDING VIEW ================= */
          <div className="max-w-md mx-auto py-3">
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-black uppercase tracking-wider mb-3">
                <ShieldCheck size={15} className="text-emerald-400" />
                Payment Confirmed • Ref #{verifiedPassReceipt.reference.slice(-8)}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-1.5">
                Complete Setup to Enter Pillar 3
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                Your{' '}
                <span className="text-amber-300 font-bold uppercase">
                  {verifiedPassReceipt.planTier} Pass ({verifiedPassReceipt.durationDays} Days)
                </span>{' '}
                is verified. Create your login or bind to your existing account below.
              </p>
            </div>

            <div className="flex w-full bg-white/5 p-1 rounded-xl mb-5 border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setSetupMode('signup');
                  setSetupError(null);
                }}
                className={`flex-1 py-2 text-xs sm:text-sm font-black rounded-lg transition ${
                  setupMode === 'signup'
                    ? 'bg-cyan-400 text-black shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Create New Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setSetupMode('existing_login');
                  setSetupError(null);
                }}
                className={`flex-1 py-2 text-xs sm:text-sm font-black rounded-lg transition ${
                  setupMode === 'existing_login'
                    ? 'bg-cyan-400 text-black shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Use Existing Account
              </button>
            </div>

            {setupError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/50 text-rose-200 text-xs sm:text-sm font-semibold flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                <span>{setupError}</span>
              </div>
            )}

            <form onSubmit={handlePostPaymentBindSubmit} className="space-y-3.5">
              {setupMode === 'signup' && (
                <>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="First Name"
                        value={setupFirstName}
                        onChange={(e) => setSetupFirstName(e.target.value)}
                        className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-black/70 border border-white/20 text-white text-base sm:text-sm focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Last Name"
                        value={setupLastName}
                        onChange={(e) => setSetupLastName(e.target.value)}
                        className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-black/70 border border-white/20 text-white text-base sm:text-sm focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">
                      Username (@handle)
                    </label>
                    <div className="relative">
                      <User
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                      />
                      <input
                        type="text"
                        required
                        placeholder="yourhandle"
                        value={setupUsername}
                        onChange={(e) => setSetupUsername(e.target.value)}
                        className="w-full min-h-[46px] pl-9 pr-4 py-2.5 rounded-xl bg-black/70 border border-white/20 text-white text-base sm:text-sm focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">
                  Verified Pass Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-black/70 border border-white/20 text-white text-base sm:text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">
                  {setupMode === 'signup' ? 'Create Password (min 6 chars)' : 'Account Password'}
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-black/70 border border-white/20 text-white text-base sm:text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              <button
                type="submit"
                disabled={isBindingAccount}
                className="w-full min-h-[50px] py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-amber-400 text-black font-black text-sm tracking-wide shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 transition cursor-pointer"
              >
                {isBindingAccount
                  ? 'Activating Earnmega AI Studio...'
                  : 'Complete Setup & Enter Earnmega AI Studio →'}
              </button>
            </form>
          </div>
        ) : viewMode === 'login' ? (
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
              <span>← Back to Pillar 3 Plans (GH₵ 50 / 100 / 200)</span>
            </button>

            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-[11px] font-bold uppercase tracking-wider mb-3">
                <ShieldCheck size={14} className="text-cyan-400" />
                Already Paid? Log In / Verify Paid Account
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-1.5">
                Verify Paid Pillar 3 Account
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                Strict 3-Pillar Isolation: Live database verification confirms your account holds an active, unexpired Pillar 3 pass before opening Earnmega AI Studio.
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
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@gmail.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full min-h-[48px] pl-10 pr-4 py-3 rounded-xl bg-black/70 border border-white/20 text-white placeholder-zinc-500 text-base sm:text-sm focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full min-h-[48px] pl-10 pr-12 py-3 rounded-xl bg-black/70 border border-white/20 text-white placeholder-zinc-500 text-base sm:text-sm focus:outline-none focus:border-cyan-400 transition"
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
                className="w-full min-h-[48px] py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-amber-400 text-black font-black text-sm tracking-wide shadow-[0_0_25px_rgba(34,211,238,0.45)] hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
              >
                <LogIn size={18} />
                <span>
                  {isLoggingIn ? 'VERIFYING PILLAR 3 ACCESS...' : 'VERIFY & ENTER PILLAR 3 HUB →'}
                </span>
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
              data-testid="pillar3-google-verify-btn"
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
              <span>🔵 Continue with Google to Verify Pillar 3 Access</span>
            </button>

            <PaystackReferenceRecovery
              pillar={3}
              onRecovered={async (res) => {
                if (res.entitlements && hasPillar3Access(res.entitlements)) {
                  const { data: sessData } = await supabase.auth.getSession();
                  if (sessData?.session?.user) {
                    clearDeniedAudit();
                    toast.success('🚀 Pillar 3 Receipt Verified! Unlocking Earnmega AI Studio...');
                    onAccessGranted(sessData.session.user, res.entitlements);
                  }
                }
              }}
            />
          </div>
        ) : (
          /* ================= MAIN PILLAR 3 3-TIER LUXURY PAYWALL VIEW ================= */
          <>
            {/* Top Bar: Pillar 3 Badge + Prominent Mobile-Safe Inline "Already Paid for Pillar 3? Log In →" Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5 pr-0 sm:pr-12">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-xs font-black tracking-wide uppercase shadow-[0_0_20px_rgba(34,211,238,0.25)] self-start">
                <Sparkles size={14} className="text-cyan-400 animate-spin" />
                <span>Pillar 3 • Earnmega AI Studio Access Gate</span>
              </div>

              {!isUpgradeMode && (
                <button
                  type="button"
                  {...makeSafeTap(() => {
                    setLoginError(null);
                    setViewMode('login');
                  })}
                  className="min-h-[48px] px-5 py-2.5 rounded-2xl border border-cyan-400/50 bg-cyan-500/15 hover:bg-cyan-500/25 active:scale-[0.98] text-cyan-200 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer touch-manipulation transition shadow-[0_0_20px_rgba(34,211,238,0.18)]"
                >
                  <LogIn size={16} className="text-cyan-300 shrink-0" />
                  <span>Already Paid? Log In / Verify Account →</span>
                </button>
              )}
            </div>

            {/* Auto-Expiry Alert Banner (Phase 6.2) */}
            {expiredMessage && (
              <div className="mb-5 p-4 rounded-2xl bg-amber-950/90 border-2 border-amber-400 text-amber-100 shadow-[0_0_30px_rgba(245,158,11,0.4)] flex items-start gap-3">
                <Clock size={22} className="text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="text-xs sm:text-sm font-black leading-relaxed">
                  {expiredMessage}
                </div>
              </div>
            )}

            {/* Smart Time-Stacking Banner when Extending/Upgrading (Phase 6.1) */}
            {isUpgradeMode && (
              <div className="mb-5 p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-400/50 text-emerald-100 text-xs sm:text-sm font-bold flex items-center gap-2.5">
                <Zap size={18} className="text-emerald-400 shrink-0" />
                <span>
                  ⬆️ Smart Time-Stacking Guaranteed: Adding a Weekly (+7d), Pro (+30d), or Premium (+365d) pass stacks directly onto your current remaining time so you never lose a single minute!
                </span>
              </div>
            )}

            {/* Forensic 3-Pillar Payment Receipt Scorecard (Phase 5) */}
            {deniedAudit && !isUpgradeMode && (
              <div className="mb-5">
                <PillarAuditBanner
                  pillar={3}
                  email={deniedAudit.email}
                  entitlements={deniedAudit.entitlements}
                  onSwitchAccount={async () => {
                    await signOutToSwitchAccount();
                    clearDeniedAudit();
                    setEmail('');
                    setLoginEmail('');
                    toast.success('Signed out. Enter or choose another paid account.');
                  }}
                />
              </div>
            )}

            {/* Headline & Subheadline */}
            <div className="text-center max-w-3xl mx-auto mb-5">
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white mb-2">
                {isUpgradeMode ? 'Extend or Upgrade Your ' : 'Unlock '}
                <span className="bg-gradient-to-r from-cyan-300 via-amber-300 to-purple-400 bg-clip-text text-transparent">
                  Earnmega AI Studio
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Select your AI Studio pass below. 100% isolated Pillar 3 neural compute with live countdown timer, executive AI personas, and instant activation.
              </p>

              {/* PHASE 4: WORLDWIDE CURRENCY SWITCHER PILL + QUICK-TAP CHIPS DIRECTLY ABOVE PRICING CARDS */}
              <div className="mt-4 flex flex-col items-center gap-2.5">
                <button
                  type="button"
                  {...makeSafeTap(handleOpenCurrencyPicker)}
                  className="min-h-[44px] px-4 py-2 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/50 text-amber-200 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(245,158,11,0.28)] hover:scale-[1.01] active:scale-[0.98] transition cursor-pointer touch-manipulation"
                >
                  <span>
                    🌍 Currency: {selectedMeta.flag} {selectedMeta.code} ({selectedMeta.symbol}) ▾ — Tap to Convert All Plans Worldwide
                  </span>
                  <ChevronDown size={15} className="text-amber-300 shrink-0" />
                </button>

                {/* Quick-Tap Popular Currency Chips (No Keyboard Needed) */}
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {QUICK_CURRENCY_CHIPS.map((chip) => {
                    const isSelected = selectedCurrency === chip.code;
                    return (
                      <button
                        key={chip.code}
                        type="button"
                        {...makeSafeTap(() => setSelectedCurrency(chip.code))}
                        className={`min-h-[34px] px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 border transition cursor-pointer touch-manipulation ${
                          isSelected
                            ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.45)]'
                            : 'bg-white/5 text-zinc-200 border-white/15 hover:bg-white/10'
                        }`}
                      >
                        <span>{chip.flag}</span>
                        <span>{chip.code}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Auto-Detected Timezone Suggestion Chip */}
                {detectedCurrency !== 'GHS' && selectedCurrency !== detectedCurrency && (
                  <button
                    type="button"
                    {...makeSafeTap(() => setSelectedCurrency(detectedCurrency))}
                    className="min-h-[34px] px-3.5 py-1 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/45 text-emerald-300 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer touch-manipulation"
                  >
                    <MapPin size={13} className="text-emerald-400 shrink-0" />
                    <span>
                      📍 Detected currency: Convert all plans to {detectedMeta.code} ({detectedMeta.symbol})
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* PHASE 3.1: THREE INTERACTIVE PRICING TIER CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mb-6">
              {PILLAR3_TIER_OPTIONS.map((tier) => {
                const isSelected = selectedTier === tier.id;
                const converted = formatConvertedPrice(
                  tier.amountGhs,
                  selectedMeta.code,
                  liveRates
                );
                const TierIcon =
                  tier.id === 'weekly' ? Zap : tier.id === 'pro' ? Rocket : Crown;

                return (
                  <div
                    key={tier.id}
                    {...makeSafeTap(() => setSelectedTier(tier.id))}
                    className={`relative rounded-3xl p-5 flex flex-col justify-between transition-all duration-200 cursor-pointer touch-manipulation bg-gradient-to-b ${
                      isSelected
                        ? `${tier.selectedBg} border-2 ${tier.accentBorder} scale-[1.01]`
                        : 'from-zinc-900/80 to-[#090A12] border border-white/12 hover:border-white/30 opacity-90 hover:opacity-100'
                    }`}
                  >
                    {/* Floating Ribbon for Pro & Premium */}
                    {tier.ribbon && (
                      <div
                        className={`-mt-8 mb-3 self-center px-3.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-lg whitespace-nowrap ${
                          tier.id === 'pro'
                            ? 'bg-gradient-to-r from-cyan-400 via-amber-300 to-amber-500 text-black'
                            : 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black'
                        }`}
                      >
                        {tier.ribbon}
                      </div>
                    )}

                    <div>
                      {/* Top Row: Badge + Radio Check */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                            tier.id === 'premium'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                              : 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/35'
                          }`}
                        >
                          <TierIcon size={12} />
                          {tier.badge}
                        </span>

                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center border transition ${
                            isSelected
                              ? 'bg-amber-400 border-amber-300 text-black shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                              : 'border-white/25 bg-white/5 text-transparent'
                          }`}
                        >
                          <Check size={14} strokeWidth={3} />
                        </div>
                      </div>

                      {/* Tier Title */}
                      <h3 className="text-base sm:text-lg font-black text-white mb-2">
                        {tier.name}
                      </h3>

                      {/* Price Display (Converted + GHS Anchor) */}
                      <div className="mb-4 pb-3 border-b border-white/10">
                        {isForeignCurrency ? (
                          <>
                            <div className="text-2xl sm:text-3xl font-black text-amber-300 leading-tight">
                              ≈ {converted.formattedWithCode}
                            </div>
                            <div className="text-xs font-bold text-zinc-300 mt-0.5">
                              (GH₵ {tier.amountGhs.toFixed(2)} / {tier.periodLabel})
                            </div>
                          </>
                        ) : (
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-black text-white">
                              GH₵ {tier.amountGhs.toFixed(2)}
                            </span>
                            <span className="text-xs font-bold text-cyan-300">
                              / {tier.periodLabel}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Perks List */}
                      <ul className="space-y-2.5 mb-5">
                        {tier.perks.map((perk, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-xs text-zinc-200 leading-relaxed"
                          >
                            <span className="text-emerald-400 font-bold shrink-0 mt-0.5">✅</span>
                            <span>{perk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div
                      className={`w-full py-2.5 px-4 rounded-xl text-center text-xs font-black uppercase tracking-wider transition ${
                        isSelected
                          ? 'bg-gradient-to-r from-cyan-400 via-amber-300 to-amber-500 text-black shadow-md'
                          : 'bg-white/10 text-zinc-300 hover:bg-white/15'
                      }`}
                    >
                      {isSelected ? `✓ Selected: ${tier.shortLabel}` : `Select ${tier.shortLabel}`}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Email Input + Paystack Checkout + View AI Studio Showroom Button */}
            <div ref={paySectionRef} className="max-w-2xl mx-auto">
              <div className="mb-4">
                <label className="block text-xs font-mono text-zinc-300 uppercase tracking-widest mb-1.5 text-center">
                  Your Email (Gmail) for Instant Pillar 3 Pass Activation
                </label>
                <div className="relative max-w-md mx-auto">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400"
                  />
                  <input
                    type="email"
                    placeholder="e.g. yourname@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full min-h-[48px] pl-10 pr-4 py-3 rounded-xl bg-black/70 border border-cyan-400/40 text-white placeholder-zinc-500 text-base sm:text-sm focus:outline-none focus:border-amber-400 transition"
                  />
                </div>
              </div>

              {isForeignCurrency && (
                <div className="mb-4 px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-400/35 text-emerald-200 text-xs text-center font-semibold">
                  💳 Worldwide Visa, Mastercard, Apple Pay &amp; Mobile Money accepted. Settled at{' '}
                  <span className="text-white font-black">
                    GH₵ {activeTierObj.amountGhs.toFixed(2)}
                  </span>{' '}
                  (≈ <span className="text-amber-300 font-black">{activeTierConverted.formattedWithCode}</span>).
                </div>
              )}

              {/* Primary CTA + "👁️ View AI Studio" Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5 mb-4">
                <button
                  type="button"
                  disabled={isVerifying}
                  {...makeSafeTap(triggerPayment)}
                  className="w-full sm:flex-1 min-h-[54px] py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-400 via-amber-400 to-amber-500 text-black font-black text-sm sm:text-base tracking-wide shadow-[0_0_35px_rgba(34,211,238,0.45)] hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                >
                  <ShieldCheck size={19} className="text-black shrink-0" />
                  <span>{isVerifying ? 'VERIFYING PASS...' : ctaButtonText}</span>
                </button>

                <button
                  type="button"
                  {...makeSafeTap(() => setShowShowroom(true))}
                  className="w-full sm:w-auto min-h-[54px] py-3.5 px-6 rounded-2xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/50 text-white font-extrabold text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(168,85,247,0.3)] cursor-pointer touch-manipulation"
                >
                  <Eye size={18} className="text-cyan-300 shrink-0" />
                  <span>👁️ View AI Studio</span>
                </button>
              </div>

              <div className="text-center text-[11px] text-zinc-500">
                🔒 256-Bit Bank-Grade Paystack Checkout • Strictly Isolated Pillar 3 AI Studio Pass
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* SEARCHABLE 160+ WORLDWIDE CURRENCY PICKER (NO AUTOFOCUS) */}
      <WorldwideCurrencyPicker
        isOpen={isCurrencyPickerOpen}
        onClose={() => setIsCurrencyPickerOpen(false)}
        selectedCode={selectedCurrency}
        onSelect={(code) => setSelectedCurrency(code)}
        liveRates={liveRates}
        baseAmountGhs={activeTierObj.amountGhs}
      />

      {/* PHASE 5: ULTRA-FUTURISTIC "👁️ VIEW AI STUDIO" CURIOSITY SHOWROOM MODAL */}
      <Pillar3ShowroomModal
        isOpen={showShowroom}
        onClose={() => setShowShowroom(false)}
        onSelectPlanAndUnlock={(preferredTier) => {
          if (preferredTier) setSelectedTier(preferredTier);
          setShowShowroom(false);
          setViewMode('gate');
        }}
      />
    </div>
  );
}
