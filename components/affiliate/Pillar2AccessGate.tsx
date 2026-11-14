'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Eye,
  CreditCard,
  Mail,
  ArrowRight,
  LogIn,
  Globe,
  Crown,
  ChevronDown,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { authFetch } from '../../utils/authFetch';
import {
  auditAccount,
  EntitlementRow,
  getBounceBackWarningMessage,
  hasPillar2Access,
  purgeLegacyAccessFlags,
  savePhonePassport,
  startGoogleVerification,
  verifyPillarStatusFromServer,
} from '../../utils/pillarAccess';
import PillarAuditBanner, {
  GoogleLogoSvg,
  PhoneSessionHeaderBar,
  signOutToSwitchAccount,
} from '../auth/PillarAuditBanner';
import PaystackReferenceRecovery from '../auth/PaystackReferenceRecovery';
import {
  ALL_WORLD_CURRENCIES,
  POPULAR_CURRENCY_CODES,
  getCurrencyMeta,
  fetchLiveGhsRates,
  formatConvertedPrice,
} from '../../utils/worldCurrencies';
import WorldwideCurrencyPicker from '../auth/WorldwideCurrencyPicker';
import Pillar2LuxuryShowroomModal from './Pillar2LuxuryShowroomModal';

const safeTap = (fn: () => void) => ({
  onClick: (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  },
});

export const PILLAR2_LICENSE_AMOUNT_GHS = 90;
export const PILLAR2_LICENSE_AMOUNT_PESEWAS = 90 * 100; // 9000 pesewas = GH₵ 90.00

export interface PaidPillar2PassData {
  paid: boolean;
  reference: string;
  email: string;
  paidAt: string;
  expiresAt: string;
  amountGhs: number;
}

interface Pillar2AccessGateProps {
  initialEmail?: string;
  currentUserId?: string;
  currentEntitlements?: EntitlementRow | null;
  initialDeniedAudit?: { email: string; entitlements: EntitlementRow | null } | null;
  sackedNotice?: string | null;
  onPassVerified: (passData: PaidPillar2PassData) => void;
  onAlreadyPaidLoginVerified: (user: any, profile: any) => void;
  onBackToHome?: () => void;
}

