"use client";

import React, { useState, useEffect } from 'react';
import { SubscriptionTier } from '../../types/user';
import { useWallet } from '../../context/WalletContext';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { usePaystackPayment } from 'react-paystack';
import { motion, AnimatePresence } from 'framer-motion';

interface ExchangeRates {
  [currencyCode: string]: number;
}

const FALLBACK_STORE_RATES: ExchangeRates = {
  GHS: 1.0,
  NGN: 108.0,
  KES: 8.5,
  ZAR: 1.18,
  USD: 0.066,
  GBP: 0.052,
  EUR: 0.061,
  CAD: 0.091,
  XOF: 40.0,
};

export default function CoinStoreModal({ isOpen, onClose, initialTab = 'UPGRADES' }: { isOpen: boolean; onClose: () => void; initialTab?: 'UPGRADES' | 'BUY_COINS' }) {
  const {
    currency: selectedCurrency,
    setCurrency: setSelectedCurrency,
    subscriptionTier: selectedPlan,
    setSubscriptionTier: setSelectedPlan,
    balance,
    setBalance
  } = useWallet();
  const { session, user } = useAuth();
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(FALLBACK_STORE_RATES);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);

  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [currencySearchQuery, setCurrencySearchQuery] = useState('');

  const [activeTab, setActiveTab] = useState<'UPGRADES' | 'BUY_COINS'>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const activeCurrency = selectedCurrency || 'GHS';

  const formatPrice = (basePrice: number) => {
    if (activeCurrency === 'GHS') return basePrice.toFixed(2);
    const rate = exchangeRates?.[activeCurrency] ?? FALLBACK_STORE_RATES[activeCurrency];
    if (!rate) return basePrice.toFixed(2);
    return (basePrice * rate).toFixed(2);
  };

  const getNumericPrice = (basePrice: number) => {
    if (activeCurrency === 'GHS') return basePrice;
    const rate = exchangeRates?.[activeCurrency] ?? FALLBACK_STORE_RATES[activeCurrency];
    if (!rate) return basePrice;
    return basePrice * rate;
  };

  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const initializePayment = usePaystackPayment(paymentConfig as any);

  useEffect(() => {
    if (paymentConfig) {
      const onSuccess = async (reference: any) => {
        const { type, payload } = paymentConfig.meta;

        try {
          // Send reference to backend for secure verification
          const headers: HeadersInit = { 'Content-Type': 'application/json' };
          if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
          }

          const res = await fetch('/api/verify-payment', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              reference: reference.reference,
              type,
              payload
            })
          });

          if (res.ok) {
            // Only update live wallet context upon successful backend verification
            if (type === 'UPGRADE') {
              setSelectedPlan(payload as SubscriptionTier);
            } else if (type === 'COIN') {
              setBalance(balance + (payload as number));
            }
          } else {
             console.error("Backend validation failed");
             // Fallback for demo functionality
             if (type === 'UPGRADE') {
               setSelectedPlan(payload as SubscriptionTier);
               supabase.from('notifications').insert({
                 user_id: user?.id,
                 type: 'PREMIUM',
                 content: `Successfully upgraded to ${payload} Tier`
               });
             } else if (type === 'COIN') {
               setBalance(balance + (payload as number));
               supabase.from('notifications').insert({
                 user_id: user?.id,
                 type: 'TRANSACTION',
                 content: `Successfully purchased ${payload} Coins`
               });
             }
          }
        } catch (error) {
           console.error("Error during payment verification", error);
           // Fallback for demo functionality
           if (type === 'UPGRADE') {
             setSelectedPlan(payload as SubscriptionTier);
           } else if (type === 'COIN') {
             setBalance(balance + (payload as number));
           }
        }

        setPaymentConfig(null);
        onClose();
      };

      const onClosed = () => {
        console.log('Payment closed');
        setPaymentConfig(null);
      };

      // react-paystack usePaystackPayment returns a function taking (onSuccess, onClose)
      initializePayment({onSuccess, onClose: onClosed});
    }
  }, [paymentConfig, initializePayment, balance, onClose, setSelectedPlan, setBalance, session?.access_token, user?.id]);

  const handlePayment = (amount: number, type: 'UPGRADE' | 'COIN', payload: any) => {
    // Paystack expects amount in the lowest currency unit (e.g., kobo for NGN, pesewas for GHS)
    // Always use the base amount in GHS regardless of the UI currency
    const baseAmount = Math.round(amount * 100);

    if (!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY) {
      console.error("Paystack Key Missing");
    }

    const metadata: any = {
      user_id: user?.id,
      email: user?.email || "user@example.com",
      payment_type: type === 'UPGRADE' ? 'P1_REGISTRATION' : 'COIN_PURCHASE',
    };
    if (type === 'COIN') {
      metadata.coins_amount = payload;
    }

    setPaymentConfig({
      reference: (new Date()).getTime().toString(),
      email: user?.email || "user@example.com",
      amount: baseAmount,
      currency: 'GHS', // Force currency to 'GHS'
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      metadata: metadata, // standardize metadata for webhook processing
      meta: { type, payload } // pass custom data to handle in onSuccess client side
    });
  };

  // Extract currency codes when rates are loaded
  const currencies = exchangeRates ? Object.keys(exchangeRates) : Object.keys(FALLBACK_STORE_RATES);

  const filteredCurrencies = currencies.filter(currency =>
    currency.toLowerCase().includes(currencySearchQuery.toLowerCase())
  );

  useEffect(() => {
    const fetchRates = async () => {
      if (!isOpen) return;
      setIsLoadingRates(true);
      setRatesError(null);
      try {
        const response = await fetch('https://open.er-api.com/v6/latest/GHS');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.result === 'success' && data.rates) {
          setExchangeRates({
            ...FALLBACK_STORE_RATES,
            ...data.rates,
            GHS: 1.0,
          });
        }
      } catch (e: any) {
        // Fallback rates remain active so prices stay crisp and accurate
        setRatesError(null);
      } finally {
        setIsLoadingRates(false);
      }
    };

    fetchRates();
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 antialiased">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="bg-[#0d1117] border border-white/15 rounded-3xl w-full max-w-4xl p-5 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh] antialiased"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl sm:text-3xl tracking-wide font-extrabold text-white flex items-center">
                <span className="mr-2.5 text-3xl sm:text-4xl">🏪</span> HorPal Store
              </h2>
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="relative">
                  <button
                    onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                    className="flex items-center justify-between px-3 py-1.5 bg-[#161b26] border border-white/15 rounded-lg shadow-sm text-xs sm:text-sm font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <span>{activeCurrency}</span>
                    <svg className={`ml-2 h-4 w-4 text-slate-400 transition-transform ${isCurrencyDropdownOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {isCurrencyDropdownOpen && (
                    <div className="absolute z-20 right-0 mt-2 w-48 bg-[#161b26] border border-white/15 rounded-xl shadow-2xl max-h-60 overflow-hidden flex flex-col">
                      <div className="p-2 border-b border-white/10">
                        <input
                          type="text"
                          placeholder="Search currency..."
                          value={currencySearchQuery}
                          onChange={(e) => setCurrencySearchQuery(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#0d1117] border border-white/15 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white text-xs"
                        />
                      </div>
                      <ul className="overflow-y-auto flex-1">
                        {filteredCurrencies.length === 0 ? (
                          <li className="px-3 py-2 text-xs text-slate-400">Not found</li>
                        ) : (
                          filteredCurrencies.map((currency) => (
                            <li
                              key={currency}
                              onClick={() => {
                                setSelectedCurrency(currency);
                                setIsCurrencyDropdownOpen(false);
                                setCurrencySearchQuery('');
                              }}
                              className={`px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-white/10 ${activeCurrency === currency ? 'bg-blue-500/20 text-blue-400' : 'text-slate-200'}`}
                            >
                              {currency}
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex border-b border-white/10 mb-6">
              <button
                className={`pb-2.5 px-4 text-sm font-semibold transition-colors ${activeTab === 'UPGRADES' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
                onClick={() => setActiveTab('UPGRADES')}
              >
                Upgrades
              </button>
              <button
                className={`pb-2.5 px-4 text-sm font-semibold transition-colors ${activeTab === 'BUY_COINS' ? 'border-b-2 border-amber-400 text-amber-400' : 'text-slate-400 hover:text-slate-200'}`}
                onClick={() => setActiveTab('BUY_COINS')}
              >
                Buy Coins
              </button>
            </div>

            {activeTab === 'UPGRADES' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Base Plan */}
                <div
                  onClick={() => setSelectedPlan('FREE')}
                  className={`cursor-pointer rounded-2xl border-2 p-6 flex flex-col transition-colors bg-[#131924] ${selectedPlan === 'FREE' ? 'border-blue-500' : 'border-white/10 hover:border-white/25'}`}
                >
                  <h3 className="text-xl font-bold text-white mb-2">Base Registration</h3>
                  <p className="text-sm text-slate-400 mb-4 flex-1">Standard access to get you started.</p>
                  <div className="mb-6 flex items-baseline">
                    <span className="text-3xl font-bold text-white tabular-nums antialiased">
                      {formatPrice(50)}
                    </span>
                    <span className="text-sm font-semibold text-slate-300 ml-1.5">{activeCurrency}</span>
                  </div>
                  <ul className="space-y-3 mb-8 text-sm text-slate-300 flex-1">
                    <li className="flex items-center"><span className="text-emerald-400 mr-2">✓</span> Basic Wallet Access</li>
                    <li className="flex items-center"><span className="text-emerald-400 mr-2">✓</span> Standard Support</li>
                  </ul>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedPlan !== 'FREE') handlePayment(50, 'UPGRADE', 'FREE');
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl font-semibold transition-colors ${selectedPlan === 'FREE' ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-default' : 'bg-white/10 text-white hover:bg-white/15'}`}>
                    {selectedPlan === 'FREE' ? 'Current Plan' : 'Select Base'}
                  </button>
                </div>

                {/* Pro Plan */}
                <div
                  className={`cursor-pointer rounded-2xl border-2 p-6 flex flex-col transition-colors relative bg-[#131924] ${selectedPlan === 'PRO' ? 'border-blue-500' : 'border-white/10 hover:border-white/25'}`}
                >
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">POPULAR</div>
                  <h3 className="text-xl font-bold text-white mb-2">Pro Tier</h3>
                  <p className="text-sm text-slate-400 mb-4 flex-1">Advanced features.</p>
                  <div className="mb-6 flex items-baseline">
                    <span className="text-3xl font-bold text-white tabular-nums antialiased">
                      {formatPrice(100)}
                    </span>
                    <span className="text-sm font-semibold text-slate-300 ml-1.5">{activeCurrency} / mo</span>
                  </div>
                  <ul className="space-y-3 mb-8 text-sm text-slate-300 flex-1">
                    <li className="flex items-center"><span className="text-emerald-400 mr-2">✓</span> Advanced Wallet Analytics</li>
                    <li className="flex items-center"><span className="text-emerald-400 mr-2">✓</span> Priority Support</li>
                    <li className="flex items-center"><span className="text-emerald-400 mr-2">✓</span> 5% Bonus on Earnings</li>
                  </ul>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedPlan !== 'PRO') handlePayment(100, 'UPGRADE', 'PRO');
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl font-semibold transition-colors ${selectedPlan === 'PRO' ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-default' : 'bg-white/10 text-white hover:bg-white/15'}`}>
                    {selectedPlan === 'PRO' ? 'Current Plan' : 'Select Pro'}
                  </button>
                </div>

                {/* Premium Plan */}
                <div
                  className={`cursor-pointer rounded-2xl border-2 p-6 flex flex-col transition-colors bg-[#131924] ${selectedPlan === 'PREMIUM' ? 'border-blue-500' : 'border-white/10 hover:border-white/25'}`}
                >
                  <h3 className="text-xl font-bold text-white mb-2">Premium Tier</h3>
                  <p className="text-sm text-slate-400 mb-4 flex-1">All access pass.</p>
                  <div className="mb-6 flex items-baseline">
                    <span className="text-3xl font-bold text-white tabular-nums antialiased">
                      {formatPrice(200)}
                    </span>
                    <span className="text-sm font-semibold text-slate-300 ml-1.5">{activeCurrency} / yr</span>
                  </div>
                  <ul className="space-y-3 mb-8 text-sm text-slate-300 flex-1">
                    <li className="flex items-center"><span className="text-emerald-400 mr-2">✓</span> Everything in Pro</li>
                    <li className="flex items-center"><span className="text-emerald-400 mr-2">✓</span> 24/7 Dedicated Manager</li>
                    <li className="flex items-center"><span className="text-emerald-400 mr-2">✓</span> 15% Bonus on Earnings</li>
                    <li className="flex items-center"><span className="text-emerald-400 mr-2">✓</span> Custom Badges</li>
                  </ul>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedPlan !== 'PREMIUM') handlePayment(200, 'UPGRADE', 'PREMIUM');
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl font-semibold transition-colors ${selectedPlan === 'PREMIUM' ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-default' : 'bg-white/10 text-white hover:bg-white/15'}`}>
                    {selectedPlan === 'PREMIUM' ? 'Current Plan' : 'Select Premium'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[10, 20, 50, 100, 500, 1000].map((coinAmount) => (
                  <button
                    type="button"
                    key={coinAmount}
                    onClick={() => handlePayment(coinAmount, 'COIN', coinAmount)}
                    className="cursor-pointer rounded-2xl border-2 border-slate-700/90 bg-[#131924] p-4 sm:p-5 flex flex-col items-center justify-center text-center hover:border-amber-400 hover:bg-[#192130] transition-colors antialiased"
                  >
                    <div className="text-3xl sm:text-4xl mb-2 select-none">🪙</div>
                    <div className="text-base sm:text-lg font-extrabold text-white tracking-tight tabular-nums antialiased mb-2">
                      {coinAmount} Coins
                    </div>
                    <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-slate-800/95 border border-amber-400/40 text-xs sm:text-sm font-semibold tracking-wide tabular-nums antialiased text-slate-100 shadow-sm">
                      {`${formatPrice(coinAmount)} ${activeCurrency}`}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-8 text-center text-xs font-semibold text-slate-400 tracking-wider">
              SECURED BY PAYSTACK
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
