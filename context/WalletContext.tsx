'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type SubscriptionTier = 'FREE' | 'PRO' | 'PREMIUM';

interface WalletState {
  balance: number;
  subscriptionTier: SubscriptionTier;
  currency: string;
}

interface WalletContextType {
  balance: number;
  subscriptionTier: SubscriptionTier;
  currency: string;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  setSubscriptionTier: React.Dispatch<React.SetStateAction<SubscriptionTier>>;
  setCurrency: React.Dispatch<React.SetStateAction<string>>;
}

const defaultState: WalletState = {
  balance: 0,
  subscriptionTier: 'FREE',
  currency: 'USD'
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState<number>(defaultState.balance);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>(defaultState.subscriptionTier);
  const [currency, setCurrency] = useState<string>(defaultState.currency);

  return (
    <WalletContext.Provider value={{ balance, subscriptionTier, currency, setBalance, setSubscriptionTier, setCurrency }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
