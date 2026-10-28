"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';

export const GIFTS = [
  { id: '1', name: 'The Rose', cost: 1, icon: '🌹', tier: 'ROSE' },
  { id: '2', name: 'The Neon Heart', cost: 10, icon: '💖', tier: 'NEON_HEART' },
  { id: '3', name: 'The Diamond', cost: 50, icon: '💎', tier: 'DIAMOND' },
  { id: '4', name: 'The Rocket', cost: 500, icon: '🚀', tier: 'ROCKET' },
  { id: '5', name: 'The EarnMega Universe', cost: 5000, icon: '🌌', tier: 'UNIVERSE' }
];

interface LiveGiftDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSendGift: (gift: any, comboCount: number) => void;
}

export default function LiveGiftDrawer({ isOpen, onClose, onSendGift }: LiveGiftDrawerProps) {
  const { balance } = useWallet();
  const [selectedGift, setSelectedGift] = useState<any | null>(null);
  const [comboCount, setComboCount] = useState(0);
  const [comboTimer, setComboTimer] = useState<NodeJS.Timeout | null>(null);

  // Reset combo state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedGift(null);
      setComboCount(0);
      if (comboTimer) clearTimeout(comboTimer);
    }
  }, [isOpen]);

  const handleSendClick = () => {
    if (!selectedGift) return;

    // Increment combo
    setComboCount((prev) => prev + 1);

    // Clear existing timer
    if (comboTimer) {
      clearTimeout(comboTimer);
    }

    // Set a new timer to finalize the combo after 1.5 seconds of inactivity
    const timer = setTimeout(() => {
      onSendGift(selectedGift, comboCount + 1);
      setComboCount(0);
      setSelectedGift(null);
      onClose();
    }, 1500);

    setComboTimer(timer);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100000]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 h-[58dvh] bg-[#0A0A0A] rounded-t-3xl z-[100001] flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-white/10"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <span className="bg-gradient-to-r from-amber-400 to-rose-500 bg-clip-text text-transparent font-black tracking-wide">
                  Live Arena Gifts
                </span>
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-amber-400">{balance.toLocaleString()}</span>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/70" />
                </button>
              </div>
            </div>

            {/* Fixed Tiers Gift Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-3 gap-3">
                {GIFTS.map((gift) => (
                  <button
                    key={gift.id}
                    onClick={() => {
                      setSelectedGift(gift);
                      setComboCount(0);
                      if (comboTimer) clearTimeout(comboTimer);
                    }}
                    className={`flex flex-col items-center p-3 rounded-2xl border transition-all ${
                      selectedGift?.id === gift.id
                        ? 'bg-gradient-to-b from-rose-500/20 to-amber-500/20 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.35)] scale-105'
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-4xl mb-2 drop-shadow-md">{gift.icon}</span>
                    <span className="text-[11px] font-bold text-white mb-1 truncate w-full text-center">
                      {gift.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <Coins className="w-3 h-3 text-amber-400" />
                      <span className="text-xs text-amber-400 font-extrabold">{gift.cost}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer / Send Button area */}
            <div className="p-4 border-t border-white/5 bg-[#050505] flex items-center justify-between min-h-[80px]">
              <div className="flex flex-col">
                <span className="text-xs text-white/50 font-bold uppercase tracking-wider">Total Value</span>
                {selectedGift ? (
                  <div className="flex items-center gap-1">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span className="text-xl font-black text-amber-400">
                      {(selectedGift.cost * Math.max(1, comboCount)).toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <span className="text-xl font-bold text-white/20">--</span>
                )}
              </div>

              <button
                onClick={handleSendClick}
                disabled={!selectedGift}
                className={`relative overflow-hidden px-8 py-3.5 rounded-full font-bold text-lg shadow-xl transition-all ${
                  selectedGift
                    ? 'bg-gradient-to-r from-rose-500 via-fuchsia-500 to-amber-500 text-white hover:scale-105 active:scale-95'
                    : 'bg-white/5 text-white/30 cursor-not-allowed'
                }`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  Send
                  {comboCount > 0 && (
                    <motion.span
                      key={comboCount}
                      initial={{ scale: 1.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-amber-200 font-black italic"
                    >
                      x{comboCount}
                    </motion.span>
                  )}
                </span>
                {comboCount > 0 && (
                  <motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: 1.5, ease: 'linear' }}
                    className="absolute bottom-0 left-0 h-1 bg-white/50"
                  />
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
