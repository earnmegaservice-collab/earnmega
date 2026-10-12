'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { UserProfileDetails } from '../profile/UserProfileModal';

// Example categories
const CATEGORIES = [
  { id: 'creatives', name: 'Creatives', icon: '🎨', color: 'from-pink-500/20 to-rose-500/20', borderColor: 'border-pink-500/30' },
  { id: 'travel', name: 'Travel', icon: '✈️', color: 'from-blue-500/20 to-cyan-500/20', borderColor: 'border-blue-500/30' },
  { id: 'fitness', name: 'Fitness', icon: '💪', color: 'from-emerald-500/20 to-green-500/20', borderColor: 'border-emerald-500/30' },
  { id: 'music', name: 'Music', icon: '🎵', color: 'from-purple-500/20 to-indigo-500/20', borderColor: 'border-purple-500/30' },
  { id: 'food', name: 'Foodies', icon: '🍝', color: 'from-orange-500/20 to-amber-500/20', borderColor: 'border-orange-500/30' },
  { id: 'tech', name: 'Tech', icon: '💻', color: 'from-slate-500/20 to-gray-500/20', borderColor: 'border-slate-500/30' },
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
                     {activeProfile.is_verified && (
                         <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.8)]">
                             <Check size={14} className="text-white font-bold" />
                         </div>
                     )}
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
    <div className="flex-1 overflow-y-auto p-4 pb-24">
       <h2 className="text-2xl font-bold text-white mb-6 mt-2">Discover</h2>

       <div className="grid grid-cols-2 gap-4">
          {CATEGORIES.map(category => (
             <motion.button
                key={category.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(category.id)}
                className={`relative aspect-square rounded-3xl p-4 flex flex-col items-center justify-center gap-4 bg-gradient-to-br ${category.color} border ${category.borderColor} backdrop-blur-xl shadow-lg overflow-hidden group`}
             >
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />
                <span className="text-5xl drop-shadow-2xl group-hover:scale-110 transition-transform duration-300">
                    {category.icon}
                </span>
                <span className="text-white font-bold tracking-wide">
                    {category.name}
                </span>
             </motion.button>
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
