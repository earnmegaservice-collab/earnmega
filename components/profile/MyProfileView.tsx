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
  liveLocation?: string;
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
  is_location_active?: boolean;
  location_city?: string;
  location_country?: string;
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
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [localImages, setLocalImages] = useState<string[]>([]);

  React.useEffect(() => {
    if (profile.publicImages) {
        setLocalImages(profile.publicImages);
    } else if (profile.profile_images) {
        setLocalImages(profile.profile_images);
    } else if (profile.avatarUrl) {
        setLocalImages([profile.avatarUrl]);
    } else {
        setLocalImages([]);
    }
  }, [profile]);




  React.useEffect(() => {
    if (isEditing) {
      setEditForm({
        bio: profile.bio || '',
        gender: profile.gender || '',
        location: profile.location || '',
        intent: profile.intent || '',
        vibe: profile.vibe || '',
        zodiac_sign: profile.zodiac_sign || '',
        education_level: profile.education_level || '',
        job_title: profile.job_title || '',
        hobby: profile.hobby || '',
        communication_style: profile.communication_style || '',
      });
    }
  }, [isEditing, profile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
           ...editForm,
           profile_images: localImages
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success("Profile saved!");
      setIsEditing(false);
      // Optional: trigger a refresh or callback to parent if needed
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    }
  };

  // Map from the `profile` object to the expected structure
  const mappedProfile: UserProfile = {
      name: profile.name || profile.username || 'User',
      age: profile.age || 25, // Mock age
      isVerified: profile.isVerified || profile.is_verified || false,
      location: profile.location || '',
      liveLocation: profile.liveLocation || '',
      is_location_active: profile.is_location_active,
      location_city: profile.location_city,
      location_country: profile.location_country,
      ghost_mode: profile.ghost_mode,
      bio: profile.bio || '',
      publicImages: localImages,
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

          setLocalImages(dbImages);

          toast.success("Photo uploaded to slot! Remember to Save Profile.");
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
              onClick={() => { if (isEditing) { setSelectedSlotIndex(index); fileInputRef.current?.click(); } else if (imgUrl) setFullscreenImage(imgUrl); }}
              className="relative aspect-[3/4] bg-white/[0.04] rounded-2xl overflow-hidden cursor-pointer group border border-white/[0.05]"
            >
              {isUploading && selectedSlotIndex === index ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-black/40">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-6 h-6 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                  />
                </div>
              ) : imgUrl ? (
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
        <div className="flex items-start justify-between">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-black text-white tracking-tight">{mappedProfile.name}</h2>
              {mappedProfile.isVerified && <VerifiedBadge />}
            </div>
            <div>
              {mappedProfile.ghost_mode ? (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full backdrop-blur-md">
                  <span className="text-xs font-bold text-white/80">Ghost Mode Active 👻</span>
                </div>
              ) : mappedProfile.is_location_active && mappedProfile.location_city ? (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full backdrop-blur-md">
                  <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  <span className="text-xs font-bold text-white/90">{mappedProfile.location_city}, {mappedProfile.location_country}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center space-x-2 mt-1">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition active:scale-95 text-white"
            >
              <Settings size={16} />
            </button>
            {onEditClick && (
              <button
                onClick={isEditing ? handleSaveProfile : () => setIsEditing(true)}
                className={`px-4 py-1.5 rounded-full border text-xs font-bold transition active:scale-95 ${
                  isEditing
                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/50 text-emerald-400 animate-pulse'
                    : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                }`}
              >
                {isEditing ? 'Save Profile' : 'Edit'}
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

        {isEditing ? (
          <textarea
            value={editForm.bio !== undefined ? editForm.bio : mappedProfile.bio}
            onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
            className="w-full bg-black/40 border border-emerald-500/30 text-white text-xs leading-relaxed font-light rounded-xl p-3 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)] resize-none"
            rows={3}
            placeholder="Write your neural bio..."
          />
        ) : mappedProfile.bio ? (
          <p className="text-xs text-white/80 leading-relaxed pt-1 font-light">
            {mappedProfile.bio}
          </p>
        ) : null}
      </div>

      {/* 3. LUMINOUS GLASSMORPHIC PILL TAGS */}
      <div className="px-6 space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/40">Attributes & Lifestyle</h4>
        {isEditing ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col space-y-1">
              <span className="text-[9px] uppercase tracking-wider text-white/50">Gender</span>
              <input type="text" value={editForm.gender !== undefined ? editForm.gender : mappedProfile.gender || ''} onChange={(e) => setEditForm({...editForm, gender: e.target.value})} className="w-full bg-black/40 border border-emerald-500/30 text-white text-xs rounded-xl p-2 focus:outline-none focus:border-emerald-500/70" placeholder="e.g. Male/Female" />
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-[9px] uppercase tracking-wider text-white/50">Location</span>
              <input type="text" value={editForm.location !== undefined ? editForm.location : mappedProfile.location || ''} onChange={(e) => setEditForm({...editForm, location: e.target.value})} className="w-full bg-black/40 border border-emerald-500/30 text-white text-xs rounded-xl p-2 focus:outline-none focus:border-emerald-500/70" placeholder="e.g. New York" />
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-[9px] uppercase tracking-wider text-white/50">Looking For</span>
              <input type="text" value={editForm.intent !== undefined ? editForm.intent : mappedProfile.intent || ''} onChange={(e) => setEditForm({...editForm, intent: e.target.value})} className="w-full bg-black/40 border border-emerald-500/30 text-white text-xs rounded-xl p-2 focus:outline-none focus:border-emerald-500/70" placeholder="e.g. Long-term" />
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-[9px] uppercase tracking-wider text-white/50">Vibe</span>
              <input type="text" value={editForm.vibe !== undefined ? editForm.vibe : mappedProfile.vibe || ''} onChange={(e) => setEditForm({...editForm, vibe: e.target.value})} className="w-full bg-black/40 border border-emerald-500/30 text-white text-xs rounded-xl p-2 focus:outline-none focus:border-emerald-500/70" placeholder="e.g. Chill" />
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-[9px] uppercase tracking-wider text-white/50">Zodiac</span>
              <input type="text" value={editForm.zodiac_sign !== undefined ? editForm.zodiac_sign : mappedProfile.zodiac || ''} onChange={(e) => setEditForm({...editForm, zodiac_sign: e.target.value})} className="w-full bg-black/40 border border-emerald-500/30 text-white text-xs rounded-xl p-2 focus:outline-none focus:border-emerald-500/70" placeholder="e.g. Aries" />
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-[9px] uppercase tracking-wider text-white/50">Education</span>
              <input type="text" value={editForm.education_level !== undefined ? editForm.education_level : mappedProfile.education || ''} onChange={(e) => setEditForm({...editForm, education_level: e.target.value})} className="w-full bg-black/40 border border-emerald-500/30 text-white text-xs rounded-xl p-2 focus:outline-none focus:border-emerald-500/70" placeholder="e.g. Masters" />
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-[9px] uppercase tracking-wider text-white/50">Job</span>
              <input type="text" value={editForm.job_title !== undefined ? editForm.job_title : mappedProfile.job || ''} onChange={(e) => setEditForm({...editForm, job_title: e.target.value})} className="w-full bg-black/40 border border-emerald-500/30 text-white text-xs rounded-xl p-2 focus:outline-none focus:border-emerald-500/70" placeholder="e.g. Engineer" />
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-[9px] uppercase tracking-wider text-white/50">Hobby</span>
              <input type="text" value={editForm.hobby !== undefined ? editForm.hobby : mappedProfile.hobby || ''} onChange={(e) => setEditForm({...editForm, hobby: e.target.value})} className="w-full bg-black/40 border border-emerald-500/30 text-white text-xs rounded-xl p-2 focus:outline-none focus:border-emerald-500/70" placeholder="e.g. Hiking" />
            </div>
            <div className="flex flex-col space-y-1 col-span-2">
              <span className="text-[9px] uppercase tracking-wider text-white/50">Communication</span>
              <input type="text" value={editForm.communication_style !== undefined ? editForm.communication_style : mappedProfile.communicationStyle || ''} onChange={(e) => setEditForm({...editForm, communication_style: e.target.value})} className="w-full bg-black/40 border border-emerald-500/30 text-white text-xs rounded-xl p-2 focus:outline-none focus:border-emerald-500/70" placeholder="e.g. Direct" />
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {mappedProfile.gender && (
              <div className="flex flex-col px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/15">
                <span className="text-[8px] uppercase tracking-wider text-white/40 mb-0.5">Gender</span>
                <span className="text-white/90 text-xs">{mappedProfile.gender}</span>
              </div>
            )}
            {mappedProfile.location && (
              <div className="flex flex-col px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/15">
                <span className="text-[8px] uppercase tracking-wider text-white/40 mb-0.5">Location</span>
                <div className="flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-rose-400" />
                  <span className="text-white/90 text-xs">{mappedProfile.location}</span>
                </div>
              </div>
            )}
            {mappedProfile.intent && (
              <div className="flex flex-col px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.15)]">
                <span className="text-[8px] uppercase tracking-wider text-purple-300 mb-0.5">Looking For</span>
                <div className="flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span className="text-purple-200 text-xs">{mappedProfile.intent}</span>
                </div>
              </div>
            )}
            {mappedProfile.vibe && (
              <div className="flex flex-col px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/15">
                <span className="text-[8px] uppercase tracking-wider text-white/40 mb-0.5">Vibe</span>
                <span className="text-white/90 text-xs">{mappedProfile.vibe}</span>
              </div>
            )}
            {mappedProfile.zodiac && (
              <div className="flex flex-col px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                <span className="text-[8px] uppercase tracking-wider text-amber-300 mb-0.5">Zodiac</span>
                <span className="text-amber-200 text-xs">♈ {mappedProfile.zodiac}</span>
              </div>
            )}
            {mappedProfile.education && (
              <div className="flex flex-col px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/15">
                <span className="text-[8px] uppercase tracking-wider text-white/40 mb-0.5">Education</span>
                <div className="flex items-center space-x-1">
                  <GraduationCap className="w-3 h-3 text-emerald-400" />
                  <span className="text-white/90 text-xs">{mappedProfile.education}</span>
                </div>
              </div>
            )}
            {mappedProfile.job && (
              <div className="flex flex-col px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/15">
                <span className="text-[8px] uppercase tracking-wider text-white/40 mb-0.5">Career</span>
                <div className="flex items-center space-x-1">
                  <Briefcase className="w-3 h-3 text-blue-400" />
                  <span className="text-white/90 text-xs">{mappedProfile.job}</span>
                </div>
              </div>
            )}
            {mappedProfile.hobby && (
              <div className="flex flex-col px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/15">
                <span className="text-[8px] uppercase tracking-wider text-white/40 mb-0.5">Hobby</span>
                <span className="text-white/90 text-xs">{mappedProfile.hobby}</span>
              </div>
            )}
            {mappedProfile.communicationStyle && (
              <div className="flex flex-col px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/15">
                <span className="text-[8px] uppercase tracking-wider text-white/40 mb-0.5">Communication</span>
                <div className="flex items-center space-x-1">
                  <MessageSquare className="w-3 h-3 text-pink-400" />
                  <span className="text-white/90 text-xs">{mappedProfile.communicationStyle}</span>
                </div>
              </div>
            )}
            {mappedProfile.languages?.map((lang, idx) => (
              <div key={idx} className="flex flex-col px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/15">
                <span className="text-[8px] uppercase tracking-wider text-white/40 mb-0.5">Language</span>
                <div className="flex items-center space-x-1">
                  <Globe className="w-3 h-3 text-cyan-400" />
                  <span className="text-white/80 text-xs">{lang.trim()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
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
            className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-2"
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
