'use client';

import React, { useState } from 'react';
import { CurrencyCode, CurrencyRate, SubscriptionTier } from '../../types/user';

const EXCHANGE_RATES: Record<CurrencyCode, CurrencyRate> = {
  NGN: { code: 'NGN', symbol: '₦', rateToNgn: 1 },
  USD: { code: 'USD', symbol: '$', rateToNgn: 1600 },
  EUR: { code: 'EUR', symbol: '€', rateToNgn: 1750 },
  GBP: { code: 'GBP', symbol: '£', rateToNgn: 2000 },
};

const COIN_BUNDLES = [
  { id: 'b_500', amount: 500, baseNgnPrice: 500 },
  { id: 'b_1250', amount: 1250, baseNgnPrice: 1000 },
  { id: 'b_5000', amount: 5000, baseNgnPrice: 3500 },
];

export default function GlobalCurrencyManager() {
  const [activeCurrency, setActiveCurrency] = useState<CurrencyCode>('NGN');
  const [activeTier, setActiveTier] = useState<SubscriptionTier>('FREE');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const convertPrice = (ngnPrice: number, currencyCode: CurrencyCode) => {
    const rateInfo = EXCHANGE_RATES[currencyCode];
    const converted = ngnPrice / rateInfo.rateToNgn;

    // Formatting logic to show cents for non-NGN, integers for NGN
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currencyCode === 'NGN' ? 0 : 2,
    }).format(converted);
  };

  const handleSubscribe = (tier: SubscriptionTier) => {
    setActiveTier(tier);
    alert(`Successfully subscribed to ${tier} tier!`);
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-gray-950 min-h-screen text-gray-100 font-sans sm:border-x sm:border-gray-800 flex flex-col">
      {/* Header & Currency Selector */}
      <header className="px-5 py-4 border-b border-gray-800 bg-gray-900/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">Wallet Settings</h2>

        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            <span>{EXCHANGE_RATES[activeCurrency].symbol} {activeCurrency}</span>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-32 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-30">
              {(Object.keys(EXCHANGE_RATES) as CurrencyCode[]).map(code => (
                <button
                  key={code}
                  onClick={() => {
                    setActiveCurrency(code);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    activeCurrency === code ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {EXCHANGE_RATES[code].symbol} {code}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 p-5 space-y-8 overflow-y-auto">

        {/* Subscriptions Section */}
        <section className="space-y-4">
           <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Membership Tiers</h3>
           <div className="space-y-3">

             {/* PRO Tier */}
             <div className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${
               activeTier === 'PRO' ? 'border-blue-500 bg-blue-900/10 shadow-lg shadow-blue-900/20' : 'border-gray-800 bg-gray-900 hover:border-gray-700'
             }`}>
               <div className="flex justify-between items-start mb-3">
                 <div>
                   <h4 className="text-lg font-bold text-white flex items-center">
                     ⭐ Pro Tier
                   </h4>
                   <p className="text-xs text-gray-400 mt-1">Basic enhancements & ad-free.</p>
                 </div>
                 <div className="text-right">
                   <p className="text-sm font-bold text-gray-200">{convertPrice(2500, activeCurrency)}</p>
                   <p className="text-[10px] text-gray-500 uppercase">/ month</p>
                 </div>
               </div>
               <button
                 onClick={() => handleSubscribe('PRO')}
                 disabled={activeTier === 'PRO'}
                 className={`w-full py-2 rounded-lg text-sm font-bold transition-all ${
                   activeTier === 'PRO'
                     ? 'bg-blue-500/20 text-blue-400 cursor-default'
                     : 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700'
                 }`}
               >
                 {activeTier === 'PRO' ? 'Active Plan' : 'Upgrade to Pro'}
               </button>
             </div>

             {/* PREMIUM Tier */}
             <div className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${
               activeTier === 'PREMIUM' ? 'border-purple-500 bg-purple-900/10 shadow-lg shadow-purple-900/20' : 'border-gray-800 bg-gray-900 hover:border-gray-700'
             }`}>
               {/* Premium Glow effect */}
               <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/20 blur-2xl rounded-full pointer-events-none" />

               <div className="flex justify-between items-start mb-3 relative z-10">
                 <div>
                   <h4 className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 flex items-center">
                     💎 Premium
                   </h4>
                   <p className="text-xs text-gray-400 mt-1">All Pro features + exclusive rewards.</p>
                 </div>
                 <div className="text-right">
                   <p className="text-sm font-bold text-gray-200">{convertPrice(7000, activeCurrency)}</p>
                   <p className="text-[10px] text-gray-500 uppercase">/ month</p>
                 </div>
               </div>
               <button
                 onClick={() => handleSubscribe('PREMIUM')}
                 disabled={activeTier === 'PREMIUM'}
                 className={`w-full py-2 rounded-lg text-sm font-bold transition-all relative z-10 ${
                   activeTier === 'PREMIUM'
                     ? 'bg-purple-500/20 text-purple-300 cursor-default border border-purple-500/30'
                     : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 shadow-lg'
                 }`}
               >
                 {activeTier === 'PREMIUM' ? 'Active Plan' : 'Go Premium'}
               </button>
             </div>

           </div>
        </section>

        {/* Coin Bundles Section */}
        <section className="space-y-4">
           <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Buy Coins</h3>
           <div className="grid grid-cols-2 gap-3">
             {COIN_BUNDLES.map(bundle => (
               <div key={bundle.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:border-emerald-500/50 transition-colors cursor-pointer group">
                 <span className="text-3xl mb-2 drop-shadow-md group-hover:scale-110 transition-transform">🪙</span>
                 <p className="text-base font-black text-white">{bundle.amount}</p>
                 <p className="text-xs font-medium text-emerald-400 mt-1 bg-emerald-500/10 px-2 py-0.5 rounded">
                   {convertPrice(bundle.baseNgnPrice, activeCurrency)}
                 </p>
               </div>
             ))}
           </div>
        </section>

      </main>
    </div>
  );
}
