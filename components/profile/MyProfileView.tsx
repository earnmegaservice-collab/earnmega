'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BadgeCheck,
  MapPin,
  Briefcase,
  GraduationCap,
  Sparkles,
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
  prompt_1_q?: string;
  prompt_1_a?: string;
  prompt_2_q?: string;
  prompt_2_a?: string;
  prompt_3_q?: string;
  prompt_3_a?: string;
}

export default function MyProfileView({
  profile: initialProfileProp,
  onEditClick
}: {
  profile: any;
  onEditClick?: () => void
}) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // LIVE DATABASE TRUTH STATE
  const [liveProfile, setLiveProfile] = useState<any>(initialProfileProp);
  const [localImages, setLocalImages] = useState<string[]>([]);
  const [editForm, setEditForm] = useState<any>({});

  // UI STATE
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 1. FORCE DIRECT DATABASE FETCH ON MOUNT (KILLS THE AMNESIA BUG)
  useEffect(() => {
    let isMounted = true;
    const fetchFreshProfile = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        if (data && isMounted) {
          setLiveProfile(data);
          setLocalImages(data.publicImages || data.profile_images || []);
        }
      } catch (err) {
        console.error("Failed to fetch fresh profile data:", err);
      }
    };
    
    fetchFreshProfile();
    return () => { isMounted = false; };
  }, [user]);

  // 2. POPULATE EDIT FORM ONLY FROM LIVE DATA
  useEffect(() => {
    if (isEditing) {
      setEditForm({
        bio: liveProfile.bio || '',
        gender: liveProfile.gender || '',
        location: liveProfile.location || '',
        intent: liveProfile.intent || '',
        vibe: liveProfile.vibe || '',
        zodiac_sign: liveProfile.zodiac_sign || '',
        education_level: liveProfile.education_level || '',
        job_title: liveProfile.job_title || '',
        hobbies: liveProfile.hobbies || '',
        communication_style: liveProfile.communication_style || '',
        prompt_1_q: liveProfile.prompt_1_q || '',
        prompt_1_a: liveProfile.prompt_1_a || '',
        prompt_2_q: liveProfile.prompt_2_q || '',
        prompt_2_a: liveProfile.prompt_2_a || '',
        prompt_3_q: liveProfile.prompt_3_q || '',
        prompt_3_a: liveProfile.prompt_3_a || '',
      });
    }
  }, [isEditing, liveProfile]);

  // 3. PERMANENT TEXT SAVE
  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
           bio: editForm.bio,
           gender: editForm.gender,
           location: editForm.location,
           intent: editForm.intent,
           vibe: editForm.vibe,
           zodiac_sign: editForm.zodiac_sign,
           education_level: editForm.education_level,
           job_title: editForm.job_title,
           hobbies: editForm.hobbies,
           communication_style: editForm.communication_style,
           prompt_1_q: editForm.prompt_1_q,
           prompt_1_a: editForm.prompt_1_a,
           prompt_2_q: editForm.prompt_2_q,
           prompt_2_a: editForm.prompt_2_a,
           prompt_3_q: editForm.prompt_3_q,
           prompt_3_a: editForm.prompt_3_a,
           profile_images: localImages,
           publicImages: localImages
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setLiveProfile(data); // Lock into UI immediately
      }

      toast.success("Profile permanently saved!");
      setIsEditing(false);
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 4. PERMANENT PHOTO SAVE (ISOLATED)
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || selectedSlotIndex === null || !user) return;
      setIsUploading(true);

      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/profile_${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
              .from('profile_images')
              .upload(fileName, file, { upsert: true });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
              .from('profile_images')
              .getPublicUrl(fileName);

          const updatedImages = [...displayPhotos];
          updatedImages[selectedSlotIndex] = publicUrl;

          const newArray = updatedImages.filter(url => url !== '');
          setLocalImages(newArray);

          // ONLY update images, do NOT overwrite text fields with an empty form
          const { error: dbError } = await supabase.from('profiles').update({
             publicImages: newArray,
             profile_images: newArray
          }).eq('id', user.id);

          if (dbError) throw dbError;
          
          setLiveProfile((prev: any) => ({...prev, publicImages: newArray, profile_images: newArray}));
          toast.success("Photo uploaded and saved permanently!");
      } catch (error: any) {
          toast.error("Upload failed: " + error.message);
      } finally {
          setIsUploading(false);
          setSelectedSlotIndex(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const mappedProfile: UserProfile = {
      name: liveProfile?.name || liveProfile?.username || liveProfile?.full_name || 'User',
      age: liveProfile?.age || 25, 
      isVerified: liveProfile?.isVerified || liveProfile?.is_verified || false,
      location: liveProfile?.location || '',
      liveLocation: liveProfile?.liveLocation || '',
      is_location_active: liveProfile?.is_location_active,
      location_city: liveProfile?.location_city,
      location_country: liveProfile?.location_country,
      ghost_mode: liveProfile?.ghost_mode,
      bio: liveProfile?.bio || '',
      publicImages: localImages,
      zodiac: liveProfile?.zodiac_sign || liveProfile?.zodiac,
      job: liveProfile?.job_title || liveProfile?.job,
      education: liveProfile?.education_level || liveProfile?.education,
      height: liveProfile?.height,
      familyPlans: liveProfile?.family_plans,
      communicationStyle: liveProfile?.communication_style,
      loveStyle: liveProfile?.love_style,
      languages: liveProfile?.languages_spoken ? liveProfile?.languages_spoken.split(',') : [],
      intent: liveProfile?.intent,
      tier: liveProfile?.tier,
      gender: liveProfile?.gender,
      hobbies: liveProfile?.hobbies,
      vibe: liveProfile?.vibe,
      prompt_1_q: liveProfile?.prompt_1_q,
      prompt_1_a: liveProfile?.prompt_1_a,
      prompt_2_q: liveProfile?.prompt_2_q,
      prompt_2_a: liveProfile?.prompt_2_a,
      prompt_3_q: liveProfile?.prompt_3_q,
      prompt_3_a: liveProfile?.prompt_3_a,
  };

  const displayPhotos = [...localImages];
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

      {/* Deep Profile Prompts Section */}
      <div className="px-6 space-y-4">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-2">Deep Profile Prompts</h4>

        {/* Prompt 1 */}
        {isEditing ? (
            <div className="bg-black/40 border border-emerald-500/30 rounded-2xl p-4 shadow-[0_0_15px_rgba(16,185,129,0.1)] focus-within:border-emerald-500/70 transition-all group">
                <input
                  type="text"
                  value={editForm.prompt_1_q !== undefined ? editForm.prompt_1_q : mappedProfile.prompt_1_q || ''}
                  onChange={(e) => setEditForm({...editForm, prompt_1_q: e.target.value})}
                  className="bg-transparent text-[10px] uppercase font-bold tracking-widest text-emerald-500/70 w-full focus:outline-none mb-2"
                  placeholder="E.g. My hidden talent is..."
                />
                <textarea
                  value={editForm.prompt_1_a !== undefined ? editForm.prompt_1_a : mappedProfile.prompt_1_a || ''}
                  onChange={(e) => setEditForm({...editForm, prompt_1_a: e.target.value})}
                  className="w-full bg-transparent text-white text-sm font-medium leading-relaxed resize-none focus:outline-none placeholder:text-white/20"
                  rows={2}
                  placeholder="Your answer..."
                />
            </div>
        ) : mappedProfile.prompt_1_a ? (
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden backdrop-blur-xl">
               <div className="absolute top-0 right-0 p-3 opacity-5"><Sparkles size={40}/></div>
               <span className="text-[10px] uppercase tracking-widest text-emerald-400/80 font-bold block mb-2">{mappedProfile.prompt_1_q || "Prompt 1"}</span>
               <p className="text-base text-white font-medium leading-snug">{mappedProfile.prompt_1_a}</p>
            </div>
        ) : null}

        {/* Prompt 2 */}
        {isEditing ? (
            <div className="bg-black/40 border border-emerald-500/30 rounded-2xl p-4 shadow-[0_0_15px_rgba(16,185,129,0.1)] focus-within:border-emerald-500/70 transition-all group">
                <input
                  type="text"
                  value={editForm.prompt_2_q !== undefined ? editForm.prompt_2_q : mappedProfile.prompt_2_q || ''}
                  onChange={(e) => setEditForm({...editForm, prompt_2_q: e.target.value})}
                  className="bg-transparent text-[10px] uppercase font-bold tracking-widest text-emerald-500/70 w-full focus:outline-none mb-2"
                  placeholder="E.g. The most spontaneous thing I've done..."
                />
                <textarea
                  value={editForm.prompt_2_a !== undefined ? editForm.prompt_2_a : mappedProfile.prompt_2_a || ''}
                  onChange={(e) => setEditForm({...editForm, prompt_2_a: e.target.value})}
                  className="w-full bg-transparent text-white text-sm font-medium leading-relaxed resize-none focus:outline-none placeholder:text-white/20"
                  rows={2}
                  placeholder="Your answer..."
                />
            </div>
        ) : mappedProfile.prompt_2_a ? (
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden backdrop-blur-xl">
               <span className="text-[10px] uppercase tracking-widest text-emerald-400/80 font-bold block mb-2">{mappedProfile.prompt_2_q || "Prompt 2"}</span>
               <p className="text-base text-white font-medium leading-snug">{mappedProfile.prompt_2_a}</p>
            </div>
        ) : null}

        {/* Prompt 3 */}
        {isEditing ? (
            <div className="bg-black/40 border border-emerald-500/30 rounded-2xl p-4 shadow-[0_0_15px_rgba(16,185,129,0.1)] focus-within:border-emerald-500/70 transition-all group">
                <input
                  type="text"
                  value={editForm.prompt_3_q !== undefined ? editForm.prompt_3_q : mappedProfile.prompt_3_q || ''}
                  onChange={(e) => setEditForm({...editForm, prompt_3_q: e.target.value})}
                  className="bg-transparent text-[10px] uppercase font-bold tracking-widest text-emerald-500/70 w-full focus:outline-none mb-2"
                  placeholder="E.g. I geek out on..."
                />
                <textarea
                  value={editForm.prompt_3_a !== undefined ? editForm.prompt_3_a : mappedProfile.prompt_3_a || ''}
                  onChange={(e) => setEditForm({...editForm, prompt_3_a: e.target.value})}
                  className="w-full bg-transparent text-white text-sm font-medium leading-relaxed resize-none focus:outline-none placeholder:text-white/20"
                  rows={2}
                  placeholder="Your answer..."
                />
            </div>
        ) : mappedProfile.prompt_3_a ? (
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden backdrop-blur-xl">
               <span className="text-[10px] uppercase tracking-widest text-emerald-400/80 font-bold block mb-2">{mappedProfile.prompt_3_q || "Prompt 3"}</span>
               <p className="text-base text-white font-medium leading-snug">{mappedProfile.prompt_3_a}</p>
            </div>
        ) : null}
      </div>

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
        userProfile={liveProfile}
      />
    </div>
  );
}
