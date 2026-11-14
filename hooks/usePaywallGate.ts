'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { useWallet } from '@/context/WalletContext';
import {
  PillarAuditResult,
  PillarEntitlementState,
  PillarId,
  auditPillarEntry,
  fetchLivePillarEntitlements,
  purgeLegacyAccessFlags,
} from '@/utils/pillarAccess';

export function usePaywallGate(targetPillar: PillarId = 1) {
  const wallet = useWallet();
  const [liveEntitlements, setLiveEntitlements] = useState<PillarEntitlementState | null>(null);
  const [auditResult, setAuditResult] = useState<PillarAuditResult | null>(null);
  const [auditing, setAuditing] = useState(false);

  useEffect(() => {
    purgeLegacyAccessFlags();
  }, []);

  const refreshLiveSessionState = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        setLiveEntitlements(null);
        return null;
      }
      const state = await fetchLivePillarEntitlements(user.id, user.email || '');
      setLiveEntitlements(state);
      return state;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    refreshLiveSessionState();
  }, [refreshLiveSessionState]);

  /**
   * PHASE 3.2: Audits an authenticated user via `/api/auth/verify-pillar-status`.
   * If unpaid, triggers mobile haptic feedback (`navigator.vibrate?.([200, 100, 200])`)
   * and returns `allowed: false` with the loud red bounce-back warning without signing out their phone session.
   */
  const auditAccount = useCallback(
    async (userId: string, email = ''): Promise<PillarAuditResult> => {
      setAuditing(true);
      try {
        const result = await auditPillarEntry(userId, targetPillar, email);
        setAuditResult(result);
        setLiveEntitlements(result.state);
        if (!result.allowed && typeof window !== 'undefined' && typeof navigator !== 'undefined') {
          try {
            navigator.vibrate?.([200, 100, 200]);
          } catch {
            // Ignore vibration errors
          }
        }
        return result;
      } finally {
        setAuditing(false);
      }
    },
    [targetPillar]
  );

  const clearAudit = useCallback(() => {
    setAuditResult(null);
  }, []);

  return {
    ...wallet,
    liveEntitlements,
    auditResult,
    auditing,
    auditAccount,
    clearAudit,
    refreshLiveSessionState,
  };
}