export default function Pillar2AccessGate({
  initialEmail = '',
  currentUserId,
  currentEntitlements = null,
  initialDeniedAudit = null,
  sackedNotice = null,
  onPassVerified,
  onAlreadyPaidLoginVerified,
  onBackToHome,
}: Pillar2AccessGateProps) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState(sackedNotice || '');
  const [loadingPaystack, setLoadingPaystack] = useState(false);
  const [verifyingServer, setVerifyingServer] = useState(false);

  // Luxury Showroom View Mode state
  const [showroomOpen, setShowroomOpen] = useState(false);
  const [interceptBanner, setInterceptBanner] = useState<string | null>(null);
  const [deniedAudit, setDeniedAudit] = useState<{ email: string; entitlements: EntitlementRow | null } | null>(
    initialDeniedAudit
  );
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const paySectionRef = useRef<HTMLDivElement | null>(null);

  // Inline Login Mode ("Already Paid for Pillar 2? Log In →")
  const [showInlineLogin, setShowInlineLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState(initialEmail);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Worldwide Currency Converter State (Base: GH₵ 90.00)
  const [selectedCurrency, setSelectedCurrency] = useState<string>('GHS');
  const [liveRates, setLiveRates] = useState<Record<string, number> | null>(null);
  const [loadingRates, setLoadingRates] = useState<boolean>(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState<boolean>(false);

  const scrollToPaySection = () => {
    if (typeof window === 'undefined') return;
    window.setTimeout(() => {
      paySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  useEffect(() => {
    purgeLegacyAccessFlags();
  }, []);

  useEffect(() => {
    if (initialDeniedAudit) {
      setDeniedAudit(initialDeniedAudit);
      if (initialDeniedAudit.email) {
        setEmail((prev) => prev || initialDeniedAudit.email);
        setLoginEmail((prev) => prev || initialDeniedAudit.email);
      }
      setShowInlineLogin(false);
      scrollToPaySection();
    }
  }, [initialDeniedAudit]);

  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail);
      setLoginEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    if (sackedNotice) {
      setError(sackedNotice);
    }
  }, [sackedNotice]);

  useEffect(() => {
    let mounted = true;
    setLoadingRates(true);
    fetchLiveGhsRates()
      .then((rates) => {
        if (!mounted) return;
        setLiveRates(rates);
      })
      .finally(() => {
        if (mounted) setLoadingRates(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const selectedMeta = getCurrencyMeta(selectedCurrency);
  const convertedDisplay = formatConvertedPrice(PILLAR2_LICENSE_AMOUNT_GHS, selectedCurrency, liveRates);

  // Preload Paystack Inline SDK
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).PaystackPop) return;

    const existingScript = document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]');
    if (existingScript) return;

    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const verifyAndPersistPillar2Pass = async (reference: string, payerEmail: string) => {
    setVerifyingServer(true);
    setError('');
    try {
      const cleanEmail = payerEmail.trim().toLowerCase();
      const res = await authFetch('/api/paystack/verify-pillar2-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
          email: cleanEmail,
          passType: 'registration_1yr',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Could not verify Pillar 2 Affiliate License payment.');
      }

      const nowIso = data.pillar2_paid_at || new Date().toISOString();
      const expiresIso =
        data.pillar2_expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

      const passData: PaidPillar2PassData = {
        paid: true,
        reference,
        email: cleanEmail,
        paidAt: nowIso,
        expiresAt: expiresIso,
        amountGhs: PILLAR2_LICENSE_AMOUNT_GHS,
      };

      if (currentUserId) {
        savePhonePassport(currentUserId, {
          email: cleanEmail,
          pillar1Paid: Boolean(currentEntitlements?.has_paid_global_chat),
          pillar2Paid: true,
          pillar3Paid: Boolean(currentEntitlements?.has_paid_pillar3),
          pillar2ExpiresAt: expiresIso,
          pillar3ExpiresAt: currentEntitlements?.pillar3_expires_at || null,
          pillar3Tier: currentEntitlements?.pillar3_tier || 'none',
        });
      }

      setDeniedAudit(null);
      onPassVerified(passData);
    } catch (err: any) {
      setError(err?.message || 'Payment verification failed. Please contact support with your reference.');
    } finally {
      setVerifyingServer(false);
      setLoadingPaystack(false);
    }
  };

  const handlePayGhs90 = () => {
    setError('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter your active Gmail / Email address so we can bind your GH₵ 90.00 Affiliate License to your account.');
      emailInputRef.current?.focus();
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
    if (!publicKey) {
      setError('Paystack public key is missing in environment configuration.');
      return;
    }

    const PaystackPop = (window as any).PaystackPop;
    if (!PaystackPop) {
      setError('Payment gateway is still initializing. Please wait 2 seconds and tap again.');
      return;
    }

    setLoadingPaystack(true);
    const txRef = `HP_P2_LICENSE_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    try {
      const handler = PaystackPop.setup({
        key: publicKey,
        email: cleanEmail,
        amount: PILLAR2_LICENSE_AMOUNT_PESEWAS, // 9000 pesewas = GH₵ 90.00
        currency: 'GHS',
        ref: txRef,
        metadata: {
          custom_fields: [
            {
              display_name: 'Pass Type',
              variable_name: 'pass_type',
              value: 'Pillar 2 Official Affiliate License (GH₵ 90.00 • 1-Year Activation)',
            },
            {
              display_name: 'Account Email',
              variable_name: 'account_email',
              value: cleanEmail,
            },
          ],
        },
        callback: (response: { reference?: string }) => {
          const confirmedRef = response?.reference || txRef;
          verifyAndPersistPillar2Pass(confirmedRef, cleanEmail);
        },
        onClose: () => {
          setLoadingPaystack(false);
        },
      });

      handler.openIframe();
    } catch (err: any) {
      console.error('Paystack launch error:', err);
      setLoadingPaystack(false);
      setError('Unable to open Paystack checkout window. Please check your connection and try again.');
    }
  };

  const handleInlineLoginCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail || !loginPassword) {
      setError('Please enter both your email and password to verify your Pillar 2 Affiliate License.');
      return;
    }

    setLoginLoading(true);
    try {
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: loginPassword,
      });

      if (signInErr || !signInData?.user) {
        throw new Error(signInErr?.message || 'Invalid email or password.');
      }

      const verified = await verifyPillarStatusFromServer(signInData.user.id, 2, cleanEmail);

      // STRICT PILLAR 2 CHECK (Phase 3): requires paid flag, receipt ref, and unexpired timestamp
      if (!verified.allowed) {
        if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
          try {
            navigator.vibrate?.([200, 100, 200]);
          } catch {}
        }
        const verifiedEmail = verified.email || signInData.user.email || cleanEmail;
        setEmail(verifiedEmail);
        setLoginPassword('');
        setDeniedAudit({ email: verifiedEmail, entitlements: verified.entitlementRow });
        setError(getBounceBackWarningMessage(2, verifiedEmail));
        setShowInlineLogin(false);
        scrollToPaySection();
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', signInData.user.id)
        .maybeSingle();

      setDeniedAudit(null);
      onAlreadyPaidLoginVerified(signInData.user, {
        ...(profile || {}),
        ...(verified.entitlementRow || {}),
      });
    } catch (err: any) {
      setError(err?.message || 'Could not verify account.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleVerify = async () => {
    setError('');
    setLoginLoading(true);
    const { error: oauthErr } = await startGoogleVerification(2);
    if (oauthErr) {
      setError(oauthErr);
      setLoginLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen w-full bg-[#040806] text-white flex items-center justify-center p-4 sm:p-6 relative overflow-x-hidden">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-[130px]" />
          <div className="absolute top-1/3 -right-24 w-96 h-96 bg-amber-500/18 rounded-full blur-[130px]" />
          <div className="absolute -bottom-24 left-1/3 w-96 h-96 bg-teal-500/15 rounded-full blur-[130px]" />
        </div>

        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 14 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="relative z-10 w-full max-w-xl rounded-3xl bg-[#08120E]/95 border border-emerald-400/35 shadow-[0_24px_90px_rgba(0,0,0,0.9)] overflow-hidden p-5 sm:p-8 space-y-5"
        >
          {/* Top Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-400 to-amber-400 p-[1px] shadow-lg shadow-emerald-500/25 shrink-0">
                <div className="w-full h-full bg-[#060E0B] rounded-[15px] flex items-center justify-center">
                  <Crown className="text-amber-300 w-6 h-6" />
                </div>
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-500/15 border border-emerald-400/35 px-2.5 py-0.5 rounded-full">
                  <Sparkles size={11} /> Pillar 2 • Official Affiliate & Creator Hub
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                  Pillar 2 Official Affiliate License Gate
                </h1>
              </div>
            </div>

            {onBackToHome && (
              <button
                type="button"
                {...safeTap(onBackToHome)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white text-xs font-bold transition cursor-pointer shrink-0"
              >
                ← Hub
              </button>
            )}
          </div>

          {interceptBanner && (
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-400/50 text-amber-200 text-xs font-bold flex items-center gap-2.5">
              <Sparkles size={16} className="text-amber-300 shrink-0" />
              <span>
                🚀 Activate your <strong>GH₵ 90.00 Affiliate License</strong> below to unlock{' '}
                <strong className="text-white">{interceptBanner}</strong> and full 50% commissions!
              </span>
            </div>
          )}

          {/* PHASE 4 & 6: Active Phone Session Pill, Multi-Account Switcher & Returning Phone Welcome Header */}
          {(initialEmail || deniedAudit?.email) && (
            <PhoneSessionHeaderBar
              targetPillar={2}
              activeEmail={initialEmail || deniedAudit?.email}
              entitlements={deniedAudit?.entitlements ?? currentEntitlements}
              onSwitchAccount={async () => {
                await signOutToSwitchAccount();
                setDeniedAudit(null);
                setError('');
                setEmail('');
                setLoginEmail('');
                setLoginPassword('');
              }}
              onSelectSavedAccount={(savedEmail) => {
                setEmail(savedEmail);
                setLoginEmail(savedEmail);
                setShowInlineLogin(true);
              }}
            />
          )}

          {/* PHASE 3: Loud Pulsing Red Bounce-Back Warning Banner when bounced from login */}
          {deniedAudit && (
            <PillarAuditBanner
              pillar={2}
              email={deniedAudit.email || initialEmail || email || 'unknown account'}
              entitlements={deniedAudit.entitlements ?? currentEntitlements}
              isBounceBack={true}
              onSwitchAccount={async () => {
                await signOutToSwitchAccount();
                setDeniedAudit(null);
                setError('');
                setEmail('');
                setLoginEmail('');
                setLoginPassword('');
              }}
            />
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-red-500/15 border-2 border-red-500/50 text-red-200 text-xs sm:text-sm font-bold leading-relaxed flex items-start gap-2.5 shadow-[0_0_30px_rgba(239,68,68,0.25)]">
              <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Price Card + 160+ Worldwide Currency Converter */}
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-amber-500/15 border border-emerald-400/35 p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 block">
                  1-Year Official License Activation • 50% Commission Tier
                </span>
                <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">GH₵ 90.00</span>
                  {selectedCurrency !== 'GHS' && (
                    <span className="text-sm sm:text-base font-black text-amber-300 bg-amber-500/15 border border-amber-400/40 px-2.5 py-0.5 rounded-lg">
                      ≈ {convertedDisplay.formattedValue} {selectedCurrency}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
                  365 Days Active
                </span>
                <span className="text-[10px] text-zinc-400">Renews at 50% off (GH₵ 45) after 1 yr</span>
              </div>
            </div>

            <div className="rounded-xl bg-black/50 border border-white/10 p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-300">
                  <Globe size={13} className="text-amber-400 shrink-0" />
                  <span>Worldwide Currency Converter (160+ Countries)</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                  {loadingRates ? (
                    <>
                      <RefreshCw size={10} className="animate-spin" /> Updating...
                    </>
                  ) : (
                    '● Live FX Rates'
                  )}
                </span>
              </div>

              <button
                type="button"
                {...safeTap(() => setCurrencyModalOpen(true))}
                aria-label="Open country and currency selector"
                className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-[#07100D] hover:bg-[#0B1813] border border-white/15 hover:border-amber-400/50 text-white flex items-center justify-between gap-2 transition cursor-pointer touch-manipulation"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl leading-none shrink-0">{selectedMeta.flag}</span>
                  <div className="text-left min-w-0">
                    <div className="text-xs font-black text-white truncate">
                      {selectedMeta.code} — {selectedMeta.name}
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">
                      Tap to search 160+ countries & currencies
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-black text-amber-300">
                    {selectedCurrency === 'GHS' ? 'GH₵ 90.00' : `≈ ${convertedDisplay.formattedValue}`}
                  </span>
                  <ChevronDown size={15} className="text-zinc-400" />
                </div>
              </button>

              {/* Popular Currency Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {POPULAR_CURRENCY_CODES.map((code) => {
                  const active = selectedCurrency === code;
                  const currObj = ALL_WORLD_CURRENCIES.find((c) => c.code === code);
                  return (
                    <button
                      key={code}
                      type="button"
                      {...safeTap(() => setSelectedCurrency(code))}
                      className={`px-2.5 py-1.5 min-h-[34px] rounded-lg text-[11px] font-black uppercase tracking-wider transition shrink-0 cursor-pointer touch-manipulation ${
                        active
                          ? 'bg-amber-400 text-black shadow-sm'
                          : 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10'
                      }`}
                    >
                      {currObj?.flag} {code}
                    </button>
                  );
                })}
              </div>

              {selectedCurrency !== 'GHS' && (
                <div className="pt-1 border-t border-white/10 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">
                    Estimated in <strong className="text-white">{selectedMeta.name}</strong>:
                  </span>
                  <span className="font-black text-amber-300 text-xs">
                    ≈ {convertedDisplay.formattedValue} ({selectedCurrency})
                  </span>
                </div>
              )}
              <p className="text-[10px] text-zinc-400 leading-snug">
                🌍 International Visa, Mastercard & Mobile Money accepted. Charged at official settlement rate of{' '}
                <strong className="text-white">GH₵ 90.00 (GHS)</strong> via Paystack; your bank or wallet automatically
                converts from {selectedCurrency}.
              </p>
            </div>

            <ul className="space-y-1.5 text-xs text-zinc-200 pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span>Earn 50% Instant Verified Commission (GH₵ 80 – GH₵ 200 per sale)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span>Full Access to 9 Digital Product Vaults, Shortlink Studio & Academy Exams</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span>Automated Friday Instant Paystack Payouts to Mobile Money & Bank</span>
              </li>
            </ul>
          </div>

          {/* Email Input for Binding Payment Status (Locked to active phone account when signed in) */}
          <div className="space-y-2">
            <label className="block text-[11px] font-black uppercase tracking-wider text-emerald-300">
              {currentUserId && initialEmail
                ? `Active Phone Account Email (1-Tap Upgrade Bound)`
                : `Enter Your Gmail / Email to Bind Your Affiliate License`}
            </label>
            <div className="relative flex items-center">
              <Mail size={16} className="absolute left-3.5 text-zinc-500 pointer-events-none" />
              <input
                ref={emailInputRef}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                readOnly={Boolean(currentUserId && initialEmail)}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="youremail@gmail.com"
                className={`w-full min-h-[48px] pl-10 pr-4 py-3 rounded-xl border text-white placeholder-zinc-500 text-base leading-normal focus:outline-none transition ${
                  currentUserId && initialEmail
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200 font-bold cursor-not-allowed'
                    : 'bg-black/70 border-emerald-500/35 focus:border-amber-400'
                }`}
              />
            </div>
            <p className="text-[11px] text-zinc-400">
              Your GH₵ 90.00 1-Year Affiliate License is permanently linked to this email in Supabase.
            </p>
          </div>

          {/* Primary Action Buttons: Pay GH₵ 90.00 + Glowing "👁️ View Affiliate Hub" */}
          <div ref={paySectionRef} className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
            <button
              type="button"
              disabled={loadingPaystack || verifyingServer}
              {...safeTap(handlePayGhs90)}
              className="sm:col-span-7 w-full min-h-[54px] py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-400 via-amber-300 to-emerald-400 text-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_12px_35px_rgba(16,185,129,0.35)] hover:brightness-110 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation disabled:opacity-60"
            >
              <CreditCard size={18} />
              <span>
                {verifyingServer
                  ? 'Activating License...'
                  : loadingPaystack
                  ? 'Opening Paystack...'
                  : selectedCurrency === 'GHS'
                  ? 'Pay GH₵ 90.00 (1-Year License)'
                  : `Pay GH₵ 90 (≈ ${convertedDisplay.formattedValue})`}
              </span>
              <ArrowRight size={16} />
            </button>

            <button
              type="button"
              {...safeTap(() => setShowroomOpen(true))}
              className="sm:col-span-5 w-full min-h-[54px] py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-emerald-500/30 border-2 border-amber-400/60 text-amber-200 font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.3)] transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
            >
              <Eye size={17} className="text-amber-300" />
              <span>👁️ View Affiliate Hub</span>
            </button>
          </div>

          {/* Inline "Already Paid for Pillar 2? Log In →" Section */}
          <div className="pt-2 border-t border-white/10">
            {!showInlineLogin ? (
              <button
                type="button"
                {...safeTap(() => {
                  setError('');
                  setShowInlineLogin(true);
                })}
                className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-zinc-200 hover:text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
              >
                <LogIn size={16} className="text-emerald-400" />
                <span>Already Paid for Pillar 2? Log In →</span>
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-black/60 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                    VERIFY PAID PILLAR 2 AFFILIATE ACCOUNT
                  </span>
                  <button
                    type="button"
                    {...safeTap(() => setShowInlineLogin(false))}
                    className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-[11px] text-white font-bold cursor-pointer"
                  >
                    ← Back to GH₵ 90 Affiliate Pass
                  </button>
                </div>

                <form onSubmit={handleInlineLoginCheck} className="space-y-3">
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Your registered Gmail / Email"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-400"
                  />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Your account password"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-400"
                  />

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full min-h-[46px] py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-60"
                  >
                    {loginLoading ? 'Verifying Pillar 2 License in Supabase...' : 'VERIFY & ENTER PILLAR 2 HUB →'}
                  </button>
                </form>

                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">OR</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <button
                  type="button"
                  disabled={loginLoading}
                  onClick={() => void handleGoogleVerify()}
                  data-testid="pillar2-google-verify-btn"
                  className="w-full min-h-[46px] py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-100 text-black font-extrabold text-xs sm:text-sm transition flex items-center justify-center gap-2.5 cursor-pointer touch-manipulation shadow-lg disabled:opacity-60"
                >
                  <GoogleLogoSvg className="w-5 h-5 shrink-0" />
                  <span>Continue with Google</span>
                </button>

                <PaystackReferenceRecovery
                  pillar={2}
                  onRecovered={(result) => {
                    setDeniedAudit(null);
                    setError('');
                    onPassVerified({
                      paid: true,
                      reference: result.reference,
                      email: result.email || loginEmail || email,
                      paidAt: new Date().toISOString(),
                      expiresAt:
                        result.entitlements?.pillar2_expires_at ||
                        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                      amountGhs: result.amountGhs || PILLAR2_LICENSE_AMOUNT_GHS,
                    });
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500 pt-1">
            <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
            <span>Secured by Paystack • 100% Isolated Pillar 2 License Verification</span>
          </div>
        </motion.div>
      </div>

      {/* 160+ Worldwide Currency Picker Modal (Base: GH₵ 90.00) */}
      <WorldwideCurrencyPicker
        isOpen={currencyModalOpen}
        selectedCode={selectedCurrency}
        liveRates={liveRates}
        baseAmountGhs={PILLAR2_LICENSE_AMOUNT_GHS}
        onSelect={(code) => setSelectedCurrency(code)}
        onClose={() => setCurrencyModalOpen(false)}
      />

      {/* Dedicated Pillar 2 Luxury Curiosity Showroom Modal */}
      <Pillar2LuxuryShowroomModal
        isOpen={showroomOpen}
        onClose={() => setShowroomOpen(false)}
        onRegisterNow={(featureName) => {
          setShowroomOpen(false);
          setInterceptBanner(featureName || 'Full Affiliate Hub Access');
          setTimeout(() => {
            emailInputRef.current?.focus();
          }, 150);
        }}
      />
    </>
  );
}
