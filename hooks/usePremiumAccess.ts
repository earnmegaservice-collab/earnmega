import { useState } from 'react';
import { useWallet } from '../context/WalletContext';

export function usePremiumAccess() {
  const { subscriptionTier } = useWallet();
  const [isInterceptorOpen, setIsInterceptorOpen] = useState(false);
  const [interceptorCost, setInterceptorCost] = useState(0);
  const [interceptorAction, setInterceptorAction] = useState<(() => Promise<void>) | null>(null);

  const checkPremiumAccess = (cost: number, action: () => Promise<void>) => {
    if (subscriptionTier?.toUpperCase() === 'PRO' || subscriptionTier?.toUpperCase() === 'PREMIUM') {
      action();
    } else {
      setInterceptorCost(cost);
      setInterceptorAction(() => action);
      setIsInterceptorOpen(true);
    }
  };

  return {
    isInterceptorOpen,
    setIsInterceptorOpen,
    interceptorCost,
    interceptorAction,
    checkPremiumAccess,
  };
}
