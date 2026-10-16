'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
    // Listen for custom event triggered by ChatInterface when a gift is sent or received
    const handleGiftEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { giftData, senderId, receiverId } = customEvent.detail;

      // SECURITY GATE: Only show if the current authenticated user is the sender or receiver
      if (user && user.id !== senderId && user.id !== receiverId) {
        return;
      }

      const newGift: GiftEvent = {
        id: Date.now().toString(),
        sender_id: senderId,
        recipient_id: receiverId || '',
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

      // Strict 5-second unmount to prevent memory leaks
      const timerId = setTimeout(() => {
        setActiveGift(current => current?.id === newGift.id ? null : current);
      }, 5000);

      // Store the timer so we can clean it up
      (window as any).__giftTimer = timerId;
    };

    window.addEventListener('gift_received_local', handleGiftEvent);
    return () => {
       window.removeEventListener('gift_received_local', handleGiftEvent);
       if ((window as any).__giftTimer) {
         clearTimeout((window as any).__giftTimer);
       }
    };
  }, [user]);

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
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "-100vh", opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 12 }}
              className="relative flex items-center justify-center"
            >
               {/* Glassmorphic 3D cup with rich espresso crema gradient */}
               <div className="w-32 h-40 bg-white/10 backdrop-blur-2xl border border-white/50 rounded-b-3xl rounded-t-lg relative flex flex-col items-center shadow-[0_10px_50px_rgba(255,255,255,0.2)]">
                  <div className="absolute -right-6 top-6 w-12 h-20 border-4 border-white/50 rounded-r-3xl rounded-l-none"></div>
                  <div className="w-full h-4 bg-gradient-to-r from-amber-900 via-amber-700 to-amber-900 rounded-t-lg absolute top-0 opacity-90"></div>
               </div>

               {/* Dynamic Steam - 4 independent Bezier curve vapor trails */}
               <motion.div className="absolute -top-16 flex space-x-2">
                 {[1, 2, 3, 4].map((i) => (
                    <motion.div
                       key={i}
                       animate={{
                         y: [0, -100],
                         x: [0, 15, -15, 10],
                         opacity: [0, 0.9, 0],
                         scale: [1, 2]
                       }}
                       transition={{
                         duration: 2,
                         repeat: Infinity,
                         ease: "easeInOut",
                         delay: i * 0.4
                       }}
                       className="w-3 h-10 bg-white/40 rounded-full blur-[4px]"
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
                  initial={{ scale: 0, rotate: 90 }}
                  animate={{ scale: [0, 1.2, 1], rotate: [90, 0] }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="relative flex items-center justify-center"
                >
                  <div className="w-40 h-40 bg-gradient-to-br from-red-600 to-rose-950 rounded-full shadow-[inset_0_-10px_20px_rgba(0,0,0,0.5),_0_10px_40px_rgba(225,29,72,0.6)]"></div>
                  <div className="absolute w-28 h-28 bg-gradient-to-tl from-rose-600 to-red-900 rounded-full shadow-[inset_0_5px_15px_rgba(0,0,0,0.4)]"></div>
                  <div className="absolute w-16 h-16 bg-gradient-to-br from-red-500 to-rose-800 rounded-full shadow-[inset_0_-3px_10px_rgba(0,0,0,0.3)]"></div>
                  <div className="absolute w-4 h-32 bg-green-700 rounded-full -bottom-24 -z-10 shadow-xl"></div>
                </motion.div>

                {/* 30 Falling Petals with complex wind physics */}
                {[...Array(30)].map((_, i) => {
                  const initialX = (Math.random() - 0.5) * (typeof window !== 'undefined' ? window.innerWidth : 400);
                  const swayDistance = 50 + Math.random() * 100;
                  return (
                    <motion.div
                      key={`petal-${i}`}
                      initial={{
                        y: -200,
                        x: initialX,
                        opacity: 0,
                        rotateX: 0,
                        rotateY: 0,
                        rotateZ: 0
                      }}
                      animate={{
                        y: typeof window !== 'undefined' ? window.innerHeight + 100 : 800,
                        opacity: [0, 1, 1, 0],
                        x: [
                          initialX,
                          initialX + swayDistance,
                          initialX - swayDistance,
                          initialX + swayDistance / 2
                        ],
                        rotateX: [0, 360, 720],
                        rotateY: [0, 180, 360],
                        rotateZ: [0, 360]
                      }}
                      transition={{
                        duration: 3 + Math.random() * 2,
                        delay: Math.random() * 1.5,
                        ease: "linear",
                        x: {
                           duration: 3 + Math.random() * 2,
                           ease: "easeInOut",
                           repeat: 0
                        }
                      }}
                      className="absolute w-5 h-5 bg-rose-600 rounded-[40%] blur-[0.5px] shadow-sm"
                      style={{ borderRadius: '50% 0 50% 50%' }}
                    />
                  )
                })}
             </motion.div>
          )}

          {/* Tier 3: Diamond (500 Coins) - Prismatic Refraction */}
          {activeGift.gift_cost === 500 && (
            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 flex items-center justify-center"
            >
               {/* Massive pulsing radial gradient glow */}
               <motion.div
                 animate={{ opacity: [0.6, 1, 0.6], scale: [0.9, 1.1, 0.9] }}
                 transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                 className="absolute rounded-full"
                 style={{ width: '200px', height: '200px', boxShadow: '0 0 200px 100px rgba(34, 211, 238, 0.6)' }}
               />

               {/* 8 sharp white light rays */}
               <motion.div
                 animate={{ rotateZ: 360 }}
                 transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                 className="absolute w-full h-full flex items-center justify-center pointer-events-none"
               >
                 {[...Array(8)].map((_, i) => (
                    <div
                      key={`ray-${i}`}
                      className="absolute w-1 bg-white/40 blur-[1px]"
                      style={{
                        height: '600px',
                        transform: `rotate(${i * 45}deg)`,
                        background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.8), transparent)'
                      }}
                    />
                 ))}
               </motion.div>

               {/* True Multi-axis 3D Rotation Diamond */}
               <motion.div
                 style={{ perspective: 1000 }}
               >
                 <motion.div
                   animate={{ rotateY: 360, rotateX: [15, 30, 15], rotateZ: [-10, -5, -10] }}
                   transition={{ rotateY: { repeat: Infinity, duration: 3, ease: "linear" }, rotateX: { repeat: Infinity, duration: 2, ease: "easeInOut" }, rotateZ: { repeat: Infinity, duration: 2, ease: "easeInOut" } }}
                   className="relative w-40 h-40 backdrop-blur-2xl"
                   style={{ transformStyle: 'preserve-3d' }}
                 >
                   <div className="absolute inset-0 bg-blue-300/40 border border-blue-200/60 shadow-[0_0_30px_rgba(34,211,238,0.5)]" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 50% 100%, 0% 25%)', transform: 'translateZ(30px)' }}></div>
                   <div className="absolute inset-0 bg-cyan-400/50 border border-cyan-200/60 shadow-[0_0_30px_rgba(34,211,238,0.5)]" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 50% 100%, 0% 25%)', transform: 'translateZ(-30px)' }}></div>
                   <div className="absolute inset-0 bg-indigo-400/30 border border-indigo-100/50" style={{ clipPath: 'polygon(0% 25%, 100% 25%, 50% 100%)', transform: 'rotateX(45deg) translateZ(15px)' }}></div>
                   <div className="absolute inset-0 bg-teal-300/40 border border-teal-100/50" style={{ clipPath: 'polygon(0% 25%, 100% 25%, 50% 0%)', transform: 'rotateX(-45deg) translateZ(15px)' }}></div>
                   <div className="absolute inset-0 bg-blue-400/30 border border-blue-100/50" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 50% 100%)', transform: 'rotateY(45deg) translateZ(15px)' }}></div>
                 </motion.div>
               </motion.div>
            </motion.div>
          )}

          {/* Tier 4: Crown (1000 Coins) - The Heavy Impact */}
          {activeGift.gift_cost === 1000 && (
            <motion.div
               initial={{ y: 0 }}
               animate={{ y: [0, -30, 20, -15, 10, -5, 0] }} // Violent Screen shake impact on portal container
               transition={{ duration: 0.5, delay: 0.4 }}
               className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
            >
               {/* Shockwave ring */}
               <motion.div
                  initial={{ scale: 0, opacity: 1, borderWidth: '20px' }}
                  animate={{ scale: 3, opacity: 0, borderWidth: '0px' }}
                  transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                  className="absolute w-40 h-40 border-amber-400 rounded-full"
               />

               <motion.div
                 initial={{ y: -1000 }}
                 animate={{ y: 0 }}
                 transition={{ duration: 0.4, ease: "easeIn" }}
                 className="relative z-10"
               >
                 {/* Imperial metallic gold gradient crown */}
                 <div className="relative w-48 h-32 flex items-end shadow-[0_0_80px_rgba(245,158,11,0.6)] rounded-full">
                    <div className="w-full h-8 bg-gradient-to-r from-yellow-100 via-amber-400 to-yellow-800 rounded-full absolute bottom-0"></div>
                    <div className="w-12 h-24 bg-gradient-to-b from-yellow-100 via-amber-400 to-yellow-800 absolute bottom-4 left-0 [clip-path:polygon(50%_0,100%_100%,0_100%)] rounded-t-full"></div>
                    <div className="w-16 h-32 bg-gradient-to-b from-yellow-100 via-amber-500 to-yellow-900 absolute bottom-4 left-16 [clip-path:polygon(50%_0,100%_100%,0_100%)] rounded-t-full shadow-[0_0_30px_rgba(252,211,77,0.5)] z-10"></div>
                    <div className="w-12 h-24 bg-gradient-to-b from-yellow-100 via-amber-400 to-yellow-800 absolute bottom-4 right-0 [clip-path:polygon(50%_0,100%_100%,0_100%)] rounded-t-full"></div>
                 </div>
               </motion.div>

               {/* 360-degree explosion of 60 gold confetti particles */}
               {[...Array(60)].map((_, i) => {
                 const angle = (i * 360) / 60;
                 return (
                   <motion.div
                     key={`confetti-${i}`}
                     initial={{ scale: 1, x: 0, y: 0, opacity: 1, rotate: angle }}
                     animate={{
                       scale: [1, 0],
                       x: Math.cos(angle * Math.PI / 180) * (typeof window !== 'undefined' ? window.innerWidth : 400),
                       y: Math.sin(angle * Math.PI / 180) * (typeof window !== 'undefined' ? window.innerHeight : 800),
                       opacity: [1, 0]
                     }}
                     transition={{ duration: 1.5, delay: 0.4, ease: "easeOut" }}
                     className="absolute w-3 h-8 bg-gradient-to-b from-yellow-300 to-amber-600 z-0"
                   />
                 );
               })}
            </motion.div>
          )}

          {/* Tier 5: Galaxy (1500 Coins) - The Supernova Takeover */}
          {activeGift.gift_cost === 1500 && (
            <motion.div
               initial={{ backgroundColor: "rgba(0,0,0,0)", backdropFilter: "blur(0px)" }}
               animate={{ backgroundColor: "rgba(0,0,0,0.98)", backdropFilter: "blur(24px)" }} // Fade background to bg-black/98 backdrop-blur-3xl
               exit={{ opacity: 0 }}
               className="absolute inset-0 flex items-center justify-center overflow-hidden"
               style={{ perspective: 1000 }}
            >
               {/* 150 floating twinkling star divs surging outward */}
               <motion.div
                 animate={{ rotateZ: 360 }}
                 transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                 className="absolute inset-0"
               >
                 {[...Array(150)].map((_, i) => (
                    <motion.div
                       key={`star-${i}`}
                       initial={{
                         scale: 0,
                         opacity: 0,
                         x: 0,
                         y: 0
                       }}
                       animate={{
                         scale: [0, 1.5, 0],
                         opacity: [0, 1, 0],
                         x: (Math.random() - 0.5) * (typeof window !== 'undefined' ? window.innerWidth : 800) * 1.5,
                         y: (Math.random() - 0.5) * (typeof window !== 'undefined' ? window.innerHeight : 1200) * 1.5
                       }}
                       transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 2, ease: "easeOut" }}
                       className="absolute w-1 h-1 bg-white rounded-full shadow-[0_0_10px_white]"
                       style={{
                          top: '50%',
                          left: '50%'
                       }}
                    />
                 ))}
               </motion.div>

               <div className="relative flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
                 {/* Core: Massive breathing magenta/cyan nebula sphere */}
                 <motion.div
                   initial={{ scale: 0, opacity: 1 }}
                   animate={{ scale: [0, 1.2, 1], opacity: [1, 0.8, 1] }}
                   transition={{
                     scale: { duration: 0.5, ease: "easeOut" },
                     opacity: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }
                   }}
                   className="absolute w-72 h-72 rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-fuchsia-500 via-indigo-900 to-transparent blur-xl"
                 />

                 {/* Blinding white flash at start */}
                 <motion.div
                   initial={{ scale: 0, opacity: 1 }}
                   animate={{ scale: 5, opacity: 0 }}
                   transition={{ duration: 0.8, ease: "easeOut" }}
                   className="absolute w-32 h-32 rounded-full bg-white blur-xl"
                 />

                 {/* 4 Distinct Orbital Rings tilted in extreme 3D space */}
                 <motion.div
                   initial={{ rotateX: 75, rotateY: -45, rotateZ: 0 }}
                   animate={{ rotateZ: 360 }}
                   transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                   className="absolute w-80 h-80 rounded-full border-2 border-fuchsia-400/60 shadow-[0_0_15px_rgba(232,121,249,0.5)]"
                 />
                 <motion.div
                   initial={{ rotateX: 45, rotateY: 60, rotateZ: 0 }}
                   animate={{ rotateZ: -360 }}
                   transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                   className="absolute w-[28rem] h-[28rem] rounded-full border border-indigo-400/50 shadow-[0_0_20px_rgba(129,140,248,0.4)]"
                 />
                 <motion.div
                   initial={{ rotateX: 60, rotateY: 30, rotateZ: 0 }}
                   animate={{ rotateZ: 360 }}
                   transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                   className="absolute w-[22rem] h-[22rem] rounded-full border-2 border-cyan-400/60 shadow-[0_0_25px_rgba(34,211,238,0.6)]"
                 />
                 <motion.div
                   initial={{ rotateX: 80, rotateY: -15, rotateZ: 0 }}
                   animate={{ rotateZ: -360 }}
                   transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                   className="absolute w-[32rem] h-[32rem] rounded-full border border-purple-400/40 shadow-[0_0_15px_rgba(192,132,252,0.3)]"
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
