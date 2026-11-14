'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  LogOut,
  ShieldAlert,
  ChevronDown,
  Smartphone,
  UserCheck,
} from 'lucide-react';
import { supabase } from '../../utils/supabase';
import {
  EntitlementRow,
  PillarId,
  SavedPhoneAccount,
  getBounceBackWarningMessage,
  getPhoneWelcomeHeaderMessage,
  getSavedPhoneAccounts,
  getScorecard,
  purgeLegacyAccessFlags,
} from '../../utils/pillarAccess';

export async function signOutToSwitchAccount() {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {}
  purgeLegacyAccessFlags();
}

/**
 * PHASE 5.1: Official 4-Color Google "G" Vector SVG Logo
 */
export function GoogleLogoSvg({ className = 'w-5 h-5 shrink-0' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
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
  );
}

/**
 * PHASE 3.2: High-Contrast Pulsing Red Bounce-Back Warning Banner
 */
export function BounceBackWarningBanner({
  pillar,
  email,
  customMessage,
  onDismiss,
}: {
  pillar: PillarId;
  email: string;
  customMessage?: string | null;
  onDismiss?: () => void;
}) {
  const message = customMessage || getBounceBackWarningMessage(pillar, email);

  return (
    <div
      role="alert"
      data-testid={`bounce-back-warning-${pillar}`}
      className="mb-4 rounded-2xl border-2 border-red-500 bg-gradient-to-r from-red-950/95 via-red-900/90 to-red-950/95 p-4 text-left shadow-[0_0_35px_rgba(239,68,68,0.5)] animate-pulse"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/25 border border-red-400/50 flex items-center justify-center shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5 text-red-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black uppercase tracking-widest">
              BOUNCE-BACK SECURITY GATE
            </span>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="text-[11px] font-bold text-red-200/80 hover:text-white underline"
              >
                Dismiss
              </button>
            )}
          </div>
          <p className="mt-2 text-xs sm:text-sm font-black text-white leading-relaxed">{message}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * PHASE 4.2 & PHASE 6.2 & PHASE 6.3:
 * Active Phone Session Pill + Multi-Account Switcher Drawer + Smart Welcome Header
 */
