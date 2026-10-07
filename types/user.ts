export type CurrencyCode = 'NGN' | 'USD' | 'EUR' | 'GBP';

export type CurrencyRate = {
  code: CurrencyCode;
  symbol: string;
  rateToNgn: number;
};

export type SubscriptionTier = 'FREE' | 'PRO' | 'PREMIUM';

export type UserWalletState = {
  balance: number;
  currency: CurrencyCode;
  tier: SubscriptionTier;
  subscriptionActiveUntil?: Date;
};
