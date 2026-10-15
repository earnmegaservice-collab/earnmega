import React, { useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useWallet } from '../../context/WalletContext';
import { Coffee, Flower2, Gem, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  onGiftSent: (giftData: any) => void;
  onOpenStore: () => void;
}

const GIFTS = [
  { id: 'coffee', name: 'Coffee', icon: <Coffee size={32} />, cost: 10 },
  { id: 'rose', name: 'Rose', icon: <Flower2 size={32} className="text-red-500" />, cost: 50 },
  { id: 'diamond', name: 'Diamond', icon: <Gem size={32} className="text-blue-400" />, cost: 500 },
  { id: 'crown', name: 'Crown', icon: <Crown size={32} className="text-yellow-400" />, cost: 1000 },
];

export default function GiftModal({ isOpen, onClose, recipientId, onGiftSent, onOpenStore }: GiftModalProps) {
  const { coins: balance, setCoins: setBalance } = useWallet();
  const [showError, setShowError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSendGift = async (gift: any) => {
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: deductError } = await supabase.rpc('deduct_coins', {
        user_uuid: user.id,
        deduct_amount: gift.cost,
      });

      if (deductError) {
        console.error('Failed to deduct coins:', deductError);
        onClose();
        onOpenStore();
        return;
      }

      // If deduction successful, trigger the gift notification
      const { error: notifError } = await supabase.from('notifications').insert({
        recipient_id: recipientId,
        sender_id: user.id,
        type: 'GIFT',
        message: `${gift.name}|${gift.cost}`
      });

      if (notifError) {
        console.error('Failed to insert gift notification:', notifError);
        // Note: Coins are deducted but animation might fail. Needs robust queue in prod.
      }

      setBalance(prev => prev - gift.cost);
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full sm:max-w-md bg-white/5 backdrop-blur-3xl border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-[0_-8px_40px_rgba(0,0,0,0.5)] sm:shadow-2xl relative overflow-hidden"
      >
        {/* Decorative top drag handle for mobile feel */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 sm:hidden" />

        <div className="flex justify-between items-center mb-6 relative z-10">
          <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-200 drop-shadow-sm">Send a Gift</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
             ✕
          </button>
        </div>

        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10 relative z-10">
          <span className="text-sm font-medium text-gray-300">Wallet Balance</span>
          <span className="text-lg font-bold text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full shadow-inner">{balance} <span className="text-sm opacity-80">Coins</span></span>
        </div>

        {showError && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md rounded-2xl">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full text-center shadow-2xl transform transition-all scale-100 opacity-100">
              <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Insufficient Coins</h3>
              <p className="text-sm text-gray-400 mb-6">You need more coins to send this gift.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowError(false)}
                  className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 font-semibold rounded-xl hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowError(false);
                    onOpenStore();
                  }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-xl hover:from-yellow-400 hover:to-orange-400 transition-colors shadow-lg shadow-yellow-500/20"
                >
                  Top Up
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 relative z-10">
          {GIFTS.map(gift => (
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.95 }}
              key={gift.id}
              onClick={() => handleSendGift(gift)}
              disabled={isProcessing}
              className="group flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 hover:border-yellow-400/50 rounded-2xl transition-all disabled:opacity-50 relative overflow-hidden shadow-lg hover:shadow-yellow-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="mb-3 transform group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300 drop-shadow-2xl">{gift.icon}</div>
              <span className="text-base font-bold text-white drop-shadow-md tracking-wide">{gift.name}</span>
              <div className="flex items-center mt-2 space-x-1">
                 <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-md shadow-sm">{gift.cost} Coins</span>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
