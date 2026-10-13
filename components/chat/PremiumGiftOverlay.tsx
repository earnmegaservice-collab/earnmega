'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';

export default function PremiumGiftOverlay() {
  const { user } = useAuth();
  const [showAnimation, setShowAnimation] = useState(false);
  const [isSender, setIsSender] = useState(false);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('public:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          if (payload.new.type === 'GIFT') {
            if (payload.new.sender_id === user.id) {
              setIsSender(true);
              triggerAnimation();
            } else if (payload.new.recipient_id === user.id) {
              setIsSender(false);
              triggerAnimation();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const triggerAnimation = () => {
    setShowAnimation(true);
    setTimeout(() => setShowAnimation(false), 3500);
  };

  const onAssetAnimationComplete = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 300]);
    }
  };

  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    xOffset: (Math.random() - 0.5) * 400,
  }));

  return (
    <AnimatePresence>
      {showAnimation && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center pointer-events-none">
          {/* Background Flash */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Main Asset (3D-styled Gift Box) */}
          <motion.div
            initial={{ y: '100vh', scale: 0.2, rotate: -90, opacity: 0 }}
            animate={{ y: 0, scale: [1, 2.5, 1.8], rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', mass: 1.2, stiffness: 120, damping: 12 }}
            onAnimationComplete={onAssetAnimationComplete}
            className="relative z-10 text-8xl drop-shadow-[0_0_50px_rgba(245,158,11,0.8)]"
          >
            🎁
          </motion.div>

          {/* Gravity Confetti */}
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{ x: 0, y: 0, opacity: 1, scale: Math.random() * 0.5 + 0.5 }}
              animate={{
                x: particle.xOffset,
                y: [0, -100, 500],
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 2,
                ease: 'easeOut',
                delay: 0.2,
              }}
              className="absolute z-10 w-4 h-4 rounded-sm bg-gradient-to-br from-amber-300 to-yellow-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]"
            />
          ))}

          {/* Text Banner */}
          <motion.h1
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="relative z-10 mt-8 text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-600 drop-shadow-[0_0_20px_rgba(245,158,11,1)] text-center px-4 leading-tight"
          >
            {isSender ? 'Premium Gift Sent!' : 'Premium Gift Received!'}
          </motion.h1>
        </div>
      )}
    </AnimatePresence>
  );
}
