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
import VerifiedTick from '../ui/VerifiedTick';

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
  hobbies?: string;
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
  const [isSaving, setIsSaving] = useState(false);
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
        hobbies: profile.hobbies || '',
        communication_style: profile.communication_style || '',
      });
    }
  }, [isEditing, profile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
           ...editForm,
           profile_images: localImages,
           publicImages: localImages
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Update local editForm state to reflect successful database changes
      if (data) {
        setEditForm({
            ...editForm,
            ...data
        });
      }

      toast.success("Profile saved!");
      setIsEditing(false);
      // Optional: trigger a refresh or callback to parent if needed
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    } finally {
      setIsSaving(false);
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
      hobbies: profile.hobbies,

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
              .from('profile_images')
              .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
              .from('profile_images')
              .getPublicUrl(fileName);

          const updatedImages = [...displayPhotos];
          updatedImages[selectedSlotIndex] = publicUrl;

          // Clean up array for DB (remove empty strings)
          const newArray = updatedImages.filter(url => url !== '');

          setLocalImages(newArray);


          // Phase 3 & 4: Upload Wiring - immediately updates the database array and local UI state
          const { error: dbError } = await supabase.from('profiles').update({
             ...editForm,
             "publicImages": newArray,
             "profile_images": newArray
          }).eq('id', user.id);


          if (dbError) throw dbError;

          toast.success("Photo uploaded and saved successfully!");
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
              onClick={() => {
                if (isEditing) {
                    setSelectedSlotIndex(index);
                    fileInputRef.current?.click();
                } else if (imgUrl) {
                    setFullscreenImage(imgUrl);
                }
              }}
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
                <>
                  <img
                    src={imgUrl}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-xl transition duration-300 group-hover:scale-105"
                  />
                  {isEditing && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                      >
                        <span className="text-emerald-400 text-xs font-bold">↻</span>
                      </motion.div>
                      <span className="text-white text-[9px] font-bold mt-1">Update</span>
                    </div>
                  )}
                </>
              ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center bg-black/20 group-hover:bg-white/5 transition-colors cursor-pointer" onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSlotIndex(index);
                  setIsEditing(true);
                  fileInputRef.current?.click();
                }}>
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                  >
                    <span className="text-emerald-400 text-xl font-bold">+</span>
                  </motion.div>
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
              {mappedProfile.isVerified && <VerifiedTick />}
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
                disabled={isSaving}
                onClick={isEditing ? handleSaveProfile : () => setIsEditing(true)}
                className={`px-4 py-1.5 rounded-full border text-xs font-bold transition active:scale-95 ${
                  isEditing
                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/50 text-emerald-400 animate-pulse'
                    : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                }`}
              >
                {isEditing ? (isSaving ? 'Saving...' : 'Save Profile') : 'Edit'}
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
          <div className="flex flex-wrap gap-2">
            <div className="flex flex-col space-y-1">
              <span className="text-[9px] uppercase tracking-wider text-emerald-500/70 ml-1">Gender</span>
              <div className="flex items-center px-3 py-1.5 rounded-full bg-black/40 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)] focus-within:border-emerald-400 focus-within:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all">
                  <input type="text" value={editForm.gender !== undefined ? editForm.gender : mappedProfile.gender || ''} onChange={(e) => setEditForm({...editForm, gender: e.target.value})} className="bg-transparent text-emerald-400 text-xs font-bold w-[90px] focus:outline-none placeholder:text-emerald-500/30" placeholder="e.g. Male" />
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <span className="text-[9px] uppercase tracking-wider text-emerald-500/70 ml-1">Location</span>
              <div className="flex items-center px-3 py-1.5 rounded-full bg-black/40 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)] focus-within:border-emerald-400 focus-within:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all space-x-1.5">
                  <MapPin className="w-3 h-3 text-emerald-500/70" />
                  <input type="text" value={editForm.location !== undefined ? editForm.location : mappedProfile.location || ''} onChange={(e) => setEditForm({...editForm, location: e.target.value})} className="bg-transparent text-emerald-400 text-xs font-bold w-[110px] focus:outline-none placeholder:text-emerald-500/30" placeholder="e.g. NY" />
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <span className="text-[9px] uppercase tracking-wider text-emerald-500/70 ml-1">Looking For</span>
              <div className="flex items-center px-3 py-1.5 rounded-full bg-black/40 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)] focus-within:border-emerald-400 focus-within:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all space-x-1.5">
                  <Sparkles className="w-3 h-3 text-emerald-500/70" />
                  <input type="text" value={editForm.intent !== undefined ? editForm.intent : mappedProfile.intent || ''} onChange={(e) => setEditForm({...editForm, intent: e.target.value})} className="bg-transparent text-emerald-400 text-xs font-bold w-[120px] focus:outline-none placeholder:text-emerald-500/30" placeholder="e.g. Long-term" />
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <span className="text-[9px] uppercase tracking-wider text-emerald-500/70 ml-1">Vibe</span>
              <div className="flex items-center px-3 py-1.5 rounded-full bg-black/40 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)] focus-within:border-emerald-400 focus-within:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all">
                  <input type="text" value={editForm.vibe !== undefined ? editForm.vibe : mappedProfile.vibe || ''} onChange={(e) => setEditForm({...editForm, vibe: e.target.value})} className="bg-transparent text-emerald-400 text-xs font-bold w-[90px] focus:outline-none placeholder:text-emerald-500/30" placeholder="e.g. Chill" />
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <span className="text-[9px] uppercase tracking-wider text-emerald-500/70 ml-1">Zodiac</span>
              <div className="flex items-center px-3 py-1.5 rounded-full bg-black/40 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)] focus-within:border-emerald-400 focus-within:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all space-x-1.5">
                  <span className="text-emerald-500/70 text-xs">♈</span>
                  <input type="text" value={editForm.zodiac_sign !== undefined ? editForm.zodiac_sign : mappedProfile.zodiac || ''} onChange={(e) => setEditForm({...editForm, zodiac_sign: e.target.value})} className="bg-transparent text-emerald-400 text-xs font-bold w-[80px] focus:outline-none placeholder:text-emerald-500/30" placeholder="e.g. Aries" />
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <span className="text-[9px] uppercase tracking-wider text-emerald-500/70 ml-1">Education</span>
              <div className="flex items-center px-3 py-1.5 rounded-full bg-black/40 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)] focus-within:border-emerald-400 focus-within:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all space-x-1.5">
                  <GraduationCap className="w-3 h-3 text-emerald-500/70" />
                  <input type="text" value={editForm.education_level !== undefined ? editForm.education_level : mappedProfile.education || ''} onChange={(e) => setEditForm({...editForm, education_level: e.target.value})} className="bg-transparent text-emerald-400 text-xs font-bold w-[120px] focus:outline-none placeholder:text-emerald-500/30" placeholder="e.g. Masters" />
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <span className="text-[9px] uppercase tracking-wider text-emerald-500/70 ml-1">Job</span>
              <div className="flex items-center px-3 py-1.5 rounded-full bg-black/40 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)] focus-within:border-emerald-400 focus-within:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all space-x-1.5">
                  <Briefcase className="w-3 h-3 text-emerald-500/70" />
                  <input type="text" value={editForm.job_title !== undefined ? editForm.job_title : mappedProfile.job || ''} onChange={(e) => setEditForm({...editForm, job_title: e.target.value})} className="bg-transparent text-emerald-400 text-xs font-bold w-[110px] focus:outline-none placeholder:text-emerald-500/30" placeholder="e.g. Engineer" />
              </div>
            </div>

            <div className="flex flex-col space-y-1 w-full">
              <span className="text-[9px] uppercase tracking-wider text-emerald-500/70 ml-1">Hobbies</span>
              <div className="flex items-center px-3 py-1.5 rounded-full bg-black/40 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)] focus-within:border-emerald-400 focus-within:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all">
                  <input type="text" value={editForm.hobbies !== undefined ? editForm.hobbies : mappedProfile.hobbies || ''} onChange={(e) => setEditForm({...editForm, hobbies: e.target.value})} className="bg-transparent text-emerald-400 text-xs font-bold w-full focus:outline-none placeholder:text-emerald-500/30" placeholder="e.g. Hiking, Coding" />
              </div>
            </div>

            <div className="flex flex-col space-y-1 w-full">
              <span className="text-[9px] uppercase tracking-wider text-emerald-500/70 ml-1">Communication</span>
              <div className="flex items-center px-3 py-1.5 rounded-full bg-black/40 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)] focus-within:border-emerald-400 focus-within:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all space-x-1.5">
                  <MessageSquare className="w-3 h-3 text-emerald-500/70" />
                  <input type="text" value={editForm.communication_style !== undefined ? editForm.communication_style : mappedProfile.communicationStyle || ''} onChange={(e) => setEditForm({...editForm, communication_style: e.target.value})} className="bg-transparent text-emerald-400 text-xs font-bold w-full focus:outline-none placeholder:text-emerald-500/30" placeholder="e.g. Direct and honest" />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {mappedProfile.gender && (
              <div className="flex items-center px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 hover:bg-white/[0.1] hover:border-emerald-500/30 transition-all cursor-default shadow-[0_0_10px_rgba(0,0,0,0.2)]">
                <span className="text-emerald-400 text-xs font-bold drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">{mappedProfile.gender}</span>
              </div>
            )}
            {mappedProfile.location && (
              <div className="flex items-center px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 hover:bg-white/[0.1] hover:border-emerald-500/30 transition-all cursor-default shadow-[0_0_10px_rgba(0,0,0,0.2)] space-x-1.5">
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 text-xs font-bold drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">{mappedProfile.location}</span>
              </div>
            )}
            {mappedProfile.intent && (
              <div className="flex items-center px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 hover:bg-white/[0.1] hover:border-emerald-500/30 transition-all cursor-default shadow-[0_0_10px_rgba(0,0,0,0.2)] space-x-1.5">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 text-xs font-bold drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">{mappedProfile.intent}</span>
              </div>
            )}
            {mappedProfile.vibe && (
              <div className="flex items-center px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 hover:bg-white/[0.1] hover:border-emerald-500/30 transition-all cursor-default shadow-[0_0_10px_rgba(0,0,0,0.2)]">
                <span className="text-emerald-400 text-xs font-bold drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">{mappedProfile.vibe}</span>
              </div>
            )}
            {mappedProfile.zodiac && (
              <div className="flex items-center px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 hover:bg-white/[0.1] hover:border-emerald-500/30 transition-all cursor-default shadow-[0_0_10px_rgba(0,0,0,0.2)] space-x-1.5">
                <span className="text-emerald-400 text-xs font-bold drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">♈ {mappedProfile.zodiac}</span>
              </div>
            )}
            {mappedProfile.education && (
              <div className="flex items-center px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 hover:bg-white/[0.1] hover:border-emerald-500/30 transition-all cursor-default shadow-[0_0_10px_rgba(0,0,0,0.2)] space-x-1.5">
                <GraduationCap className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 text-xs font-bold drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">{mappedProfile.education}</span>
              </div>
            )}
            {mappedProfile.job && (
              <div className="flex items-center px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 hover:bg-white/[0.1] hover:border-emerald-500/30 transition-all cursor-default shadow-[0_0_10px_rgba(0,0,0,0.2)] space-x-1.5">
                <Briefcase className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 text-xs font-bold drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">{mappedProfile.job}</span>
              </div>
            )}
            {mappedProfile.hobbies && (
              <div className="flex items-center px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 hover:bg-white/[0.1] hover:border-emerald-500/30 transition-all cursor-default shadow-[0_0_10px_rgba(0,0,0,0.2)]">
                <span className="text-emerald-400 text-xs font-bold drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">{mappedProfile.hobbies}</span>
              </div>
            )}
            {mappedProfile.communicationStyle && (
              <div className="flex items-center px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 hover:bg-white/[0.1] hover:border-emerald-500/30 transition-all cursor-default shadow-[0_0_10px_rgba(0,0,0,0.2)] space-x-1.5">
                <MessageSquare className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 text-xs font-bold drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">{mappedProfile.communicationStyle}</span>
              </div>
            )}
            {mappedProfile.languages?.map((lang, idx) => (
              <div key={idx} className="flex items-center px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 hover:bg-white/[0.1] hover:border-emerald-500/30 transition-all cursor-default shadow-[0_0_10px_rgba(0,0,0,0.2)] space-x-1.5">
                <Globe className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 text-xs font-bold drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">{lang.trim()}</span>
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
            className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-2"
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
