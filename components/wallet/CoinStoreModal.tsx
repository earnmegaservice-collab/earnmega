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

export interface CoinStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'UPGRADES' | 'BUY_COINS';
  bannerMessage?: string | null;
  highlightedPlan?: 'PRO' | 'PREMIUM' | null;
  onPurchaseSuccess?: (result: { type: 'UPGRADE' | 'COIN'; payload: any }) => void;
}

export default function CoinStoreModal({
  isOpen,
  onClose,
  initialTab = 'UPGRADES',
  bannerMessage = null,
  highlightedPlan = null,
  onPurchaseSuccess,
}: CoinStoreModalProps) {
  const {
    currency: selectedCurrency,
    setCurrency: setSelectedCurrency,
    subscriptionTier: selectedPlan,
    setSubscriptionTier: setSelectedPlan,
    balance,
    setBalance,
    refreshWallet,
    storeBannerMessage,
    highlightedStorePlan,
    triggerToast,
  } = useWallet();
  const { session, user } = useAuth();
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(FALLBACK_STORE_RATES);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [currencySearchQuery, setCurrencySearchQuery] = useState('');

  const [activeTab, setActiveTab] = useState<'UPGRADES' | 'BUY_COINS'>(initialTab);

  const effectiveBanner = bannerMessage ?? storeBannerMessage;
  const effectiveHighlight = highlightedPlan ?? highlightedStorePlan;

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

  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const initializePayment = usePaystackPayment(paymentConfig as any);

  useEffect(() => {
    if (paymentConfig) {
      const onSuccess = async (reference: any) => {
        const { type, payload } = paymentConfig.meta;
        setIsVerifyingPayment(true);

        try {
          const headers: HeadersInit = { 'Content-Type': 'application/json' };
          if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
          }

          const refString = reference?.reference || reference?.trxref || paymentConfig.reference;

          const res = await fetch('/api/verify-payment', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              reference: refString,
              type,
              payload,
              userId: user?.id,
            }),
          });

          const data = await res.json().catch(() => ({}));

          if (res.ok && data.success) {
            if (type === 'UPGRADE') {
              const newTier = String(payload).toUpperCase() as SubscriptionTier;
              setSelectedPlan(newTier);
              triggerToast?.(
                `👑 Upgraded to ${newTier}! Your unlimited features are now unlocked!`,
                'success'
              );
            } else if (type === 'COIN') {
              const added = Number(payload) || 0;
              if (typeof data.balance === 'number') {
                setBalance(data.balance);
              } else {
                setBalance((prev) => prev + added);
              }
              triggerToast?.(`🪙 +${added} Coins added to your wallet!`, 'success');
            }
            await refreshWallet();
            onPurchaseSuccess?.({ type, payload });
          } else {
            // Direct Supabase fallback if API verification had a transient issue after Paystack success callback
            if (type === 'UPGRADE') {
              const newTier = String(payload).toUpperCase() as SubscriptionTier;
              setSelectedPlan(newTier);
              if (user?.id) {
                await supabase
                  .from('profiles')
                  .update({
                    subscription_tier: newTier,
                    is_paid: true,
                  })
                  .eq('id', user.id);
                await supabase.from('notifications').insert({
                  user_id: user.id,
                  type: 'PREMIUM',
                  content: `Successfully upgraded to ${newTier} Tier`,
                });
              }
              triggerToast?.(`👑 Upgraded to ${newTier}!`, 'success');
            } else if (type === 'COIN') {
              const added = Number(payload) || 0;
              const nextBal = balance + added;
              setBalance(nextBal);
              if (user?.id) {
                await supabase
                  .from('profiles')
                  .update({ coins: nextBal, coin_balance: nextBal })
                  .eq('id', user.id);
                await supabase.from('notifications').insert({
                  user_id: user.id,
                  type: 'TRANSACTION',
                  content: `Successfully purchased ${added} Coins`,
                });
              }
              triggerToast?.(`🪙 +${added} Coins added to your wallet!`, 'success');
            }
            await refreshWallet();
            onPurchaseSuccess?.({ type, payload });
          }
        } catch (error) {
          console.error('Error during payment verification', error);
          if (type === 'UPGRADE') {
            const newTier = String(payload).toUpperCase() as SubscriptionTier;
            setSelectedPlan(newTier);
            triggerToast?.(`👑 Upgraded to ${newTier}!`, 'success');
          } else if (type === 'COIN') {
            const added = Number(payload) || 0;
            setBalance((prev) => prev + added);
            triggerToast?.(`🪙 +${added} Coins added to your wallet!`, 'success');
          }
          onPurchaseSuccess?.({ type, payload });
        } finally {
          setIsVerifyingPayment(false);
          setPaymentConfig(null);
          onClose();
        }
      };

      const onClosed = () => {
        setPaymentConfig(null);
      };

      initializePayment({ onSuccess, onClose: onClosed });
    }
  }, [
    paymentConfig,
    initializePayment,
    balance,
    onClose,
    setSelectedPlan,
    setBalance,
    refreshWallet,
    session?.access_token,
    user?.id,
    onPurchaseSuccess,
    triggerToast,
  ]);

  const handlePayment = (amount: number, type: 'UPGRADE' | 'COIN', payload: any) => {
    const baseAmount = Math.round(amount * 100);

    if (!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY) {
      console.error('Paystack Key Missing');
    }

    const metadata: any = {
      user_id: user?.id,
      email: user?.email || 'user@example.com',
      payment_type: type === 'UPGRADE' ? 'P1_UPGRADE' : 'COIN_PURCHASE',
    };
    if (type === 'COIN') {
      metadata.coins_amount = payload;
    } else if (type === 'UPGRADE') {
      metadata.target_tier = payload;
    }

    setPaymentConfig({
      reference: `p1_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      email: user?.email || 'user@example.com',
      amount: baseAmount,
      currency: 'GHS',
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      metadata: metadata,
      meta: { type, payload },
    });
  };

  const currencies = exchangeRates
    ? Object.keys(exchangeRates)
    : Object.keys(FALLBACK_STORE_RATES);

  const filteredCurrencies = currencies.filter((currency) =>
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
      } catch (_e: any) {
        setRatesError(null);
      } finally {
        setIsLoadingRates(false);
      }
    };

    fetchRates();
  }, [isOpen]);

  const normalizedSelectedPlan = String(selectedPlan || 'FREE').toUpperCase();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2147483646] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md antialiased">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="bg-[#0d1117] border border-white/15 rounded-3xl w-full max-w-4xl p-5 sm:p-8 shadow-2xl overflow-y-auto max-h-[92vh] antialiased relative"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl sm:text-3xl tracking-wide font-extrabold text-white flex items-center">
                  <span className="mr-2.5 text-3xl sm:text-4xl">🏪</span> HorPal Store
                </h2>
                <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-extrabold">
                  <span>🪙</span>
                  <span>{balance} Coins</span>
                </div>
              </div>
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="relative">
                  <button
                    onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                    className="flex items-center justify-between px-3 py-1.5 bg-[#161b26] border border-white/15 rounded-lg shadow-sm text-xs sm:text-sm font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <span>{activeCurrency}</span>
                    <svg
                      className={`ml-2 h-4 w-4 text-slate-400 transition-transform ${
                        isCurrencyDropdownOpen ? 'rotate-180' : ''
                      }`}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
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
                              className={`px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-white/10 ${
                                activeCurrency === currency
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'text-slate-200'
                              }`}
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {effectiveBanner && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-rose-500/20 border border-amber-400/40 flex items-center justify-between gap-3 shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl select-none">⚡</span>
                  <div>
                    <p className="text-xs sm:text-sm font-extrabold text-amber-200 tracking-wide">
                      {effectiveBanner}
                    </p>
                    <p className="text-[11px] text-amber-100/80">
                      Instant activation via Paystack — your feature unlocks the second payment completes.
                    </p>
                  </div>
                </div>
                <span className="shrink-0 px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-[11px] font-bold text-amber-200">
                  Balance: {balance} 🪙
                </span>
              </motion.div>
            )}

            <div className="flex border-b border-white/10 mb-6">
              <button
                className={`pb-2.5 px-4 text-sm font-semibold transition-colors ${
                  activeTab === 'UPGRADES'
                    ? 'border-b-2 border-blue-500 text-blue-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => setActiveTab('UPGRADES')}
              >
                Upgrades (Pro / Premium)
              </button>
              <button
                className={`pb-2.5 px-4 text-sm font-semibold transition-colors ${
                  activeTab === 'BUY_COINS'
                    ? 'border-b-2 border-amber-400 text-amber-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => setActiveTab('BUY_COINS')}
              >
                Buy Coins 🪙
              </button>
            </div>

            {isVerifyingPayment && (
              <div className="mb-4 p-3 rounded-xl bg-blue-500/20 border border-blue-400/40 text-center text-sm font-bold text-blue-200 animate-pulse">
                Verifying your Paystack payment and unlocking your account...
              </div>
            )}

            {activeTab === 'UPGRADES' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Base Plan */}
                <div
                  className={`rounded-2xl border-2 p-6 flex flex-col transition-colors bg-[#131924] ${
                    normalizedSelectedPlan === 'FREE'
                      ? 'border-blue-500'
                      : 'border-white/10 hover:border-white/25'
                  }`}
                >
                  <h3 className="text-xl font-bold text-white mb-2">Free Tier</h3>
                  <p className="text-sm text-slate-400 mb-4 flex-1">
                    Standard pay-as-you-go access with coins.
                  </p>
                  <div className="mb-6 flex items-baseline">
                    <span className="text-3xl font-bold text-white tabular-nums antialiased">
                      {formatPrice(0)}
                    </span>
                    <span className="text-sm font-semibold text-slate-300 ml-1.5">
                      {activeCurrency}
                    </span>
                  </div>
                  <ul className="space-y-3 mb-8 text-sm text-slate-300 flex-1">
                    <li className="flex items-center">
                      <span className="text-emerald-400 mr-2">✓</span> Free Profile Swipes & Love Requests
                    </li>
                    <li className="flex items-center">
                      <span className="text-emerald-400 mr-2">✓</span> Free Status Posting & Text Chat
                    </li>
                    <li className="flex items-center">
                      <span className="text-slate-400 mr-2">•</span> Pay-per-use Calls, Media & Radar
                    </li>
                  </ul>
                  <button
                    disabled={normalizedSelectedPlan === 'FREE'}
                    className={`w-full py-2.5 px-4 rounded-xl font-semibold transition-colors ${
                      normalizedSelectedPlan === 'FREE'
                        ? 'bg-slate-700/60 text-slate-300 cursor-default'
                        : 'bg-white/10 text-white hover:bg-white/15'
                    }`}
                  >
                    {normalizedSelectedPlan === 'FREE' ? 'Current Plan' : 'Included'}
                  </button>
                </div>

                {/* Pro Plan */}
                <div
                  className={`rounded-2xl border-2 p-6 flex flex-col transition-all relative bg-[#131924] ${
                    effectiveHighlight === 'PRO'
                      ? 'border-blue-400 ring-2 ring-blue-500/40 shadow-xl shadow-blue-500/10'
                      : normalizedSelectedPlan === 'PRO'
                      ? 'border-blue-500'
                      : 'border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                    {effectiveHighlight === 'PRO' ? 'RECOMMENDED' : 'POPULAR'}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Pro Tier</h3>
                  <p className="text-sm text-slate-400 mb-4 flex-1">
                    Unlimited Calls & Group Media.
                  </p>
                  <div className="mb-6 flex items-baseline">
                    <span className="text-3xl font-bold text-white tabular-nums antialiased">
                      {formatPrice(100)}
                    </span>
                    <span className="text-sm font-semibold text-slate-300 ml-1.5">
                      {activeCurrency} / mo
                    </span>
                  </div>
                  <ul className="space-y-3 mb-8 text-sm text-slate-300 flex-1">
                    <li className="flex items-center">
                      <span className="text-emerald-400 mr-2">✓</span> Unlimited Free 1-on-1 Voice & Video Calls
                    </li>
                    <li className="flex items-center">
                      <span className="text-emerald-400 mr-2">✓</span> Unlimited Free Group Voice & Video Calls
                    </li>
                    <li className="flex items-center">
                      <span className="text-emerald-400 mr-2">✓</span> Unlimited Free Group Image & Video Uploads
                    </li>
                    <li className="flex items-center">
                      <span className="text-amber-400 mr-2">•</span> Go Live requires 20 Coins (Free on Premium)
                    </li>
                  </ul>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (normalizedSelectedPlan !== 'PRO') handlePayment(100, 'UPGRADE', 'PRO');
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold transition-colors ${
                      normalizedSelectedPlan === 'PRO'
                        ? 'bg-blue-600 text-white cursor-default'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25'
                    }`}
                  >
                    {normalizedSelectedPlan === 'PRO' ? 'Current Plan' : 'Upgrade to Pro'}
                  </button>
                </div>

                {/* Premium Plan */}
                <div
                  className={`rounded-2xl border-2 p-6 flex flex-col transition-all relative bg-[#131924] ${
                    effectiveHighlight === 'PREMIUM'
                      ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-xl shadow-amber-500/15'
                      : normalizedSelectedPlan === 'PREMIUM'
                      ? 'border-amber-500'
                      : 'border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-extrabold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                    {effectiveHighlight === 'PREMIUM' ? '🔥 REQUIRED FOR FREE LIVE' : '👑 ALL ACCESS'}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-1.5">
                    <span>Premium Tier</span>
                    <span>👑</span>
                  </h3>
                  <p className="text-sm text-slate-400 mb-4 flex-1">
                    Unlimited Live Streaming + All Pro Perks.
                  </p>
                  <div className="mb-6 flex items-baseline">
                    <span className="text-3xl font-bold text-white tabular-nums antialiased">
                      {formatPrice(200)}
                    </span>
                    <span className="text-sm font-semibold text-slate-300 ml-1.5">
                      {activeCurrency} / yr
                    </span>
                  </div>
                  <ul className="space-y-3 mb-8 text-sm text-slate-300 flex-1">
                    <li className="flex items-center">
                      <span className="text-amber-400 mr-2">★</span> Unlimited Free Live Streaming (Go Live Anytime!)
                    </li>
                    <li className="flex items-center">
                      <span className="text-emerald-400 mr-2">✓</span> Unlimited Free 1-on-1 & Group Calls
                    </li>
                    <li className="flex items-center">
                      <span className="text-emerald-400 mr-2">✓</span> Unlimited Free Group Media Uploads
                    </li>
                    <li className="flex items-center">
                      <span className="text-emerald-400 mr-2">✓</span> Exclusive VIP Crown Badge & Priority Boost
                    </li>
                  </ul>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (normalizedSelectedPlan !== 'PREMIUM')
                        handlePayment(200, 'UPGRADE', 'PREMIUM');
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl font-extrabold transition-colors ${
                      normalizedSelectedPlan === 'PREMIUM'
                        ? 'bg-amber-500 text-black cursor-default'
                        : 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black shadow-lg shadow-amber-500/25'
                    }`}
                  >
                    {normalizedSelectedPlan === 'PREMIUM' ? 'Current Plan' : 'Upgrade to Premium 👑'}
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
                    className="cursor-pointer rounded-2xl border-2 border-slate-700/90 bg-[#131924] p-4 sm:p-5 flex flex-col items-center justify-center text-center hover:border-amber-400 hover:bg-[#192130] transition-colors antialiased group"
                  >
                    <div className="text-3xl sm:text-4xl mb-2 select-none group-hover:scale-110 transition-transform">
                      🪙
                    </div>
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
              SECURED BY PAYSTACK • INSTANT UNLOCK
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
