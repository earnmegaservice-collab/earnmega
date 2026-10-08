'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CurrencyCode, SubscriptionTier, UserWalletState } from '../types/user';

type WalletContextType = UserWalletState & {
  addBalance: (amount: number) => void;
  setCurrency: (currency: CurrencyCode) => void;
  setTier: (tier: SubscriptionTier) => void;
};

const defaultState: WalletContextType = {
  balance: 0,
  currency: 'GHS',
  tier: 'BASE',
  addBalance: () => {},
  setCurrency: () => {},
  setTier: () => {},
};

const WalletContext = createContext<WalletContextType>(defaultState);

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState<CurrencyCode>('GHS');
  const [tier, setTier] = useState<SubscriptionTier>('BASE');

  const addBalance = (amount: number) => setBalance(prev => prev + amount);

  return (
    <WalletContext.Provider value={{ balance, currency, tier, addBalance, setCurrency, setTier }}>
      {children}
    </WalletContext.Provider>
  );
};
