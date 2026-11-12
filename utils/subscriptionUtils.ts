export type EffectiveTier = 'free' | 'pro' | 'premium';

export interface SubscriptionProfileLike {
  subscription_tier?: string | null;
  tier?: string | null;
  is_pro?: boolean | null;
  is_premium?: boolean | null;
  subscription_expires_at?: string | null;
}

/**
 * Evaluates the user's effective active subscription tier while respecting expiry timestamps.
 */
export function getEffectiveNormalizedTier(
  record?: SubscriptionProfileLike | null
): EffectiveTier {
  if (!record) return 'free';

  if (record.subscription_expires_at) {
    const expMs = new Date(record.subscription_expires_at).getTime();
    if (!Number.isNaN(expMs) && expMs <= Date.now()) {
      return 'free';
    }
  }

  const rawTier = String(record.subscription_tier || record.tier || '').trim().toLowerCase();
  if (rawTier === 'premium' || rawTier === 'vip' || record.is_premium === true) {
    return 'premium';
  }
  if (rawTier === 'pro' || record.is_pro === true) {
    return 'pro';
  }
  return 'free';
}

/**
 * Returns true only when the user holds an active, non-expired Pro or Premium plan.
 */
export function hasActiveProOrPremium(record?: SubscriptionProfileLike | null): boolean {
  const effectiveTier = getEffectiveNormalizedTier(record);
  return effectiveTier === 'pro' || effectiveTier === 'premium';
}
