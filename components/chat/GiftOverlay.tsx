'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

type GiftEvent = {
  id: string;
  sender_id: string;
  recipient_id: string;
  gift_name: string;
  gift_cost: number;
};

export default function GiftOverlay() {
  const [activeGift, setActiveGift] = useState<GiftEvent | null>(null);

  useEffect(() => {
    // Listen for custom event triggered by ChatInterface when a gift is sent or received
    const handleGiftEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { giftData, senderId } = customEvent.detail;

      const newGift: GiftEvent = {
        id: Date.now().toString(),
        sender_id: senderId,
        recipient_id: '', // Not strictly needed for this local display implementation
        gift_name: giftData.name.toLowerCase(),
        gift_cost: giftData.cost
      };

      setActiveGift(newGift);

      // Sensory Engine (Haptics)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        if (giftData.cost === 10) navigator.vibrate(50);
        else if (giftData.cost === 50) navigator.vibrate([100, 50, 100]);
        else if (giftData.cost === 500) navigator.vibrate([200, 100, 200, 100, 200]);
        else if (giftData.cost === 1000) navigator.vibrate([200, 100, 200]); // Crown: requested [200, 100, 200]
        else if (giftData.cost === 1500) navigator.vibrate([500, 100, 500]); // Galaxy: requested [500, 100, 500]
      }

      // Strict 4-second unmount to prevent memory leaks
      setTimeout(() => {
        setActiveGift(current => current?.id === newGift.id ? null : current);
      }, 4000);
    };

    window.addEventListener('gift_received_local', handleGiftEvent);
    return () => window.removeEventListener('gift_received_local', handleGiftEvent);
  }, []);

  if (!activeGift) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {activeGift && (
        <motion.div
          key="gift-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
        >

          {/* Tier 1: Coffee (10 Coins) */}
          {activeGift.gift_cost === 10 && (
            <motion.div
              initial={{ y: "100vh", opacity: 0 }}
              animate={{ y: "0vh", opacity: 1 }}
              exit={{ y: "-100vh", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="relative flex items-center justify-center"
            >
               {/* Glassmorphic 3D cup */}
               <div className="w-32 h-40 bg-white/20 backdrop-blur-md border border-white/40 rounded-b-3xl rounded-t-lg relative flex flex-col items-center shadow-[0_10px_30px_rgba(255,255,255,0.2)]">
                  <div className="absolute -right-6 top-6 w-12 h-20 border-4 border-white/40 rounded-r-3xl rounded-l-none"></div>
                  <div className="w-full h-4 bg-amber-900/40 rounded-t-lg absolute top-0"></div>
               </div>

               {/* Dynamic Steam */}
               <motion.div className="absolute -top-16 flex space-x-3">
                 {[1, 2, 3].map((i) => (
                    <motion.div
                       key={i}
                       initial={{ y: 0, opacity: 0 }}
                       animate={{ y: -50, opacity: [0, 0.8, 0] }}
                       transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.3 }}
                       className="w-2 h-10 bg-white/60 rounded-full blur-[2px]"
                    />
                 ))}
               </motion.div>
            </motion.div>
          )}

          {/* Tier 2: Rose (50 Coins) */}
          {activeGift.gift_cost === 50 && (
             <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center overflow-hidden"
             >
                {/* Multi-layered 3D Rose */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.8 }}
                  className="relative flex items-center justify-center"
                >
                  <div className="w-40 h-40 bg-gradient-to-br from-red-400 to-red-800 rounded-full shadow-[inset_0_-10px_20px_rgba(0,0,0,0.5),_0_10px_30px_rgba(239,68,68,0.5)]"></div>
                  <div className="absolute w-28 h-28 bg-gradient-to-tl from-red-500 to-red-900 rounded-full shadow-[inset_0_5px_15px_rgba(0,0,0,0.4)]"></div>
                  <div className="absolute w-16 h-16 bg-gradient-to-br from-red-300 to-red-600 rounded-full shadow-[inset_0_-3px_10px_rgba(0,0,0,0.3)]"></div>
                  <div className="absolute w-4 h-32 bg-green-600 rounded-full -bottom-24 -z-10 shadow-lg"></div>
                </motion.div>

                {/* Falling Petals */}
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={`petal-${i}`}
                    initial={{ y: -200, x: Math.random() * window.innerWidth - window.innerWidth/2, opacity: 0 }}
                    animate={{ y: window.innerHeight, opacity: [0, 1, 1, 0], x: (Math.random() - 0.5) * 200, rotateZ: [0, 360] }}
                    transition={{ duration: 2.5 + Math.random(), delay: Math.random() * 1.5, ease: "linear" }}
                    className="absolute w-6 h-6 bg-red-500 rounded-full blur-[1px]"
                    style={{ borderRadius: '50% 0 50% 50%' }}
                  />
                ))}
             </motion.div>
          )}

          {/* Tier 3: Diamond (500 Coins) */}
          {activeGift.gift_cost === 500 && (
            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 flex items-center justify-center"
            >
               {/* Massive pulsing radial gradient glow */}
               <motion.div
                 animate={{ opacity: [0.5, 1, 0.5] }}
                 transition={{ repeat: Infinity, duration: 2 }}
                 className="absolute rounded-full"
                 style={{ width: '200px', height: '200px', boxShadow: '0 0 120px 60px rgba(59, 130, 246, 0.6)' }}
               />

               {/* True 3D Rotation Diamond */}
               <motion.div
                 style={{ perspective: 1000 }}
               >
                 <motion.div
                   animate={{ rotateY: 360 }}
                   transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                   className="relative w-40 h-40 backdrop-blur-md"
                   style={{ transformStyle: 'preserve-3d' }}
                 >
                   <div className="absolute inset-0 bg-blue-300/30 border border-blue-200/50" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 50% 100%, 0% 25%)', transform: 'translateZ(20px)' }}></div>
                   <div className="absolute inset-0 bg-cyan-400/40 border border-cyan-200/50" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 50% 100%, 0% 25%)', transform: 'translateZ(-20px)' }}></div>
                   <div className="absolute inset-0 bg-blue-500/20 border border-blue-100/40" style={{ clipPath: 'polygon(0% 25%, 100% 25%, 50% 100%)', transform: 'rotateX(45deg) translateZ(10px)' }}></div>
                   <div className="absolute inset-0 bg-cyan-300/30 border border-cyan-100/40" style={{ clipPath: 'polygon(0% 25%, 100% 25%, 50% 0%)', transform: 'rotateX(-45deg) translateZ(10px)' }}></div>
                 </motion.div>
               </motion.div>
            </motion.div>
          )}

          {/* Tier 4: Crown (1000 Coins) */}
          {activeGift.gift_cost === 1000 && (
            <motion.div
               initial={{ y: 0 }}
               animate={{ y: [0, -15, 10, -5, 0] }} // Screen shake impact on portal container
               transition={{ duration: 0.5, delay: 0.3 }}
               className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
            >
               <motion.div
                 initial={{ y: -500 }}
                 animate={{ y: 0 }}
                 transition={{ type: "spring", stiffness: 200, damping: 10 }}
                 className="relative z-10"
               >
                 {/* Luxurious metallic gold gradient crown */}
                 <div className="relative w-48 h-32 flex items-end">
                    <div className="w-full h-8 bg-gradient-to-r from-yellow-300 via-amber-500 to-yellow-600 rounded-full absolute bottom-0 shadow-[0_10px_20px_rgba(250,204,21,0.5)]"></div>
                    <div className="w-12 h-24 bg-gradient-to-b from-yellow-300 via-amber-500 to-yellow-600 absolute bottom-4 left-0 clip-polygon-[50%_0,100%_100%,0_100%] rounded-t-full shadow-lg"></div>
                    <div className="w-16 h-32 bg-gradient-to-b from-yellow-200 via-yellow-500 to-amber-600 absolute bottom-4 left-16 clip-polygon-[50%_0,100%_100%,0_100%] rounded-t-full shadow-xl"></div>
                    <div className="w-12 h-24 bg-gradient-to-b from-yellow-300 via-amber-500 to-yellow-600 absolute bottom-4 right-0 clip-polygon-[50%_0,100%_100%,0_100%] rounded-t-full shadow-lg"></div>
                 </div>
               </motion.div>

               {/* 360-degree explosion of 30 gold confetti particles */}
               {[...Array(30)].map((_, i) => {
                 const angle = (i * 360) / 30;
                 return (
                   <motion.div
                     key={`confetti-${i}`}
                     initial={{ scale: 1, x: 0, y: 0, opacity: 1, rotate: angle }}
                     animate={{
                       scale: [1, 0],
                       x: Math.cos(angle * Math.PI / 180) * window.innerWidth * 0.8,
                       y: Math.sin(angle * Math.PI / 180) * window.innerHeight * 0.8,
                       opacity: [1, 0]
                     }}
                     transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
                     className="absolute w-3 h-8 bg-gradient-to-b from-yellow-300 to-amber-600 z-0"
                   />
                 );
               })}
            </motion.div>
          )}

          {/* Tier 5: Galaxy (1500 Coins) */}
          {activeGift.gift_cost === 1500 && (
            <motion.div
               initial={{ backgroundColor: "rgba(0,0,0,0)" }}
               animate={{ backgroundColor: "rgba(0,0,0,0.9)" }} // Fade background to bg-black/90
               exit={{ opacity: 0 }}
               className="absolute inset-0 flex items-center justify-center overflow-hidden"
               style={{ perspective: 1000 }}
            >
               {/* 50 floating twinkling star divs */}
               {[...Array(50)].map((_, i) => (
                  <motion.div
                     key={`star-${i}`}
                     initial={{ scale: 0, opacity: 0 }}
                     animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
                     transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
                     className="absolute w-1 h-1 bg-white rounded-full shadow-[0_0_8px_white]"
                     style={{
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`
                     }}
                  />
               ))}

               <div className="relative flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
                 {/* Core: Massive breathing magenta/cyan nebula sphere */}
                 <motion.div
                   animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
                   transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                   className="absolute w-64 h-64 rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-fuchsia-600 via-purple-900 to-transparent blur-md"
                 />

                 {/* 3 Distinct Orbital Rings tilted and spinning */}
                 <motion.div
                   initial={{ rotateX: 60, rotateY: 45, rotateZ: 0 }}
                   animate={{ rotateZ: 360 }}
                   transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                   className="absolute w-80 h-80 rounded-full border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                 />
                 <motion.div
                   initial={{ rotateX: 75, rotateY: -30, rotateZ: 0 }}
                   animate={{ rotateZ: -360 }}
                   transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                   className="absolute w-96 h-96 rounded-full border border-fuchsia-500/40 shadow-[0_0_20px_rgba(217,70,239,0.4)]"
                 />
                 <motion.div
                   initial={{ rotateX: 45, rotateY: 60, rotateZ: 0 }}
                   animate={{ rotateZ: 360 }}
                   transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                   className="absolute w-72 h-72 rounded-full border border-cyan-400/60 shadow-[0_0_25px_rgba(34,211,238,0.6)]"
                 />
               </div>
            </motion.div>
          )}

        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
