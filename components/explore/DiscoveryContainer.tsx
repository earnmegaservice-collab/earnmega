import React, { useState } from 'react';
import DiscoveryRadar, { DiscoveredUser } from './DiscoveryRadar';
import DiscoveryProfile from './DiscoveryProfile';
import { useWallet } from '../../context/WalletContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';

interface DiscoveryContainerProps {
  onStartChat: (user: any) => void;
}

export default function DiscoveryContainer({ onStartChat }: DiscoveryContainerProps) {
  const [matchedUser, setMatchedUser] = useState<DiscoveredUser | null>(null);
  const { balance, setBalance } = useWallet();
  const { user: authUser } = useAuth();

  const handleSkip = () => {
    setMatchedUser(null);
  };

  const handleSendGift = (user: DiscoveredUser) => {
    // Usually this would open the GiftModal
    toast.success('Premium Gifting Engine coming soon!');
  };

  const handleChat = async (discoveredUser: DiscoveredUser) => {
    try {
      // Manual deduction logic in absence of deductCoins helper
      if (balance < 10) throw new Error('Insufficient coins');

      const { error } = await supabase.rpc('deduct_coins', {
        user_id: authUser?.id,
        amount: 10
      });
      if (error) throw error;
      setBalance(prev => prev - 10);

      onStartChat(discoveredUser);

    } catch (error) {
      toast.error("Insufficient coins for premium chat.");
    }
  };

  return (
    <div className="relative w-full h-full">
      <AnimatePresence mode="wait">
        {!matchedUser ? (
          <DiscoveryRadar key="radar" onMatchFound={setMatchedUser} />
        ) : (
          <DiscoveryProfile
            key="profile"
            user={matchedUser}
            onSkip={handleSkip}
            onSendGift={handleSendGift}
            onChat={handleChat}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
