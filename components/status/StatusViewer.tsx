'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Eye } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';

interface StatusViewerProps {
  statuses: any[];
  creatorProfile: any;
  onClose: () => void;
  onUnlockRequired: () => void;
  hasUnlocked: boolean;
}

export default function StatusViewer({ statuses, creatorProfile, onClose, onUnlockRequired, hasUnlocked }: StatusViewerProps) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentStatus = statuses[currentIndex];

  useEffect(() => {
    // If viewer is not the creator, check if they need to unlock
    if (user?.id !== creatorProfile.id && !hasUnlocked) {
      // In a real app, you would check a database table (e.g. `status_unlocks`)
      // to see if they've paid. For this task, we rely on state from the parent
      // component (or if they've explicitly triggered an unlock this session).
      onUnlockRequired();
    }
  }, [hasUnlocked, user?.id, creatorProfile.id]);

  useEffect(() => {
    setIsLiked(false); // reset like state per status item
    if (currentStatus.media_type === 'video' && videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(console.error);
    }
  }, [currentIndex, currentStatus]);

  const handleNext = () => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiked) return;

    setIsLiked(true);

    // Broadcast like event to creator
    supabase.channel('chat-events').send({
       type: 'broadcast',
       event: 'status_liked',
       payload: { creatorId: creatorProfile.id, viewerId: user?.id, statusId: currentStatus.id }
    });
  };

  if (!hasUnlocked && user?.id !== creatorProfile.id) {
     return null; // Don't render full screen if not unlocked
  }

  return (
    <div className="fixed inset-0 z-[150] bg-black flex flex-col">
       {/* Progress Bars */}
       <div className="absolute top-0 left-0 right-0 z-50 flex gap-1 p-2 bg-gradient-to-b from-black/60 to-transparent pt-safe">
         {statuses.map((_, idx) => (
           <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
             <motion.div
               className="h-full bg-white rounded-full"
               initial={{ width: idx < currentIndex ? '100%' : '0%' }}
               animate={{ width: idx === currentIndex ? '100%' : idx < currentIndex ? '100%' : '0%' }}
               transition={idx === currentIndex ? { duration: currentStatus.media_type === 'video' ? 15 : 5, ease: "linear" } : { duration: 0 }}
               onAnimationComplete={() => {
                 if (idx === currentIndex) handleNext();
               }}
             />
           </div>
         ))}
       </div>

       {/* Header */}
       <div className="absolute top-4 left-0 right-0 z-50 px-4 pt-safe flex justify-between items-center mt-2">
         <div className="flex items-center gap-2">
           <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 overflow-hidden">
             {creatorProfile.avatar_url ? (
               <img src={creatorProfile.avatar_url} alt="" className="w-full h-full object-cover" />
             ) : (
               <div className="w-full h-full flex items-center justify-center text-white font-bold">
                 {(creatorProfile.username?.[0] || 'U').toUpperCase()}
               </div>
             )}
           </div>
           <div>
             <h3 className="text-white font-bold text-sm drop-shadow-md">{creatorProfile.username}</h3>
             <p className="text-white/70 text-[10px] drop-shadow-md">
                {new Date(currentStatus.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </p>
           </div>
         </div>
         <button onClick={onClose} className="p-2 text-white hover:bg-white/10 rounded-full backdrop-blur-md">
           <X size={24} />
         </button>
       </div>

       {/* Media */}
       <div className="flex-1 relative cursor-pointer" onClick={handleNext}>
         {/* Left tap zone for previous */}
         <div className="absolute top-0 bottom-0 left-0 w-[30%] z-40" onClick={handlePrev} />

         <AnimatePresence mode="wait">
            <motion.div
              key={currentStatus.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {currentStatus.media_type === 'video' ? (
                <video
                  ref={videoRef}
                  src={currentStatus.media_url}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted // Unmute if needed, but standard is often muted or relies on user interaction
                  onEnded={handleNext}
                />
              ) : (
                <img
                  src={currentStatus.media_url}
                  alt="Status"
                  className="w-full h-full object-cover"
                />
              )}
            </motion.div>
         </AnimatePresence>
       </div>

       {/* Bottom Glass Bar */}
       <div className="absolute bottom-0 left-0 right-0 z-50 p-6 pb-safe bg-gradient-to-t from-black/80 via-black/40 to-transparent">
         <div className="flex items-center justify-between bg-white/10 backdrop-blur-2xl border border-white/20 p-4 rounded-3xl shadow-2xl">
            <div className="flex items-center gap-2 text-white/80">
              <Eye size={20} />
              <span className="font-bold text-sm tracking-widest">{Math.floor(Math.random() * 500) + 50}</span>
            </div>

            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={handleLike}
              className={`p-3 rounded-full transition-all border ${
                 isLiked ? 'bg-pink-500/20 border-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.5)]' : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <Heart size={24} className={isLiked ? "text-pink-500 fill-pink-500" : "text-white/80"} />
            </motion.button>
         </div>
       </div>
    </div>
  );
}
