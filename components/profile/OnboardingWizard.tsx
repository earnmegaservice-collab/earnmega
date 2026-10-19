import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';

import { AlertCircle, User, AtSign, FileText, CheckCircle2 } from 'lucide-react';

interface OnboardingWizardProps {
  userId?: string;
  onComplete?: () => void;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  userId,
  onComplete,
}) => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(() => localStorage.getItem('em_wizard_name') || '');
  const [username, setUsername] = useState(() => localStorage.getItem('em_wizard_username') || '');
  const [bio, setBio] = useState(() => localStorage.getItem('em_wizard_bio') || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorToast(null);

    if (!user) {
      setErrorToast('Authentication failed. No active session.');
      setIsSaving(false);
      return;
    }

    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullName,
        username: username,
        bio: bio
      });

      if (error) throw error;

      setIsSuccess(true);
      localStorage.removeItem('em_wizard_name');
      localStorage.removeItem('em_wizard_username');
      localStorage.removeItem('em_wizard_bio');
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 2500);
    } catch (err: any) {
      const errorMessage = err?.message || 'Unknown Supabase Error';
      setErrorToast(errorMessage);
      setIsSaving(false);
    }
  };

  return (
    <div className="relative w-full max-w-xl mx-auto z-10">
      <AnimatePresence>
        {errorToast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="mb-6 p-4 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-200 flex items-start gap-3 relative overflow-hidden">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <span className="font-bold text-red-300 uppercase tracking-wider text-xs block mb-1">Profile Update Failed</span>
              <span className="leading-relaxed font-mono text-xs">{errorToast}</span>
            </div>
            <button type="button" onClick={() => setErrorToast(null)} className="text-red-400 hover:text-white font-bold px-1.5 py-0.5 rounded-lg">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative rounded-[2.5rem] bg-neutral-900/70 border border-white/10 p-8 sm:p-10 shadow-[0_40px_80px_rgba(0,0,0,0.8)] backdrop-blur-3xl overflow-hidden">
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
              <User className="absolute left-4 w-5 h-5 text-neutral-500 group-focus-within:text-fuchsia-400" />
              <input type="text" required value={fullName} onChange={(e) => { setFullName(e.target.value); localStorage.setItem('em_wizard_name', e.target.value); }} className="w-full bg-neutral-950/80 border border-neutral-800 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-fuchsia-500 font-mono" placeholder="Enter full legal name" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-widest pl-1">Network Handle</label>
            <div className="relative flex items-center group">
              <AtSign className="absolute left-4 w-5 h-5 text-neutral-500 group-focus-within:text-fuchsia-400" />
              <input type="text" required value={username} onChange={(e) => { setUsername(e.target.value); localStorage.setItem('em_wizard_username', e.target.value); }} className="w-full bg-neutral-950/80 border border-neutral-800 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-fuchsia-500 font-mono" placeholder="username" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-widest pl-1">Neural Bio / Description</label>
            <div className="relative flex items-start group pt-1">
              <FileText className="absolute left-4 top-4 w-5 h-5 text-neutral-500 group-focus-within:text-fuchsia-400" />
              <textarea required rows={3} value={bio} onChange={(e) => { setBio(e.target.value); localStorage.setItem('em_wizard_bio', e.target.value); }} className="w-full bg-neutral-950/80 border border-neutral-800 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-fuchsia-500 font-mono resize-none" placeholder="Define your interests, goals, and identity..." />
            </div>
          </div>

          <button type="submit" disabled={isSaving} className="relative w-full h-16 mt-6 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 p-[1px] transition-all active:scale-95 group overflow-hidden">
            <div className="w-full h-full bg-neutral-950 rounded-full flex items-center justify-center relative z-10">
              {isSaving ? (
                <span className="text-fuchsia-400 font-black tracking-[0.3em] uppercase text-xs animate-pulse">Encrypting Profile...</span>
              ) : (
                <span className="text-white font-black tracking-[0.2em] uppercase text-sm">Initialize Profile</span>
              )}
            </div>
          </button>
        </form>
      </div>

      <AnimatePresence>
        {isSuccess && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-[50px] flex flex-col items-center justify-center">
            <div className="relative w-40 h-40 flex items-center justify-center mb-10">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute inset-0 rounded-full bg-emerald-500/20 blur-3xl" />
              <svg className="w-32 h-32 z-10 drop-shadow-[0_0_20px_rgba(16,185,129,0.8)]" viewBox="0 0 50 50">
                <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" d="M14 27l8 8 16-16" />
              </svg>
            </div>
            <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-4xl font-black text-white tracking-tighter mb-3">Securely Encrypted</motion.h2>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OnboardingWizard;
