"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Loader2, ImagePlus, UploadCloud } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileImages: string[];
  onUploadSuccess: (newImages: string[]) => void;
}

export const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({
  isOpen,
  onClose,
  profileImages,
  onUploadSuccess
}) => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const deficit = 6 - (profileImages?.length || 0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    setError(null);

    try {
      // Create a canvas to compress the image
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("Failed to load image"));
      });

      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not get canvas context");
      ctx.drawImage(img, 0, 0, width, height);

      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
      const res = await fetch(compressedBase64);
      const blob = await res.blob();

      const fileName = `${user.id}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('profile_images')
        .upload(fileName, blob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('profile_images').getPublicUrl(fileName);
      if (!data?.publicUrl) throw new Error("Could not get public URL");

      const newUrl = data.publicUrl;
      const updatedImages = [...(profileImages || []), newUrl];

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          publicImages: updatedImages,
          profile_images: updatedImages
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      onUploadSuccess(updatedImages);

    } catch (err: any) {
      console.error("Upload error", err);
      setError(err.message || "Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
         fileInputRef.current.value = '';
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-3xl px-4"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="w-full max-w-sm bg-[#0a0a0c] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-32 bg-gradient-to-b from-indigo-500/20 to-transparent blur-2xl pointer-events-none" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors z-10"
            disabled={isUploading}
          >
            <X className="w-4 h-4 text-white/70" />
          </button>

          <div className="flex flex-col items-center text-center mt-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
              <Camera className="w-8 h-8 text-indigo-400" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Complete Your Profile</h2>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              You are missing <span className="font-bold text-indigo-400">{deficit}</span> photo{deficit !== 1 ? 's' : ''} to reach the 6-photo requirement. Profiles with full galleries get 3x more matches.
            </p>

            {error && (
              <div className="w-full p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-left mb-4">
                {error}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 w-full mb-6">
              {[...Array(6)].map((_, idx) => (
                <div
                  key={idx}
                  className={`aspect-[3/4] rounded-xl overflow-hidden border ${
                    idx < (profileImages?.length || 0)
                      ? 'border-white/10 bg-white/5'
                      : 'border-dashed border-indigo-500/30 bg-indigo-500/5 flex items-center justify-center'
                  }`}
                >
                  {idx < (profileImages?.length || 0) ? (
                    <img
                      src={profileImages[idx]}
                      alt={`Profile ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-indigo-400/50">
                      <ImagePlus className="w-6 h-6" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || deficit === 0}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3.5 px-6 rounded-2xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed mb-3"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-5 h-5" />
                  <span>Upload Photo</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              disabled={isUploading}
              className="text-xs text-zinc-500 hover:text-white transition-colors"
            >
              Do it later
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
