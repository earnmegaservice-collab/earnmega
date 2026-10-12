'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Plus, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mandatory fields
  const [images, setImages] = useState<(string | null)[]>([null, null, null, null, null, null]);
  const [genderIdentity, setGenderIdentity] = useState('');
  const [intent, setIntent] = useState('');

  // Optional fields
  const [zodiacSign, setZodiacSign] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [height, setHeight] = useState('');
  const [familyPlans, setFamilyPlans] = useState('');
  const [communicationStyle, setCommunicationStyle] = useState('');
  const [loveStyle, setLoveStyle] = useState('');
  const [languagesSpoken, setLanguagesSpoken] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadIndex, setUploadIndex] = useState<number | null>(null);

  const handleImageUploadClick = (index: number) => {
    setUploadIndex(index);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || uploadIndex === null || !user) return;
    const file = e.target.files[0];

    try {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}/profile_${Date.now()}_${uploadIndex}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('profile_images')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('profile_images')
            .getPublicUrl(fileName);

        const newImages = [...images];
        newImages[uploadIndex] = data.publicUrl;
        setImages(newImages);
        toast.success("Image uploaded!");
    } catch (error: any) {
        toast.error("Failed to upload image: " + error.message);
    }
  };

  const handleRemoveImage = (index: number) => {
      const newImages = [...images];
      newImages[index] = null;
      setImages(newImages);
  };

  const isStep1Valid = images.every(img => img !== null);
  const isStep2Valid = genderIdentity !== '' && intent !== '';

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);

    try {
        // Prepare the actual uploaded images list (using the object URLs for now,
        // normally you'd map these to the actual bucket URLs returned from supabase.storage.from.upload)
        const validImages = images.filter((img): img is string => img !== null);

        const { error } = await supabase.from('profiles').update({
            has_completed_onboarding: true,
            profile_images: validImages,
            gender_identity: genderIdentity,
            intent: intent,
            zodiac_sign: zodiacSign,
            education_level: educationLevel,
            job_title: jobTitle,
            height: height,
            family_plans: familyPlans,
            communication_style: communicationStyle,
            love_style: loveStyle,
            languages_spoken: languagesSpoken
        }).eq('id', user.id);

        if (error) throw error;
        toast.success("Profile completed successfully!");
        onComplete();
    } catch (e: any) {
        toast.error("Error saving profile: " + e.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

        <div className="flex-1 overflow-y-auto pb-24">
            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className="p-6 pt-12"
                    >
                        <h1 className="text-3xl font-bold text-white mb-2">Upload your best photos</h1>
                        <p className="text-gray-400 mb-8">Add 6 photos to show off who you are. (Mandatory)</p>

                        <div className="grid grid-cols-3 gap-3">
                            {images.map((img, idx) => (
                                <div key={idx} className="relative aspect-[3/4] bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-lg">
                                    {img ? (
                                        <>
                                            <img src={img} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => handleRemoveImage(idx)}
                                                className="absolute bottom-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white backdrop-blur-md"
                                            >
                                                <X size={16} />
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => handleImageUploadClick(idx)}
                                            className="w-full h-full flex flex-col items-center justify-center text-gray-500 hover:text-white transition-colors"
                                        >
                                            <Plus size={32} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className="p-6 pt-12"
                    >
                        <h1 className="text-3xl font-bold text-white mb-2">The Basics</h1>
                        <p className="text-gray-400 mb-8">Just a few more mandatory details.</p>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Gender Identity</label>
                                <select
                                    value={genderIdentity}
                                    onChange={(e) => setGenderIdentity(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="" disabled>Select...</option>
                                    <option value="Man">Man</option>
                                    <option value="Woman">Woman</option>
                                    <option value="Non-binary">Non-binary</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">What brings you to EarnMega?</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {['Expanding social circle', 'Finding activity partners', 'Casual chats', 'Dating'].map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => setIntent(opt)}
                                            className={`p-4 rounded-xl border text-left font-medium transition-all ${intent === opt ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div
                        key="step3"
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className="p-6 pt-12"
                    >
                        <h1 className="text-3xl font-bold text-white mb-2">More About You</h1>
                        <p className="text-gray-400 mb-8">These are optional, but they help people know you better.</p>

                        <div className="space-y-4">
                            <input type="text" placeholder="Zodiac / Star Sign" value={zodiacSign} onChange={e => setZodiacSign(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500" />
                            <input type="text" placeholder="Education Level" value={educationLevel} onChange={e => setEducationLevel(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500" />
                            <input type="text" placeholder="Job Title & Company" value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500" />
                            <input type="text" placeholder="Height" value={height} onChange={e => setHeight(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500" />
                            <input type="text" placeholder="Family Plans" value={familyPlans} onChange={e => setFamilyPlans(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500" />
                            <input type="text" placeholder="Communication Style" value={communicationStyle} onChange={e => setCommunicationStyle(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500" />
                            <input type="text" placeholder="Love Style" value={loveStyle} onChange={e => setLoveStyle(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500" />
                            <input type="text" placeholder="Languages Spoken" value={languagesSpoken} onChange={e => setLanguagesSpoken(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* Fixed Bottom Navigation Area */}
        <div className="fixed bottom-0 w-full p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
            {step === 1 && (
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    disabled={!isStep1Valid}
                    onClick={() => setStep(2)}
                    className="w-full bg-white text-black font-bold py-4 rounded-xl disabled:opacity-50 disabled:bg-gray-600 disabled:text-gray-400 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                >
                    Continue
                </motion.button>
            )}

            {step === 2 && (
                <div className="flex gap-4">
                    <button onClick={() => setStep(1)} className="px-6 py-4 rounded-xl bg-white/10 text-white font-medium">Back</button>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        disabled={!isStep2Valid}
                        onClick={() => setStep(3)}
                        className="flex-1 bg-white text-black font-bold py-4 rounded-xl disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                    >
                        Continue
                    </motion.button>
                </div>
            )}

            {step === 3 && (
                <div className="flex gap-4">
                    <button onClick={() => setStep(2)} className="px-6 py-4 rounded-xl bg-white/10 text-white font-medium">Back</button>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        disabled={isSubmitting}
                        onClick={handleSubmit}
                        className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.5)] flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? 'Saving...' : <>Finish <Check size={20}/></>}
                    </motion.button>
                </div>
            )}
        </div>
    </div>
  );
}
