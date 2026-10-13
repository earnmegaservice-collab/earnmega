import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, MessageCircle } from 'lucide-react';
import { DiscoveredUser } from './DiscoveryRadar';

interface DiscoveryProfileProps {
  user: DiscoveredUser;
  onSkip: () => void;
  onSendGift: (user: DiscoveredUser) => void;
  onChat: (user: DiscoveredUser) => void;
}

export default function DiscoveryProfile({ user, onSkip, onSendGift, onChat }: DiscoveryProfileProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

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

  const handleNextPhoto = () => {
    if (currentPhotoIndex < photos.length - 1) {
      setCurrentPhotoIndex(prev => prev + 1);
    }
  };

  const handlePrevPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(prev => prev - 1);
    }
  };

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, currentTarget } = e;
    const { width, left } = currentTarget.getBoundingClientRect();
    const xPos = clientX - left;

    if (xPos < width * 0.3) {
      handlePrevPhoto();
    } else {
      handleNextPhoto();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute inset-0 bg-black z-50 overflow-hidden flex flex-col"
    >
      {/* Progress Bars */}
      <div className="absolute top-2 left-2 right-2 z-20 flex gap-1">
        {photos.map((_, idx) => (
          <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white"
              initial={{ width: idx < currentPhotoIndex ? '100%' : '0%' }}
              animate={{ width: idx === currentPhotoIndex ? '100%' : idx < currentPhotoIndex ? '100%' : '0%' }}
              transition={{ duration: 0.3 }}
            />
          </div>
        ))}
      </div>

      {/* Image Area with Tap Zones */}
      <div className="relative flex-1 bg-zinc-900" onClick={handleTap}>
        <AnimatePresence initial={false} mode="wait">
          <motion.img
            key={currentPhotoIndex}
            src={photos[currentPhotoIndex]}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>
      </div>

      {/* Bottom Information Overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end p-6 pb-24 z-20 pointer-events-none">

        <div className="flex flex-col gap-2 pointer-events-auto">
          {/* Shared Interest Pill */}
          {user.matchedKeyword && (
            <div className="self-start px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/50 text-xs font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              ✨ Shared Interest: {user.matchedKeyword}
            </div>
          )}

          <h2 className="text-3xl font-black text-white drop-shadow-md">
            {user.username}{user.age ? `, ${user.age}` : ''}
          </h2>
        </div>
      </div>

      {/* Action Row */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-6 z-30">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onSkip}
          className="w-14 h-14 rounded-full backdrop-blur-md bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition shadow-lg"
        >
          <X className="w-6 h-6" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onSendGift(user)}
          className="w-16 h-16 rounded-full backdrop-blur-md bg-gradient-to-tr from-amber-500/80 to-pink-500/80 border border-white/30 flex items-center justify-center text-white hover:opacity-90 transition shadow-[0_0_20px_rgba(245,158,11,0.4)]"
        >
          <Gift className="w-7 h-7" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onChat(user)}
          className="w-14 h-14 rounded-full backdrop-blur-md bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition shadow-lg"
        >
          <MessageCircle className="w-6 h-6 fill-white" />
        </motion.button>
      </div>

    </motion.div>
  );
}
