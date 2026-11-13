'use client';

import React from 'react';
import { AlertTriangle, LogOut } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import {
  EntitlementRow,
  PillarId,
  getScorecard,
  purgeLegacyAccessFlags,
} from '../../utils/pillarAccess';

export async function signOutToSwitchAccount() {
  try {
    // Use local scope so switching accounts clears this browser's session immediately
    // without blocking on a network call or invalidating other devices.
    await supabase.auth.signOut({ scope: 'local' });
  } catch (_) {}
  purgeLegacyAccessFlags();
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
  /** Defaults to a full sign-out; pass a custom handler if the page needs extra cleanup. */
  onSwitchAccount?: () => void | Promise<void>;
}

/** PHASE 5 - Forensic 3-Pillar Payment Receipt Scorecard shown on the gate when an account is bounced. */
export default function PillarAuditBanner({ pillar, email, entitlements, onSwitchAccount }: Props) {
  const card = getScorecard(entitlements);

  return (
    <div
      role="alert"
      data-testid={`pillar-audit-banner-${pillar}`}
      className="mb-5 rounded-2xl border-2 border-red-500 bg-red-950/90 p-4 text-red-50 shadow-[0_0_35px_rgba(239,68,68,0.45)]"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-400" />
        <h3 className="text-xs font-black uppercase leading-snug tracking-wide sm:text-sm">
          🚫 ACCESS DENIED TO PILLAR {pillar} — UNPAID ACCOUNT DETECTED
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

      <p className="mt-3 text-xs font-semibold leading-relaxed text-red-100 sm:text-sm">
        <span className="font-black text-white">Verdict:</span> Each pillar requires its own separate payment. Your
        account has NOT paid for Pillar {pillar} yet. Complete your payment below to unlock Pillar {pillar}{' '}
        immediately.
      </p>

      <button
        type="button"
        onClick={() => void (onSwitchAccount ? onSwitchAccount() : signOutToSwitchAccount())}
        className="mt-3.5 inline-flex min-h-[44px] cursor-pointer touch-manipulation items-center gap-2 rounded-xl border border-red-400/60 bg-black/50 px-4 py-2 text-xs font-extrabold text-red-100 transition hover:bg-black/70"
      >
        <LogOut size={14} />
        Switch Account / Sign Out
      </button>
    </div>
  );
}
