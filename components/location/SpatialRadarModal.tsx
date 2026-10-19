import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useSpatialTracker } from '../../hooks/useSpatialTracker';
import { supabase } from '../../utils/supabase';

export function SpatialRadarModal() {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const { activateRadar, isLocating } = useSpatialTracker();

  useEffect(() => {
    if (!user) return;

    const checkLocationStatus = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_location_active')
        .eq('id', user.id)
        .single();

      if (!error && data && !data.is_location_active) {
        setIsVisible(true);
      }
    };

    checkLocationStatus();
  }, [user]);

  const handleActivate = async () => {
    if (!user) return;
    const result = await activateRadar(user.id);
    if (result.success) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-sm bg-[#050505] border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden"
          >
            {/* Glowing accents */}
            <div className="absolute top-0 left-1/4 w-32 h-32 bg-fuchsia-500/20 blur-[60px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-emerald-500/20 blur-[60px] rounded-full pointer-events-none" />

            {/* Radar Animation */}
            <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/50 animate-ping" />
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] flex items-center justify-center relative z-10">
                <div className="w-4 h-4 rounded-full bg-emerald-400" />
              </div>
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight mb-3 relative z-10">
              Initialize Spatial Radar
            </h2>
            <p className="text-sm text-white/60 mb-8 leading-relaxed relative z-10 font-light">
              Allow EarnMega to pinpoint your global coordinates to unlock the local hub and display your live city to the network.
            </p>

            <div className="w-full space-y-3 relative z-10">
              <button
                type="button"
                onClick={handleActivate}
                disabled={isLocating}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLocating ? 'Acquiring...' : 'Activate Radar'}
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                disabled={isLocating}
                className="w-full py-3 rounded-2xl text-white/50 hover:text-white/80 hover:bg-white/5 transition-all text-sm font-medium border border-transparent"
              >
                Remain Hidden
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
