'use client';
import React, { useState, useEffect } from 'react';
import OnboardingWizard from './OnboardingWizard';
import { SpatialPhotoStudio } from './SpatialPhotoStudio';
import ExtendedQuestionnaire from './ExtendedQuestionnaire';
import FacialVerification from './FacialVerification';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';

type Step = 'complete-profile' | 'spatial-studio' | 'extended-questionnaire' | 'facial-verification';

export default function OnboardingFlow({ onComplete }: { onComplete?: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('complete-profile');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved step from localStorage to survive OOM kills
  useEffect(() => {
    const savedStep = localStorage.getItem('em_onboarding_step') as Step;
    if (savedStep && ['complete-profile', 'spatial-studio', 'extended-questionnaire', 'facial-verification'].includes(savedStep)) {
      setStep(savedStep);
    }
    setIsLoaded(true);
  }, []);

  if (!isLoaded) return null;

  const handleStepChange = (newStep: Step) => {
    setStep(newStep);
    localStorage.setItem('em_onboarding_step', newStep);
  };

  return (
    <>
      {step === 'complete-profile' ? (
        <OnboardingWizard onComplete={() => handleStepChange('spatial-studio')} />
      ) : step === 'spatial-studio' ? (
        <SpatialPhotoStudio onComplete={() => handleStepChange('extended-questionnaire')} />
      ) : step === 'extended-questionnaire' ? (
        <ExtendedQuestionnaire onComplete={() => handleStepChange('facial-verification')} />
      ) : step === 'facial-verification' ? (
        <FacialVerification onComplete={() => {
          localStorage.removeItem('em_onboarding_step');
          if (onComplete) onComplete();
        }} />
      ) : null}
    </>
  );
}
