'use client';

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import VerifiedBadge from '../ui/VerifiedBadge';
import { 
  X, Heart, Image as ImageIcon, ArrowUpRight, 
  ChevronDown, MapPin, Briefcase, GraduationCap, 
  Sparkles, Ruler, Zap, Check, MessageCircle
} from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import { toast } from 'react-hot-toast';
import {
  AI_FRIENDS_BOT_ID,
  SUPPORT_BOT_ID,
  fetchUserConnectionsAndRequests,
  sendLoveRequest,
  getRealSubscriptionTier,
  isRealPremium,
  isRealVip,
  isRealVerified,
} from '../../utils/connectionsStore';

// 4K Ultra-Realistic 2026 Category Backgrounds
const CATEGORIES = [
  { id: 'creatives', name: 'Creatives', imageUrl: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=2000&auto=format&fit=crop' },
  { id: 'travel', name: 'Travel', imageUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2000&auto=format&fit=crop' },
  { id: 'nightlife', name: 'Nightlife', imageUrl: 'https://images.unsplash.com/photo-1555096462-c1c5eb4e4d64?q=80&w=2000&auto=format&fit=crop' },
  { id: 'fitness', name: 'Fitness', imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2000&auto=format&fit=crop' },
  { id: 'food', name: 'Foodies', imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2000&auto=format&fit=crop' },
  { id: 'cinema', name: 'Cinema', imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2000&auto=format&fit=crop' },
  { id: 'gaming', name: 'Gaming', imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2000&auto=format&fit=crop' },
  { id: 'fashion', name: 'Fashion', imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2000&auto=format&fit=crop' },
  { id: 'luxury', name: 'Luxury', imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2000&auto=format&fit=crop' },
  { id: 'entrepreneurship', name: 'Entrepreneurship', imageUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=2000&auto=format&fit=crop' },
  { id: 'astrology', name: 'Astrology', imageUrl: 'https://images.unsplash.com/photo-1532968961962-8a0cb3a2d4f5?q=80&w=2000&auto=format&fit=crop' },
  { id: 'arts', name: 'Arts', imageUrl: 'https://images.unsplash.com/photo-1518998053401-878c73041ea2?q=80&w=2000&auto=format&fit=crop' },
];

interface ExploreFeedProps {
  onStartChat: (user: any) => void;
  currentUserProfile: any;
}

export default function ExploreFeed({ onStartChat, currentUserProfile }: ExploreFeedProps) {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [sentRequestIds, setSentRequestIds] = useState<Set<string>>(new Set());
  const [acceptedUserIds, setAcceptedUserIds] = useState<Set<string>>(new Set());
  const [isSendingLove, setIsSendingLove] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    fetchUserConnectionsAndRequests(user.id).then(({ acceptedUserIds: acc, outgoingPendingIds }) => {
      setAcceptedUserIds(new Set(acc));
      setSentRequestIds(new Set(outgoingPendingIds));
    });
  }, [user?.id, selectedCategory]);

  useEffect(() => {
    if (selectedCategory) {
      loadProfilesForCategory();
    }
  }, [selectedCategory]);

  const loadProfilesForCategory = async () => {
    setIsLoading(true);
    try {
      const categoryName = CATEGORIES.find(c => c.id === selectedCategory)?.name || selectedCategory;

      let query = supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id)
        .eq('is_verified', true)
        .or('is_bot.is.null,is_bot.eq.false')
        .contains('interests', [categoryName])
        .limit(20);

      let { data, error } = await query;

      if (!error && (!data || data.length === 0)) {
        const fallbackQuery = await supabase
          .from('profiles')
          .select('*')
          .neq('id', user?.id)
          .or('is_bot.is.null,is_bot.eq.false')
          .limit(20);
        data = fallbackQuery.data;
      }

      if (error) throw error;
      const humanUsers = (data || []).filter(
        u =>
          u.id !== user?.id &&
          u.id !== AI_FRIENDS_BOT_ID &&
          u.id !== SUPPORT_BOT_ID &&
          u.is_bot !== true &&
          !(u.username || u.full_name || '').toLowerCase().includes('support')
      );
      setProfiles(humanUsers);
      setCurrentProfileIndex(0);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    if (currentProfileIndex < profiles.length - 1) {
      setCurrentProfileIndex(prev => prev + 1);
    } else {
      setSelectedCategory(null);
    }
  };

  const buildCleanChatTarget = (profile: any) => {
    const displayName = profile.username || profile.full_name || profile.name || 'User';
    return {
      id: profile.id,
      name: displayName,
      username: profile.username || displayName,
      avatarInitials: displayName.slice(0, 2).toUpperCase(),
      avatarUrl: profile.avatar_url,
      bio: profile.bio || 'EarnMega user',
      joinDate: profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Recent',
      // PHASE 5: Strictly real badge status from DB
      tier: getRealSubscriptionTier(profile),
      is_premium: isRealPremium(profile),
      is_vip: isRealVip(profile),
      subscription_tier: profile.subscription_tier || 'free',
      isVerified: isRealVerified(profile),
      is_verified: isRealVerified(profile),
      isOnline: true,
      coinsGifted: profile.coins_gifted || 0,
      isSelf: false,
    };
  };

  // PHASE 2: Unified Love Request System in Explore
  const handleLike = async (profile: any) => {
    if (!user || !profile?.id || isSendingLove) return;

    const targetUsername = profile.username || profile.full_name || profile.name || 'User';

    // 3. If already connected (status === 'accepted'), navigate cleanly to their existing 1-on-1 DM
    if (acceptedUserIds.has(profile.id)) {
      onStartChat(buildCleanChatTarget(profile));
      return;
    }

    // If request already sent, inform user smoothly
    if (sentRequestIds.has(profile.id)) {
      toast(`Love request already sent to @${targetUsername}! ❤️`, { icon: '💌' });
      return;
    }

    setIsSendingLove(true);
    try {
      const myUsername =
        currentUserProfile?.name ||
        currentUserProfile?.username ||
        user.user_metadata?.username ||
        user.email?.split('@')[0] ||
        'User';

      const result = await sendLoveRequest({
        currentUserId: user.id,
        currentUsername: myUsername,
        currentUserAvatar: currentUserProfile?.avatarUrl,
        targetUserId: profile.id,
        targetUsername,
      });

      if (result.status === 'already_connected') {
        setAcceptedUserIds(prev => new Set(prev).add(profile.id));
        onStartChat(buildCleanChatTarget(profile));
        return;
      }

      if (result.status === 'mutual_match') {
        // Smart Mutual Match upgrade!
        setAcceptedUserIds(prev => new Set(prev).add(profile.id));
        toast.success("It's a Match! 🎉");
        onStartChat(buildCleanChatTarget(profile));
        return;
      }

      // Request sent (pending approval) — do NOT open 1-on-1 DM chat yet
      setSentRequestIds(prev => new Set(prev).add(profile.id));
      toast.success(`Love request sent to @${targetUsername}! ❤️`);
    } catch (err) {
      console.error('Error sending love request:', err);
      toast.error('Could not send request right now. Please try again.');
    } finally {
      setIsSendingLove(false);
    }
  };

  if (selectedCategory && profiles.length > 0) {
    const activeProfile = profiles[currentProfileIndex];
    const isAlreadyConnected = acceptedUserIds.has(activeProfile?.id);
    const isRequestSent = sentRequestIds.has(activeProfile?.id);

    return (
      <ProfileView
        activeProfile={activeProfile}
        onSkip={handleSkip}
        onLike={handleLike}
        onClose={() => setSelectedCategory(null)}
        isConnected={isAlreadyConnected}
        isRequestSent={isRequestSent}
        isSendingLove={isSendingLove}
      />
    );
  }

  return <ExploreFeedCategories onSelect={setSelectedCategory} />;
}

// Subcomponent to handle hooks for ProfileUI
function ProfileView({
  activeProfile,
  onSkip,
  onLike,
  onClose,
  isConnected,
  isRequestSent,
  isSendingLove,
}: {
  activeProfile: any;
  onSkip: () => void;
  onLike: (p: any) => void;
  onClose: () => void;
  isConnected?: boolean;
  isRequestSent?: boolean;
  isSendingLove?: boolean;
}) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showSparkExplosion, setShowSparkExplosion] = useState(false);
  const { balance, setBalance } = useWallet();

  useEffect(() => {
    setCurrentPhotoIndex(0);
  }, [activeProfile?.id]);

  const handleSpark = () => {
    if (balance >= 1) {
      setBalance(balance - 1);
    }
    setShowSparkExplosion(true);
    toast.success('⚡ Spark Sent!');
    setTimeout(() => {
      setShowSparkExplosion(false);
      onLike(activeProfile);
    }, 1200);
  };

  const rawPhotos = activeProfile?.publicImages || activeProfile?.profile_images || [];
  const profilePhotos =
    rawPhotos.length > 0
      ? rawPhotos.slice(0, 6)
      : activeProfile?.avatar_url
      ? [activeProfile.avatar_url]
      : [];

  const hasPhotos = profilePhotos.length > 0;
  const displayImage = hasPhotos ? profilePhotos[currentPhotoIndex] : null;

  const handlePhotoTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hasPhotos || profilePhotos.length <= 1) return;

    const { clientX } = e;
    const screenWidth = window.innerWidth;

    if (clientX < screenWidth * 0.3) {
      setCurrentPhotoIndex(prev => Math.max(0, prev - 1));
    } else {
      setCurrentPhotoIndex(prev => Math.min(profilePhotos.length - 1, prev + 1));
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([30, 50, 30]);
    }
  }, [activeProfile.id]);

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: scrollContainerRef });
  const bgScale = useTransform(scrollY, [0, 500], [1, 0.9]);
  const bgOpacity = useTransform(scrollY, [0, 500], [1, 0.3]);

  const realVerified = isRealVerified(activeProfile);
  const realVip = isRealVip(activeProfile);
  const realPremium = isRealPremium(activeProfile);

  const profileContent = (
    <div ref={scrollContainerRef} className="fixed inset-0 z-[99999] bg-black overflow-y-auto overflow-x-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeProfile.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative min-h-[150vh] w-full flex flex-col bg-[#0a0a0c]"
        >
          {/* 1. 100vh FULL SCREEN HERO IMAGE */}
          <motion.div style={{ scale: bgScale, opacity: bgOpacity }} className="relative h-[100dvh] w-full shrink-0 origin-top">
            <div className="absolute inset-0 z-0" onClick={handlePhotoTap}>
              {displayImage ? (
                <img
                  src={displayImage}
                  alt={activeProfile.username}
                  className="w-full h-full object-cover transition-all duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center">
                  <ImageIcon size={80} className="text-white/20" />
                </div>
              )}
              <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 inset-x-0 h-[40vh] bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/80 to-transparent pointer-events-none" />
            </div>

            {profilePhotos.length > 1 && (
              <div className="absolute top-3 left-3 right-3 flex gap-1.5 z-50">
                {profilePhotos.map((_: any, idx: number) => (
                  <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: idx <= currentPhotoIndex ? '100%' : '0%' }}
                      transition={{ duration: 0.3 }}
                      className="h-full bg-white rounded-full shadow-[0_0_8px_white]"
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={onClose}
              className="absolute top-8 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/20 z-50 shadow-xl"
            >
              <X size={20} />
            </button>

            {/* Core Info */}
            <div className="absolute bottom-[110px] left-0 right-0 px-6 z-10 text-white pointer-events-none pb-6">
              <div className="flex items-center gap-3 mb-2 drop-shadow-2xl flex-wrap">
                <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-white drop-shadow-2xl">
                  {activeProfile.username || activeProfile.full_name}
                  {activeProfile.age ? <span className="font-light">, {activeProfile.age}</span> : null}
                </h2>
                {realVerified && <VerifiedBadge />}
                {realVip && (
                  <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-[10px] font-black uppercase tracking-widest">
                    VIP
                  </span>
                )}
                {!realVip && realPremium && (
                  <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-[10px] font-black uppercase tracking-widest">
                    PREMIUM
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-white/90 font-medium drop-shadow-md mb-4">
                <MapPin size={16} className="text-emerald-400" />
                <span className="text-sm">
                  {activeProfile.country || activeProfile.location || 'Global Network'} • {activeProfile.intent || 'Looking to connect'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* 2. SCROLLABLE DEEP PROFILE SHEET */}
          {!activeProfile.bio && !activeProfile.prompt_1_a && !activeProfile.prompt_2_a && !activeProfile.prompt_3_a ? null : (
            <div className="bg-[#050505]/75 backdrop-blur-[50px] border-t border-white/10 rounded-t-[48px] px-8 pt-10 pb-40 w-full mt-[-100px] relative z-40 shadow-[0_-40px_100px_rgba(0,0,0,0.9)]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-fuchsia-500/20 blur-[100px] pointer-events-none -z-10 rounded-full"></div>

              <div className="w-full flex justify-center mb-8">
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="opacity-50"
                >
                  <ChevronDown size={28} />
                </motion.div>
              </div>

              <div className="flex flex-col gap-6">
                {activeProfile.bio && (
                  <div className="mb-4">
                    <p className="text-xl font-medium text-slate-200 leading-relaxed tracking-wide drop-shadow-lg">
                      {activeProfile.bio}
                    </p>
                  </div>
                )}

                {activeProfile.prompt_1_a && (
                  <div className="bg-transparent relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={60} /></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-rose-400 mb-2 block">{activeProfile.prompt_1_q}</span>
                    <p className="text-3xl font-black text-white leading-none tracking-tighter drop-shadow-xl mb-8">
                      {activeProfile.prompt_1_a}
                    </p>
                  </div>
                )}

                {activeProfile.prompt_2_a && (
                  <div className="bg-transparent relative overflow-hidden">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-rose-400 mb-2 block">{activeProfile.prompt_2_q}</span>
                    <p className="text-3xl font-black text-white leading-none tracking-tighter drop-shadow-xl mb-8">
                      {activeProfile.prompt_2_a}
                    </p>
                  </div>
                )}

                {activeProfile.prompt_3_a && (
                  <div className="bg-transparent relative overflow-hidden">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-rose-400 mb-2 block">{activeProfile.prompt_3_q}</span>
                    <p className="text-3xl font-black text-white leading-none tracking-tighter drop-shadow-xl mb-8">
                      {activeProfile.prompt_3_a}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-4">Essentials</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {activeProfile.job_title && (
                      <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                        <Briefcase size={20} className="text-cyan-400" />
                        <span className="text-sm font-medium text-white">{activeProfile.job_title}</span>
                      </div>
                    )}
                    {activeProfile.education && (
                      <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                        <GraduationCap size={20} className="text-purple-400" />
                        <span className="text-sm font-medium text-white">{activeProfile.education}</span>
                      </div>
                    )}
                    {activeProfile.height && (
                      <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                        <Ruler size={20} className="text-pink-400" />
                        <span className="text-sm font-medium text-white">{activeProfile.height} cm</span>
                      </div>
                    )}
                    {activeProfile.zodiac_sign && (
                      <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                        <Sparkles size={20} className="text-yellow-400" />
                        <span className="text-sm font-medium text-white">{activeProfile.zodiac_sign}</span>
                      </div>
                    )}
                  </div>
                </div>

                {(activeProfile.interests || []).length > 0 && (
                  <div>
                    <h3 className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-4">Lifestyle</h3>
                    <div className="flex flex-wrap gap-3">
                      {activeProfile.interests.map((interest: string, idx: number) => (
                        <span key={idx} className="bg-white/10 border border-white/5 text-white font-semibold rounded-full px-4 py-2 flex items-center gap-2">{interest}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. FLOATING ACTION BUTTONS */}
          <div className="fixed bottom-8 left-0 right-0 flex justify-center gap-5 px-6 z-[100000] pointer-events-none items-center">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onSkip}
              className="pointer-events-auto w-[64px] h-[64px] rounded-full bg-slate-900/80 backdrop-blur-2xl border-2 border-white/10 flex items-center justify-center text-gray-300 shadow-[0_10px_40px_rgba(0,0,0,0.5)] hover:bg-slate-800 transition-colors"
              title="Next Profile"
            >
              <X size={30} strokeWidth={2.5} />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleSpark}
              disabled={isRequestSent || isSendingLove}
              className="pointer-events-auto w-14 h-14 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(245,158,11,0.6)] border border-amber-300 hover:scale-105 transition-transform relative overflow-hidden disabled:opacity-50"
            >
              <Zap size={28} fill="currentColor" className="text-white drop-shadow-md" />
              {showSparkExplosion && (
                <motion.div
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: 5, opacity: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="absolute inset-0 bg-yellow-300 rounded-full"
                />
              )}
            </motion.button>

            {isConnected ? (
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => onLike(activeProfile)}
                className="pointer-events-auto h-[64px] px-6 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center gap-2 text-white font-black text-sm uppercase tracking-wider shadow-[0_10px_40px_rgba(16,185,129,0.5)] border-2 border-emerald-300"
              >
                <MessageCircle size={22} />
                <span>Open Chat</span>
              </motion.button>
            ) : isRequestSent ? (
              <motion.button
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                disabled
                className="pointer-events-auto h-[64px] px-6 rounded-full bg-rose-500/25 backdrop-blur-2xl border-2 border-rose-400/60 flex items-center justify-center gap-2 text-rose-200 font-black text-xs uppercase tracking-wider shadow-[0_10px_40px_rgba(244,63,94,0.3)]"
              >
                <Check size={20} strokeWidth={3} className="text-rose-400" />
                <span>Request Sent</span>
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.85 }}
                disabled={isSendingLove}
                onClick={() => onLike(activeProfile)}
                className="pointer-events-auto w-[64px] h-[64px] rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white shadow-[0_10px_50px_rgba(244,63,94,0.6)] border-2 border-rose-400 hover:scale-105 transition-transform disabled:opacity-60"
                title="Send Love Request"
              >
                <Heart size={30} fill="currentColor" />
              </motion.button>
            )}
          </div>
        </motion.div>

        <AnimatePresence>
          {showSparkExplosion && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100001] pointer-events-none flex items-center justify-center"
            >
              <div className="relative w-full h-full">
                {[...Array(20)].map((_, i) => {
                  const angle = (Math.PI * 2 * i) / 20;
                  const velocity = 150 + Math.random() * 150;
                  const tx = Math.cos(angle) * velocity;
                  const ty = Math.sin(angle) * velocity;
                  return (
                    <motion.div
                      key={i}
                      initial={{ x: '50vw', y: '80vh', scale: 1, opacity: 1 }}
                      animate={{ x: `calc(50vw + ${tx}px)`, y: `calc(80vh + ${ty}px)`, scale: 0, opacity: 0 }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="absolute w-4 h-4 bg-yellow-400 rounded-full shadow-[0_0_15px_rgba(250,204,21,1)]"
                    />
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </AnimatePresence>
    </div>
  );

  return typeof window !== 'undefined'
    ? (ReactDOM.createPortal(profileContent, document.body) as React.ReactElement)
    : null;
}

function ExploreFeedCategories({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="flex-1 overflow-y-auto w-full max-w-full bg-black">
      <div className="px-5 mt-6 mb-2">
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tight drop-shadow-lg">Explore</h2>
        <p className="text-sm text-gray-500 font-medium mt-1">Discover 4K Live Hubs</p>
      </div>

      <div className="grid grid-cols-2 gap-4 px-4 pb-32 pt-4">
        {CATEGORIES.map((cat, i) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 100 }}
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`group relative rounded-[2rem] overflow-hidden cursor-pointer ${i % 3 === 0 ? 'col-span-2 aspect-[16/9]' : 'col-span-1 aspect-[4/5]'} shadow-2xl border border-white/10`}
          >
            <img
              src={cat.imageUrl}
              alt={cat.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110 opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent transition-opacity duration-500 group-hover:opacity-80" />
            <div className="absolute bottom-0 left-0 w-full p-5 flex justify-between items-end">
              <div>
                <h3 className="text-white font-black text-2xl tracking-tighter drop-shadow-xl">{cat.name}</h3>
                <span className="text-white/70 text-[10px] uppercase tracking-[0.2em] font-black mt-1 block group-hover:text-yellow-400 transition-colors duration-300">Live Hub</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:bg-white group-hover:text-black transition-all">
                <ArrowUpRight size={20} strokeWidth={3} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
