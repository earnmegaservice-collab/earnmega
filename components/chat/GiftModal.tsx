import React from 'react';
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
  const { balance, setBalance } = useWallet();
  const [showError, setShowError] = React.useState(false);

  if (!isOpen) return null;

  const handleSendGift = (gift: any) => {
    if (balance >= gift.cost) {
      setBalance(prev => prev - gift.cost);
      onGiftSent(gift);
      onClose();
    } else {
      setShowError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Send a Gift</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
             ✕
          </button>
        </div>

        <div className="text-center mb-6 text-sm text-gray-400">
          Your balance: <span className="font-bold text-yellow-500">{balance} Coins</span>
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

        <div className="grid grid-cols-2 gap-4">
          {GIFTS.map(gift => (
            <motion.button
              whileTap={{ scale: 0.95 }}
              key={gift.id}
              onClick={() => handleSendGift(gift)}
              className="flex flex-col items-center justify-center p-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl transition-all"
            >
              <div className="mb-2">{gift.icon}</div>
              <span className="text-sm font-bold text-white">{gift.name}</span>
              <span className="text-xs text-yellow-500 mt-1">{gift.cost} Coins</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
