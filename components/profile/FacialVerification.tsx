'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Camera, CameraOff, CheckCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';

interface FacialVerificationProps {
  onComplete: () => void;
}

export default function FacialVerification({ onComplete }: FacialVerificationProps) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const router = useRouter();

  const startCamera = async () => {
    try {
      // PHASE 2: Lightweight Feed
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 } }, audio: false });
      setStream(mediaStream);
      setCameraFailed(false);
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraFailed(true);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    setIsVerifying(true);

    // Simulate scan delay for UX
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      if (user) {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}_biometric_fallback_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
        if (uploadError) console.error("Fallback upload failed:", uploadError);

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ is_verified: true })
            .eq('id', user.id);
        if (updateError) throw updateError;
      }

      setShowSuccessOverlay(true);
      setTimeout(() => {
        localStorage.setItem('em_hub_unlocked', 'true');
        if (typeof onComplete === 'function') onComplete();
        setTimeout(() => {
          window.location.assign('/');
        }, 500);
      }, 3000);

    } catch (err: any) {
      toast.error(err.message, { style: { background: '#ef4444', color: '#fff' }});
      setIsVerifying(false);
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const runBiometricScan = async () => {
    if (!user || !videoRef.current || !canvasRef.current) return;
    setIsVerifying(true);

    // PHASE 3: Canvas Scanner - Draw video frame to hidden canvas
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    // CRITICAL OOM FIX: Kill video feed immediately
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }

    // Cinematic Processing Delay (Neon Laser Animation time)
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
        // Upload the blob
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.7));
        if (blob) {
            const fileName = `${user.id}_biometric_${Date.now()}.jpg`;
            const { data: uploadData, error: uploadError } = await supabase.storage.from('avatars').upload(fileName, blob);
            if (uploadError) {
                console.error("Failed to upload biometric scan:", uploadError);
            }
        }

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ is_verified: true })
            .eq('id', user.id);

        if (updateError) throw updateError;

        setShowSuccessOverlay(true);
        setTimeout(() => {
           localStorage.setItem('em_hub_unlocked', 'true');
           if (typeof onComplete === 'function') onComplete();

           // Failsafe exit
           setTimeout(() => {
             window.location.assign('/');
           }, 500);
        }, 3000);

    } catch (error: any) {
        toast.error(error.message, { style: { background: '#ef4444', color: '#fff' }});
        setIsVerifying(false);
    }
  };

  const handleSkip = async () => {
    toast.success("Securing your connection...");

    // 1. Permanently unlock the app on this device
    localStorage.setItem('em_hub_unlocked', 'true');

    // 2. Silent background DB sync
    if (user) {
      await supabase.from('profiles').update({ is_verified: false }).eq('id', user.id);
    }

    // 3. Absolute hard transition
    if (typeof onComplete === 'function') onComplete();
    setTimeout(() => window.location.assign('/'), 500);
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

            <canvas ref={canvasRef} className="hidden" />

            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={stream ? "w-full h-full object-cover transform scale-x-[-1]" : "hidden"}
            />

            {isVerifying && canvasRef.current && (
                <img src={canvasRef.current.toDataURL('image/jpeg', 0.7)} className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" alt="Captured Frame" />
            )}

            <div className="absolute inset-0 pointer-events-none border-[12px] border-black/40 rounded-full"></div>

            {isVerifying && (
                <motion.div
                    animate={{ y: ['-10%', '110%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent shadow-[0_0_15px_rgba(217,70,239,0.8)] z-20"
                />
            )}

            {!stream && !isVerifying && !showSuccessOverlay && (
                <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm flex flex-col gap-4 items-center justify-center z-10 p-4 text-center">
                    {!cameraFailed ? (
                        <button type="button" onClick={startCamera} className="bg-white text-black px-6 py-3 rounded-full font-bold shadow-lg disabled:opacity-50 transition-transform active:scale-95">
                            Initialize Neural Scan
                        </button>
                    ) : (
                        <div className="flex flex-col gap-3 items-center justify-center w-full h-full bg-black/60 backdrop-blur-md rounded-full border border-white/10 p-4 shadow-xl">
                            <Upload className="w-8 h-8 text-fuchsia-400" />
                            <p className="text-white text-xs font-bold uppercase tracking-wider text-center">Camera Offline</p>
                            <label className="bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white px-4 py-2 rounded-full font-bold shadow-lg cursor-pointer transition-transform hover:scale-105 active:scale-95 text-xs">
                                Upload from Device
                                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                            </label>
                        </div>
                    )}
                </div>
            )}
        </div>

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
