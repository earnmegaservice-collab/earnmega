import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ImagePlus, X, UploadCloud, Zap, AlertCircle } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';


interface PhotoAsset {
  file: File;
  previewUrl: string;
}

interface SpatialPhotoStudioProps {
  onComplete?: () => void;
}

export const SpatialPhotoStudio: React.FC<SpatialPhotoStudioProps> = ({ onComplete }) => {
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const { user } = useAuth();

  // 1. Bulk Gallery Selection Logic
  const handleBulkSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const incomingFiles = Array.from(e.target.files);
    
    setPhotos(prev => {
      const combined = [...prev];
      for (const file of incomingFiles) {
        if (combined.length >= 6) break; // Hard cap at exactly 6 spatial slots
        combined.push({
          file,
          previewUrl: URL.createObjectURL(file)
        });
      }
      return combined;
    });
  };

  // 2. Native Hardware Camera Hook
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    setPhotos(prev => {
      if (prev.length >= 6) return prev;
      return [...prev, { file, previewUrl: URL.createObjectURL(file) }];
    });
  };

  // 3. Remove Staged Photo
  const removePhoto = (indexToRemove: number) => {
    setPhotos(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // 4. Final Matrix Upload Logic
  const handleFinalizeMatrix = async () => {
    if (photos.length === 0) return;
    setIsUploading(true);
    setErrorToast(null);

    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const fileExt = photo.file.name.split('.').pop() || 'jpg';
        const fileName = `${user?.id || 'unknown'}-spatial-${Date.now()}-${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, photo.file, { upsert: true });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        uploadedUrls.push(data.publicUrl);
      }

      if (user) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ profile_images: uploadedUrls })
          .eq('id', user.id);

        if (updateError) {
          console.error('Profile update error:', updateError);
          throw updateError;
        }
      }

      if (onComplete) onComplete();
    } catch (error: any) {
      console.error('Error finalizing spatial matrix:', error);
      setErrorToast(error?.message || 'An unknown error occurred during upload.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-neutral-950 flex flex-col items-center pt-16 px-4 pb-32 overflow-hidden z-10">
      
      {/* Ambient Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[50%] bg-[radial-gradient(ellipse_at_center,_rgba(79,70,229,0.15)_0%,_transparent_70%)] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        
        <AnimatePresence>
          {errorToast && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="mb-6 p-4 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-200 flex items-start gap-3 w-full relative overflow-hidden">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <span className="font-bold text-red-300 uppercase tracking-wider text-xs block mb-1">Upload Failed</span>
                <span className="leading-relaxed font-mono text-xs">{errorToast}</span>
              </div>
              <button type="button" onClick={() => setErrorToast(null)} className="text-red-400 hover:text-white font-bold px-1.5 py-0.5 rounded-lg">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2 mb-4 text-indigo-400 font-mono text-xs tracking-widest uppercase">
          <Zap className="w-4 h-4" />
          <span>Stage 2: Spatial Matrix</span>
        </motion.div>
        
        <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="text-4xl font-black text-white tracking-tighter mb-3 text-center">
          Visual Identity
        </motion.h1>
        
        <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-neutral-400 text-sm font-medium mb-12 text-center max-w-xs leading-relaxed">
          Upload 6 high-resolution assets to construct your global profile deck.
        </motion.p>

        {/* 3D Glassmorphic Staging Grid */}
        <div className="grid grid-cols-3 gap-3 w-full mb-12 relative">
          {/* Grid Background Plate */}
          <div className="absolute inset-[-20px] bg-white/[0.02] border border-white/5 rounded-[2.5rem] backdrop-blur-3xl -z-10" />

          {[0, 1, 2, 3, 4, 5].map((index) => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ delay: 0.3 + (index * 0.05) }}
              key={index} 
              className="aspect-[3/4] rounded-2xl bg-black/40 backdrop-blur-md relative overflow-hidden group shadow-lg border border-white/10"
            >
              <AnimatePresence mode="popLayout">
                {photos[index] ? (
                  <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} className="w-full h-full relative">
                    <img src={photos[index].previewUrl} className="w-full h-full object-cover" alt={`Slot ${index + 1}`} />
                    {/* Dark gradient overlay so the X button is visible */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <button 
                      onClick={() => removePhoto(index)} type="button"
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-xl flex items-center justify-center text-white border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-500/80 hover:border-red-500 hover:scale-110 active:scale-90 shadow-xl"
                    >
                      <X size={14} strokeWidth={3} />
                    </button>
                  </motion.div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center border-[1.5px] border-dashed border-white/10 rounded-2xl group-hover:border-indigo-500/50 group-hover:bg-indigo-500/5 transition-all duration-300">
                    <span className="text-white/20 font-black text-3xl group-hover:text-indigo-400/40 transition-colors">{index + 1}</span>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Hardware Hooks Console */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }} className="flex gap-4 w-full mb-10">
          
          {/* Bulk Select Button */}
          <button type="button" onClick={() => document.getElementById('bulk-input')?.click()} className="flex-1 h-16 rounded-[1.5rem] bg-neutral-900 border border-neutral-700 hover:border-indigo-500/50 hover:bg-neutral-800 flex items-center justify-center gap-3 cursor-pointer transition-all duration-300 active:scale-95 shadow-xl group">
            <ImagePlus className="text-indigo-400 group-hover:scale-110 transition-transform" size={24} strokeWidth={2} />
            <span className="text-white font-bold text-sm tracking-wide">Bulk Gallery</span>
          </button>
          <input id="bulk-input" type="file" multiple accept="image/*" className="hidden" onChange={handleBulkSelect} />
          
          {/* Live Camera Button */}
          <button type="button" onClick={() => document.getElementById('camera-input')?.click()} className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-indigo-500 to-purple-600 hover:opacity-90 flex items-center justify-center cursor-pointer transition-all duration-300 active:scale-95 shadow-[0_0_30px_rgba(99,102,241,0.5)] group border border-white/20">
            <Camera className="text-white group-hover:scale-110 transition-transform" size={24} strokeWidth={2} />
          </button>
          <input id="camera-input" type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture} />
        </motion.div>

        {/* Finalize Button */}
        <AnimatePresence>
          {photos.length > 0 && (
            <motion.button type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={handleFinalizeMatrix}
              disabled={isUploading}
              className="relative w-full h-16 rounded-full bg-white text-black font-black tracking-[0.2em] uppercase text-sm shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-80 disabled:active:scale-100 overflow-hidden"
            >
              {isUploading ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 rounded-full border-2 border-neutral-300 border-t-black" />
                  <span>Uploading Assets...</span>
                </>
              ) : (
                <>
                  <span>Initialize Matrix</span>
                  <UploadCloud size={20} strokeWidth={2.5} />
                </>
              )}
            </motion.button>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};
