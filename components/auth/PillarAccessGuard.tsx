'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../utils/supabase';
import {
  EntitlementRow,
  PillarId,
  getScorecard,
  PillarScorecard,
  verifyPillarStatusFromServer,
} from '../../utils/pillarAccess';

export interface PillarGuardPaywallContext {
  user: any | null;
  entitlements: EntitlementRow | null;
  scorecard: PillarScorecard;
  /** Re-run the live Supabase audit right now (call after a payment / login completes). */
  recheck: () => Promise<void>;
}

interface Props {
  pillar: PillarId;
  children: React.ReactNode;
  /** Rendered (full screen) whenever the live DB row does not grant this pillar. */
  renderPaywall: (ctx: PillarGuardPaywallContext) => React.ReactNode;
  intervalMs?: number;
}

type Status = 'verifying' | 'granted' | 'denied' | 'error';

const MAX_SILENT_FAILURES = 3;

/**
 * PHASE 4 - hard component-level bouncer. The main view of a pillar is NEVER rendered until the
 * signed-in user's fresh public.profiles row proves they paid for THIS pillar, and is re-checked
 * every 15s and on window focus so an unpaid / expired session can never linger inside.
 */
export default function PillarAccessGuard({ pillar, children, renderPaywall, intervalMs = 15000 }: Props) {
  const [status, setStatus] = useState<Status>('verifying');
  const [user, setUser] = useState<any | null>(null);
  const [entitlements, setEntitlements] = useState<EntitlementRow | null>(null);

  const statusRef = useRef<Status>('verifying');
  const failuresRef = useRef(0);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(true);

  const commit = useCallback((next: Status) => {
    statusRef.current = next;
    if (mountedRef.current) setStatus(next);
  }, []);

  const verify = useCallback((): Promise<void> => {
    if (inFlightRef.current) return inFlightRef.current;
    const run = (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data?.session?.user ?? null;
        if (!sessionUser) {
          if (!mountedRef.current) return;
          setUser(null);
          setEntitlements(null);
          failuresRef.current = 0;
          commit('denied');
          return;
        }
        const verified = await verifyPillarStatusFromServer(
          sessionUser.id,
          pillar,
          sessionUser.email || ''
        );
        if (!mountedRef.current) return;
        failuresRef.current = 0;
        setUser(sessionUser);
        setEntitlements(verified.entitlementRow);
        commit(verified.allowed ? 'granted' : 'denied');
      } catch (err) {
        failuresRef.current += 1;
        // A brief network blip must not eject a paying member, but never-verified or repeated
        // failures lock the view (fail closed).
        if (statusRef.current === 'granted' && failuresRef.current < MAX_SILENT_FAILURES) return;
        commit('error');
      } finally {
        inFlightRef.current = null;
      }
    })();
    inFlightRef.current = run;
    return run;
  }, [pillar, commit]);

  useEffect(() => {
    mountedRef.current = true;
    void verify();

    const timer = window.setInterval(() => void verify(), intervalMs);
    const onFocus = () => void verify();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void verify();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      // Any sign-in / sign-out / token refresh: drop trust and re-audit immediately.
      if (statusRef.current !== 'granted') commit('verifying');
      void verify();
    });

    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      listener?.subscription?.unsubscribe();
    };
  }, [verify, intervalMs, commit]);

  if (status === 'granted') return <>{children}</>;

  if (status === 'denied') {
    return <>{renderPaywall({ user, entitlements, scorecard: getScorecard(entitlements), recheck: verify })}</>;
  }

  return (
    <div
      data-testid={`pillar-guard-shield-${pillar}`}
      className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-[#030303] px-6 text-center"
    >
      <div className="h-14 w-14 animate-spin rounded-full border-4 border-amber-500/20 border-t-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.4)]" />
      <p className="mt-6 font-mono text-xs font-bold uppercase tracking-widest text-amber-300">
        {status === 'error'
          ? `⚠️ Could not verify Pillar ${pillar} license — access stays locked`
          : `🔐 Verifying Pillar ${pillar} License in Supabase...`}
      </p>
      {status === 'error' && (
        <button
          type="button"
          onClick={() => {
            commit('verifying');
            void verify();
          }}
          className="mt-5 min-h-[44px] cursor-pointer rounded-xl border border-amber-400/50 bg-amber-500/10 px-5 py-2 text-xs font-extrabold text-amber-200 hover:bg-amber-500/20"
        >
          Retry verification
        </button>
      )}
    </div>
  );
}
