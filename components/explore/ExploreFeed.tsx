'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VerifiedBadge from '../ui/VerifiedBadge';
import { X, Heart, Image as ImageIcon, ArrowUpRight } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { UserProfileDetails } from '../profile/UserProfileModal';

const CATEGORIES = [
  { id: 'creatives', name: 'Creatives', videoUrl: 'https://cdn.pixabay.com/video/2019/11/17/29285-373809630_tiny.mp4' },
  { id: 'travel', name: 'Travel', videoUrl: 'https://cdn.pixabay.com/video/2016/11/21/6462-192534570_tiny.mp4' },
  { id: 'fitness', name: 'Fitness', videoUrl: 'https://cdn.pixabay.com/video/2020/05/23/40062-426176547_tiny.mp4' },
  { id: 'music', name: 'Music', videoUrl: 'https://cdn.pixabay.com/video/2019/04/16/22812-330623253_tiny.mp4' },
  { id: 'food', name: 'Foodies', videoUrl: 'https://cdn.pixabay.com/video/2020/04/18/36485-412702715_tiny.mp4' },
  { id: 'tech', name: 'Tech', videoUrl: 'https://cdn.pixabay.com/video/2017/09/20/12117-236208006_tiny.mp4' },
  { id: 'dancing', name: 'Dancing', videoUrl: 'https://cdn.pixabay.com/video/2020/03/10/33458-396112999_tiny.mp4' },
  { id: 'singing', name: 'Singing', videoUrl: 'https://cdn.pixabay.com/video/2016/09/14/5253-182379373_tiny.mp4' },
  { id: 'fashion', name: 'Fashion', videoUrl: 'https://cdn.pixabay.com/video/2019/12/17/30397-380695079_tiny.mp4' },
  { id: 'nightlife', name: 'Nightlife', videoUrl: 'https://cdn.pixabay.com/video/2017/08/17/11413-228780721_tiny.mp4' },
  { id: 'investing', name: 'Investing', videoUrl: 'https://cdn.pixabay.com/video/2020/03/12/33588-397262071_tiny.mp4' },
  { id: 'cinema', name: 'Cinema', videoUrl: 'https://cdn.pixabay.com/video/2020/03/24/34085-401736637_tiny.mp4' },
  { id: 'gaming', name: 'Gaming', videoUrl: 'https://cdn.pixabay.com/video/2020/06/17/42220-431872134_tiny.mp4' },
  { id: 'automotive', name: 'Automotive', videoUrl: 'https://cdn.pixabay.com/video/2021/04/23/71917-540776735_tiny.mp4' },
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

  useEffect(() => {
    if (selectedCategory) {
      loadProfilesForCategory();
    }
  }, [selectedCategory]);

  const loadProfilesForCategory = async () => {
    setIsLoading(true);
    try {
      // In a real app, you would filter by the category or interests.
      // For now, we just load random verified users who aren't the current user.
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id)
        .eq('is_verified', true)
        .limit(10);

      if (error) throw error;
      setProfiles(data || []);
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
      // Reached the end
      setSelectedCategory(null);
    }
  };

  const handleLike = (profile: any) => {
    // Initiate DM, which will trigger verification check in ChatInterface
    onStartChat({
       id: profile.id,
       name: profile.username || 'User',
       avatarInitials: (profile.username?.[0] || 'U').toUpperCase() + (profile.username?.[1] || 'S').toUpperCase(),
       avatarUrl: profile.avatar_url,
       bio: profile.bio,
       joinDate: profile.created_at,
       tier: 'FREE',
       isOnline: false,
       coinsGifted: profile.coins_gifted || 0,
       isSelf: false
    });
  };

  if (selectedCategory && profiles.length > 0) {
    const activeProfile = profiles[currentProfileIndex];
    // Use the first profile image if available, else avatar_url
    const displayImage = (activeProfile.profile_images && activeProfile.profile_images.length > 0)
        ? activeProfile.profile_images[0]
        : activeProfile.avatar_url;

    return (
      <div className="fixed inset-0 z-40 bg-black">
         <AnimatePresence mode="wait">
            <motion.div
               key={activeProfile.id}
               initial={{ opacity: 0, x: '100%' }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: '-100%' }}
               transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               className="absolute inset-0 flex flex-col"
            >
               {/* Background Image */}
               <div className="absolute inset-0">
                  {displayImage ? (
                      <img src={displayImage} alt={activeProfile.username} className="w-full h-full object-cover" />
                  ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center">
                          <ImageIcon size={64} className="text-white/20" />
                      </div>
                  )}
                  {/* Bottom Gradient for Text legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
               </div>

               {/* Content */}
               <div className="relative flex-1 flex flex-col justify-end p-6 pb-24 text-white">
                  <div className="flex items-center gap-2 mb-2">
                     <h2 className="text-4xl font-bold">{activeProfile.username}</h2>
                     {activeProfile.is_verified && <VerifiedBadge />}
                  </div>

                  {activeProfile.bio && (
                      <p className="text-lg text-gray-200 mb-4 font-medium leading-tight">
                          {activeProfile.bio}
                      </p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-6">
                      {activeProfile.intent && (
                          <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-sm font-bold border border-white/30">
                              {activeProfile.intent}
                          </span>
                      )}
                      {activeProfile.job_title && (
                          <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-sm font-bold border border-white/30">
                              💼 {activeProfile.job_title}
                          </span>
                      )}
                      {activeProfile.zodiac_sign && (
                          <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-sm font-bold border border-white/30">
                              ✨ {activeProfile.zodiac_sign}
                          </span>
                      )}
                  </div>
               </div>

               {/* Action Buttons */}
               <div className="absolute bottom-32 left-0 right-0 flex justify-center gap-8 px-6">
                  <motion.button
                     whileTap={{ scale: 0.9 }}
                     onClick={handleSkip}
                     className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-xl border-2 border-white/20 flex items-center justify-center text-white shadow-xl hover:bg-black/60 transition-colors"
                  >
                     <X size={32} />
                  </motion.button>

                  <motion.button
                     whileTap={{ scale: 0.9 }}
                     onClick={() => handleLike(activeProfile)}
                     className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white shadow-[0_0_30px_rgba(244,63,94,0.6)] border-2 border-red-400/50 hover:scale-105 transition-transform"
                  >
                     <Heart size={32} fill="currentColor" />
                  </motion.button>
               </div>

               {/* Close Swipe View */}
               <button
                  onClick={() => setSelectedCategory(null)}
                  className="absolute top-16 right-6 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white"
               >
                  <X size={20} />
               </button>
            </motion.div>
         </AnimatePresence>
      </div>
    );
  }

  // Categories Grid View
  return (
    <div className="flex-1 overflow-y-auto w-full max-w-full">
      <div className="px-4 mt-4">
        <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-lg">Explore Hub</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 px-3 pb-32 pt-4">
        {CATEGORIES.map((cat, i) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05, type: "spring", stiffness: 100 }}
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`group relative rounded-[2rem] overflow-hidden cursor-pointer ${i % 4 === 0 || i % 4 === 3 ? 'col-span-2 aspect-[16/9]' : 'col-span-1 aspect-[4/5]'} shadow-2xl border border-white/5`}
          >
            {/* High-End Auto-Playing Video Background */}
            <video
              src={cat.videoUrl}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110 opacity-80"
            />

            {/* Obsidian Glass Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent transition-opacity duration-500 group-hover:opacity-90" />

            <div className="absolute bottom-0 left-0 w-full p-6 flex justify-between items-end">
              <div>
                <h3 className="text-white font-black text-2xl tracking-tighter drop-shadow-lg">{cat.name}</h3>
                <span className="text-white/50 text-[10px] uppercase tracking-[0.3em] font-black mt-1 block group-hover:text-emerald-400 transition-colors duration-300">Live Hub</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:bg-white group-hover:text-black transition-all">
                <ArrowUpRight size={20} strokeWidth={3}/>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

const Check = ({ size, className }: { size: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);
