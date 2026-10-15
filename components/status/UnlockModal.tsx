'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Unlock, X, Coins } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import toast from 'react-hot-toast';

interface UnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId: string;
  creatorUsername: string;
  onSuccess: () => void;
  onOpenStore: () => void;
}

const GOD_MODE = true;
export default function UnlockModal({ isOpen, onClose, creatorId, creatorUsername, onSuccess, onOpenStore }: UnlockModalProps) {
  const { user } = useAuth();
  const { balance, refreshWallet } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUnlock = async () => {
    if (!user) return;

    if (!GOD_MODE && balance < 10) {
      toast.error('Insufficient coins. Please buy more.');
      onOpenStore();
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading('Processing payment...');

    try {
      // 1. Deduct 10 coins and transfer to creator
      const { error } = GOD_MODE ? { error: null } : await supabase.rpc('transfer_coins', {
        receiver_id: creatorId,
        gift_cost: 10,
        gift_name: 'Status Unlock',
      });

      if (error) {
        throw error;
      }

      // 2. Broadcast unlock event for realtime notification to creator
      supabase.channel('chat-events').send({
         type: 'broadcast',
         event: 'status_unlocked',
         payload: { creatorId: creatorId, viewerId: user.id }
      });

      // 3. Update local wallet state
      await refreshWallet();

      toast.success('Status Unlocked!', { id: toastId });
      onSuccess();
    } catch (error: any) {
      console.error('Failed to unlock status:', error);
      toast.error(error.message || 'Payment failed. Please try again.', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm bg-white/10 backdrop-blur-3xl border border-white/20 rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col items-center text-center overflow-hidden"
          >
            {/* Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/20 rounded-full blur-3xl -mr-16 -mt-16" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-1"
            >
              <X size={20} />
            </button>

            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/30 mb-4 border-2 border-white/20 mt-4">
              <Unlock size={28} className="text-white drop-shadow-md" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">Unlock Premium Status</h3>
            <p className="text-sm text-gray-300 mb-6">
              Pay <strong className="text-yellow-400">10 Coins</strong> to securely unlock and view {creatorUsername}'s exclusive content.
            </p>

            <div className="flex flex-col space-y-3 w-full">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleUnlock}
                disabled={isProcessing}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white rounded-xl font-bold shadow-lg shadow-yellow-500/25 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Unlock size={18} />
                    <span>Pay 10 Coins</span>
                  </>
                )}
              </motion.button>

              <div className="flex justify-between items-center px-2 pt-2">
                 <span className="text-xs text-gray-400">Your Balance:</span>
                 <div className="flex items-center gap-1">
                   <Coins size={12} className="text-yellow-500" />
                   <span className="text-xs font-bold text-yellow-500">{balance}</span>
                 </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
