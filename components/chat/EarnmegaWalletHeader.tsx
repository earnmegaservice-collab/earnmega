'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useWallet } from "../../context/WalletContext";
import { Store, Coins, Bell } from 'lucide-react';
import { motion } from 'framer-motion';

const CoinStoreModal = dynamic(() => import("../../components/wallet/CoinStoreModal"), { ssr: false });
const NotificationDrawer = dynamic(() => import("../../components/status/NotificationDrawer"), { ssr: false });

export default function EarnmegaWalletHeader() {
  const { coins: balance, subscription_tier: subscriptionTier } = useWallet();
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const handleTopUp = () => {
    setIsStoreOpen(true);
  };

  return (
    <>
      <CoinStoreModal isOpen={isStoreOpen} onClose={() => setIsStoreOpen(false)} />
      <NotificationDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />

      {/* Spacer to push content down below the fixed header */}
      <div className="h-16 shrink-0 w-full" />

      <div className="fixed top-0 w-full flex items-center justify-between p-4 bg-black/80 backdrop-blur-3xl border-b border-white/10 z-50 text-white font-sans">

        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
           <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-sm shadow-[0_0_15px_rgba(99,102,241,0.5)]">
             EM
           </div>

           <div className="flex flex-col items-start">
             <div className="flex items-center space-x-1.5">
               <Coins className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" size={16} />
               <span className="text-sm font-extrabold tracking-[0.05em] bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500">
                 {balance.toLocaleString()}
               </span>
             </div>
             <span className="text-[10px] text-gray-400 font-medium">Balance</span>
           </div>
        </div>

        {/* Center: Subscription Tier (Optional, keeping it small) */}

        <div
          className={`hidden sm:flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-colors border ${
            subscriptionTier === 'PREMIUM'
              ? 'bg-purple-900/30 text-purple-300 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
              : subscriptionTier === 'PRO'
              ? 'bg-blue-900/30 text-blue-300 border-blue-500/50'
              : 'bg-gray-800 text-gray-300 border-gray-600'
          }`}
        >
          {subscriptionTier === 'PREMIUM' ? 'PREMIUM' : subscriptionTier === 'PRO' ? 'PRO' : 'BASE'}
        </div>

        {/* Action Section */}
        <div className="flex items-center space-x-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsNotificationsOpen(true)}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors relative"
          >
            <Bell size={16} className="text-white/80" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleTopUp}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all border border-emerald-400/30"
          >
            <Store size={16} className="text-white" />
          </motion.button>
        </div>

      </div>
    </>
  );
}
