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

  // Gather tags (Dynamic Attribute Mapping)
  const tags: string[] = [];

  const ignoredKeys = ['id', 'user_id', 'created_at', 'updated_at', 'avatar_url', 'publicImages', 'profile_images', 'name', 'username', 'email', 'tier', 'bio', 'prompt_1_q', 'prompt_1_a', 'prompt_2_q', 'prompt_2_a', 'prompt_3_q', 'prompt_3_a', 'is_verified', 'is_location_active', 'location_city', 'location_country', 'coins_gifted', 'ghost_mode', 'last_seen'];

  if (fullProfile) {
     for (const [key, value] of Object.entries(fullProfile)) {
        if (ignoredKeys.includes(key)) continue;
        if (!value) continue;
        if (typeof value === 'string' || typeof value === 'number') {
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

  // Dynamic mapping of attributes object if it exists (from instructions)
  if (fullProfile?.attributes) {
      const allAttributes = Object.entries(fullProfile.attributes || {}).filter(([key, val]) => val !== null && val !== '');
      for (const [key, val] of allAttributes) {
         if (typeof val === 'string' || typeof val === 'number') {
             tags.push(String(val));
         }
      }
  }

  const uniqueTags = Array.from(new Set(tags));

  return (
    <AnimatePresence>
      {isOpen && user && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] bg-[#020202] overflow-y-auto overflow-x-hidden">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative min-h-[150vh] w-full flex flex-col pb-20"
          >
            {/* Close Button */}
            <button
               onClick={onClose}
               className="absolute top-6 right-6 w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white backdrop-blur-xl transition-colors z-[100] shadow-lg"
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
                     transition={{ duration: 1.5, ease: "easeOut" }}
                  />
               ) : (
                  <div className="absolute inset-0 w-full h-full bg-slate-900 flex items-center justify-center z-0">
                     <span className="text-6xl font-bold text-white/20">{user.avatarInitials}</span>
                  </div>
               )}
               {/* The Vantablack Fade */}
               <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/60 to-transparent z-10" />

               {/* The Identity Lockup */}
               <div className="absolute bottom-6 left-0 w-full px-6 z-20">
                  <div className="flex items-center gap-3">
                     <h1 className="text-5xl font-black text-white tracking-tighter drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)]">
                        {user.name}
                     </h1>
                     {user.isVerified && (
                        <CheckCircle size={28} className="fill-blue-500 text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)]" />
                     )}
                  </div>
               </div>
            </div>

            {/* 2. THE FLOATING "BLACK CARD" */}
            <div className="mx-6 -mt-8 relative z-30 flex items-center justify-between p-5 rounded-2xl bg-white/5 backdrop-blur-3xl border border-white/10 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.7)]">
               <div className="flex flex-col">
                  {fullProfile?.location && (
                     <div className="flex items-center gap-1.5 text-white/90 font-medium">
                        <MapPin size={16} className="text-rose-400" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400 font-bold">{fullProfile.location}</span>
                     </div>
                  )}
                  {fullProfile?.age && (
                     <span className="text-sm bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400 font-medium mt-1">
                        Age {fullProfile.age}
                     </span>
                  )}
               </div>
               <div className="flex flex-col items-end">
                  {isPremium && (
                      <div className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(251,191,36,0.4)]">
                        VIP
                      </div>
                  )}
                  {!isPremium && user.tier === 'PRO' && (
                      <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-black uppercase tracking-widest backdrop-blur-sm">
                        PRO
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
                           <div className="absolute bottom-0 left-0 w-full h-[20%] bg-gradient-to-t from-white to-transparent opacity-0 group-hover:opacity-10 transition-opacity" />
                        </motion.div>
                     ))}
                  </div>
               </div>
            )}

            {/* 4. LUXURY ATTRIBUTES & BIO */}
            <div className="px-6 pt-8 flex flex-col gap-8">
                {user.bio && (
                   <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                      <span className="text-[10px] text-fuchsia-400 font-bold uppercase tracking-widest mb-3 block">About Me</span>
                      <p className="text-xl font-medium text-slate-100 leading-relaxed tracking-wide">
                          {user.bio}
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
                            transition: { staggerChildren: 0.1 }
                         }
                      }}
                   >
                      <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Attributes</h3>
                      <div className="flex overflow-x-auto gap-3 px-6 pb-6 hide-scrollbar snap-x snap-mandatory mask-image-linear-edges" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                          <style jsx>{`
                              .hide-scrollbar::-webkit-scrollbar {
                                  display: none;
                              }
                          `}</style>
                          {uniqueTags.map((tag, idx) => (
                              <motion.div
                                 key={idx}
                                 variants={{
                                    hidden: { opacity: 0, y: 20 },
                                    visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 20, stiffness: 200 } }
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
                      <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-3 block">{fullProfile.prompt_1_q || "Prompt 1"}</span>
                      <p className="text-lg font-medium text-white/90 leading-relaxed">
                        {fullProfile.prompt_1_a}
                      </p>
                    </div>
                )}

                {fullProfile?.prompt_2_a && (
                    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 relative overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.05)]">
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
