'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Briefcase, GraduationCap, Sparkles, MessageSquare, Globe, User, Heart, X, CheckCircle, Camera } from 'lucide-react';

type SubscriptionTier = 'FREE' | 'PRO' | 'PREMIUM';

export interface UserProfileDetails {
  id: string;
  name: string;
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
  unreadCount?: number;
  lastMessageTime?: number;
  isGroup?: boolean;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfileDetails | null;
  onUpgradeClick: () => void;
}

export default function UserProfileModal({ isOpen, onClose, user, onUpgradeClick }: UserProfileModalProps) {
  if (!isOpen || !user) return null;

  const [hasUnviewedStatus, setHasUnviewedStatus] = React.useState(false);
  const [hasStatus, setHasStatus] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [fullProfile, setFullProfile] = React.useState<any>(null);

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
    if (!user) return;

    // Fetch full profile details
    import('../../utils/supabase').then(async ({ supabase }) => {
       const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
       if (!error && data) {
           setFullProfile(data);
       }
    });

    if (!currentUser) return;

    import('../../utils/supabase').then(async ({ supabase }) => {
      // Profile View Notification logic
      if (user.id !== currentUser.id) {
          try {
              const { data } = await supabase.from('notifications')
                  .select('id').eq('type', 'PROFILE_VIEW').eq('user_id', user.id).eq('actor_id', currentUser.id)
                  .gte('created_at', new Date(Date.now() - 86400000).toISOString()).limit(1);
              if (!data || data.length === 0) {
                  await supabase.from('notifications').insert({
                      user_id: user.id,
                      actor_id: currentUser.id,
                      type: 'PROFILE_VIEW',
                      content: 'Viewed your profile'
                  });
              }
          } catch(e) {}
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

          const viewedIds = new Set(views?.map(v => v.status_id) || []);
          const allViewed = statuses.every(s => viewedIds.has(s.id));
          setHasUnviewedStatus(!allViewed);
        } else {
          setHasStatus(false);
        }
      };

      checkStatuses();
    });
  }, [user, currentUser]);

  const isProOrHigher = user.tier === 'PRO' || user.tier === 'PREMIUM';
  const isPremium = user.tier?.toLowerCase() === 'premium' || user.tier?.toLowerCase() === 'pro';

  // Gather photos
  const rawPhotos = fullProfile?.publicImages || fullProfile?.profile_images || [];
  let photos = rawPhotos.length > 0 ? rawPhotos.slice(0, 6) : (user.avatarUrl ? [user.avatarUrl] : []);
  if (photos.length === 0 && fullProfile?.avatar_url) {
      photos = [fullProfile.avatar_url];
  }

  // Gather tags
  const tags: string[] = [];

  // Map through ALL available demographic, attribute, and lifestyle fields
  const ignoredKeys = ['id', 'user_id', 'created_at', 'updated_at', 'avatar_url', 'publicImages', 'profile_images', 'name', 'username', 'email', 'tier', 'bio', 'prompt_1_q', 'prompt_1_a', 'prompt_2_q', 'prompt_2_a', 'prompt_3_q', 'prompt_3_a', 'is_verified', 'is_location_active', 'location_city', 'location_country', 'coins_gifted', 'ghost_mode', 'last_seen'];
  if (fullProfile) {
     for (const [key, value] of Object.entries(fullProfile)) {
        if (ignoredKeys.includes(key)) continue;
        if (!value) continue;
        if (typeof value === 'string' || typeof value === 'number') {
           // Some special cases for formatting
           if (key === 'intent') tags.push(`Looking for ${value}`);
           else if (key === 'zodiac_sign' || key === 'zodiac') tags.push(`♈ ${value}`);
           else if (key === 'hobbies' || key === 'languages_spoken') {
               if (typeof value === 'string') {
                   const items = value.split(',').map(item => item.trim()).filter(Boolean);
                   tags.push(...items);
               }
           } else {
              tags.push(String(value));
           }
        }
     }
  }

  // Deduplicate tags
  const uniqueTags = Array.from(new Set(tags));

  return (
    <AnimatePresence>
      {isOpen && user && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] bg-[#050505] overflow-y-auto overflow-x-hidden">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative min-h-[150vh] w-full flex flex-col"
          >
            {/* 1. HERO HEADER */}
            <div className="relative h-[40dvh] w-full shrink-0">
               {photos.length > 0 ? (
                  <img src={photos[0]} alt={user.name} className="absolute inset-0 w-full h-full object-cover" />
               ) : (
                  <div className="absolute inset-0 w-full h-full bg-slate-900 flex items-center justify-center">
                     <span className="text-6xl font-bold text-white/20">{user.avatarInitials}</span>
                  </div>
               )}
               {/* Heavy gradient fade into background */}
               <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" />

               {/* Close Button */}
               <button
                  onClick={onClose}
                  className="absolute top-6 right-6 w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white backdrop-blur-xl transition-colors z-50 pointer-events-auto shadow-lg"
               >
                  <X size={20} strokeWidth={2.5} />
               </button>

               {/* Overlapping Info */}
               <div className="absolute bottom-6 left-0 right-0 px-6 z-20 pointer-events-none">
                  <div className="flex items-center gap-3 drop-shadow-2xl">
                     <h2 className="text-4xl font-extrabold tracking-tight text-white">{user.name}{fullProfile?.age ? `, ${fullProfile.age}` : ''}</h2>
                     {user.isVerified && (
                        <div className="text-blue-400">
                          <CheckCircle size={24} className="fill-blue-500 text-white" />
                        </div>
                     )}
                  </div>
                  {fullProfile?.location && (
                     <div className="flex items-center gap-1.5 text-white/90 font-medium drop-shadow-md mt-2">
                        <MapPin size={16} className="text-rose-400" />
                        <span className="text-sm">{fullProfile.location}</span>
                     </div>
                  )}
                  {isPremium && (
                      <div className="mt-3 inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(251,191,36,0.4)]">
                        VIP Member
                      </div>
                  )}
                  {!isPremium && user.tier === 'PRO' && (
                      <div className="mt-3 inline-block px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-black uppercase tracking-widest backdrop-blur-sm">
                        PRO Member
                      </div>
                  )}
               </div>
            </div>

            {/* 2. GLOWING MEDIA GALLERY */}
            {photos.length > 1 && (
               <div className="px-6 py-8">
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Gallery</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                     {photos.map((photo: string, idx: number) => (
                        <div key={idx} className="p-[1px] rounded-2xl bg-gradient-to-br from-fuchsia-500/40 via-transparent to-cyan-500/40 shadow-lg">
                           <motion.div
                              whileTap={{ scale: 0.98 }}
                              className="w-full aspect-[3/4] bg-[#050505] rounded-2xl overflow-hidden cursor-pointer"
                           >
                              <img src={photo} className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" alt="Gallery image" />
                           </motion.div>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {/* 3. LUXURY ATTRIBUTES & BIO */}
            <div className="px-6 pb-20 flex flex-col gap-8 pt-4">

                {user.bio && (
                   <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                      <span className="text-[10px] text-fuchsia-400 font-bold uppercase tracking-widest mb-3 block">About Me</span>
                      <p className="text-xl font-medium text-slate-100 leading-relaxed tracking-wide">
                          {user.bio}
                      </p>
                   </div>
                )}

                {uniqueTags.length > 0 && (
                   <div>
                      <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Attributes</h3>
                      <div className="flex flex-wrap gap-3 overflow-x-auto hide-scrollbar pb-2 [mask-image:linear-gradient(to_right,black_80%,transparent)]">
                          {uniqueTags.map((tag, idx) => (
                              <div key={idx} className="px-4 py-2 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-sm font-medium text-white/90 shadow-[0_0_15px_rgba(255,255,255,0.05)] whitespace-nowrap">
                                  {tag}
                              </div>
                          ))}
                      </div>
                   </div>
                )}

                {/* Deep Prompts */}
                {fullProfile?.prompt_1_a && (
                    <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-purple-500/10 rounded-3xl p-6 relative overflow-hidden shadow-[0_0_30px_rgba(139,92,246,0.05)]">
                      <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-3 block">{fullProfile.prompt_1_q || "Prompt 1"}</span>
                      <p className="text-lg font-medium text-white/90 leading-relaxed">
                        {fullProfile.prompt_1_a}
                      </p>
                    </div>
                )}

                {fullProfile?.prompt_2_a && (
                    <div className="bg-gradient-to-br from-rose-900/20 to-pink-900/20 border border-pink-500/10 rounded-3xl p-6 relative overflow-hidden shadow-[0_0_30px_rgba(244,63,94,0.05)]">
                      <span className="text-[10px] text-pink-400 font-bold uppercase tracking-widest mb-3 block">{fullProfile.prompt_2_q || "Prompt 2"}</span>
                      <p className="text-lg font-medium text-white/90 leading-relaxed">
                        {fullProfile.prompt_2_a}
                      </p>
                    </div>
                )}
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
