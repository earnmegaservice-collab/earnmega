'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Flower2, Gem, Crown } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';

type GiftEvent = {
  id: string;
  sender_id: string;
  recipient_id: string;
  gift_name: string;
  gift_cost: number;
};

export default function GiftOverlay() {
  const { user } = useAuth();
  const [activeGift, setActiveGift] = useState<GiftEvent | null>(null);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `type=eq.GIFT`,
        },
        (payload) => {
          const { sender_id, recipient_id, message, id } = payload.new;
          if (sender_id === user.id || recipient_id === user.id) {
            const [gift_name, costStr] = message.split('|');
            setActiveGift({
              id,
              sender_id,
              recipient_id,
              gift_name: gift_name.toLowerCase(),
              gift_cost: parseInt(costStr, 10)
            });

            // Trigger Haptics based on tier
            const cost = parseInt(costStr, 10);
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              if (cost === 10) navigator.vibrate(50);
              else if (cost === 50) navigator.vibrate([100, 50, 100]);
              else if (cost === 500) navigator.vibrate([200, 100, 200, 100, 200]);
              else if (cost === 1000) navigator.vibrate([400, 100, 400, 100, 600]);
            }

            setTimeout(() => {
              setActiveGift(current => current?.id === id ? null : current);
            }, 5000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!activeGift) return null;

  // Determine if the current user is the receiver to apply aura on their avatar via a global class or state if needed.
  // For simplicity and immediate visual effect on the screen without complex state lifting, we will use a pseudo-avatar
  // representation in the overlay itself if it's the receiver, or rely on the global cinematic effect.
  // We'll create the Aura directly in the center to represent the "Receiver's Avatar Aura"
  const isReceiver = activeGift.recipient_id === user?.id;

  return (
    <AnimatePresence>
      {activeGift && (
        <motion.div
          key="gift-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
        >
          {/* Receiver Aura Ring (Global representation) */}
          {isReceiver && (
             <motion.div
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0 }}
               className={`absolute inset-0 flex items-center justify-center z-[-1] ${
                 activeGift.gift_cost === 10 ? 'ring-4 ring-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.8)] rounded-full w-40 h-40' :
                 activeGift.gift_cost === 50 ? 'ring-8 ring-rose-500 animate-pulse rounded-full w-48 h-48' :
                 activeGift.gift_cost === 500 ? 'shadow-[0_0_80px_rgba(34,211,238,1)] rounded-full w-56 h-56' :
                 'bg-gradient-to-r from-purple-500 via-yellow-400 to-white p-2 rounded-full w-64 h-64 animate-[spin_4s_linear_infinite]'
               }`}
             />
          )}

          {/* Tier 1: Coffee (10 Coins) */}
          {activeGift.gift_cost === 10 && (
            <motion.div
              initial={{ y: "100vh", opacity: 0 }}
              animate={{ y: "0vh", opacity: 1 }}
              exit={{ y: "-100vh", opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative flex items-center justify-center"
            >
               <Coffee size={120} className="text-amber-500 drop-shadow-[0_0_20px_rgba(245,158,11,0.8)]" />
               <motion.div
                 animate={{ y: [-10, -30, -50], opacity: [0, 1, 0], scale: [1, 1.2, 1.5] }}
                 transition={{ repeat: Infinity, duration: 1.5 }}
                 className="absolute -top-10 flex space-x-2"
               >
                 <div className="w-1 h-6 bg-white/40 rounded-full blur-[1px]"></div>
                 <div className="w-1 h-8 bg-white/40 rounded-full blur-[1px] mt-2"></div>
                 <div className="w-1 h-6 bg-white/40 rounded-full blur-[1px]"></div>
               </motion.div>
            </motion.div>
          )}

          {/* Tier 2: Rose (50 Coins) */}
          {activeGift.gift_cost === 50 && (
             <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-rose-500/20 flex items-center justify-center overflow-hidden"
             >
                {/* Falling Petals */}
                {[...Array(15)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: -100, x: Math.random() * window.innerWidth - window.innerWidth/2, opacity: 0, rotate: 0 }}
                    animate={{ y: window.innerHeight, opacity: [0, 1, 0], rotate: 360 }}
                    transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
                    className="absolute w-4 h-4 bg-rose-600/60 rounded-full blur-[1px]"
                    style={{ borderRadius: '50% 0 50% 50%' }}
                  />
                ))}
                <motion.div
                  initial={{ rotate: 0, scale: 0.5, y: 100 }}
                  animate={{ rotate: 360, scale: 1.5, y: 0 }}
                  transition={{ type: "spring", damping: 15 }}
                >
                  <Flower2 size={150} className="text-rose-500 drop-shadow-[0_0_30px_rgba(244,63,94,0.8)]" />
                </motion.div>
             </motion.div>
          )}

          {/* Tier 3: Diamond (500 Coins) */}
          {activeGift.gift_cost === 500 && (
            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-cyan-500/30 backdrop-blur-lg flex items-center justify-center"
            >
               <motion.div
                 initial={{ scale: 5, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 transition={{ type: "spring", damping: 12, stiffness: 100 }}
               >
                 <Gem size={200} className="text-cyan-400 drop-shadow-[0_0_50px_rgba(34,211,238,1)]" />
               </motion.div>
               {/* 30 sharp white/blue shards exploding outward */}
               {[...Array(30)].map((_, i) => {
                 const angle = (i * 360) / 30;
                 return (
                   <motion.div
                     key={i}
                     initial={{ scale: 0, x: 0, y: 0, opacity: 1, rotate: angle }}
                     animate={{
                       scale: [0, 1.5, 0],
                       x: Math.cos(angle * Math.PI / 180) * 300,
                       y: Math.sin(angle * Math.PI / 180) * 300,
                       opacity: 0
                     }}
                     transition={{ duration: 1.2, ease: "easeOut" }}
                     className="absolute w-2 h-16 bg-gradient-to-t from-white to-cyan-400"
                     style={{ transformOrigin: "bottom center" }}
                   />
                 );
               })}
            </motion.div>
          )}

          {/* Tier 4: Crown (1000 Coins) */}
          {activeGift.gift_cost === 1000 && (
            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1, x: [-10, 10, -10, 10, -5, 5, 0] }}
               exit={{ opacity: 0 }}
               transition={{ x: { duration: 0.4 } }}
               className="absolute inset-0 bg-gradient-to-b from-amber-500/40 to-purple-900/40 flex flex-col items-center justify-center overflow-hidden"
            >
               {/* Heavy Golden Confetti Rain */}
               {[...Array(50)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: -50, x: Math.random() * window.innerWidth - window.innerWidth/2, opacity: 0, rotate: 0 }}
                    animate={{ y: window.innerHeight, opacity: [0, 1, 1, 0], rotate: 720 }}
                    transition={{ duration: 1.5 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
                    className="absolute w-2 h-6 bg-yellow-400"
                  />
                ))}
               <motion.div
                 initial={{ y: -500 }}
                 animate={{ y: 0 }}
                 transition={{ type: "spring", bounce: 0.5, damping: 10 }}
               >
                 <Crown size={250} className="text-yellow-400 drop-shadow-[0_0_80px_rgba(250,204,21,1)]" />
               </motion.div>
               <motion.div
                 className="mt-8"
               >
                 <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-100 to-yellow-500 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)] text-center">
                   VIP CROWN RECEIVED
                 </h1>
               </motion.div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
