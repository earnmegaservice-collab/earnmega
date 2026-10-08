export type CurrencyCode = 'GHS' | 'NGN' | 'USD' | 'EUR' | 'GBP' | 'KES';

export type CurrencyRate = {
  code: CurrencyCode;
  symbol: string;
  rateToGhs: number;
};

export type SubscriptionTier = 'BASE' | 'PRO' | 'PREMIUM';

export type UserWalletState = {
  balance: number;
  currency: CurrencyCode;
  tier: SubscriptionTier;
  subscriptionActiveUntil?: Date;
};
