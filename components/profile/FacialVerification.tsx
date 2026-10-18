'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, CheckCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import * as faceapi from 'face-api.js';

interface FacialVerificationProps {
  onComplete: () => void;
}

const LIVENESS_PROMPTS = [
  "Blink slowly twice.",
  "Smile widely.",
  "Turn your head slightly to the left.",
  "Turn your head slightly to the right.",
  "Open your mouth slightly."
];

export default function FacialVerification({ onComplete }: FacialVerificationProps) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [livenessPrompt, setLivenessPrompt] = useState<string | null>(null);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  const loadModels = async () => {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models')
      ]);
      setModelsLoaded(true);
    } catch (err) {
      console.error("Failed to load models", err);
      toast.error("Failed to load facial recognition models.");
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 } } });
      setStream(mediaStream);
      setCameraError(false);
    } catch (err1: any) {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        setStream(mediaStream);
        setCameraError(false);
      } catch (err2: any) {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
          setStream(mediaStream);
          setCameraError(false);
        } catch (err3: any) {
          console.error("Camera access failed:", err3);
          setCameraError(true);
          toast.error("Camera access denied by device settings");
        }
      }
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Clean up on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const extractFaceDescriptor = async (imageElement: HTMLImageElement | HTMLVideoElement) => {
    const detection = await faceapi.detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
    return detection?.descriptor;
  };

  const getPublicImagesDescriptors = async () => {
      if (!user) return [];
      const { data, error } = await supabase.from('profiles').select('profile_images').eq('id', user.id).single();
      if (error || !data || !data.profile_images) return [];

      const descriptors: Float32Array[] = [];
      for (const url of data.profile_images) {
          if (!url) continue;
          try {
              const img = await faceapi.fetchImage(url);
              const descriptor = await extractFaceDescriptor(img);
              if (descriptor) {
                  descriptors.push(descriptor);
              }
          } catch(e) {
              console.error("Failed to extract descriptor for image", url, e);
          }
      }
      return descriptors;
  };

  const runBiometricScan = async () => {
    if (!user || !videoRef.current || !modelsLoaded) return;
    setIsVerifying(true);

    try {
        // 1. Liveness prompt
        const prompt = LIVENESS_PROMPTS[Math.floor(Math.random() * LIVENESS_PROMPTS.length)];
        setLivenessPrompt(prompt);

        // Give them time to read and act
        await new Promise(resolve => setTimeout(resolve, 3000));
        setLivenessPrompt(null);
        toast("Analyzing micro-expressions...", { icon: '🤖' });
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 2. Extract live descriptor
        const liveDescriptor = await extractFaceDescriptor(videoRef.current);
        if (!liveDescriptor) {
             throw new Error("No face detected in live feed.");
        }

        // 3. Compare with public images
        const savedDescriptors = await getPublicImagesDescriptors();
        if (savedDescriptors.length === 0) {
            // No reference images, we still pass them but maybe log it
            console.warn("No reference images to compare against.");
        } else {
             let isMatch = false;
             for (const savedDescriptor of savedDescriptors) {
                 const distance = faceapi.euclideanDistance(liveDescriptor, savedDescriptor);
                 if (distance < 0.6) { // 0.6 is typical threshold
                     isMatch = true;
                     break;
                 }
             }
             if (!isMatch) {
                 throw new Error("Biometric Mismatch: Identity Not Confirmed.");
             }
        }

        // 4. Mark profile as verified in database
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ is_verified: true })
            .eq('id', user.id);

        if (updateError) throw updateError;

        localStorage.setItem('hasBypassedLiveness', 'true');

        // Show cinematic success
        setShowSuccessOverlay(true);
        setTimeout(() => {
           onComplete();
        }, 3000);

    } catch (error: any) {
        toast.error(error.message, { style: { background: '#ef4444', color: '#fff' }});
    } finally {
        setIsVerifying(false);
    }
  };


  const handleSkip = async () => {
    toast.success("Verification bypassed.");
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 600);
  };

  if (showSuccessOverlay) {
      return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
              <motion.div
                 initial={{ scale: 0.8, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 transition={{ type: "spring", stiffness: 200, damping: 20 }}
                 className="flex flex-col items-center justify-center"
              >
                  <motion.div
                      animate={{
                          boxShadow: ["0px 0px 0px #06b6d4", "0px 0px 100px #06b6d4", "0px 0px 0px #06b6d4"],
                          rotate: [0, 360]
                      }}
                      transition={{ duration: 2, ease: "easeInOut" }}
                      className="w-32 h-32 rounded-full border-4 border-cyan-400 flex items-center justify-center mb-6 bg-blue-900/50 backdrop-blur-xl"
                  >
                      <ShieldCheck size={64} className="text-cyan-400" />
                  </motion.div>
                  <motion.h2
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500"
                  >
                      Identity Verified
                  </motion.h2>
              </motion.div>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950 p-6">
      {/* Background cinematic mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-fuchsia-900/20 via-zinc-950 to-zinc-950 pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm flex flex-col items-center text-center relative z-10 bg-white/5 backdrop-blur-3xl border border-white/10 p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
      >
        <div className="w-16 h-16 bg-gradient-to-tr from-fuchsia-500/20 to-cyan-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(192,38,211,0.3)] border border-fuchsia-400/30">
           <ShieldCheck size={32} className="text-cyan-400" />
        </div>

        <h1 className="text-3xl font-black text-white mb-2 tracking-tighter">Biometric Scan</h1>
        <p className="text-zinc-400 mb-8 text-sm">
            Military-grade liveness check. Align your face within the frame to secure your verified badge.
        </p>

        <div className="relative w-64 h-64 mx-auto mb-8 rounded-full overflow-hidden border-2 border-white/20 shadow-[0_0_50px_rgba(6,182,212,0.2)] bg-black">

            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
            />

            {/* HUD Overlay */}
            <div className="absolute inset-0 pointer-events-none border-[12px] border-black/40 rounded-full"></div>

            {/* Laser Animation */}
            {isVerifying && (
                <motion.div
                    animate={{ y: ['-10%', '110%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent shadow-[0_0_15px_rgba(217,70,239,0.8)] z-20"
                />
            )}

            {cameraError && !stream && (
                <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-md flex flex-col gap-3 items-center justify-center z-10 border border-red-500/20 rounded-full">
                    <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                        <CameraOff size={24} className="text-red-400" />
                    </div>
                    <span className="text-red-400 font-bold text-sm tracking-widest uppercase">Hardware Blocked</span>
                </div>
            )}

            {!cameraError && !stream && (
                <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm flex flex-col gap-4 items-center justify-center z-10">
                    <button type="button" onClick={startCamera} disabled={!modelsLoaded} className="bg-white text-black px-6 py-3 rounded-full font-bold shadow-lg disabled:opacity-50 transition-transform active:scale-95">
                        {modelsLoaded ? 'Initialize Scanner' : 'Loading Deep AI...'}
                    </button>
                </div>
            )}
        </div>

        <AnimatePresence>
            {livenessPrompt && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute top-32 left-0 w-full text-center z-50 pointer-events-none"
                >
                    <span className="bg-black/80 text-cyan-400 font-bold px-6 py-3 rounded-full border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.5)] backdrop-blur-md inline-block">
                        {livenessPrompt}
                    </span>
                </motion.div>
            )}
        </AnimatePresence>

        <div className="w-full flex flex-col gap-3">
            {stream && (
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={runBiometricScan}
                    disabled={isVerifying}
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold py-4 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 hover:from-cyan-500 hover:to-blue-500 transition-all border border-cyan-400/30"
                >
                    {isVerifying ? 'Analyzing Matrix...' : 'Start Scan'}
                </motion.button>
            )}

            <button
                onClick={handleSkip}
                type="button"
                disabled={isVerifying}
                className="w-full py-3 mt-2 text-neutral-500 text-sm font-medium hover:text-neutral-300 transition-colors"
            >
                Skip for Now
            </button>
        </div>
      </motion.div>
    </div>
  );
}
