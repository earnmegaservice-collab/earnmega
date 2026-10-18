'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';

interface ExtendedQuestionnaireProps {
  onComplete: () => void;
}

const STEPS = [
  {
    title: 'Core Identity & Location',
    fields: [
      { key: 'gender', label: 'Gender', options: ['Male', 'Female', 'Non-Binary', 'Prefer not to say'] },
      { key: 'location', label: 'Location', options: ['🇬🇭 Ghana', '🇳🇬 Nigeria', '🇺🇸 United States', '🇬🇧 United Kingdom', '🇿🇦 South Africa', '🇰🇪 Kenya', '🇨🇦 Canada', '🌍 Other / Global'] },
    ]
  },
  {
    title: 'EarnMega Intent & Vibe',
    fields: [
      { key: 'intent', label: 'Primary Intent', options: ['Earning Rewards', 'Networking & Business', 'Content Creation', 'Building Communities', 'Making Friends', 'Exploring the Hub'] },
      { key: 'vibe', label: 'Personality Vibe', options: ['Introvert', 'Extrovert', 'Ambivert', 'Observer'] },
    ]
  },
  {
    title: 'Demographics & Lifestyle',
    fields: [
      { key: 'zodiac_sign', label: 'Zodiac', options: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'] },
      { key: 'education_level', label: 'Education', options: ['High School', 'College Student', 'Undergraduate Degree', 'Postgraduate Degree', 'Self-Taught', 'Entrepreneur'] },
      { key: 'job_title', label: 'Industry/Job', options: ['Tech & IT', 'Finance & Crypto', 'Healthcare', 'Arts & Entertainment', 'Business & Sales', 'Student', 'Freelancer', 'Other'] },
    ]
  },
  {
    title: 'Hobbies & Communication',
    fields: [
      { key: 'hobby', label: 'Top Hobby', options: ['Gaming', 'Tech & Coding', 'Fashion & Style', 'Travel', 'Music & Podcasting', 'Sports & Fitness', 'Art & Design'] },
      { key: 'communication_style', label: 'Communication Style', options: ['Texting', 'Voice Notes', 'Video Calls', 'In-Person Meetups'] },
    ]
  }
];

export default function ExtendedQuestionnaire({ onComplete }: ExtendedQuestionnaireProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const handleSelect = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setToast(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', user.id);

      if (error) throw error;
      setToast({ message: 'Profile updated successfully!', type: 'success' });
      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (error: any) {
      setToast({ message: error.message || 'Failed to update profile', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStepComplete = STEPS[currentStep].fields.every(f => !!formData[f.key]);

  return (
    <div className="w-full max-w-lg mx-auto bg-neutral-900/70 backdrop-blur-3xl border border-white/10 rounded-3xl p-8 shadow-[0_40px_80px_rgba(0,0,0,0.8)]">

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-4 p-4 rounded-xl text-center text-sm font-bold ${
            toast.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          }`}
        >
          {toast.message}
        </motion.div>
      )}

      <div className="mb-8">
        <h2 className="text-2xl font-black text-white tracking-tight mb-2">Build Your Identity</h2>
        <div className="flex gap-2">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= currentStep ? 'bg-gradient-to-r from-indigo-500 to-fuchsia-500' : 'bg-white/10'}`} />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
          <div>
            <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-widest">{STEPS[currentStep].title}</h3>

            {STEPS[currentStep].fields.map((field, index) => (
              <motion.div
                key={field.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="mb-8"
              >
                <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-widest mb-3">
                  {field.label}
                </label>
                <div className="flex flex-wrap gap-3">
                  {field.options.map(option => {
                    const isSelected = formData[field.key] === option;
                    return (
                      <motion.button
                        key={option}
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSelect(field.key, option)}
                        className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                          isSelected
                            ? 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white shadow-[0_0_20px_rgba(217,70,239,0.5)] border-transparent'
                            : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20'
                        }`}
                      >
                        {option}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>

          <motion.button
            type="button"
            whileTap={isStepComplete ? { scale: 0.95 } : {}}
            onClick={handleNext}
            disabled={!isStepComplete || isSubmitting}
            className={`w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-sm transition-all ${
              isStepComplete && !isSubmitting
                ? 'bg-white text-black hover:bg-neutral-200'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Saving...' : currentStep === STEPS.length - 1 ? 'Finalize Identity' : 'Continue'}
          </motion.button>

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
