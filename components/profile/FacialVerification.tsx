'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Camera, CheckCircle } from 'lucide-react';
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
  const [isVerifying, setIsVerifying] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      toast.error("Unable to access camera. Please check permissions.");
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Clean up on unmount
  React.useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const imageDataUrl = canvasRef.current.toDataURL('image/jpeg');
        setCapturedImage(imageDataUrl);
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const submitVerification = async () => {
    if (!user || !capturedImage) return;
    setIsVerifying(true);

    try {
        // 1. Convert base64 to Blob for Supabase Storage
        const res = await fetch(capturedImage);
        const blob = await res.blob();

        // 2. Upload to verification_photos bucket (private)
        const fileName = `${user.id}/verification_${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
            .from('verification_photos')
            .upload(fileName, blob);

        if (uploadError) throw uploadError;

        // 3. Mark profile as verified in database
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ is_verified: true })
            .eq('id', user.id);

        if (updateError) throw updateError;

        toast.success("Verification successful!");
        onComplete();
    } catch (error: any) {
        toast.error("Verification failed: " + error.message);
    } finally {
        setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm flex flex-col items-center text-center"
      >
        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(59,130,246,0.3)] border border-blue-400/30">
           <Camera size={32} className="text-blue-400" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">Liveness Check</h1>
        <p className="text-gray-400 mb-8">
            Look straight at the camera. We need to verify you are a real person to keep the community safe.
        </p>

        <div className="relative w-64 h-64 mx-auto mb-8 rounded-full overflow-hidden border-4 border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.5)]">
            {capturedImage ? (
                <img src={capturedImage} alt="Captured" className="w-full h-full object-cover transform scale-x-[-1]" />
            ) : (
                <>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                    {!stream && (
                        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                            <button onClick={startCamera} className="bg-white text-black px-4 py-2 rounded-full font-bold">Start Camera</button>
                        </div>
                    )}
                </>
            )}

            {/* Target overlay */}
            {!capturedImage && stream && (
               <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-32 h-40 border-2 border-dashed border-white/50 rounded-[40%]"></div>
               </div>
            )}
        </div>

        {/* Hidden canvas for image extraction */}
        <canvas ref={canvasRef} className="hidden" />

        <div className="w-full flex flex-col gap-3">
            {capturedImage ? (
                <>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={submitVerification}
                        disabled={isVerifying}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.5)] flex items-center justify-center gap-2"
                    >
                        {isVerifying ? 'Verifying...' : <>Submit Verification <CheckCircle size={20}/></>}
                    </motion.button>
                    <button
                        onClick={retakePhoto}
                        disabled={isVerifying}
                        className="w-full py-4 text-gray-400 font-medium hover:text-white"
                    >
                        Retake Photo
                    </button>
                </>
            ) : (
                stream && (
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={capturePhoto}
                        className="w-full bg-white text-black font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    >
                        Capture Photo
                    </motion.button>
                )
            )}
        </div>
      </motion.div>
    </div>
  );
}
