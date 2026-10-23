'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';

const INTERESTS = [
  // Pets
  'Dog', 'Cat', 'Reptile', 'None',
  // Drinking
  'Socially', 'Never', 'Frequently',
  // Smoking
  'Smoker', '420',
  // Fitness
  'Gym Rat', 'Yoga', 'Occasional',
  // Diet
  'Vegan', 'Vegetarian', 'Carnivore',
  // Personality
  'Introvert', 'Extrovert', 'Ambivert',
  // Comm. Style
  'Texter', 'Caller', 'FaceTime',
  // Other
  'Foodie', 'Nightlife', 'Investor', 'Creative',
  'Techie', 'Traveler', 'Gamer', 'Artist', 'Musician', 'Bookworm'
];

const PROMPT_OPTIONS = [
  "My most chaotic daily habit is...",
  "I'll know I've made it when...",
  "The most spontaneous thing I've done is...",
  "A boundary I will never cross is...",
  "I geek out on...",
  "My love language is..."
];

interface TheInterviewProps {
  onComplete: () => void;
}

export default function TheInterview({ onComplete }: TheInterviewProps) {
  const { user } = useAuth();

  const [prompt1Q, setPrompt1Q] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('em_interview_p1_q') || PROMPT_OPTIONS[0] : PROMPT_OPTIONS[0]);
  const [prompt1A, setPrompt1A] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('em_interview_p1_a') || '' : '');

  const [prompt2Q, setPrompt2Q] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('em_interview_p2_q') || PROMPT_OPTIONS[1] : PROMPT_OPTIONS[1]);
  const [prompt2A, setPrompt2A] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('em_interview_p2_a') || '' : '');

  const [prompt3Q, setPrompt3Q] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('em_interview_p3_q') || PROMPT_OPTIONS[2] : PROMPT_OPTIONS[2]);
  const [prompt3A, setPrompt3A] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('em_interview_p3_a') || '' : '');

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

    if (!prompt1A || !prompt2A || !prompt3A || selectedInterests.length === 0) {
      setErrorToast("Please answer all prompts and select at least one interest.");
      return;
    }

    setIsSaving(true);
    setErrorToast(null);

    try {
      const { error } = await supabase.from('profiles').update({
        prompt_1_q: prompt1Q,
        prompt_1_a: prompt1A,
        prompt_2_q: prompt2Q,
        prompt_2_a: prompt2A,
        prompt_3_q: prompt3Q,
        prompt_3_a: prompt3A,
        interests: selectedInterests
      }).eq('id', user.id);

      if (error) throw error;

      localStorage.removeItem('em_interview_p1_q');
      localStorage.removeItem('em_interview_p1_a');
      localStorage.removeItem('em_interview_p2_q');
      localStorage.removeItem('em_interview_p2_a');
      localStorage.removeItem('em_interview_p3_q');
      localStorage.removeItem('em_interview_p3_a');
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

          <div className="space-y-6">
            <div>
               <select
                 value={prompt1Q}
                 onChange={(e) => { setPrompt1Q(e.target.value); localStorage.setItem('em_interview_p1_q', e.target.value); }}
                 className="block w-full text-xs font-bold text-fuchsia-400 uppercase tracking-widest bg-transparent border-b border-fuchsia-500/30 pb-2 mb-2 focus:outline-none focus:border-fuchsia-500"
               >
                 {PROMPT_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-neutral-900 text-white">{opt}</option>)}
               </select>
               <textarea required rows={2} value={prompt1A} onChange={(e) => { setPrompt1A(e.target.value); localStorage.setItem('em_interview_p1_a', e.target.value); }} className="w-full bg-neutral-950/80 border border-neutral-800 rounded-2xl py-4 px-4 text-white text-sm focus:outline-none focus:border-fuchsia-500 font-medium resize-none" placeholder="Your answer..." />
            </div>

            <div>
               <select
                 value={prompt2Q}
                 onChange={(e) => { setPrompt2Q(e.target.value); localStorage.setItem('em_interview_p2_q', e.target.value); }}
                 className="block w-full text-xs font-bold text-fuchsia-400 uppercase tracking-widest bg-transparent border-b border-fuchsia-500/30 pb-2 mb-2 focus:outline-none focus:border-fuchsia-500"
               >
                 {PROMPT_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-neutral-900 text-white">{opt}</option>)}
               </select>
               <textarea required rows={2} value={prompt2A} onChange={(e) => { setPrompt2A(e.target.value); localStorage.setItem('em_interview_p2_a', e.target.value); }} className="w-full bg-neutral-950/80 border border-neutral-800 rounded-2xl py-4 px-4 text-white text-sm focus:outline-none focus:border-fuchsia-500 font-medium resize-none" placeholder="Your answer..." />
            </div>

            <div>
               <select
                 value={prompt3Q}
                 onChange={(e) => { setPrompt3Q(e.target.value); localStorage.setItem('em_interview_p3_q', e.target.value); }}
                 className="block w-full text-xs font-bold text-fuchsia-400 uppercase tracking-widest bg-transparent border-b border-fuchsia-500/30 pb-2 mb-2 focus:outline-none focus:border-fuchsia-500"
               >
                 {PROMPT_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-neutral-900 text-white">{opt}</option>)}
               </select>
               <textarea required rows={2} value={prompt3A} onChange={(e) => { setPrompt3A(e.target.value); localStorage.setItem('em_interview_p3_a', e.target.value); }} className="w-full bg-neutral-950/80 border border-neutral-800 rounded-2xl py-4 px-4 text-white text-sm focus:outline-none focus:border-fuchsia-500 font-medium resize-none" placeholder="Your answer..." />
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
