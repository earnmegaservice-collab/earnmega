import React from 'react';
import { useWallet } from '../../context/WalletContext';

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  onGiftSent: (giftData: any) => void;
}

const GIFTS = [
  { id: 'coffee', name: 'Coffee', icon: '☕', cost: 10 },
  { id: 'rose', name: 'Rose', icon: '🌹', cost: 50 },
  { id: 'diamond', name: 'Diamond', icon: '💎', cost: 500 },
  { id: 'crown', name: 'Crown', icon: '👑', cost: 1000 },
];

export default function GiftModal({ isOpen, onClose, recipientId, onGiftSent }: GiftModalProps) {
  const { balance, setBalance } = useWallet();

  if (!isOpen) return null;

  const handleSendGift = (gift: any) => {
    if (balance >= gift.cost) {
      setBalance(prev => prev - gift.cost);
      onGiftSent(gift);
      onClose();
    } else {
      alert('Not enough coins!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Send a Gift</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
             ✕
          </button>
        </div>

        <div className="text-center mb-6 text-sm text-gray-400">
          Your balance: <span className="font-bold text-yellow-500">{balance} Coins</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {GIFTS.map(gift => (
            <button
              key={gift.id}
              onClick={() => handleSendGift(gift)}
              className="flex flex-col items-center justify-center p-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl transition-all"
            >
              <span className="text-3xl mb-2">{gift.icon}</span>
              <span className="text-sm font-bold text-white">{gift.name}</span>
              <span className="text-xs text-yellow-500 mt-1">{gift.cost} Coins</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
