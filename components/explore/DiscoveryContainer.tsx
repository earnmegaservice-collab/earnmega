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
      if (!authUser) throw new Error('Not authenticated');

      // 1. Create a group chat instantly in public.rooms (mocking 1-on-1 for this UI)
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          name: `Chat with ${discoveredUser.username}`,
          created_by: authUser.id,
          type: 'direct',
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // 2. Add both participants
      const { error: partError } = await supabase
        .from('room_participants')
        .insert([
          { room_id: room.id, user_id: authUser.id, role: 'admin' },
          { room_id: room.id, user_id: discoveredUser.id, role: 'member' }
        ]);

      if (partError) throw partError;

      // 3. Initiate navigation
      onStartChat({
        id: discoveredUser.id,
        name: discoveredUser.username,
        avatarUrl: discoveredUser.avatar_url,
        bio: discoveredUser.bio,
        roomId: room.id // Passing the newly created room ID to the chat interface
      });

    } catch (error) {
      console.error(error);
      toast.error("Failed to initiate chat connection.");
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
