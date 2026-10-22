'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';

const INTERESTS = [
  'Foodie', 'Gym Rat', 'Nightlife', 'Investor', 'Creative',
  'Techie', 'Traveler', 'Gamer', 'Artist', 'Musician'
];

interface TheInterviewProps {
  onComplete: () => void;
}

export default function TheInterview({ onComplete }: TheInterviewProps) {
  const { user } = useAuth();

  const [prompt1, setPrompt1] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('em_interview_p1') || '' : '');
  const [prompt2, setPrompt2] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('em_interview_p2') || '' : '');
  const [prompt3, setPrompt3] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('em_interview_p3') || '' : '');

  const [selectedInterests, setSelectedInterests] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('em_interview_interests');
    return saved ? JSON.parse(saved) : [];
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const toggleInterest = (interest: string) => {
    let newInterests;
    if (selectedInterests.includes(interest)) {
      newInterests = selectedInterests.filter(i => i !== interest);
    } else {
      if (selectedInterests.length >= 5) return;
      newInterests = [...selectedInterests, interest];
    }
    setSelectedInterests(newInterests);
    localStorage.setItem('em_interview_interests', JSON.stringify(newInterests));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!prompt1 || !prompt2 || !prompt3 || selectedInterests.length === 0) {
      setErrorToast("Please answer all prompts and select at least one interest.");
      return;
    }

    setIsSaving(true);
    setErrorToast(null);

    try {
      const { error } = await supabase.from('profiles').update({
        prompt1,
        prompt2,
        prompt3,
        interests: selectedInterests
      }).eq('id', user.id);

      if (error) throw error;

      localStorage.removeItem('em_interview_p1');
      localStorage.removeItem('em_interview_p2');
      localStorage.removeItem('em_interview_p3');
      localStorage.removeItem('em_interview_interests');

      onComplete();
    } catch (err: any) {
      setErrorToast(err.message || 'Failed to save interview data.');
      setIsSaving(false);
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto z-10">
      <AnimatePresence>
        {errorToast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="mb-6 p-4 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-200 flex items-start gap-3 relative overflow-hidden">
             <span className="text-sm font-bold">{errorToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative rounded-[2.5rem] bg-neutral-900/70 border border-white/10 p-8 sm:p-10 shadow-[0_40px_80px_rgba(0,0,0,0.8)] backdrop-blur-3xl overflow-hidden">
        <div className="flex items-center gap-2 mb-3 text-emerald-400 font-mono text-xs tracking-widest uppercase">
          <CheckCircle2 className="w-4 h-4" />
          <span>Stage 2: The Interview</span>
        </div>
        <h1 className="text-4xl font-black text-white tracking-tighter mb-2">Deep Profile Data</h1>
        <p className="text-neutral-400 text-sm mb-10 font-medium">Answer these mandatory prompts to make your profile stand out.</p>

        <form onSubmit={handleSave} className="space-y-8 relative z-10">

          <div className="space-y-4">
            <div>
               <label className="block text-xs font-bold text-fuchsia-400 uppercase tracking-widest pl-1 mb-2">I describe myself as...</label>
               <textarea required rows={2} value={prompt1} onChange={(e) => { setPrompt1(e.target.value); localStorage.setItem('em_interview_p1', e.target.value); }} className="w-full bg-neutral-950/80 border border-neutral-800 rounded-2xl py-4 px-4 text-white text-sm focus:outline-none focus:border-fuchsia-500 font-medium resize-none" placeholder="Fun, easygoing, and incredibly adventurous..." />
            </div>

            <div>
               <label className="block text-xs font-bold text-fuchsia-400 uppercase tracking-widest pl-1 mb-2">My hidden talent is...</label>
               <textarea required rows={2} value={prompt2} onChange={(e) => { setPrompt2(e.target.value); localStorage.setItem('em_interview_p2', e.target.value); }} className="w-full bg-neutral-950/80 border border-neutral-800 rounded-2xl py-4 px-4 text-white text-sm focus:outline-none focus:border-fuchsia-500 font-medium resize-none" placeholder="I can name any movie from a single frame..." />
            </div>

            <div>
               <label className="block text-xs font-bold text-fuchsia-400 uppercase tracking-widest pl-1 mb-2">A perfect weekend is...</label>
               <textarea required rows={2} value={prompt3} onChange={(e) => { setPrompt3(e.target.value); localStorage.setItem('em_interview_p3', e.target.value); }} className="w-full bg-neutral-950/80 border border-neutral-800 rounded-2xl py-4 px-4 text-white text-sm focus:outline-none focus:border-fuchsia-500 font-medium resize-none" placeholder="Trying a new restaurant then hitting a rooftop bar..." />
            </div>
          </div>

          <div className="space-y-3">
             <label className="block text-xs font-bold text-neutral-300 uppercase tracking-widest pl-1">Lifestyle & Interests (Up to 5)</label>
             <div className="flex flex-wrap gap-3">
                {INTERESTS.map((interest) => {
                  const isSelected = selectedInterests.includes(interest);
                  return (
                    <motion.button
                      type="button"
                      key={interest}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleInterest(interest)}
                      className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] border-transparent'
                          : 'bg-white/5 border border-white/10 text-neutral-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {interest}
                    </motion.button>
                  );
                })}
             </div>
          </div>

          <button type="submit" disabled={isSaving} className="relative w-full h-16 mt-6 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-[1px] transition-all active:scale-95 group overflow-hidden">
            <div className="w-full h-full bg-neutral-950 rounded-full flex items-center justify-center relative z-10">
              {isSaving ? (
                <span className="text-emerald-400 font-black tracking-[0.3em] uppercase text-xs animate-pulse">Saving...</span>
              ) : (
                <span className="text-white font-black tracking-[0.2em] uppercase text-sm">Save & Continue</span>
              )}
            </div>
          </button>
        </form>
      </div>
    </div>
  );
}
