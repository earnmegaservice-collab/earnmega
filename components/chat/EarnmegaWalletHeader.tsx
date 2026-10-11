'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useWallet } from "../../context/WalletContext";
import { Store, Coins } from 'lucide-react';
import { motion } from 'framer-motion';

const CoinStoreModal = dynamic(() => import("../../components/wallet/CoinStoreModal"), { ssr: false });

export default function EarnmegaWalletHeader() {
  const { balance, subscriptionTier } = useWallet();
  const [isStoreOpen, setIsStoreOpen] = useState(false);

  const handleTopUp = () => {
    setIsStoreOpen(true);
  };

  return (
    <>
      <CoinStoreModal isOpen={isStoreOpen} onClose={() => setIsStoreOpen(false)} />
      <div className="bg-white/5 backdrop-blur-md border-b border-white/10 p-4 shrink-0 flex items-center justify-between text-white font-sans w-full">

        {/* Balance & Badge Section */}
        <div className="flex flex-col items-start space-y-1.5">
          <div className="flex items-center space-x-2">
            <Coins className="text-yellow-400" size={24} />
            <span className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-amber-600">
              {balance.toLocaleString()} <span className="text-sm font-semibold text-gray-400">Coins</span>
            </span>
          </div>

          <div
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors border ${
              subscriptionTier === 'PREMIUM'
                ? 'bg-purple-900/30 text-purple-300 border-purple-500/50'
                : subscriptionTier === 'PRO'
                ? 'bg-blue-900/30 text-blue-300 border-blue-500/50'
                : 'bg-gray-800 text-gray-300 border-gray-600'
            }`}
          >
            {subscriptionTier === 'PREMIUM' ? '💎 Premium' : subscriptionTier === 'PRO' ? '⭐ Pro' : '🛠️ Base'}
          </div>
        </div>

        {/* Action Section */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleTopUp}
          className="flex items-center space-x-1.5 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          <Store size={16} />
          <span>Store</span>
        </motion.button>

      </div>
    </>
  );
}
