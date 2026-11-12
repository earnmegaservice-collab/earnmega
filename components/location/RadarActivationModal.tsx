import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import { useSpatialTracker } from '../../hooks/useSpatialTracker';

export function RadarActivationModal() {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const { activateRadar, isLocating } = useSpatialTracker();

  useEffect(() => {
    if (!user) return;

    const dismissed = localStorage.getItem('locationDismissed');
    if (dismissed === 'true') return;

    const checkLiveLocation = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('liveLocation, is_location_active')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data && !data.liveLocation && !data.is_location_active) {
        setIsVisible(true);
      }
    };

    checkLiveLocation();
  }, [user]);

  const handleDismiss = () => {
    localStorage.setItem('locationDismissed', 'true');
    setIsVisible(false);
  };

  const handleActivate = async () => {
    if (!user) return;
    await activateRadar(user.id);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-neutral-900/80 backdrop-blur-3xl flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-sm bg-white/5 border border-white/10 rounded-3xl p-8 shadow-[0_0_50px_rgba(217,70,239,0.15)] flex flex-col items-center text-center relative overflow-hidden"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-fuchsia-500/20 blur-[60px] rounded-full pointer-events-none" />
            <div className="absolute top-1/3 left-1/3 w-24 h-24 bg-emerald-500/20 blur-[50px] rounded-full pointer-events-none" />

            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                boxShadow: [
                  '0 0 0 0 rgba(16, 185, 129, 0)',
                  '0 0 20px 5px rgba(16, 185, 129, 0.3)',
                  '0 0 0 0 rgba(16, 185, 129, 0)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 rounded-full bg-neutral-800/80 border border-emerald-500/30 flex items-center justify-center mb-6 relative z-10 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            >
              <Globe className="w-10 h-10 text-emerald-400" />
            </motion.div>

            <h2 className="text-2xl font-bold text-white tracking-tight mb-3 relative z-10">
              Activate Global Radar
            </h2>
            <p className="text-sm text-white/60 mb-8 leading-relaxed relative z-10">
              Connect with the HorPal network and discover opportunities in your city.
            </p>

            <div className="w-full space-y-3 relative z-10">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleActivate}
                disabled={isLocating}
                className="w-full py-4 bg-gradient-to-r from-fuchsia-600 to-emerald-600 hover:from-fuchsia-500 hover:to-emerald-500 rounded-2xl text-white font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] relative overflow-hidden"
              >
                <motion.div
                  className="absolute inset-0 bg-white/20"
                  animate={{ opacity: [0, 0.5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="relative z-10">
                  {isLocating ? 'Pinpointing Live Radar...' : 'Activate Radar'}
                </span>
              </motion.button>

              <button
                onClick={handleDismiss}
                disabled={isLocating}
                className="w-full py-3 rounded-2xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
              >
                Stay Hidden
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
