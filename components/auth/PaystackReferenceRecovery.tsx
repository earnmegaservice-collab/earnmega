'use client';

import React, { useState } from 'react';
import { Receipt, ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { PillarId, EntitlementRow } from '../../utils/pillarAccess';
import { authFetch } from '../../utils/authFetch';
import { supabase } from '../../utils/supabase';

export interface ReferenceRecoveryResult {
  success: boolean;
  pillar: PillarId;
  reference: string;
  email: string;
  amountGhs: number;
  planTier?: string | null;
  durationDays?: number | null;
  bound: boolean;
  entitlements: EntitlementRow | null;
}

interface Props {
  pillar: PillarId;
  /** Invoked once the live Paystack reference is verified and bound to the signed-in account. */
  onRecovered: (result: ReferenceRecoveryResult) => void | Promise<void>;
  className?: string;
}

/**
 * PHASE 6 - Collapsible "Paid via Paystack but account still locked? Enter Paystack Reference".
 * Verifies the reference live against /api/paystack/verify-reference (confirming amount & pillar metadata)
 * and binds the pass strictly to the currently authenticated user for that single pillar.
 */
export default function PaystackReferenceRecovery({ pillar, onRecovered, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanRef = reference.trim();
    if (!cleanRef) {
      setErrorMsg('Please enter your Paystack payment reference.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: sessData } = await supabase.auth.getSession();
      if (!sessData?.session?.access_token) {
        setErrorMsg('Please sign in with your Email or Google account above first, then enter your Paystack Reference.');
        return;
      }

      const res = await authFetch('/api/paystack/verify-reference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pillar, reference: cleanRef }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) {
        setErrorMsg(
          payload?.error ||
            'Could not verify this Paystack reference for this pillar. Please check the reference code and try again.'
        );
        return;
      }

      setSuccessMsg(`Verified receipt ${payload.reference} for Pillar ${pillar}. Unlocking...`);
      await onRecovered(payload as ReferenceRecoveryResult);
    } catch {
      setErrorMsg('Network error while verifying with Paystack. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`mt-3 rounded-xl border border-white/10 bg-black/30 p-3 ${className}`}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setErrorMsg('');
          setSuccessMsg('');
        }}
        data-testid={`paystack-recovery-toggle-${pillar}`}
        className="flex min-h-[40px] w-full cursor-pointer touch-manipulation items-center justify-between gap-2 text-left text-xs font-bold text-amber-300 transition hover:text-amber-200"
      >
        <span className="flex items-center gap-2">
          <Receipt size={14} className="shrink-0" />
          Paid via Paystack but account still locked? Enter Paystack Reference
        </span>
        {open ? <ChevronUp size={15} className="shrink-0" /> : <ChevronDown size={15} className="shrink-0" />}
      </button>

      {open && (
        <form onSubmit={handleVerify} className="mt-3 space-y-2.5 border-t border-white/10 pt-3">
          <p className="text-[11px] leading-relaxed text-zinc-400">
            Make sure you are signed in with your account above, then paste your Paystack reference receipt for{' '}
            <strong className="text-white">Pillar {pillar}</strong> below.
          </p>

          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. T123456789012345"
            disabled={submitting}
            className="w-full rounded-xl border border-white/15 bg-black/60 px-3.5 py-2.5 text-sm font-mono text-white placeholder-zinc-500 outline-none focus:border-amber-400"
          />

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-950/60 p-2.5 text-xs font-semibold text-red-200">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/60 p-2.5 text-xs font-semibold text-emerald-200">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !reference.trim()}
            className="flex min-h-[44px] w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Verifying Receipt with Paystack...
              </>
            ) : (
              <>Verify &amp; Unlock Pillar {pillar}</>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
