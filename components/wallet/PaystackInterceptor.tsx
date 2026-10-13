'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Coins } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';

interface PaystackInterceptorProps {
  isOpen: boolean;
  onClose: () => void;
  cost: number;
  action: (() => Promise<void>) | null;
  onOpenStore: () => void;
}

export default function PaystackInterceptor({ isOpen, onClose, cost, action, onOpenStore }: PaystackInterceptorProps) {
  const { balance, refreshWallet } = useWallet();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayCoins = async () => {
    if (!action) return;

    if (balance < cost) {
      toast.error('Insufficient coins.');
      onOpenStore();
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading('Processing payment...');

    try {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.rpc('deduct_coins', {
        user_uuid: user.id,
        deduct_amount: cost,
      });

      if (error) {
        throw error;
      }

      await refreshWallet();
      toast.success('Payment successful!', { id: toastId });
      onClose();
      await action();
    } catch (error: any) {
      console.error('Failed to process payment:', error);
      toast.error(error.message || 'Payment failed.', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full sm:max-w-md bg-black/90 backdrop-blur-xl border-t border-amber-500/30 rounded-t-3xl sm:rounded-3xl p-6 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] flex flex-col relative z-10 overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-1"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col items-center text-center mt-2 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-purple-600 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-4 border border-white/10">
                <Zap size={28} className="text-white drop-shadow-md" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Premium Feature</h3>
              <p className="text-sm text-white/70">
                This action requires coins or a premium subscription.
              </p>
            </div>

            <div className="flex flex-col gap-4 w-full">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handlePayCoins}
                disabled={isProcessing}
                className="w-full py-4 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-bold transition-all flex justify-between items-center disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <Coins size={20} className="text-yellow-400" />
                  <span className="text-lg">Pay {cost} Coins</span>
                </div>
                <div className="text-sm text-white/50 font-normal">
                  Balance: {balance}
                </div>
              </motion.button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-white/30 text-xs uppercase tracking-wider">Or</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  onClose();
                  onOpenStore();
                }}
                className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white rounded-2xl font-bold shadow-lg shadow-amber-500/20 transition-all flex justify-center items-center gap-2"
              >
                <Zap size={20} />
                <span className="text-lg">Upgrade to Pro / Premium</span>
              </motion.button>
            </div>

            <p className="text-center text-white/40 text-xs mt-6">
              Unlimited access to all premium features.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
