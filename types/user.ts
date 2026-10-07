export type SubscriptionTier = 'FREE' | 'PRO' | 'PREMIUM';
export type BillingCycle = 'MONTHLY' | 'YEARLY';

export interface CurrencyPreference {
  code: string;
  symbol: string;
}

export interface UserSubscription {
  tier: SubscriptionTier;
  cycle: BillingCycle;
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  currency: CurrencyPreference;
  subscription: UserSubscription;
  createdAt: Date;
  updatedAt: Date;
}
