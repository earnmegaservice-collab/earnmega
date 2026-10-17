import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, User, AtSign, FileText, CheckCircle2 } from 'lucide-react';

interface OnboardingWizardProps {
  userId?: string;
  onComplete?: () => void;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  userId = 'usr_3d98f21a',
  onComplete,
}) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorToast(null);

    try {
      // Simulating the secure network request
      await new Promise(resolve => setTimeout(resolve, 2000));

      // On successful save, trigger the cinematic success portal
      setIsSuccess(true);
      
      // Hold the portal for 2.5 seconds, then trigger the app's routing
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 2500);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Database update failed due to an unknown security constraint.';
      console.error('[Profile Saving Error]:', err);
      setErrorToast(errorMessage);
      setIsSaving(false);
    }
  };

  return (
    <div className="relative w-full max-w-xl mx-auto z-10">
      
      {/* Luxurious Error Toast */}
      <AnimatePresence>
        {errorToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="mb-6 p-4 rounded-2xl bg-red-950/80 border border-red-500/50 backdrop-blur-xl shadow-[0_0_30px_rgba(239,68,68,0.3)] text-red-200 flex items-start gap-3 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-red-500/10 pointer-events-none" />
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <span className="font-bold text-red-300 uppercase tracking-wider text-xs block mb-1">Profile Update Failed</span>
              <span className="leading-relaxed font-mono text-xs">{errorToast}</span>
            </div>
            <button onClick={() => setErrorToast(null)} className="text-red-400 hover:text-red-200 font-bold text-sm px-1.5 py-0.5 rounded-lg transition-colors cursor-pointer">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glassmorphic Form Card */}
      <div className="relative rounded-[2.5rem] bg-neutral-900/70 border border-white/10 p-8 sm:p-10 shadow-[0_40px_80px_rgba(0,0,0,0.8)] backdrop-blur-3xl overflow-hidden">
        
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-fuchsia-500/10 to-transparent pointer-events-none" />

        <div className="flex items-center gap-2 mb-3 text-fuchsia-400 font-mono text-xs tracking-widest uppercase">
          <CheckCircle2 className="w-4 h-4" />
          <span>Stage 1: Biometric Identity Protocol</span>
        </div>
        <h1 className="text-4xl font-black text-white tracking-tighter mb-2">Gateway Profile</h1>
        <p className="text-neutral-400 text-sm mb-10 font-medium">Configure your user parameters before initializing the spatial photo matrix.</p>

        <form onSubmit={handleSave} className="space-y-6 relative z-10">
          
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-widest pl-1">Full Designation</label>
            <div className="relative flex items-center group">
              <User className="absolute left-4 w-5 h-5 text-neutral-500 group-focus-within:text-fuchsia-400 transition-colors pointer-events-none" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-neutral-950/80 border border-neutral-800 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-all font-mono placeholder:text-neutral-700 shadow-inner"
                placeholder="Enter full legal name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-widest pl-1">Network Handle</label>
            <div className="relative flex items-center group">
              <AtSign className="absolute left-4 w-5 h-5 text-neutral-500 group-focus-within:text-fuchsia-400 transition-colors pointer-events-none" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-neutral-950/80 border border-neutral-800 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-all font-mono placeholder:text-neutral-700 shadow-inner"
                placeholder="username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-widest pl-1">Neural Bio / Description</label>
            <div className="relative flex items-start group pt-1">
              <FileText className="absolute left-4 top-4 w-5 h-5 text-neutral-500 group-focus-within:text-fuchsia-400 transition-colors pointer-events-none" />
              <textarea
                required
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-neutral-950/80 border border-neutral-800 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-all font-mono resize-none placeholder:text-neutral-700 shadow-inner"
                placeholder="Define your interests, goals, and identity..."
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSaving} 
            className="relative w-full h-16 mt-6 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 p-[1px] shadow-[0_0_40px_rgba(147,51,234,0.4)] transition-all active:scale-95 group overflow-hidden disabled:opacity-80 disabled:active:scale-100"
          >
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-full h-full bg-neutral-950 rounded-full flex items-center justify-center relative z-10">
              {isSaving ? (
                <div className="flex items-center gap-3">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-6 h-6 rounded-full border-2 border-transparent border-t-fuchsia-500 border-r-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.8)]" />
                  <span className="text-fuchsia-400 font-black tracking-[0.3em] uppercase text-xs animate-pulse">Encrypting Profile...</span>
                </div>
              ) : (
                <span className="text-white font-black tracking-[0.2em] uppercase text-sm">Initialize Profile</span>
              )}
            </div>
          </button>
        </form>
      </div>

      {/* THE SUCCESS PORTAL OVERLAY */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-[50px] flex flex-col items-center justify-center"
          >
            <div className="relative w-40 h-40 flex items-center justify-center mb-10">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 20 }} className="absolute inset-0 rounded-full bg-emerald-500/20 blur-3xl" />
              <svg className="w-32 h-32 z-10 drop-shadow-[0_0_20px_rgba(16,185,129,0.8)]" viewBox="0 0 50 50">
                <motion.path 
                  initial={{ pathLength: 0 }} 
                  animate={{ pathLength: 1 }} 
                  transition={{ duration: 0.8, ease: "easeInOut" }} 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="4" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M14 27l8 8 16-16" 
                />
              </svg>
            </div>
            <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="text-4xl font-black text-white tracking-tighter mb-3 drop-shadow-lg">
              Securely Encrypted
            </motion.h2>
            <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }} className="text-emerald-400/80 font-black tracking-[0.4em] uppercase text-xs">
              Welcome to EarnMega
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default OnboardingWizard;
