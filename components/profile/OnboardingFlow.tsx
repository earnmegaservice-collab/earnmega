'use client';
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import OnboardingWizard from './OnboardingWizard';
import { SpatialPhotoStudio } from './SpatialPhotoStudio';
import ExtendedQuestionnaire from './ExtendedQuestionnaire';
import TheInterview from './TheInterview';
import FacialVerification from './FacialVerification';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';

type Step = 'complete-profile' | 'the-interview' | 'spatial-studio' | 'extended-questionnaire' | 'facial-verification';

export default function OnboardingFlow({ onComplete }: { onComplete?: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('complete-profile');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Load saved step from localStorage to survive OOM kills
  useEffect(() => {
    const savedStep = localStorage.getItem('em_onboarding_step') as Step;
    if (savedStep && ['complete-profile', 'the-interview', 'spatial-studio', 'extended-questionnaire', 'facial-verification'].includes(savedStep)) {
      setStep(savedStep);
    }
    setIsLoaded(true);
  }, []);

  if (!isLoaded) return null;

  const dataUrlToBlob = async (dataUrl: string) => {
    const res = await fetch(dataUrl);
    return await res.blob();
  };

  const handleFlowComplete = async () => {
    if (!user) return;
    setIsFinalizing(true);
    try {
      const savedPhotos = JSON.parse(localStorage.getItem('em_matrix_photos') || '[]');
      const uploadedUrls: string[] = [];

      for (let i = 0; i < savedPhotos.length; i++) {
        const photo = savedPhotos[i];
        if (!photo.dataUrl) continue;
        const blob = await dataUrlToBlob(photo.dataUrl);
        const fileName = `${user.id}/spatial-${Date.now()}-${i}.jpg`;
        const { error: uploadError } = await supabase.storage.from('profile_images').upload(fileName, blob, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('profile_images').getPublicUrl(fileName);
        uploadedUrls.push(data.publicUrl);
      }

      const formData = JSON.parse(localStorage.getItem('em_questionnaire_data') || '{}');

      // The Fix: URLs are now mapped to BOTH publicImages and profile_images so they appear in the grid
      const { error } = await supabase.from('profiles').update({
        publicImages: uploadedUrls,
        profile_images: uploadedUrls,
        gender: formData.gender,
        location: formData.location,
        looking_for: formData.intent,
        vibe: formData.vibe,
        zodiac: formData.zodiac_sign,
        education: formData.education_level,
        job: formData.job_title,
        hobbies: formData.hobby,
        communication_style: formData.communication_style,
        intent: formData.intent
      }).eq('id', user.id);

      if (error) throw error;

      localStorage.removeItem('em_onboarding_step');
      localStorage.removeItem('em_matrix_photos');
      localStorage.removeItem('em_questionnaire_data');

      if (onComplete) onComplete();
    } catch (err) {
      console.error('Finalize error', err);
      alert('Failed to initialize matrix. Please try again.');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleStepChange = (newStep: Step) => {
    setStep(newStep);
    localStorage.setItem('em_onboarding_step', newStep);
  };

  return (
    <>
      {step === 'complete-profile' ? (
        <OnboardingWizard onComplete={() => handleStepChange('the-interview')} />
      ) : step === 'the-interview' ? (
        <TheInterview onComplete={() => handleStepChange('spatial-studio')} />
      ) : step === 'spatial-studio' ? (
        <SpatialPhotoStudio onComplete={() => handleStepChange('extended-questionnaire')} />
      ) : step === 'extended-questionnaire' ? (
        <ExtendedQuestionnaire onComplete={() => handleStepChange('facial-verification')} />
      ) : step === 'facial-verification' ? (
        <FacialVerification onComplete={handleFlowComplete} />
      ) : null}

      {isFinalizing && (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
          <h2 className="text-2xl font-black text-white">Initializing Matrix...</h2>
          <p className="text-emerald-400 mt-2">Securing profile data</p>
        </div>
      )}
    </>
  );
}
