'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import { useRef } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import {
  BadgeCheck,
  MapPin,
  Briefcase,
  GraduationCap,
  Sparkles,
  Heart,
  MessageSquare,
  Globe,
  X,
  Settings
} from 'lucide-react';
import SettingsModal from './SettingsModal';
import VerifiedBadge from '../ui/VerifiedBadge';

interface UserProfile {
  name: string;
  age: number;
  isVerified: boolean;
  location?: string;
  bio?: string;
  publicImages: string[];
  zodiac?: string;
  job?: string;
  education?: string;
  height?: string;
  familyPlans?: string;
  communicationStyle?: string;
  loveStyle?: string;
  languages?: string[];
  intent?: string;
  tier?: string;
  ghost_mode?: boolean;
  gender?: string;
  hobby?: string;
  vibe?: string;
}

export default function MyProfileView({
  profile,
  onEditClick
}: {
  profile: any;
  onEditClick?: () => void
}) {
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);


  // Map from the `profile` object to the expected structure
  const mappedProfile: UserProfile = {
      name: profile.name || profile.username || 'User',
      age: profile.age || 25, // Mock age
      isVerified: profile.isVerified || profile.is_verified || false,
      location: profile.location || '',
      bio: profile.bio || '',
      publicImages: profile.profile_images || (profile.avatarUrl ? [profile.avatarUrl] : []),
      zodiac: profile.zodiac_sign,
      job: profile.job_title,
      education: profile.education_level,
      height: profile.height,
      familyPlans: profile.family_plans,
      communicationStyle: profile.communication_style,
      loveStyle: profile.love_style,
      languages: profile.languages_spoken ? profile.languages_spoken.split(',') : [],
      intent: profile.intent,
      tier: profile.tier,
      ghost_mode: profile.ghost_mode || false,
      gender: profile.gender,
      hobby: profile.hobby,
      vibe: profile.vibe,
  };


  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || selectedSlotIndex === null || !user) return;
      setIsUploading(true);

      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/profile_${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
              .from('avatars')
              .getPublicUrl(fileName);

          const updatedImages = [...displayPhotos];
          updatedImages[selectedSlotIndex] = publicUrl;

          // Clean up array for DB (remove empty strings)
          const dbImages = updatedImages.filter(url => url !== '');

          const { error: updateError } = await supabase
              .from('profiles')
              .update({ profile_images: dbImages })
              .eq('id', user.id);

          if (updateError) throw updateError;

          // The page might need a refresh to get the latest profile object, or we could update local state
          mappedProfile.publicImages = dbImages;
          displayPhotos[selectedSlotIndex] = publicUrl;

          toast.success("Photo updated successfully!");
      } catch (error: any) {
          toast.error("Upload failed: " + error.message);
      } finally {
          setIsUploading(false);
          setSelectedSlotIndex(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  // Guarantee exactly 6 slots
  const displayPhotos = [...(mappedProfile.publicImages || [])];
  while (displayPhotos.length < 6) {
    displayPhotos.push('');
  }

  return (
    <div className="w-full pb-10 space-y-6 pt-4">

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handlePhotoUpload}
      />

      {/* 1. 3x2 CINEMATIC PHOTO GRID */}
      <div className="space-y-1.5 px-4">
        <div className="grid grid-cols-3 gap-1.5 w-full rounded-3xl overflow-hidden p-1 bg-white/[0.02] border border-white/10 backdrop-blur-2xl">
          {displayPhotos.slice(0, 6).map((imgUrl, index) => (
            <div
              key={index}
              onClick={() => { if (onEditClick) { setSelectedSlotIndex(index); fileInputRef.current?.click(); } else if (imgUrl) setFullscreenImage(imgUrl); }}
              className="relative aspect-[3/4] bg-white/[0.04] rounded-2xl overflow-hidden cursor-pointer group border border-white/[0.05]"
            >
              {imgUrl ? (
                <img
                  src={imgUrl}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover rounded-xl transition duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/20">
                  <Sparkles className="w-4 h-4 mb-1" />
                  <span className="text-[9px] font-bold">Slot {index + 1}</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-center text-white/40 tracking-wider">TAP ANY PHOTO TO EXPAND IN 4K</p>
      </div>

      {/* 2. USER DETAILS HEADER */}
      <div className="px-6 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-black text-white tracking-tight">{mappedProfile.name}</h2>
            {mappedProfile.isVerified && <VerifiedBadge />}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition active:scale-95 text-white"
            >
              <Settings size={16} />
            </button>
            {onEditClick && (
              <button
                onClick={onEditClick}
                className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold transition active:scale-95 text-white"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {mappedProfile.location && (
          <div className="flex items-center space-x-1.5 text-xs text-white/60">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            <span>{mappedProfile.location}</span>
          </div>
        )}

        {mappedProfile.bio && (
          <p className="text-xs text-white/80 leading-relaxed pt-1 font-light">
            {mappedProfile.bio}
          </p>
        )}
      </div>

      {/* 3. LUMINOUS GLASSMORPHIC PILL TAGS */}
      <div className="px-6 space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/40">Attributes & Lifestyle</h4>
        <div className="flex flex-wrap gap-2">
          {mappedProfile.gender && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/15 text-white/90 text-xs">
              <span>{mappedProfile.gender}</span>
            </div>
          )}
          {mappedProfile.location && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/15 text-white/90 text-xs">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>{mappedProfile.location}</span>
            </div>
          )}
          {mappedProfile.intent && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-200 text-xs shadow-[0_0_12px_rgba(168,85,247,0.15)]">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Looking for: {mappedProfile.intent}</span>
            </div>
          )}
          {mappedProfile.vibe && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/15 text-white/90 text-xs">
              <span>{mappedProfile.vibe}</span>
            </div>
          )}
          {mappedProfile.zodiac && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs shadow-[0_0_12px_rgba(245,158,11,0.15)]">
              <span>♈ {mappedProfile.zodiac}</span>
            </div>
          )}
          {mappedProfile.education && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/15 text-white/90 text-xs">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
              <span>{mappedProfile.education}</span>
            </div>
          )}
          {mappedProfile.job && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/15 text-white/90 text-xs">
              <Briefcase className="w-3.5 h-3.5 text-blue-400" />
              <span>{mappedProfile.job}</span>
            </div>
          )}
          {mappedProfile.hobby && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/15 text-white/90 text-xs">
              <span>{mappedProfile.hobby}</span>
            </div>
          )}
          {mappedProfile.communicationStyle && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/15 text-white/90 text-xs">
              <MessageSquare className="w-3.5 h-3.5 text-pink-400" />
              <span>{mappedProfile.communicationStyle}</span>
            </div>
          )}
          {mappedProfile.languages?.map((lang, idx) => (
            <div key={idx} className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/15 text-white/80 text-xs">
              <Globe className="w-3 h-3 text-cyan-400" />
              <span>{lang.trim()}</span>
            </div>
          ))}
        </div>
      </div>

      {mappedProfile.tier && (
         <div className="px-6">
             <div className="p-4 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-2xl border border-indigo-500/20 backdrop-blur-md">
                 <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                     <span className="text-xl">💎</span> Subscription Tier
                 </h3>
                 <p className="text-gray-300 text-sm">You are currently on the <strong className="text-white">{mappedProfile.tier}</strong> plan.</p>
             </div>
         </div>
      )}

      {/* 4. 100vh FULL-SCREEN LIGHTBOX OVERLAY */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-2"
          >
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center z-10 active:scale-95"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <img
              src={fullscreenImage}
              alt="4K Enlarged Preview"
              className="w-full h-full object-contain rounded-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userProfile={profile}
      />
    </div>
  );
}
