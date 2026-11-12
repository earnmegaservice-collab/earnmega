'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';

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
  refreshWallet: () => Promise<void>;
}

const defaultState: WalletState = {
  balance: 0,
  subscriptionTier: 'FREE',
  currency: 'GHS'
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState<number>(defaultState.balance);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>(defaultState.subscriptionTier);
  const [currency, setCurrency] = useState<string>(defaultState.currency);
  const { user } = useAuth();

  const refreshWallet = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('coins, coin_balance, subscription_tier')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        const verifiedCoins =
          typeof data.coins === 'number' && data.coins > 0
            ? data.coins
            : typeof data.coin_balance === 'number' && data.coin_balance > 0
            ? data.coin_balance
            : typeof data.coins === 'number'
            ? data.coins
            : 0;
        setBalance(verifiedCoins);
        if (data.subscription_tier) setSubscriptionTier(data.subscription_tier);
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    }
  };

  useEffect(() => {
    refreshWallet();

    if (!user) return;
    const channel = supabase.channel(`wallet_updates_${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, () => {
         refreshWallet();
      })
      .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <WalletContext.Provider value={{ balance, subscriptionTier, currency, setBalance, setSubscriptionTier, setCurrency, refreshWallet }}>
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
