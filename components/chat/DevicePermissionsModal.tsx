import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Mic, ShieldAlert } from 'lucide-react';

interface DevicePermissionsModalProps {
  onGrant: () => void;
  onDeny: () => void;
}

export const DevicePermissionsModal: React.FC<DevicePermissionsModalProps> = ({ onGrant, onDeny }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-4 pb-0 sm:pb-4"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-sm bg-neutral-900/90 backdrop-blur-3xl border border-white/20 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center text-center relative overflow-hidden"
      >
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-purple-500 to-amber-400" />

        <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-6 shadow-xl relative">
          <ShieldAlert size={32} className="text-amber-400" />
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center border-2 border-neutral-900">
            <Camera size={14} className="text-white" />
          </div>
          <div className="absolute -bottom-2 -left-2 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-neutral-900">
            <Mic size={14} className="text-white" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Permission Vault</h2>
        <p className="text-sm text-white/70 mb-8 leading-relaxed">
          To provide a studio-grade 4K calling experience, EarnMega requires access to your camera and microphone.
        </p>

        <div className="w-full space-y-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onGrant}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-bold tracking-wide shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all"
          >
            Grant Access
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onDeny}
            className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 font-medium transition-colors"
          >
            Not Now
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};
