'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Heart, X, CheckCircle, Check } from 'lucide-react';
import { LiveSpatialRadarCard } from '../location/LiveSpatialRadarCard';
import {
  isRealVip,
  isRealPremium,
  isRealVerified,
  insertScopedNotification,
  ConnectionRequestItem,
} from '../../utils/connectionsStore';

export type SubscriptionTier = 'FREE' | 'PRO' | 'PREMIUM' | 'VIP';

export interface UserProfileDetails {
  id: string;
  name: string;
  username?: string;
  avatarInitials: string;
  avatarUrl?: string;
  bio: string;
  joinDate: string;
  tier: SubscriptionTier;
  isOnline: boolean;
  last_seen?: string;
  coinsGifted: number;
  isSelf: boolean;
  ghost_mode?: boolean;
  isVerified?: boolean;
  is_verified?: boolean;
  is_premium?: boolean;
  is_vip?: boolean;
  subscription_tier?: string;
  age?: number;
  country?: string;
  location?: string;
  unreadCount?: number;
  lastMessageTime?: number;
  isGroup?: boolean;
  is_bot?: boolean;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfileDetails | null;
  onUpgradeClick: () => void;
  pendingRequest?: ConnectionRequestItem | null;
  onAcceptRequest?: (req: ConnectionRequestItem) => Promise<void> | void;
  onDeclineRequest?: (req: ConnectionRequestItem) => Promise<void> | void;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  user,
  onUpgradeClick,
  pendingRequest,
  onAcceptRequest,
  onDeclineRequest,
}: UserProfileModalProps) {
  const [hasUnviewedStatus, setHasUnviewedStatus] = React.useState(false);
  const [hasStatus, setHasStatus] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [fullProfile, setFullProfile] = React.useState<any>(null);
  const [isProcessingRequest, setIsProcessingRequest] = React.useState(false);

  React.useEffect(() => {
    import('../../utils/supabase').then(({ supabase }) => {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          setCurrentUser(data.user);
        }
      });
    });
  }, []);

  React.useEffect(() => {
    if (!user) {
      setFullProfile(null);
      return;
    }

    // Fetch full profile details from Supabase
    import('../../utils/supabase').then(async ({ supabase }) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (!error && data) {
        setFullProfile(data);
      }
    });

    if (!currentUser) return;

    import('../../utils/supabase').then(async ({ supabase }) => {
      if (user.id !== currentUser.id && !user.is_bot) {
        try {
          await insertScopedNotification({
            recipientId: user.id,
            senderId: currentUser.id,
            type: 'PROFILE_VIEW',
            message: 'Viewed your profile',
          });
        } catch (e) {}
      }
      const checkStatuses = async () => {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: statuses } = await supabase
          .from('statuses')
          .select('id')
          .eq('user_id', user.id)
          .gt('created_at', twentyFourHoursAgo);

        if (statuses && statuses.length > 0) {
          setHasStatus(true);
          const { data: views } = await supabase
            .from('status_views')
            .select('status_id')
            .eq('user_id', currentUser.id);

          const viewedIds = new Set(views?.map((v: any) => v.status_id) || []);
          const allViewed = statuses.every((s: any) => viewedIds.has(s.id));
          setHasUnviewedStatus(!allViewed);
        } else {
          setHasStatus(false);
        }
      };

      checkStatuses();
    });
  }, [user, currentUser]);

  if (!isOpen || !user) return null;

  // PHASE 5: Strictly evaluate real database profile fields for VIP / PREMIUM / Verified
  const mergedProfile = fullProfile || user;
  const realVip = isRealVip(mergedProfile);
  const realPremium = isRealPremium(mergedProfile);
  const realVerified = isRealVerified(mergedProfile);

  // Gather photos
  const rawPhotos = fullProfile?.publicImages || fullProfile?.profile_images || [];
  let photos = rawPhotos.length > 0 ? rawPhotos.slice(0, 6) : user.avatarUrl ? [user.avatarUrl] : [];
  if (photos.length === 0 && fullProfile?.avatar_url) {
    photos = [fullProfile.avatar_url];
  }

  // Gather real attributes / tags
  const tags: string[] = [];

  const ignoredKeys = [
    'id',
    'user_id',
    'created_at',
    'updated_at',
    'avatar_url',
    'publicImages',
    'profile_images',
    'name',
    'full_name',
    'username',
    'email',
    'tier',
    'subscription_tier',
    'is_premium',
    'is_vip',
    'bio',
    'prompt_1_q',
    'prompt_1_a',
    'prompt_2_q',
    'prompt_2_a',
    'prompt_3_q',
    'prompt_3_a',
    'is_verified',
    'isVerified',
    'facial_verified',
    'is_location_active',
    'location_city',
    'location_country',
    'coins_gifted',
    'coin_balance',
    'coins',
    'ghost_mode',
    'last_seen',
    'is_bot',
    'bot_role',
    'bot_type',
    'notifications_muted',
    'age',
    'location',
    'country',
  ];

  if (fullProfile) {
    if (Array.isArray(fullProfile.interests)) {
      for (const item of fullProfile.interests) {
        if (item) tags.push(String(item));
      }
    }
    for (const [key, value] of Object.entries(fullProfile)) {
      if (ignoredKeys.includes(key)) continue;
      if (!value) continue;
      if (typeof value === 'string' || typeof value === 'number') {
        if (key === 'intent') tags.push(`Looking for ${value}`);
        else if (key === 'zodiac_sign' || key === 'zodiac') tags.push(`♈ ${value}`);
        else if (key === 'hobbies' || key === 'languages_spoken') {
          if (typeof value === 'string') {
            const items = value
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean);
            tags.push(...items);
          }
        } else {
          tags.push(String(value));
        }
      }
    }
  }

  if (fullProfile?.attributes) {
    const allAttributes = Object.entries(fullProfile.attributes || {}).filter(
      ([, val]) => val !== null && val !== ''
    );
    for (const [, val] of allAttributes) {
      if (typeof val === 'string' || typeof val === 'number') {
        tags.push(String(val));
      }
    }
  }

  const uniqueTags = Array.from(new Set(tags));
  const displayLocation =
    fullProfile?.location || fullProfile?.country || fullProfile?.location_country || user.country || user.location;
  const displayAge = fullProfile?.age || user.age;
  const displayBio = fullProfile?.bio || user.bio;

  return (
    <AnimatePresence>
      {isOpen && user && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-[#020202] overflow-y-auto overflow-x-hidden"
        >
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative min-h-[120vh] w-full flex flex-col pb-28"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="fixed top-6 right-6 w-10 h-10 bg-black/60 hover:bg-black/80 border border-white/15 rounded-full flex items-center justify-center text-white backdrop-blur-xl transition-colors z-[100] shadow-lg"
            >
              <X size={20} strokeWidth={2.5} />
            </button>

            {/* 1. THE EDGE-TO-EDGE "AURA" HERO */}
            <div className="relative w-full h-[55vh] flex-shrink-0">
              {photos.length > 0 ? (
                <motion.img
                  src={photos[0]}
                  className="absolute inset-0 w-full h-full object-cover z-0"
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                />
              ) : (
                <div className="absolute inset-0 w-full h-full bg-slate-900 flex items-center justify-center z-0">
                  <span className="text-6xl font-bold text-white/20">{user.avatarInitials}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/60 to-transparent z-10" />

              {/* The Identity Lockup */}
              <div className="absolute bottom-6 left-0 w-full px-6 z-20">
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)]">
                    {fullProfile?.username || fullProfile?.full_name || user.name}
                  </h1>
                  {realVerified && (
                    <CheckCircle
                      size={28}
                      className="fill-blue-500 text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)]"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* 2. THE FLOATING "BLACK CARD" */}
            <div className="mx-6 -mt-8 relative z-30 flex items-center justify-between p-5 rounded-2xl bg-white/5 backdrop-blur-3xl border border-white/10 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.7)]">
              <div className="flex flex-col">
                {displayLocation ? (
                  <div className="flex items-center gap-1.5 text-white/90 font-medium">
                    <MapPin size={16} className="text-rose-400" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400 font-bold">
                      {displayLocation}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-white/60 font-medium">Member Profile</span>
                )}
                {displayAge && (
                  <span className="text-sm bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400 font-medium mt-1">
                    Age {displayAge}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end">
                {/* PHASE 5: Render VIP or PREMIUM badge ONLY if real DB upgrade exists */}
                {realVip && (
                  <div className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(251,191,36,0.4)]">
                    VIP
                  </div>
                )}
                {!realVip && realPremium && (
                  <div className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(251,191,36,0.4)]">
                    PREMIUM
                  </div>
                )}
                {user.isOnline && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                    <span className="text-xs font-bold text-green-400 uppercase tracking-wider">Online</span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. THE 6-IMAGE CINEMATIC VAULT */}
            {photos.length > 1 && (
              <div className="mx-6 mt-8 p-[1px] rounded-3xl bg-gradient-to-br from-fuchsia-600/40 via-transparent to-cyan-600/40">
                <div className="bg-[#020202] rounded-[23px] p-4 grid grid-cols-3 gap-2">
                  {photos.map((photo: string, idx: number) => (
                    <motion.div
                      key={idx}
                      whileTap={{ scale: 0.93 }}
                      className="aspect-[4/5] rounded-xl overflow-hidden ring-1 ring-white/10 shadow-inner relative group cursor-pointer"
                    >
                      <img src={photo} className="w-full h-full object-cover" alt="Vault image" />
                      <div className="absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. LUXURY ATTRIBUTES & BIO */}
            <div className="px-6 pt-8 flex flex-col gap-8">
              {/* PHASE 7: Live Spatial Radar Card (10 Coins Curiosity Paywall) */}
              <LiveSpatialRadarCard
                profile={mergedProfile}
                isSelf={Boolean(user.isSelf || (currentUser && currentUser.id === user.id))}
              />

              {displayBio && (
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                  <span className="text-[10px] text-fuchsia-400 font-bold uppercase tracking-widest mb-3 block">
                    About Me
                  </span>
                  <p className="text-xl font-medium text-slate-100 leading-relaxed tracking-wide">
                    {displayBio}
                  </p>
                </div>
              )}

              {uniqueTags.length > 0 && (
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: { staggerChildren: 0.1 },
                    },
                  }}
                >
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Attributes</h3>
                  <div
                    className="flex overflow-x-auto gap-3 pb-4 hide-scrollbar snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {uniqueTags.map((tag, idx) => (
                      <motion.div
                        key={idx}
                        variants={{
                          hidden: { opacity: 0, y: 20 },
                          visible: {
                            opacity: 1,
                            y: 0,
                            transition: { type: 'spring', damping: 20, stiffness: 200 },
                          },
                        }}
                        className="snap-start flex-shrink-0 px-6 py-3 rounded-full bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.04)] hover:border-fuchsia-500/50 transition-colors"
                      >
                        <span className="text-white/95 font-bold text-sm tracking-wide">{tag}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Deep Prompts */}
              {fullProfile?.prompt_1_a && (
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 relative overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                  <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-3 block">
                    {fullProfile.prompt_1_q || 'Prompt 1'}
                  </span>
                  <p className="text-lg font-medium text-white/90 leading-relaxed">
                    {fullProfile.prompt_1_a}
                  </p>
                </div>
              )}

              {fullProfile?.prompt_2_a && (
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 relative overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                  <span className="text-[10px] text-pink-400 font-bold uppercase tracking-widest mb-3 block">
                    {fullProfile.prompt_2_q || 'Prompt 2'}
                  </span>
                  <p className="text-lg font-medium text-white/90 leading-relaxed">
                    {fullProfile.prompt_2_a}
                  </p>
                </div>
              )}
            </div>

            {/* PHASE 3: Incoming Love Request Decision Bar inside Profile Inspection Modal */}
            {pendingRequest && (onAcceptRequest || onDeclineRequest) && (
              <div className="fixed bottom-0 left-0 right-0 z-[110] p-4 bg-black/90 backdrop-blur-2xl border-t border-rose-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Heart size={18} className="text-rose-500 fill-rose-500 flex-shrink-0" />
                  <span className="text-xs font-bold text-white truncate">
                    {user.name} sent you a Love request
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {onDeclineRequest && (
                    <button
                      disabled={isProcessingRequest}
                      onClick={async () => {
                        setIsProcessingRequest(true);
                        try {
                          await onDeclineRequest(pendingRequest);
                          onClose();
                        } finally {
                          setIsProcessingRequest(false);
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-rose-500/20 text-white/80 hover:text-rose-300 text-xs font-bold uppercase tracking-wider transition-all"
                    >
                      Decline
                    </button>
                  )}
                  {onAcceptRequest && (
                    <button
                      disabled={isProcessingRequest}
                      onClick={async () => {
                        setIsProcessingRequest(true);
                        try {
                          await onAcceptRequest(pendingRequest);
                          onClose();
                        } finally {
                          setIsProcessingRequest(false);
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.5)] flex items-center gap-1.5 transition-all"
                    >
                      <Check size={15} strokeWidth={3} />
                      <span>{isProcessingRequest ? 'Accepting...' : 'Accept & Chat'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
