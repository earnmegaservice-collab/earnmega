"use client";

import React, { useState, useEffect } from 'react';
import { SubscriptionTier, BillingCycle } from '../../types/user';

interface ExchangeRates {
  [currencyCode: string]: number;
}

export default function CoinStoreModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [isLoadingRates, setIsLoadingRates] = useState(true);
  const [ratesError, setRatesError] = useState<string | null>(null);

  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [currencySearchQuery, setCurrencySearchQuery] = useState('');

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>('FREE');

  const basePrices: Record<SubscriptionTier, Record<BillingCycle, number>> = {
    FREE: { MONTHLY: 0, YEARLY: 0 },
    PRO: { MONTHLY: 9.99, YEARLY: 99.99 },
    PREMIUM: { MONTHLY: 19.99, YEARLY: 199.99 },
  };

  const getPrice = (tier: SubscriptionTier, cycle: BillingCycle) => {
    const basePrice = basePrices[tier][cycle];
    if (!exchangeRates || !exchangeRates[selectedCurrency]) return basePrice;

    const rate = exchangeRates[selectedCurrency];
    return (basePrice * rate).toFixed(2);
  };

  // Extract currency codes when rates are loaded
  const currencies = exchangeRates ? Object.keys(exchangeRates) : ['USD'];

  const filteredCurrencies = currencies.filter(currency =>
    currency.toLowerCase().includes(currencySearchQuery.toLowerCase())
  );

  useEffect(() => {
    const fetchRates = async () => {
      if (!isOpen) return;
      setIsLoadingRates(true);
      setRatesError(null);
      try {
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.result === 'success') {
          setExchangeRates(data.rates);
        } else {
          throw new Error('Failed to fetch rates: API returned error');
        }
      } catch (e: any) {
        setRatesError(e.message || 'An error occurred fetching exchange rates.');
      } finally {
        setIsLoadingRates(false);
      }
    };

    fetchRates();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Earnmega Store</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-8 relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Currency
          </label>
          <div className="relative">
            <button
              onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm text-left text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span>{selectedCurrency}</span>
              <svg className={`h-5 w-5 text-gray-400 transition-transform ${isCurrencyDropdownOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {isCurrencyDropdownOpen && (
              <div className="absolute z-10 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col">
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <input
                    type="text"
                    placeholder="Search currency..."
                    value={currencySearchQuery}
                    onChange={(e) => setCurrencySearchQuery(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white sm:text-sm"
                  />
                </div>
                <ul className="overflow-y-auto flex-1">
                  {isLoadingRates ? (
                    <li className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">Loading currencies...</li>
                  ) : ratesError ? (
                    <li className="px-4 py-2 text-sm text-red-500">Error loading currencies</li>
                  ) : filteredCurrencies.length === 0 ? (
                    <li className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">No currencies found</li>
                  ) : (
                    filteredCurrencies.map((currency) => (
                      <li
                        key={currency}
                        onClick={() => {
                          setSelectedCurrency(currency);
                          setIsCurrencyDropdownOpen(false);
                          setCurrencySearchQuery('');
                        }}
                        className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedCurrency === currency ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-200'}`}
                      >
                        {currency}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg inline-flex">
            <button
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${billingCycle === 'MONTHLY' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('YEARLY')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${billingCycle === 'YEARLY' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              Yearly <span className="ml-1 text-xs text-green-500 font-bold">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free Plan */}
          <div
            onClick={() => setSelectedPlan('FREE')}
            className={`cursor-pointer rounded-xl border-2 p-6 flex flex-col transition-all ${selectedPlan === 'FREE' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Registration Plan</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex-1">Basic features to get you started on Earnmega.</p>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
              Free
            </div>
            <ul className="space-y-3 mb-8 text-sm text-gray-600 dark:text-gray-300 flex-1">
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Basic Wallet Access</li>
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Standard Support</li>
            </ul>
            <button className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${selectedPlan === 'FREE' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
              {selectedPlan === 'FREE' ? 'Current Plan' : 'Select Free'}
            </button>
          </div>

          {/* Pro Plan */}
          <div
            onClick={() => setSelectedPlan('PRO')}
            className={`cursor-pointer rounded-xl border-2 p-6 flex flex-col transition-all relative ${selectedPlan === 'PRO' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
          >
            <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">POPULAR</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Pro Tier</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex-1">Enhanced tools for serious earners.</p>
            <div className="mb-6 flex items-baseline">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {isLoadingRates ? '...' : getPrice('PRO', billingCycle)}
              </span>
              <span className="text-sm text-gray-500 ml-1">{selectedCurrency} / {billingCycle === 'MONTHLY' ? 'mo' : 'yr'}</span>
            </div>
            <ul className="space-y-3 mb-8 text-sm text-gray-600 dark:text-gray-300 flex-1">
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Advanced Wallet Analytics</li>
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Priority Support</li>
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> 5% Bonus on Earnings</li>
            </ul>
            <button className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${selectedPlan === 'PRO' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
              Select Pro
            </button>
          </div>

          {/* Premium Plan */}
          <div
            onClick={() => setSelectedPlan('PREMIUM')}
            className={`cursor-pointer rounded-xl border-2 p-6 flex flex-col transition-all ${selectedPlan === 'PREMIUM' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Premium Tier</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex-1">Maximum benefits and exclusive features.</p>
            <div className="mb-6 flex items-baseline">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {isLoadingRates ? '...' : getPrice('PREMIUM', billingCycle)}
              </span>
              <span className="text-sm text-gray-500 ml-1">{selectedCurrency} / {billingCycle === 'MONTHLY' ? 'mo' : 'yr'}</span>
            </div>
            <ul className="space-y-3 mb-8 text-sm text-gray-600 dark:text-gray-300 flex-1">
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Everything in Pro</li>
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> 24/7 Dedicated Manager</li>
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> 15% Bonus on Earnings</li>
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Custom Badges</li>
            </ul>
            <button className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${selectedPlan === 'PREMIUM' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
              Select Premium
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
