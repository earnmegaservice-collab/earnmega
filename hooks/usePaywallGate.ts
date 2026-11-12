'use client';

import { useWallet, SpendCoinsOptions, OpenCoinStoreOptions, NormalizedTier } from '../context/WalletContext';

export type { SpendCoinsOptions, OpenCoinStoreOptions, NormalizedTier };

export function usePaywallGate() {
  const {
    balance,
    subscriptionTier,
    tier,
    isPro,
    isPremium,
    spendCoinsOrPromptStore,
    openCoinStore,
    closeCoinStore,
    refreshWallet,
    triggerToast,
  } = useWallet();

  return {
    userCoins: balance,
    balance,
    tier,
    subscriptionTier,
    isPro,
    isPremium,
    spendCoinsOrPromptStore,
    openCoinStore,
    closeCoinStore,
    refreshWallet,
    triggerToast,
  };
}
