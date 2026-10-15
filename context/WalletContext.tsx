'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';

type SubscriptionTier = 'FREE' | 'PRO' | 'PREMIUM';

interface WalletState {
  coins: number;
  subscription_tier: SubscriptionTier;
  currency: string;
}

interface WalletContextType {
  coins: number;
  subscription_tier: SubscriptionTier;
  currency: string;
  setCoins: React.Dispatch<React.SetStateAction<number>>;
  setSubscription_tier: React.Dispatch<React.SetStateAction<SubscriptionTier>>;
  setCurrency: React.Dispatch<React.SetStateAction<string>>;
  refreshWallet: () => Promise<void>;
}

const defaultState: WalletState = {
  coins: 0,
  subscription_tier: 'FREE',
  currency: 'USD'
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [coins, setCoins] = useState<number>(defaultState.coins);
  const [subscription_tier, setSubscription_tier] = useState<SubscriptionTier>(defaultState.subscription_tier);
  const [currency, setCurrency] = useState<string>(defaultState.currency);
  const { user } = useAuth();

  const refreshWallet = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('coins, subscription_tier')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        if (data.coins !== undefined) setCoins(data.coins);
        if (data.subscription_tier) setSubscription_tier(data.subscription_tier);
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    }
  };

  useEffect(() => {
    refreshWallet();
  }, [user]);

  return (
    <WalletContext.Provider value={{ coins, subscription_tier, currency, setCoins, setSubscription_tier, setCurrency, refreshWallet }}>
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
