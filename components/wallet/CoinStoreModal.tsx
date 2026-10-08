'use client';

import React, { useState } from 'react';
import { useWallet } from '../../context/WalletContext';
import { CurrencyCode, CurrencyRate } from '../../types/user';

export const EXCHANGE_RATES: Record<CurrencyCode, CurrencyRate> = {
  GHS: { code: 'GHS', symbol: '₵', rateToGhs: 1 },
  NGN: { code: 'NGN', symbol: '₦', rateToGhs: 100 },
  USD: { code: 'USD', symbol: '$', rateToGhs: 0.06 },
  EUR: { code: 'EUR', symbol: '€', rateToGhs: 0.055 },
  GBP: { code: 'GBP', symbol: '£', rateToGhs: 0.047 },
  KES: { code: 'KES', symbol: 'KSh', rateToGhs: 8 },
};

export const convertPrice = (ghsPrice: number, currencyCode: CurrencyCode) => {
  const rateInfo = EXCHANGE_RATES[currencyCode];
  const converted = ghsPrice * rateInfo.rateToGhs;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: ['NGN', 'KES'].includes(currencyCode) ? 0 : 2,
  }).format(converted);
};

type CoinStoreModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const COIN_PACKAGES = [
  { coins: 10, ghs: 5 },
  { coins: 20, ghs: 10 },
  { coins: 50, ghs: 25 },
  { coins: 100, ghs: 50, isPopular: true },
  { coins: 500, ghs: 250 },
  { coins: 1000, ghs: 500 },
];

export default function CoinStoreModal({ isOpen, onClose }: CoinStoreModalProps) {
  const { addBalance, currency, setCurrency, setTier } = useWallet();
  const [activeTab, setActiveTab] = useState<'UPGRADES' | 'COINS'>('UPGRADES');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (!isOpen) return null;

  const handlePurchase = (coins: number) => {
    addBalance(coins);
    alert(`Successfully purchased ${coins} Coins!`);
  };

  const handleUpgrade = (tier: 'BASE' | 'PRO' | 'PREMIUM') => {
    setTier(tier);
    alert(`Successfully upgraded to ${tier} tier!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sm:items-center font-sans">

      <div
        className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header & Currency Selector */}
        <div className="flex flex-col border-b border-gray-800 bg-gray-900/90 z-20">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-xl font-extrabold text-white tracking-tight">Earnmega Store</h2>

            <div className="flex items-center space-x-3">
               <div className="relative">
                 <button
                   onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                   className="flex items-center space-x-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors text-white"
                 >
                   <span>{EXCHANGE_RATES[currency].symbol} {currency}</span>
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
                           setCurrency(code);
                           setIsDropdownOpen(false);
                         }}
                         className={`w-full text-left px-4 py-2 text-sm transition-colors text-white ${
                           currency === code ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'hover:bg-gray-700'
                         }`}
                       >
                         {EXCHANGE_RATES[code].symbol} {code}
                       </button>
                     ))}
                   </div>
                 )}
               </div>

               <button
                 onClick={onClose}
                 className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors focus:outline-none"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                 </svg>
               </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex px-4 space-x-2 pb-2">
            <button
              onClick={() => setActiveTab('UPGRADES')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'UPGRADES' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Upgrades
            </button>
            <button
              onClick={() => setActiveTab('COINS')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'COINS' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Buy Coins
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto bg-gray-950 flex-1">
          {activeTab === 'UPGRADES' && (
            <div className="space-y-4">
              <div className="border border-gray-800 bg-gray-900 rounded-2xl p-4">
                <h4 className="text-white font-bold mb-1">Base Registration</h4>
                <p className="text-gray-400 text-xs mb-3">Standard access.</p>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-400 font-bold">{convertPrice(50, currency)}</span>
                  <button onClick={() => handleUpgrade('BASE')} className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-bold">Select</button>
                </div>
              </div>
              <div className="border border-blue-500/50 bg-blue-900/10 rounded-2xl p-4">
                <h4 className="text-blue-400 font-bold mb-1">Pro Tier</h4>
                <p className="text-gray-400 text-xs mb-3">Advanced features.</p>
                <div className="flex justify-between items-center">
                  <span className="text-blue-400 font-bold">{convertPrice(100, currency)}<span className="text-[10px] text-gray-500">/mo</span></span>
                  <button onClick={() => handleUpgrade('PRO')} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold">Upgrade</button>
                </div>
              </div>
              <div className="border border-purple-500/50 bg-purple-900/10 rounded-2xl p-4 relative overflow-hidden">
                <h4 className="text-purple-400 font-bold mb-1">Premium Tier</h4>
                <p className="text-gray-400 text-xs mb-3">All access pass.</p>
                <div className="flex justify-between items-center relative z-10">
                  <span className="text-purple-400 font-bold">{convertPrice(200, currency)}<span className="text-[10px] text-gray-500">/yr</span></span>
                  <button onClick={() => handleUpgrade('PREMIUM')} className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg text-sm font-bold shadow-lg">Upgrade</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'COINS' && (
            <div className="space-y-3">
              {COIN_PACKAGES.map((pkg) => (
                <div key={pkg.coins} className={`flex items-center justify-between p-4 rounded-2xl border ${pkg.isPopular ? 'bg-gray-800 border-amber-500/50' : 'bg-gray-900 border-gray-800'}`}>
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🪙</span>
                    <div className="flex flex-col">
                      <span className="text-white font-bold">{pkg.coins} Coins</span>
                      {pkg.isPopular && <span className="text-[10px] text-amber-500 font-bold uppercase">Popular</span>}
                    </div>
                  </div>
                  <button onClick={() => handlePurchase(pkg.coins)} className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500 hover:text-emerald-950 text-emerald-400 border border-emerald-500/20 rounded-xl text-sm font-bold transition-colors">
                    {convertPrice(pkg.ghs, currency)}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-4 bg-gray-900 border-t border-gray-800 text-center">
           <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold flex items-center justify-center">
              Secured by Paystack
           </p>
        </div>
      </div>

    </div>
  );
}
