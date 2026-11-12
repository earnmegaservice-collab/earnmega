'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';

export interface SubscriptionTimerState {
  tier: 'free' | 'pro' | 'premium';
  isActive: boolean;
  expiresAt: string | null;
  formattedRemaining: string;
  remainingSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  hasExpiredNotice: boolean;
  dismissNotice: () => void;
}

export function useSubscriptionTimer(userId?: string | null): SubscriptionTimerState {
  const [tier, setTier] = useState<'free' | 'pro' | 'premium'>('free');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [hasExpiredNotice, setHasExpiredNotice] = useState(false);

  // Fetch initial subscription state
  const checkStatus = useCallback(async () => {
    if (!userId) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_expires_at, is_pro, is_premium')
        .eq('id', userId)
        .maybeSingle();

      if (!profile) return;

      const rawTier = String(profile.subscription_tier || '').toLowerCase();
      const currentTier = (rawTier === 'premium' || profile.is_premium)
        ? 'premium'
        : (rawTier === 'pro' || profile.is_pro)
        ? 'pro'
        : 'free';

      setTier(currentTier as 'free' | 'pro' | 'premium');
      setExpiresAt(profile.subscription_expires_at || null);

      if (profile.subscription_expires_at && currentTier !== 'free') {
        const expMs = new Date(profile.subscription_expires_at).getTime();
        const diffSec = Math.max(0, Math.floor((expMs - Date.now()) / 1000));
        setRemainingSeconds(diffSec);

        // If already passed, trigger server downgrade check
        if (diffSec <= 0) {
          triggerServerDowngrade(userId);
        }
      } else {
        setRemainingSeconds(0);
      }
    } catch (err) {
      console.error('Error checking subscription status:', err);
    }
  }, [userId]);

  const triggerServerDowngrade = async (uid: string) => {
    try {
      const res = await fetch('/api/pillar1/subscription-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid }),
      });
      const data = await res.json();
      if (data.downgraded) {
        setTier('free');
        setRemainingSeconds(0);
        setHasExpiredNotice(true);
      }
    } catch (e) {
      console.error('Failed to trigger server downgrade:', e);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Tick every second
  useEffect(() => {
    if (tier === 'free' || !expiresAt) return;

    const interval = setInterval(() => {
      const expMs = new Date(expiresAt).getTime();
      const diffSec = Math.floor((expMs - Date.now()) / 1000);

      if (diffSec <= 0) {
        clearInterval(interval);
        setRemainingSeconds(0);
        if (userId) {
          triggerServerDowngrade(userId);
        } else {
          setTier('free');
          setHasExpiredNotice(true);
        }
      } else {
        setRemainingSeconds(diffSec);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [tier, expiresAt, userId]);

  const days = Math.floor(remainingSeconds / 86400);
  const hours = Math.floor((remainingSeconds % 86400) / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  const formattedRemaining =
    remainingSeconds > 0
      ? `${days}d ${hours.toString().padStart(2, '0')}h ${minutes
          .toString()
          .padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s remaining`
      : '0d 00h 00m 00s remaining';

  return {
    tier,
    isActive: tier !== 'free' && remainingSeconds > 0,
    expiresAt,
    formattedRemaining,
    remainingSeconds,
    days,
    hours,
    minutes,
    seconds,
    hasExpiredNotice,
    dismissNotice: () => setHasExpiredNotice(false),
  };
}
