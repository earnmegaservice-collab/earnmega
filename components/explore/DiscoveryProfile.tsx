'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Heart, ChevronDown, MapPin, Briefcase, 
  GraduationCap, Sparkles, Wine, Ruler, Dog, Music 
} from 'lucide-react';
import { DiscoveredUser } from './DiscoveryRadar';
import VerifiedBadge from '../ui/VerifiedBadge';

interface DiscoveryProfileProps {
  user: DiscoveredUser;
  onSkip: () => void;
  onSendGift: (user: DiscoveredUser) => void;
  onChat: (user: DiscoveredUser) => void;
}

export default function DiscoveryProfile({ user, onSkip, onSendGift, onChat }: DiscoveryProfileProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [direction, setDirection] = useState<'skip' | 'love'>('skip');
  const [showLoveExplosion, setShowLoveExplosion] = useState(false);

  // 1. Extract true 4K arrays or fallback to high-end Unsplash placeholders for testing
  const rawPhotos = (user as any).publicImages || (user as any).profile_images || [];
  let photos = rawPhotos.length > 0 ? rawPhotos.slice(0, 6) : (user.avatar_url ? [user.avatar_url] : []);
  
  // High-End 4K Fallbacks if the user has no images (replaces the low-res via.placeholder)
  if (photos.length === 0) {
    photos = [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=2000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=2000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=2000&auto=format&fit=crop'
    ];
  }

  const hasPhotos = photos.length > 0;

  // 2. Tinder-Style Tap Navigation Engine
  const handlePhotoTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hasPhotos || photos.length <= 1) return;
    
    const { clientX } = e;
    const screenWidth = window.innerWidth;
    
    if (clientX < screenWidth * 0.3) {
      // Tap Left 30%: Go Back
      setCurrentPhotoIndex(prev => Math.max(0, prev - 1));
    } else {
      // Tap Right 70%: Go Forward
      setCurrentPhotoIndex(prev => Math.min(photos.length - 1, prev + 1));
    }
    
    // Crisp haptic tick on photo change
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(25);
    }
  };

  const handleSkip = () => {
    setDirection('skip');
    onSkip();
  };

  const handleLove = () => {
    setDirection('love');
    setShowLoveExplosion(true);
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([100, 50, 100]);
    
    setTimeout(() => {
        onChat(user);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black overflow-y-auto overflow-x-hidden">
      
      {/* FULL-SCREEN 4K LOVE EXPLOSION */}
      <AnimatePresence>
          {showLoveExplosion && (
              <motion.div
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none"
              >
                  <motion.div
                     initial={{ scale: 0, rotate: -45 }}
                     animate={{ scale: [0, 1.5, 5, 25], opacity: [1, 1, 0.9, 0] }}
                     transition={{ duration: 1.2, ease: "easeOut" }}
                     className="text-rose-500 drop-shadow-[0_0_80px_rgba(225,29,72,1)]"
                  >
                      <Heart size={140} fill="currentColor" />
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={user.id}
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: direction === 'skip' ? -300 : 300, rotate: direction === 'skip' ? -10 : 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative min-h-[150vh] w-full flex flex-col bg-slate-950"
        >
          {/* =====================================================================
              1. 100dvh HERO IMAGE & TAP ZONES (True Tinder-Style 4K)
              ===================================================================== */}
          <div className="relative h-[100dvh] w-full shrink-0">
            {/* Photo & Tap Layer */}
            <div className="absolute inset-0 z-0 cursor-pointer" onClick={handlePhotoTap}>
              <AnimatePresence initial={false} mode="wait">
                <motion.img
                  key={currentPhotoIndex}
                  src={photos[currentPhotoIndex]}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
                />
              </AnimatePresence>
              
              {/* Ultra-smooth gradients to protect top/bottom UI text */}
              <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 inset-x-0 h-[28rem] bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none" />
            </div>

            {/* Segmented Photo Progress Bars (Top) */}
            {photos.length > 1 && (
              <div className="absolute top-4 left-3 right-3 flex gap-1.5 z-20 pointer-events-none">
                {photos.map((_, idx) => (
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

            {/* Main Info Block (Anchored safely above the deep scroll sheet) */}
            <div className="absolute bottom-[110px] left-0 right-0 px-6 z-10 text-white pointer-events-none">
              <div className="flex items-center gap-3 mb-2 drop-shadow-xl">
                 <h2 className="text-4xl sm:text-5xl font-black tracking-tight">{user.username}<span className="font-light">{(user as any).age ? `, ${(user as any).age}` : ''}</span></h2>
                 {/* Assuming verification check exists or pass true to test */}
                 <VerifiedBadge /> 
              </div>

              <div className="flex items-center gap-2 text-white/90 font-medium drop-shadow-md mb-4">
                <MapPin size={16} className="text-rose-400" />
                <span className="text-sm">Nearby • {(user as any).intent || 'Looking for connections'}</span>
              </div>

              {user.bio && (
                  <p className="text-base sm:text-lg text-gray-100 mb-4 font-medium leading-relaxed drop-shadow-lg line-clamp-2">
                      {user.bio}
                  </p>
              )}

              {/* Holographic Radar Match Indicator */}
              {user.matchedKeyword && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 backdrop-blur-md shadow-[0_0_20px_rgba(217,70,239,0.3)]">
                    ⚡ Matched: {user.matchedKeyword}
                  </span>
                </div>
              )}

              {/* Scroll Down Bounce Prompt */}
              <motion.div 
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="flex justify-center mt-6 opacity-80"
              >
                <ChevronDown size={32} className="drop-shadow-lg" />
              </motion.div>
            </div>
          </div>

          {/* =====================================================================
              2. MASSIVE SCROLLABLE DEEP PROFILE SHEET (Dark Mode UX)
              ===================================================================== */}
          <div className="relative w-full bg-slate-950 rounded-t-[40px] -mt-10 p-8 pb-48 z-20 shadow-[0_-20px_60px_rgba(0,0,0,0.8)] flex flex-col gap-10 text-white">
            
            {/* Dynamic Interactive Prompt Card */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-inner relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={60}/></div>
              <span className="text-xs text-rose-400 font-bold uppercase tracking-widest mb-3 block">My hidden talent is...</span>
              <p className="text-xl font-medium leading-relaxed">
                {(user as any).hidden_talent || "Finding the absolute best late-night food spots anywhere I travel."}
              </p>
            </div>

            {/* Essentials Grid */}
            <div>
              <h3 className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-4">Essentials</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 bg-white/5 p-3.5 rounded-2xl border border-white/5">
                  <Briefcase size={20} className="text-cyan-400" />
                  <span className="text-sm font-medium">{(user as any).job_title || 'Entrepreneur'}</span>
                </div>
                <div className="flex items-center gap-3 bg-white/5 p-3.5 rounded-2xl border border-white/5">
                  <GraduationCap size={20} className="text-purple-400" />
                  <span className="text-sm font-medium">{(user as any).education || 'University Alumni'}</span>
                </div>
                <div className="flex items-center gap-3 bg-white/5 p-3.5 rounded-2xl border border-white/5">
                  <Ruler size={20} className="text-pink-400" />
                  <span className="text-sm font-medium">{(user as any).height || '175 cm'}</span>
                </div>
                <div className="flex items-center gap-3 bg-white/5 p-3.5 rounded-2xl border border-white/5">
                  <Sparkles size={20} className="text-yellow-400" />
                  <span className="text-sm font-medium">{(user as any).zodiac_sign || 'Scorpio'}</span>
                </div>
              </div>
            </div>

            {/* Lifestyle Badges */}
            <div>
              <h3 className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-4">Lifestyle</h3>
              <div className="flex flex-wrap gap-3">
                <span className="px-4 py-2.5 bg-white/10 rounded-full text-sm font-medium flex items-center gap-2"><Dog size={16} className="text-amber-300"/> Pet Lover</span>
                <span className="px-4 py-2.5 bg-white/10 rounded-full text-sm font-medium flex items-center gap-2"><Wine size={16} className="text-rose-300"/> Social Drinker</span>
                <span className="px-4 py-2.5 bg-white/10 rounded-full text-sm font-medium">🚭 Non-smoker</span>
                <span className="px-4 py-2.5 bg-white/10 rounded-full text-sm font-medium flex items-center gap-2"><Music size={16} className="text-indigo-300"/> R&B & Hip-Hop</span>
              </div>
            </div>

            {/* Second Interactive Prompt */}
            <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-purple-500/20 rounded-3xl p-6 relative overflow-hidden">
              <span className="text-xs text-purple-400 font-bold uppercase tracking-widest mb-3 block">The most romantic thing...</span>
              <p className="text-xl font-medium leading-relaxed">
                {(user as any).romantic_prompt || "Surprising me with a late-night drive to nowhere with a perfectly curated playlist."}
              </p>
            </div>
            
          </div>
        </motion.div>
      </AnimatePresence>

      {/* =====================================================================
          3. FIXED FLOATING ACTION BUTTONS (Anchored safely outside scroll flow)
          ===================================================================== */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center gap-8 px-6 z-[99999] pointer-events-none">
        <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleSkip}
            className="pointer-events-auto w-[76px] h-[76px] rounded-full bg-slate-900/90 backdrop-blur-2xl border-2 border-white/10 flex items-center justify-center text-gray-400 shadow-[0_10px_40px_rgba(0,0,0,0.6)] hover:bg-slate-800 hover:text-white hover:border-white/30 transition-all"
        >
            <X size={36} strokeWidth={2.5} />
        </motion.button>

        <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleLove}
            className="pointer-events-auto w-[76px] h-[76px] rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white shadow-[0_10px_50px_rgba(244,63,94,0.7)] border-2 border-rose-400 hover:scale-105 transition-transform"
        >
            <Heart size={36} fill="currentColor" strokeWidth={2.5}/>
        </motion.button>
      </div>
    </div>
  );
}
