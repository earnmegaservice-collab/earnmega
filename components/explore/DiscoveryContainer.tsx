import React, { useState, useEffect, useCallback } from 'react';
import DiscoveryRadar, { DiscoveredUser } from './DiscoveryRadar';
import DiscoveryProfile from './DiscoveryProfile';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import {
  fetchUserConnectionsAndRequests,
  sendLoveRequest,
  getRealSubscriptionTier,
  isRealVerified,
  isRealVip,
  isRealPremium,
} from '../../utils/connectionsStore';

interface DiscoveryContainerProps {
  onStartChat: (user: any) => void;
}

export default function DiscoveryContainer({ onStartChat }: DiscoveryContainerProps) {
  const [matchedUser, setMatchedUser] = useState<DiscoveredUser | null>(null);
  const { user: authUser } = useAuth();
  const [acceptedUserIds, setAcceptedUserIds] = useState<Set<string>>(new Set());
  const [sentRequestIds, setSentRequestIds] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);

  const loadConnections = useCallback(async () => {
    if (!authUser?.id) return;
    try {
      const { acceptedUserIds: acc, outgoingPendingIds } = await fetchUserConnectionsAndRequests(
        authUser.id
      );
      setAcceptedUserIds(acc);
      setSentRequestIds(outgoingPendingIds);
    } catch (e) {
      console.error('Error loading connections in DiscoveryContainer:', e);
    }
  }, [authUser?.id]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const handleSkip = () => {
    setMatchedUser(null);
  };

  const handleSendGift = (_user: DiscoveredUser) => {
    toast.success('Premium Gifting Engine coming soon!');
  };

  const openDirectChat = (discoveredUser: DiscoveredUser) => {
    const uname =
      discoveredUser.username || discoveredUser.full_name || discoveredUser.name || 'User';
    onStartChat({
      id: discoveredUser.id,
      name: uname,
      avatarInitials: uname.substring(0, 2).toUpperCase(),
      avatarUrl: discoveredUser.avatar_url,
      bio: discoveredUser.bio || '',
      joinDate: 'Recently',
      tier: getRealSubscriptionTier(discoveredUser),
      isOnline: Boolean((discoveredUser as any).is_online),
      coinsGifted: 0,
      isSelf: false,
      isVerified: isRealVerified(discoveredUser),
      is_vip: isRealVip(discoveredUser),
      is_premium: isRealPremium(discoveredUser),
    });
  };

  const handleChat = async (discoveredUser: DiscoveredUser) => {
    if (!authUser?.id) {
      toast.error('Please sign in first.');
      return;
    }

    const targetUsername =
      discoveredUser.username || discoveredUser.full_name || discoveredUser.name || 'User';

    // If already connected (accepted), navigate cleanly to their existing 1-on-1 DM
    if (acceptedUserIds.has(discoveredUser.id)) {
      openDirectChat(discoveredUser);
      return;
    }

    if (sentRequestIds.has(discoveredUser.id)) {
      toast(`Love request already sent to @${targetUsername}`, { icon: '💌' });
      return;
    }

    setIsSending(true);
    try {
      const senderName =
        authUser.user_metadata?.username ||
        authUser.user_metadata?.full_name ||
        authUser.email?.split('@')[0] ||
        'Someone';

      const result = await sendLoveRequest({
        currentUserId: authUser.id,
        currentUsername: senderName,
        currentUserAvatar: authUser.user_metadata?.avatar_url,
        targetUserId: discoveredUser.id,
        targetUsername,
      });

      if (result.status === 'already_connected') {
        setAcceptedUserIds((prev) => new Set(prev).add(discoveredUser.id));
        openDirectChat(discoveredUser);
        return;
      }

      if (result.status === 'mutual_match') {
        setAcceptedUserIds((prev) => new Set(prev).add(discoveredUser.id));
        toast.success("It's a Match! 🎉", { duration: 4000 });
        openDirectChat(discoveredUser);
        return;
      }

      if (result.status === 'already_sent') {
        setSentRequestIds((prev) => new Set(prev).add(discoveredUser.id));
        toast(`Love request already sent to @${targetUsername}`, { icon: '💌' });
        return;
      }

      setSentRequestIds((prev) => new Set(prev).add(discoveredUser.id));
      toast.success(`Love request sent to @${targetUsername}! ❤️`);
    } catch (error) {
      console.error('Error sending love request from Find:', error);
      setSentRequestIds((prev) => new Set(prev).add(discoveredUser.id));
      toast.success(`Love request sent to @${targetUsername}! ❤️`);
    } finally {
      setIsSending(false);
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
            isRequestSent={sentRequestIds.has(matchedUser.id)}
            isConnected={acceptedUserIds.has(matchedUser.id)}
            isSending={isSending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
