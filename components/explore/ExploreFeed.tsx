'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VerifiedBadge from '../ui/VerifiedBadge';
import { 
  X, Heart, Image as ImageIcon, ArrowUpRight, 
  ChevronDown, MapPin, Briefcase, GraduationCap, 
  Sparkles, Wine, Ruler, Dog, Music 
} from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';

// 4K Ultra-Realistic 2026 Category Backgrounds
const CATEGORIES = [
  { id: 'creatives', name: 'Creatives', imageUrl: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=2000&auto=format&fit=crop' },
  { id: 'travel', name: 'Travel', imageUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2000&auto=format&fit=crop' },
  { id: 'nightlife', name: 'Nightlife', imageUrl: 'https://images.unsplash.com/photo-1555096462-c1c5eb4e4d64?q=80&w=2000&auto=format&fit=crop' },
  { id: 'fitness', name: 'Fitness', imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2000&auto=format&fit=crop' },
  { id: 'food', name: 'Foodies', imageUrl: 'https://images.unsplash.com/photo-1544025162-83b482ba83fb?q=80&w=2000&auto=format&fit=crop' },
  { id: 'cinema', name: 'Cinema', imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2000&auto=format&fit=crop' },
  { id: 'gaming', name: 'Gaming', imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2000&auto=format&fit=crop' },
  { id: 'fashion', name: 'Fashion', imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2000&auto=format&fit=crop' },
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
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0); // Tinder-style photo state
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedCategory) {
      loadProfilesForCategory();
    }
  }, [selectedCategory]);

  const loadProfilesForCategory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id)
        .eq('is_verified', true)
        .limit(10);

      if (error) throw error;
      setProfiles(data || []);
      setCurrentProfileIndex(0);
      setCurrentPhotoIndex(0); // Reset photo index on new load
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    if (currentProfileIndex < profiles.length - 1) {
      setCurrentProfileIndex(prev => prev + 1);
      setCurrentPhotoIndex(0); // Reset photos for next person
    } else {
      setSelectedCategory(null);
    }
  };

  const handleLike = (profile: any) => {
    onStartChat({
       id: profile.id,
       name: profile.username || 'User',
       avatarInitials: (profile.username?.[0] || 'U').toUpperCase() + (profile.username?.[1] || 'S').toUpperCase(),
       avatarUrl: profile.avatar_url,
       bio: profile.bio,
       joinDate: profile.created_at,
       tier: 'PREMIUM',
       isOnline: true,
       coinsGifted: profile.coins_gifted || 0,
       isSelf: false
    });
  };

  if (selectedCategory && profiles.length > 0) {
    const activeProfile = profiles[currentProfileIndex];
    
    // Extract up to 6 high-res photos from DB, fallback to avatar
    const rawPhotos = activeProfile?.publicImages || activeProfile?.profile_images || [];
    const profilePhotos = rawPhotos.length > 0 
      ? rawPhotos.slice(0, 6) 
      : (activeProfile?.avatar_url ? [activeProfile.avatar_url] : []);

    const hasPhotos = profilePhotos.length > 0;
    const displayImage = hasPhotos ? profilePhotos[currentPhotoIndex] : null;

    // Tinder-style tap to navigate photos
    const handlePhotoTap = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!hasPhotos || profilePhotos.length <= 1) return;
      
      const { clientX } = e;
      const screenWidth = window.innerWidth;
      
      if (clientX < screenWidth * 0.3) {
        // Tap left 30%: Go back
        setCurrentPhotoIndex(prev => Math.max(0, prev - 1));
      } else {
        // Tap right 70%: Go forward
        setCurrentPhotoIndex(prev => Math.min(profilePhotos.length - 1, prev + 1));
      }
      
      // Haptic tick
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(25);
      }
    };

    return (
      <div className="fixed inset-0 z-[9999] bg-black overflow-y-auto overflow-x-hidden">
         <AnimatePresence mode="wait">
            <motion.div
               key={activeProfile.id}
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 1.05 }}
               transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               className="relative min-h-[150vh] w-full flex flex-col bg-slate-950"
            >
               {/* -------------------------------------------------------------
                   1. 100vh FULL SCREEN HERO IMAGE (Tinder Style)
               ------------------------------------------------------------- */}
               <div className="relative h-[100dvh] w-full shrink-0">
                  {/* Photo Engine & Tap Zones */}
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
                    {/* Protection Gradients */}
                    <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                    <div className="absolute bottom-0 inset-x-0 h-80 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />
                  </div>

                  {/* Segmented Photo Progress Bars (Top) */}
                  {profilePhotos.length > 1 && (
                    <div className="absolute top-3 left-3 right-3 flex gap-1.5 z-50">
                      {profilePhotos.map((_, idx) => (
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

                  {/* Top-Right Close Button */}
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="absolute top-8 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/20 z-50 shadow-xl"
                  >
                    <X size={20} />
                  </button>

                  {/* Core Info (Anchored above the bottom buttons) */}
                  <div className="absolute bottom-[130px] left-0 right-0 px-6 z-10 text-white pointer-events-none">
                     <div className="flex items-center gap-3 mb-2 drop-shadow-xl">
                        <h2 className="text-4xl font-black tracking-tight">{activeProfile.username}, <span className="font-light">{activeProfile.age || '24'}</span></h2>
                        {activeProfile.is_verified && <VerifiedBadge />}
                     </div>

                     <div className="flex items-center gap-2 text-white/90 font-medium drop-shadow-md mb-4">
                       <MapPin size={16} className="text-emerald-400" />
                       <span className="text-sm">2 miles away • {activeProfile.intent || 'Long-term partner'}</span>
                     </div>

                     {activeProfile.bio && (
                         <p className="text-base text-gray-100 mb-6 font-medium leading-relaxed drop-shadow-lg line-clamp-3">
                             {activeProfile.bio}
                         </p>
                     )}

                     {/* Scroll Down Prompt */}
                     <motion.div 
                       animate={{ y: [0, 8, 0] }}
                       transition={{ duration: 1.5, repeat: Infinity }}
                       className="flex justify-center mt-2 opacity-80"
                     >
                       <ChevronDown size={28} className="drop-shadow-lg" />
                     </motion.div>
                  </div>
               </div>

               {/* -------------------------------------------------------------
                   2. MASSIVE SCROLLABLE DEEP PROFILE SHEET
               ------------------------------------------------------------- */}
               <div className="relative w-full bg-slate-950 rounded-t-[40px] -mt-12 p-8 pb-40 z-20 shadow-[0_-20px_60px_rgba(0,0,0,0.7)] flex flex-col gap-8 text-white">
                  
                  {/* Dynamic Block Quote Prompt */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={60}/></div>
                    <span className="text-xs text-yellow-400 font-bold uppercase tracking-widest mb-2 block">About Me</span>
                    <p className="text-xl font-medium leading-relaxed">
                      "I describe myself as fun, easygoing, and incredibly adventurous. Big on family and I enjoy deep, late-night conversations."
                    </p>
                  </div>

                  {/* Essentials / Lifestyle Tags Grid */}
                  <div>
                    <h3 className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-4">Essentials</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                        <Briefcase size={20} className="text-cyan-400" />
                        <span className="text-sm font-medium">{activeProfile.job_title || 'Forex Trader at NK FX'}</span>
                      </div>
                      <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                        <GraduationCap size={20} className="text-purple-400" />
                        <span className="text-sm font-medium">{activeProfile.education || 'Methodist University'}</span>
                      </div>
                      <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                        <Ruler size={20} className="text-pink-400" />
                        <span className="text-sm font-medium">173 cm</span>
                      </div>
                      <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                        <Sparkles size={20} className="text-yellow-400" />
                        <span className="text-sm font-medium">{activeProfile.zodiac_sign || 'Cancer'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Lifestyle Badges */}
                  <div>
                    <h3 className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-4">Lifestyle</h3>
                    <div className="flex flex-wrap gap-3">
                      <span className="px-4 py-2 bg-white/10 rounded-full text-sm font-medium flex items-center gap-2"><Dog size={16}/> Dog Lover</span>
                      <span className="px-4 py-2 bg-white/10 rounded-full text-sm font-medium flex items-center gap-2"><Wine size={16}/> Social Drinker</span>
                      <span className="px-4 py-2 bg-white/10 rounded-full text-sm font-medium">🚭 Non-smoker</span>
                      <span className="px-4 py-2 bg-white/10 rounded-full text-sm font-medium flex items-center gap-2"><Music size={16}/> Hip-hop</span>
                    </div>
                  </div>

                  {/* Bottom Padder to allow scrolling past floating buttons */}
                  <div className="h-24 w-full"></div>
               </div>

               {/* -------------------------------------------------------------
                   3. FLOATING ACTION BUTTONS (Anchored to Screen Bottom)
               ------------------------------------------------------------- */}
               <div className="fixed bottom-8 left-0 right-0 flex justify-center gap-8 px-6 z-[99999] pointer-events-none">
                  <motion.button
                     whileTap={{ scale: 0.85 }}
                     onClick={handleSkip}
                     className="pointer-events-auto w-[72px] h-[72px] rounded-full bg-slate-900/80 backdrop-blur-2xl border-2 border-white/10 flex items-center justify-center text-gray-300 shadow-[0_10px_40px_rgba(0,0,0,0.5)] hover:bg-slate-800 transition-colors"
                  >
                     <X size={34} strokeWidth={2.5} />
                  </motion.button>

                  <motion.button
                     whileTap={{ scale: 0.85 }}
                     onClick={() => handleLike(activeProfile)}
                     className="pointer-events-auto w-[72px] h-[72px] rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white shadow-[0_10px_50px_rgba(244,63,94,0.6)] border-2 border-rose-400 hover:scale-105 transition-transform"
                  >
                     <Heart size={34} fill="currentColor" />
                  </motion.button>
               </div>

            </motion.div>
         </AnimatePresence>
      </div>
    );
  }

  // Categories Grid View (4K Unsplash Upgrade)
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
            transition={{ delay: i * 0.05, type: "spring", stiffness: 100 }}
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`group relative rounded-[2rem] overflow-hidden cursor-pointer ${i % 3 === 0 ? 'col-span-2 aspect-[16/9]' : 'col-span-1 aspect-[4/5]'} shadow-2xl border border-white/10`}
          >
            {/* High-End 4K Image Background */}
            <img
              src={cat.imageUrl}
              alt={cat.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110 opacity-90"
            />

            {/* Obsidian Glass Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent transition-opacity duration-500 group-hover:opacity-80" />

            <div className="absolute bottom-0 left-0 w-full p-5 flex justify-between items-end">
              <div>
                <h3 className="text-white font-black text-2xl tracking-tighter drop-shadow-xl">{cat.name}</h3>
                <span className="text-white/70 text-[10px] uppercase tracking-[0.2em] font-black mt-1 block group-hover:text-yellow-400 transition-colors duration-300">Live Hub</span>
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
