import re

with open('./components/chat/GiftOverlay.tsx', 'r') as f:
    content = f.read()

# Replace the Coffee section (10 Coins)
old_coffee = """          {/* Tier 1: Coffee (10 Coins) */}
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
          )}"""

new_coffee = """          {/* Tier 1: Coffee (10 Coins) */}
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
          )}"""

# Replace the Rose section (50 Coins)
old_rose = """          {/* Tier 2: Rose (50 Coins) */}
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
          )}"""

new_rose = """          {/* Tier 2: Rose (50 Coins) */}
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
          )}"""

content = content.replace(old_coffee, new_coffee)
content = content.replace(old_rose, new_rose)

with open('./components/chat/GiftOverlay.tsx', 'w') as f:
    f.write(content)
