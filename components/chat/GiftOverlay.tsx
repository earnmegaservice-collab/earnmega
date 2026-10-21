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
    const handleGiftEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { giftData, senderId, receiverId } = customEvent.detail;

      // 🔒 SECURITY GATE: ONLY THE RECEIVER SEES THE ANIMATION
      if (!user || user.id !== receiverId) return;

      const newGift: GiftEvent = {
        id: Date.now().toString(),
        sender_id: senderId,
        recipient_id: receiverId || '',
        gift_name: giftData.name.toLowerCase(),
        gift_cost: giftData.cost
      };

      setActiveGift(newGift);

      // Advanced Sensory Engine (Haptics)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        if (giftData.cost === 10) navigator.vibrate(50);
        else if (giftData.cost === 50) navigator.vibrate([100, 50, 100]);
        else if (giftData.cost === 500) navigator.vibrate([200, 50, 200, 50, 300]);
        else if (giftData.cost === 1000) navigator.vibrate([300, 100, 400]); 
        else if (giftData.cost === 1500) navigator.vibrate([500, 100, 500, 100, 800]); 
      }

      // 7-second unmount to allow full 4K particle decay
      const timerId = setTimeout(() => {
        setActiveGift(current => current?.id === newGift.id ? null : current);
      }, 7000);

      (window as any).__giftTimer = timerId;
    };

    window.addEventListener('gift_received_local', handleGiftEvent);
    return () => {
       window.removeEventListener('gift_received_local', handleGiftEvent);
       if ((window as any).__giftTimer) clearTimeout((window as any).__giftTimer);
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
          transition={{ duration: 0.5 }}
          className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
        >

          {/* ☕ TIER 1: COFFEE (10 Coins) - Frosted Glass & Volumetric Steam */}
          {activeGift.gift_cost === 10 && (
            <motion.div
              initial={{ y: "100vh", scale: 0.5 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="relative flex flex-col items-center justify-center"
            >
               {/* Glowing Amber Coaster */}
               <motion.div 
                 animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }} 
                 transition={{ duration: 2, repeat: Infinity }}
                 className="absolute -bottom-4 w-40 h-8 bg-amber-600/30 rounded-[100%] blur-xl" 
               />
               
               <div className="w-32 h-44 bg-white/5 backdrop-blur-3xl border-x border-b border-white/20 rounded-b-[40px] rounded-t-lg relative flex flex-col items-center shadow-[0_20px_60px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(255,255,255,0.1)]">
                  <div className="absolute -right-8 top-8 w-12 h-24 border-[6px] border-white/10 rounded-r-3xl rounded-l-none backdrop-blur-md"></div>
                  {/* Liquid Espresso Core */}
                  <div className="w-[96%] h-[94%] absolute bottom-1 rounded-b-[36px] bg-gradient-to-t from-amber-950 via-amber-800 to-amber-600 opacity-90 shadow-[inset_0_-10px_20px_rgba(0,0,0,0.8)]"></div>
               </div>

               {/* Organic Vapor Trails */}
               <motion.div className="absolute -top-24 flex space-x-3">
                 {[1, 2, 3].map((i) => (
                    <motion.div
                       key={i}
                       animate={{ 
                         y: [0, -120], 
                         x: [0, i % 2 === 0 ? 25 : -25, i % 2 === 0 ? -15 : 15, 0], 
                         opacity: [0, 0.6, 0], 
                         scale: [1, 3],
                         filter: ["blur(4px)", "blur(12px)"]
                       }}
                       transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 }}
                       className="w-4 h-12 bg-white/30 rounded-[100%]"
                    />
                 ))}
               </motion.div>
            </motion.div>
          )}

          {/* 🌹 TIER 2: ROSE (50 Coins) - Velvet Bloom & Golden Embers */}
          {activeGift.gift_cost === 50 && (
             <motion.div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                {/* Magical Aura */}
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute w-80 h-80 bg-rose-600/20 rounded-full blur-3xl mix-blend-screen"
                />

                <motion.div
                  initial={{ scale: 0, rotateZ: -45, y: 100 }}
                  animate={{ scale: [0, 1.3, 1], rotateZ: 0, y: 0 }}
                  transition={{ duration: 1, type: "spring", bounce: 0.5 }}
                  className="relative flex flex-col items-center drop-shadow-[0_0_40px_rgba(225,29,72,0.8)]"
                >
                  {/* Stem */}
                  <div className="absolute top-20 w-3 h-48 bg-gradient-to-b from-green-600 to-green-950 rounded-full -z-10 shadow-[0_0_15px_rgba(21,128,61,0.5)]"></div>
                  
                  {/* Deep Velvet Petals */}
                  <div className="relative w-48 h-48">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_#f43f5e,_#881337,_#4c0519)] rounded-[45%_55%_40%_60%] shadow-[inset_0_-10px_30px_rgba(0,0,0,0.8)]"></div>
                    <div className="absolute inset-4 bg-[radial-gradient(circle_at_40%_40%,_#fb7185,_#be123c,_#881337)] rounded-[55%_45%_60%_40%] rotate-45 shadow-[inset_0_5px_20px_rgba(0,0,0,0.6)]"></div>
                    <div className="absolute inset-10 bg-[radial-gradient(circle_at_50%_50%,_#fda4af,_#e11d48,_#9f1239)] rounded-[50%] -rotate-12 shadow-[inset_0_-5px_15px_rgba(0,0,0,0.5)]"></div>
                  </div>
                </motion.div>

                {/* Firefly Gold Embers */}
                {[...Array(40)].map((_, i) => (
                  <motion.div
                    key={`ember-${i}`}
                    initial={{ y: 200, x: (Math.random() - 0.5) * 400, opacity: 0, scale: 0 }}
                    animate={{
                      y: -800,
                      x: (Math.random() - 0.5) * 600,
                      opacity: [0, 1, 1, 0],
                      scale: [0, Math.random() * 1.5 + 0.5, 0],
                    }}
                    transition={{ duration: 3 + Math.random() * 3, ease: "easeOut" }}
                    className="absolute w-2 h-2 bg-amber-300 rounded-full shadow-[0_0_15px_3px_rgba(252,211,77,0.8)] mix-blend-screen"
                  />
                ))}
             </motion.div>
          )}

          {/* 💎 TIER 3: DIAMOND (500 Coins) - Refractive Chromatic Aberration */}
          {activeGift.gift_cost === 500 && (
            <motion.div className="absolute inset-0 flex items-center justify-center">
               {/* Super-bright core flare */}
               <motion.div
                 animate={{ scale: [1, 1.5, 1], opacity: [0.8, 1, 0.8] }}
                 transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                 className="absolute w-64 h-64 bg-cyan-400/30 rounded-full blur-3xl mix-blend-screen"
               />
               
               {/* Spinning optical light rays */}
               <motion.div animate={{ rotateZ: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute inset-0 flex items-center justify-center">
                 <div className="w-[800px] h-[800px] bg-[conic-gradient(from_0deg,_transparent_0deg,_rgba(103,232,249,0.2)_10deg,_transparent_20deg,_transparent_180deg,_rgba(103,232,249,0.2)_190deg,_transparent_200deg)] mix-blend-color-dodge"></div>
               </motion.div>

               <motion.div style={{ perspective: 2000 }}>
                 <motion.div
                   animate={{ rotateY: 360, rotateX: [20, 40, 20], rotateZ: [-15, 0, -15] }}
                   transition={{ rotateY: { repeat: Infinity, duration: 5, ease: "linear" }, rotateX: { repeat: Infinity, duration: 4, ease: "easeInOut" } }}
                   className="relative w-56 h-56 transform-gpu"
                   style={{ transformStyle: 'preserve-3d' }}
                 >
                   {/* Chromatic Aberration Layers (Red/Cyan splits) */}
                   <div className="absolute inset-0 bg-blue-100/40 border-[3px] border-white/80 shadow-[0_0_80px_rgba(255,255,255,1)] mix-blend-screen" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 50% 100%, 0% 25%)', transform: 'translateZ(50px)' }}></div>
                   <div className="absolute inset-0 bg-fuchsia-500/30 border-[1px] border-fuchsia-200 shadow-[0_0_40px_rgba(217,70,239,0.8)] mix-blend-screen" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 50% 100%, 0% 25%)', transform: 'translateZ(45px) translateX(-5px)' }}></div>
                   <div className="absolute inset-0 bg-cyan-400/40 border-[1px] border-cyan-100 shadow-[0_0_40px_rgba(34,211,238,0.8)] mix-blend-screen" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 50% 100%, 0% 25%)', transform: 'translateZ(45px) translateX(5px)' }}></div>
                   
                   {/* Lower Facets */}
                   <div className="absolute inset-0 bg-blue-400/30 border-2 border-white/50 backdrop-blur-md" style={{ clipPath: 'polygon(0% 25%, 100% 25%, 50% 100%)', transform: 'rotateX(50deg) translateZ(25px)' }}></div>
                   <div className="absolute inset-0 bg-cyan-300/30 border-2 border-white/50 backdrop-blur-md" style={{ clipPath: 'polygon(0% 25%, 100% 25%, 50% 0%)', transform: 'rotateX(-50deg) translateZ(25px)' }}></div>
                 </motion.div>
               </motion.div>
            </motion.div>
          )}

          {/* 👑 TIER 4: CROWN (1000 Coins) - Heavy Metal Volumetric Drop */}
          {activeGift.gift_cost === 1000 && (
            <motion.div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-black/60 backdrop-blur-md">
               {/* Massive Impact Shockwave */}
               <motion.div
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: [0, 5, 8], opacity: [1, 0.8, 0] }}
                  transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                  className="absolute w-64 h-64 border-[15px] border-amber-400 rounded-full mix-blend-color-dodge shadow-[0_0_100px_rgba(251,191,36,1)]"
               />
               
               {/* Volumetric Vertical Light Pillar */}
               <motion.div
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{ scaleY: [0, 1, 0], opacity: [0, 1, 0] }}
                  transition={{ duration: 1.5, delay: 0.2, ease: "easeInOut" }}
                  className="absolute w-full h-[200vh] bg-gradient-to-r from-transparent via-amber-200/40 to-transparent mix-blend-screen"
               />

               <motion.div
                 initial={{ y: -1000, scale: 1.5, rotateX: 45 }}
                 animate={{ y: [null, 0, -30, 0], scale: 1, rotateX: 0 }}
                 transition={{ duration: 0.6, ease: "easeOut" }}
                 className="relative z-10"
               >
                 {/* Ultra-Realistic 3D Gold Crown */}
                 <div className="relative w-64 h-48 flex items-end drop-shadow-[0_20px_100px_rgba(252,211,77,1)]">
                    <div className="w-full h-12 bg-[linear-gradient(to_right,#b45309,#fde047,#b45309,#fde047,#b45309)] rounded-full absolute bottom-0 border-t-[3px] border-yellow-200 shadow-[inset_0_-10px_20px_rgba(0,0,0,0.8)]">
                       {/* Crown Jewels */}
                       <div className="absolute top-1/2 left-1/4 w-4 h-4 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,1),inset_0_0_5px_white] -translate-y-1/2"></div>
                       <div className="absolute top-1/2 left-1/2 w-6 h-6 bg-emerald-400 rounded-full shadow-[0_0_15px_rgba(52,211,153,1),inset_0_0_8px_white] -translate-x-1/2 -translate-y-1/2"></div>
                       <div className="absolute top-1/2 right-1/4 w-4 h-4 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,1),inset_0_0_5px_white] -translate-y-1/2"></div>
                    </div>
                    <div className="w-16 h-36 bg-[linear-gradient(to_bottom,#fef08a,#d97706,#78350f)] absolute bottom-6 left-0 [clip-path:polygon(50%_0,100%_100%,0_100%)] rounded-t-full"></div>
                    <div className="w-24 h-44 bg-[linear-gradient(to_bottom,#ffffff,#f59e0b,#451a03)] absolute bottom-6 left-[80px] [clip-path:polygon(50%_0,100%_100%,0_100%)] rounded-t-full shadow-[0_0_60px_rgba(255,255,255,0.8)] z-10">
                        {/* Center Diamond on top peak */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-white rotate-45 shadow-[0_0_20px_white]"></div>
                    </div>
                    <div className="w-16 h-36 bg-[linear-gradient(to_bottom,#fef08a,#d97706,#78350f)] absolute bottom-6 right-0 [clip-path:polygon(50%_0,100%_100%,0_100%)] rounded-t-full"></div>
                 </div>
               </motion.div>

               {/* Raining Gold Physics */}
               {[...Array(100)].map((_, i) => (
                 <motion.div
                   key={`gold-${i}`}
                   initial={{ y: 0, x: 0, opacity: 1, scale: Math.random() * 1.5 + 0.5 }}
                   animate={{
                     y: typeof window !== 'undefined' ? window.innerHeight : 800,
                     x: (Math.random() - 0.5) * 800,
                     rotateZ: Math.random() * 720,
                     opacity: [1, 1, 0]
                   }}
                   transition={{ duration: 1.5 + Math.random(), delay: 0.3, ease: "easeIn" }}
                   className="absolute w-4 h-8 bg-[linear-gradient(135deg,#fde047,#d97706)] shadow-[0_0_10px_rgba(251,191,36,0.8)]"
                   style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                 />
               ))}
            </motion.div>
          )}

          {/* 🌌 TIER 5: GALAXY (1500 Coins) - Deep Space Black Hole Physics */}
          {activeGift.gift_cost === 1500 && (
            <motion.div
               initial={{ backgroundColor: "rgba(0,0,0,0)", backdropFilter: "blur(0px)" }}
               animate={{ backgroundColor: "rgba(0,0,0,1)", backdropFilter: "blur(50px)" }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 flex items-center justify-center overflow-hidden"
               style={{ perspective: 800 }}
            >
               {/* Hyperspeed Star Streaks */}
               <motion.div animate={{ scale: [1, 1.5], opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute inset-0">
                 {[...Array(60)].map((_, i) => {
                    const angle = Math.random() * 360;
                    return (
                      <div
                        key={`streak-${i}`}
                        className="absolute w-32 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent mix-blend-screen"
                        style={{
                          top: '50%', left: '50%',
                          transform: `rotate(${angle}deg) translateX(${100 + Math.random() * 400}px)`,
                          opacity: Math.random()
                        }}
                      />
                    )
                 })}
               </motion.div>

               <div className="relative flex items-center justify-center transform-gpu">
                 
                 {/* Supermassive Black Hole Core (True Black with tearing edges) */}
                 <motion.div
                   initial={{ scale: 0 }}
                   animate={{ scale: [0, 1.2, 1] }}
                   transition={{ duration: 1, ease: "easeOut" }}
                   className="absolute w-48 h-48 bg-black rounded-full shadow-[0_0_100px_30px_rgba(0,0,0,1)] z-20"
                 />
                 
                 {/* Intense Accretion Disk Glow */}
                 <motion.div
                   animate={{ rotateZ: -360, scale: [1, 1.1, 1] }}
                   transition={{ rotateZ: { duration: 10, repeat: Infinity, ease: "linear" }, scale: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
                   className="absolute w-80 h-80 rounded-full bg-[radial-gradient(circle,_transparent_30%,_#d946ef_50%,_#3b82f6_70%,_transparent_100%)] blur-2xl mix-blend-screen z-10"
                 />

                 {/* High-Velocity Plasma Rings */}
                 <motion.div
                   initial={{ rotateX: 70, rotateY: 20, rotateZ: 0, scale: 0 }}
                   animate={{ rotateZ: 360, scale: 1 }}
                   transition={{ rotateZ: { duration: 3, repeat: Infinity, ease: "linear" }, scale: { duration: 1, ease: "easeOut" } }}
                   className="absolute w-[36rem] h-[36rem] rounded-full border-[8px] border-l-fuchsia-400 border-r-indigo-500 border-y-transparent shadow-[0_0_80px_20px_rgba(217,70,239,0.8)] mix-blend-color-dodge z-30"
                 />
                 
                 <motion.div
                   initial={{ rotateX: 60, rotateY: -30, rotateZ: 0, scale: 0 }}
                   animate={{ rotateZ: -360, scale: 1 }}
                   transition={{ rotateZ: { duration: 5, repeat: Infinity, ease: "linear" }, scale: { duration: 1.5, ease: "easeOut" } }}
                   className="absolute w-[44rem] h-[44rem] rounded-full border-[4px] border-t-cyan-300 border-b-blue-600 border-x-transparent shadow-[0_0_60px_10px_rgba(34,211,238,0.6)] mix-blend-color-dodge z-0"
                 />

                 {/* Cosmic Dust Clouds */}
                 <motion.div
                   animate={{ rotateZ: 360, opacity: [0.4, 0.8, 0.4] }}
                   transition={{ rotateZ: { duration: 30, repeat: Infinity, ease: "linear" }, opacity: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}
                   className="absolute w-[60rem] h-[60rem] bg-[radial-gradient(ellipse_at_center,_rgba(147,51,234,0.15)_0%,_transparent_60%)] mix-blend-screen -z-10 pointer-events-none"
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
