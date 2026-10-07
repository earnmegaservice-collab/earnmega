'use client';

import React, { useState } from 'react';
import CoinStoreModal from "../../components/wallet/CoinStoreModal";
import { useWallet } from "../../context/WalletContext";

export default function EarnmegaWalletHeader() {
  const { balance, subscriptionTier, setSubscriptionTier } = useWallet();
  const [isStoreOpen, setIsStoreOpen] = useState(false);

  const isPremium = subscriptionTier === 'PREMIUM';
  const toggleTier = () => setSubscriptionTier(isPremium ? 'PRO' : 'PREMIUM');

  const handleTopUp = () => {
    setIsStoreOpen(true);
  };

  return (
    <>
      <CoinStoreModal isOpen={isStoreOpen} onClose={() => setIsStoreOpen(false)} />
      <div className="bg-gray-900 border-b border-gray-800 p-4 shrink-0 flex items-center justify-between text-white font-sans w-full">

        {/* Balance & Badge Section */}
        <div className="flex flex-col items-start space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="text-xl leading-none">🪙</span>
            <span className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-amber-600">
              {balance.toLocaleString()} <span className="text-sm font-semibold text-gray-400">Coins</span>
            </span>
          </div>

          <button
            onClick={toggleTier}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors border ${
              isPremium
                ? 'bg-purple-900/30 text-purple-300 border-purple-500/50 hover:bg-purple-900/50'
                : 'bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700'
            }`}
            title="Toggle Tier for Demo"
          >
            {isPremium ? '💎 Premium' : '⭐ Pro'}
          </button>
        </div>

        {/* Action Section */}
        <button
          onClick={handleTopUp}
          className="flex items-center space-x-1.5 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/20 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 9a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V15a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V9z" clipRule="evenodd" />
          </svg>
          <span>Top Up</span>
        </button>

      </div>
    </>
  );
}
