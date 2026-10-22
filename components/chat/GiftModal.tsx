'use client';

import React, { useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useWallet } from '../../context/WalletContext';
import { ShieldAlert, Zap, Coffee, Flower2, Gem, Crown, Sparkles, Flame } from 'lucide-react';
import { motion } from 'framer-motion';

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  onGiftSent: (giftData: any) => void;
  onOpenStore: () => void;
}

const GIFTS = [
  { 
    id: 'serpent', 
    name: 'Cyber Serpent', 
    icon: <Zap size={32} className="text-cyan-400 animate-pulse" />, 
    cost: 10,
    badge: 'START',
    gradient: 'from-cyan-500/20 via-slate-900 to-slate-950',
    border: 'border-cyan-500/40 hover:border-cyan-400',
    glow: 'hover:shadow-[0_0_30px_rgba(34,211,238,0.4)]'
  },
  { 
    id: 'coffee', 
    name: 'Coffee', 
    icon: <Coffee size={32} className="text-amber-500" />, 
    cost: 10,
    gradient: 'from-amber-500/10 via-slate-900 to-slate-950',
    border: 'border-white/10 hover:border-amber-400/50',
    glow: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]'
  },
  { 
    id: 'rose', 
    name: 'Rose', 
    icon: <Flower2 size={32} className="text-rose-500" />, 
    cost: 50,
    gradient: 'from-rose-500/15 via-slate-900 to-slate-950',
    border: 'border-white/10 hover:border-rose-400/50',
    glow: 'hover:shadow-[0_0_25px_rgba(244,63,94,0.3)]'
  },
  { 
    id: 'diamond', 
    name: 'Diamond', 
    icon: <Gem size={32} className="text-sky-400" />, 
    cost: 500,
    gradient: 'from-sky-500/15 via-slate-900 to-slate-950',
    border: 'border-white/10 hover:border-sky-400/50',
    glow: 'hover:shadow-[0_0_25px_rgba(56,189,248,0.3)]'
  },
  { 
    id: 'crown', 
    name: 'Crown', 
    icon: <Crown size={32} className="text-yellow-400" />, 
    cost: 1000,
    gradient: 'from-yellow-500/15 via-slate-900 to-slate-950',
    border: 'border-white/10 hover:border-yellow-400/50',
    glow: 'hover:shadow-[0_0_30px_rgba(251,191,36,0.3)]'
  },
  { 
    id: 'galaxy', 
    name: 'Galaxy', 
    icon: <Sparkles size={32} className="text-fuchsia-400" />, 
    cost: 1500,
    gradient: 'from-fuchsia-500/15 via-slate-900 to-slate-950',
    border: 'border-white/10 hover:border-fuchsia-400/50',
    glow: 'hover:shadow-[0_0_30px_rgba(217,70,239,0.3)]'
  },
  { 
    id: 'god_mode', 
    name: 'God Mode Aura', 
    icon: <Flame size={34} className="text-amber-300 animate-bounce" />, 
    cost: 2000,
    badge: 'MYTHIC',
    gradient: 'from-amber-500/30 via-orange-950/50 to-slate-950',
    border: 'border-amber-400/80 hover:border-yellow-200',
    glow: 'shadow-[0_0_30px_rgba(251,191,36,0.25)] hover:shadow-[0_0_50px_rgba(251,191,36,0.6)]'
  },
];

const GOD_MODE = true;

export default function GiftModal({ isOpen, onClose, recipientId, onGiftSent, onOpenStore }: GiftModalProps) {
  const { balance, setBalance } = useWallet();
  const [showError, setShowError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSendGift = async (gift: any) => {
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check balance if God mode coin deduction is bypassed
      if (!GOD_MODE && balance < gift.cost) {
        setShowError(true);
        setIsProcessing(false);
        return;
      }

      const { error: deductError } = GOD_MODE ? { error: null } : await supabase.rpc('deduct_coins', {
        user_uuid: user.id,
        deduct_amount: gift.cost,
      });

      if (deductError) {
        console.error('Failed to deduct coins:', deductError);
        onClose();
        onOpenStore();
        return;
      }

      // Trigger the real-time gift notification payload matching GiftOverlay listener
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: recipientId,
        actor_id: user.id,
        type: 'GIFT',
        content: `${gift.name}|${gift.cost}`
      });

      if (notifError) {
        console.error('Failed to insert gift notification:', notifError);
      }

      setBalance(prev => Math.max(0, prev - gift.cost));
      onGiftSent(gift);
      onClose();
    } catch (err) {
      console.error('Unexpected error sending gift:', err);
      onClose();
      onOpenStore();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="w-full sm:max-w-lg bg-slate-950/85 backdrop-blur-3xl border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl p-6 shadow-[0_-10px_50px_rgba(0,0,0,0.8)] relative overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Decorative top drag handle for mobile feel */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-5 sm:hidden" />

        <div className="flex justify-between items-center mb-5 relative z-10">
          <div>
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-200 to-yellow-500 drop-shadow-sm">Send a Gift</h2>
            <p className="text-xs text-gray-400 mt-0.5">Unleash cinematic 4K animations in chat</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
             ✕
          </button>
        </div>

        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10 relative z-10">
          <span className="text-sm font-medium text-gray-300">Wallet Balance</span>
          <span className="text-lg font-extrabold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-4 py-1 rounded-full shadow-inner">
            {balance} <span className="text-xs opacity-80 uppercase tracking-wider">Coins</span>
          </span>
        </div>

        {showError && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md rounded-3xl">
            <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-6 w-full text-center shadow-2xl">
              <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4 border border-red-500/40">
                <ShieldAlert className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Insufficient Coins</h3>
              <p className="text-sm text-gray-400 mb-6">You need more coins to dispatch this luxury gift.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowError(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 text-gray-300 font-semibold rounded-xl hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowError(false);
                    onOpenStore();
                  }}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 font-black rounded-xl hover:from-yellow-400 hover:to-amber-400 transition-colors shadow-lg shadow-yellow-500/20"
                >
                  Top Up
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 relative z-10 overflow-y-auto pr-1 pb-2">
          {GIFTS.map(gift => {
            const isGod = gift.id === 'god_mode';
            const isSerpent = gift.id === 'serpent';

            return (
              <motion.button
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
                key={gift.id}
                onClick={() => handleSendGift(gift)}
                disabled={isProcessing}
                className={`group relative flex flex-col items-center justify-center p-4 bg-gradient-to-br ${gift.gradient} border ${gift.border} rounded-2xl transition-all disabled:opacity-50 overflow-hidden shadow-lg ${gift.glow} ${isGod ? 'col-span-2 sm:col-span-1' : ''}`}
              >
                {/* Special Badge (START / MYTHIC) */}
                {gift.badge && (
                  <span className={`absolute top-2 right-2 text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-md shadow-md uppercase ${isGod ? 'bg-gradient-to-r from-amber-400 to-yellow-200 text-slate-950 animate-pulse' : 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-300'}`}>
                    {gift.badge}
                  </span>
                )}

                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <div className="mb-2.5 transform group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300 drop-shadow-2xl">
                  {gift.icon}
                </div>
                <span className="text-sm font-bold text-white drop-shadow-md tracking-wide text-center">{gift.name}</span>
                <div className="flex items-center mt-2 space-x-1">
                   <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md shadow-sm ${isGod ? 'bg-amber-400/20 border border-amber-400/40 text-amber-300' : isSerpent ? 'bg-cyan-400/20 text-cyan-300' : 'bg-yellow-400/10 text-yellow-400'}`}>
                     {gift.cost} Coins
                   </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