export function PhoneSessionHeaderBar({
  targetPillar,
  activeEmail,
  entitlements,
  onSwitchAccount,
  onSelectSavedAccount,
}: {
  targetPillar: PillarId;
  activeEmail?: string | null;
  entitlements?: EntitlementRow | null;
  onSwitchAccount: () => void | Promise<void>;
  onSelectSavedAccount?: (email: string) => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const cleanEmail = (activeEmail || '').trim();
  const savedAccounts: SavedPhoneAccount[] =
    typeof window !== 'undefined' ? getSavedPhoneAccounts() : [];

  if (!cleanEmail) return null;

  const card = getScorecard(entitlements);
  const unlocked = {
    pillar1Paid: card.pillar1,
    pillar2Paid: card.pillar2,
    pillar3Paid: card.pillar3,
  };

  const welcomeMessage = getPhoneWelcomeHeaderMessage(targetPillar, cleanEmail, unlocked);

  return (
    <div className="mb-4 space-y-2.5 text-left">
      {/* Saved Multi-Account Switcher Pill (Phase 6.3) */}
      <div className="rounded-2xl border border-emerald-500/30 bg-[#071525]/95 p-3 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                Signed in on this phone: {cleanEmail}
              </p>
              <p className="text-[11px] font-semibold text-slate-300 truncate">
                1-Tap Upgrade Checkout Active • Bound to {cleanEmail}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDrawerOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] font-black text-white transition cursor-pointer"
          >
            <span>🔄 Switch / Manage Account</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${drawerOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {drawerOpen && (
          <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Saved Phone Accounts ({savedAccounts.length || 1})
            </p>
            <div className="space-y-1.5">
              {savedAccounts.map((acc) => {
                const isCurrent = acc.email.toLowerCase() === cleanEmail.toLowerCase();
                return (
                  <div
                    key={acc.email}
                    className={`flex items-center justify-between gap-2 p-2 rounded-xl border text-xs ${
                      isCurrent
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                        : 'bg-black/40 border-white/10 text-slate-300'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-bold truncate flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{acc.email}</span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase">
                            Active
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                        <span className={acc.pillar1Paid ? 'text-emerald-300 font-bold' : ''}>
                          P1: {acc.pillar1Paid ? '✅' : '🔒'}
                        </span>
                        <span className={acc.pillar2Paid ? 'text-amber-300 font-bold' : ''}>
                          P2: {acc.pillar2Paid ? '✅' : '🔒'}
                        </span>
                        <span className={acc.pillar3Paid ? 'text-cyan-300 font-bold' : ''}>
                          P3: {acc.pillar3Paid ? '✅' : '🔒'}
                        </span>
                      </div>
                    </div>
                    {!isCurrent && onSelectSavedAccount && (
                      <button
                        type="button"
                        onClick={() => {
                          setDrawerOpen(false);
                          onSelectSavedAccount(acc.email);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-[10px] font-black uppercase shrink-0 cursor-pointer"
                      >
                        Use Account
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  void onSwitchAccount();
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-200 text-xs font-black transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out / Switch to Another Account</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Smart Returning Phone Welcome Header (Phase 4.2) */}
      {welcomeMessage && (
        <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-cyan-500/15 p-3.5 shadow-md">
          <p className="text-xs sm:text-sm font-bold text-amber-100 leading-relaxed">
            {welcomeMessage}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
              ⚡ Paying below attaches Pillar {targetPillar} directly to {cleanEmail}
            </span>
            <button
              type="button"
              onClick={() => void onSwitchAccount()}
              className="text-[11px] font-black text-amber-300 hover:text-white underline cursor-pointer"
            >
              Switch Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const ROWS: Array<{ key: 'pillar1' | 'pillar2' | 'pillar3'; label: string }> = [
  { key: 'pillar1', label: 'Pillar 1 (Global Chat - GH₵ 50)' },
  { key: 'pillar2', label: 'Pillar 2 (Affiliate Hub - GH₵ 90)' },
  { key: 'pillar3', label: 'Pillar 3 (AI Studio - GH₵ 50/100/200)' },
];

interface Props {
  pillar: PillarId;
  email: string;
  entitlements: EntitlementRow | null | undefined;
  isBounceBack?: boolean;
  onSwitchAccount?: () => void | Promise<void>;
}

/**
 * PHASE 3.2 & PHASE 5: High-contrast pulsing red Bounce-Back Warning Banner + Forensic 3-Pillar Receipt Scorecard
 */
export default function PillarAuditBanner({
  pillar,
  email,
  entitlements,
  isBounceBack = true,
  onSwitchAccount,
}: Props) {
  const card = getScorecard(entitlements);
  const bounceMsg = getBounceBackWarningMessage(pillar, email || 'your account');

  return (
    <div className="mb-5 space-y-3 text-left">
      {isBounceBack && <BounceBackWarningBanner pillar={pillar} email={email} customMessage={bounceMsg} />}

      <div
        role="alert"
        data-testid={`pillar-audit-banner-${pillar}`}
        className="rounded-2xl border-2 border-red-500 bg-red-950/90 p-4 text-red-50 shadow-[0_0_35px_rgba(239,68,68,0.45)]"
      >
        <div className="flex items-start gap-2.5">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-400" />
          <h3 className="text-xs font-black uppercase leading-snug tracking-wide sm:text-sm">
            {bounceMsg}
          </h3>
        </div>

        <dl className="mt-3 space-y-1.5 text-xs sm:text-sm">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <dt className="font-bold text-red-200">Account Verified:</dt>
            <dd className="break-all font-mono text-white">{email || 'unknown account'}</dd>
          </div>
          {ROWS.map((r) => (
            <div key={r.key} className="flex flex-wrap items-baseline gap-x-2">
              <dt className="font-bold text-red-200">{r.label}:</dt>
              <dd className={`font-black ${card[r.key] ? 'text-emerald-300' : 'text-red-300'}`}>
                {card[r.key] ? '✅ PAID' : '❌ UNPAID'}
              </dd>
            </div>
          ))}
        </dl>

        <button
          type="button"
          onClick={() => void (onSwitchAccount ? onSwitchAccount() : signOutToSwitchAccount())}
          className="mt-3.5 inline-flex min-h-[44px] cursor-pointer touch-manipulation items-center gap-2 rounded-xl border border-red-400/60 bg-black/50 px-4 py-2 text-xs font-extrabold text-red-100 transition hover:bg-black/70"
        >
          <LogOut size={14} />
          🔄 Switch / Manage Account
        </button>
      </div>
    </div>
  );
}
