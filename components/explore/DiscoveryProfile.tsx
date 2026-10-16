import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart } from 'lucide-react';
import { DiscoveredUser } from './DiscoveryRadar';

interface DiscoveryProfileProps {
  user: DiscoveredUser;
  onSkip: () => void;
  onSendGift: (user: DiscoveredUser) => void;
  onChat: (user: DiscoveredUser) => void;
}

export default function DiscoveryProfile({ user, onSkip, onSendGift, onChat }: DiscoveryProfileProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [direction, setDirection] = useState<'skip' | 'love'>('skip');

  // Default to 6 mock images if less are provided
  const basePhotos = [
    user.avatar_url || 'https://via.placeholder.com/800x1200/1a1a2e/ffffff?text=Photo+1',
    'https://via.placeholder.com/800x1200/16213e/ffffff?text=Photo+2',
    'https://via.placeholder.com/800x1200/0f3460/ffffff?text=Photo+3',
    'https://via.placeholder.com/800x1200/e94560/ffffff?text=Photo+4',
    'https://via.placeholder.com/800x1200/222831/ffffff?text=Photo+5',
    'https://via.placeholder.com/800x1200/393e46/ffffff?text=Photo+6',
  ];
  const photos = basePhotos.slice(0, 6);

  const nextPhoto = () => {
    if (currentPhotoIndex < photos.length - 1) {
      setCurrentPhotoIndex(prev => prev + 1);
    }
  };

  const prevPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    setDirection('skip');
    onSkip();
  };

  const [showLoveExplosion, setShowLoveExplosion] = useState(false);

  const handleLove = () => {
    setDirection('love');
    setShowLoveExplosion(true);
    setTimeout(() => {
        onChat(user);
    }, 1200); // Wait for animation
  };

  return (
    <div className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center p-4">
      {/* Love Explosion Overlay */}
      <AnimatePresence>
          {showLoveExplosion && (
              <motion.div
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none"
              >
                  <motion.div
                     initial={{ scale: 0, rotate: -45 }}
                     animate={{ scale: [0, 1.5, 5, 20], opacity: [1, 1, 0.8, 0] }}
                     transition={{ duration: 1.2, ease: "easeOut" }}
                     className="text-rose-500 drop-shadow-[0_0_50px_rgba(225,29,72,0.8)]"
                  >
                      <Heart size={120} fill="currentColor" />
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, x: direction === 'skip' ? -300 : 300, rotate: direction === 'skip' ? -15 : 15 }}
        className="relative w-full max-w-md h-[75vh] rounded-[2.5rem] bg-neutral-900 overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/10"
      >

        {/* The Image Array */}
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

        {/* Story-style Progress Bars */}
        <div className="absolute top-4 left-0 right-0 px-4 flex gap-1.5 z-20">
          {photos.map((_, idx) => (
            <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-md">
              <div className={`h-full bg-white transition-all duration-300 ${idx === currentPhotoIndex ? 'w-full' : idx < currentPhotoIndex ? 'w-full' : 'w-0'}`} />
            </div>
          ))}
        </div>

        {/* Invisible Tap Zones for Navigation */}
        <div className="absolute inset-0 z-10 flex">
          <div className="w-1/2 h-full cursor-pointer" onClick={prevPhoto} />
          <div className="w-1/2 h-full cursor-pointer" onClick={nextPhoto} />
        </div>

        {/* Bottom Bio & Action Console */}
        <div className="absolute bottom-0 w-full p-6 pt-24 bg-gradient-to-t from-black via-black/80 to-transparent z-20 pointer-events-none">
          <h2 className="text-4xl font-black text-white tracking-tighter drop-shadow-lg">{user.username}{user.age ? `, ${user.age}` : ''}</h2>
          {user.bio && (
            <p className="text-white/80 font-medium text-sm mt-2 line-clamp-2">{user.bio}</p>
          )}

          {/* Common Interests Hologram */}
          {user.matchedKeyword && (
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 backdrop-blur-md">
                {user.matchedKeyword}
              </span>
            </div>
          )}
        </div>

        {/* The Floating Action Buttons */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-8 z-30 pointer-events-auto">
          <button onClick={handleSkip} className="w-16 h-16 rounded-full bg-neutral-900/80 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-neutral-800 shadow-xl transition-all active:scale-90">
            <X size={28} strokeWidth={3}/>
          </button>
          <button onClick={handleLove} className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-500 to-fuchsia-600 flex items-center justify-center text-white shadow-[0_0_40px_rgba(225,29,72,0.6)] transition-all active:scale-90 hover:scale-105 border-2 border-white/20">
            <Heart fill="currentColor" size={36} strokeWidth={2.5}/>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
