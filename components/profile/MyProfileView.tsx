'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Briefcase,
  GraduationCap,
  Sparkles,
  MessageSquare,
  Globe,
  X,
  Settings,
  Heart,
  Flame,
  Crown,
  Compass,
  Star,
  Quote,
  Check,
  ShieldCheck
} from 'lucide-react';
import SettingsModal from './SettingsModal';
import VerifiedTick from '../ui/VerifiedTick';
import FacialVerification from './FacialVerification';

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
  onEditClick?: () => void;
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
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // 1. FORCE DIRECT DATABASE FETCH ON MOUNT
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
        console.error('Failed to fetch fresh profile data:', err);
      }
    };

    fetchFreshProfile();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // 2. POPULATE EDIT FORM ONLY FROM LIVE DATA
  useEffect(() => {
    if (isEditing && liveProfile) {
      setEditForm({
        bio: liveProfile.bio || '',
        gender: liveProfile.gender || '',
        location: liveProfile.location || '',
        intent: liveProfile.intent || '',
        vibe: liveProfile.vibe || '',
        zodiac_sign: liveProfile.zodiac_sign || liveProfile.zodiac || '',
        education_level: liveProfile.education_level || liveProfile.education || '',
        job_title: liveProfile.job_title || liveProfile.job || '',
        hobbies: liveProfile.hobbies || '',
        communication_style: liveProfile.communication_style || '',
        prompt_1_q: liveProfile.prompt_1_q || '',
        prompt_1_a: liveProfile.prompt_1_a || '',
        prompt_2_q: liveProfile.prompt_2_q || '',
        prompt_2_a: liveProfile.prompt_2_a || '',
        prompt_3_q: liveProfile.prompt_3_q || '',
        prompt_3_a: liveProfile.prompt_3_a || ''
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
        setLiveProfile(data);
      }

      toast.success('Profile permanently saved!');
      setIsEditing(false);
    } catch (error: any) {
      toast.error('Failed to save: ' + error.message);
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

      const {
        data: { publicUrl }
      } = supabase.storage.from('profile_images').getPublicUrl(fileName);

      const updatedImages = [...displayPhotos];
      updatedImages[selectedSlotIndex] = publicUrl;

      const newArray = updatedImages.filter((url) => url !== '');
      setLocalImages(newArray);

      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          publicImages: newArray,
          profile_images: newArray
        })
        .eq('id', user.id);

      if (dbError) throw dbError;

      setLiveProfile((prev: any) => ({
        ...prev,
        publicImages: newArray,
        profile_images: newArray
      }));
      toast.success('Photo uploaded and saved permanently!');
    } catch (error: any) {
      toast.error('Upload failed: ' + error.message);
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
    languages: liveProfile?.languages_spoken
      ? String(liveProfile.languages_spoken).split(',')
      : [],
    intent: liveProfile?.intent,
    tier: liveProfile?.tier || liveProfile?.subscription_tier,
    gender: liveProfile?.gender,
    hobbies: liveProfile?.hobbies,
    vibe: liveProfile?.vibe,
    prompt_1_q: liveProfile?.prompt_1_q,
    prompt_1_a: liveProfile?.prompt_1_a,
    prompt_2_q: liveProfile?.prompt_2_q,
    prompt_2_a: liveProfile?.prompt_2_a,
    prompt_3_q: liveProfile?.prompt_3_q,
    prompt_3_a: liveProfile?.prompt_3_a
  };

  const displayPhotos = [...localImages];
  while (displayPhotos.length < 6) {
    displayPhotos.push('');
  }

  // MERGE ALL ONBOARDING ANSWERS + LIFESTYLE COLUMNS SO EVERY ANSWER DISPLAYS BOLDLY
  const structuredAttributes: { label: string; value: string; accent: string }[] = [];

  const pushIfPresent = (label: string, val: any, accent: string) => {
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      structuredAttributes.push({ label, value: String(val).trim(), accent });
    }
  };

  pushIfPresent('Identity', mappedProfile.gender, 'from-fuchsia-500/20 to-purple-500/10 border-fuchsia-500/30 text-fuchsia-300');
  pushIfPresent('Looking For', mappedProfile.intent, 'from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-300');
  pushIfPresent('Signature Vibe', mappedProfile.vibe, 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-300');
  pushIfPresent('Location', mappedProfile.location, 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-300');
  pushIfPresent('Zodiac Sign', mappedProfile.zodiac, 'from-indigo-500/20 to-violet-500/10 border-indigo-500/30 text-indigo-300');
  pushIfPresent('Career & Craft', mappedProfile.job, 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-300');
  pushIfPresent('Education', mappedProfile.education, 'from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-300');
  pushIfPresent('Passions & Hobbies', mappedProfile.hobbies, 'from-pink-500/20 to-rose-500/10 border-pink-500/30 text-pink-300');
  pushIfPresent('Communication', mappedProfile.communicationStyle, 'from-teal-500/20 to-emerald-500/10 border-teal-500/30 text-teal-300');
  pushIfPresent('Love Style', mappedProfile.loveStyle, 'from-red-500/20 to-rose-500/10 border-red-500/30 text-red-300');
  pushIfPresent('Family Plans', mappedProfile.familyPlans, 'from-violet-500/20 to-purple-500/10 border-violet-500/30 text-violet-300');
  pushIfPresent('Height', mappedProfile.height, 'from-sky-500/20 to-cyan-500/10 border-sky-500/30 text-sky-300');

  // Include any extra JSON onboarding attributes saved inside liveProfile.attributes
  if (liveProfile?.attributes && typeof liveProfile.attributes === 'object') {
    Object.entries(liveProfile.attributes).forEach(([rawKey, val]) => {
      if (val !== null && val !== undefined && String(val).trim() !== '') {
        const cleanLabel = rawKey
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());
        const alreadyExists = structuredAttributes.some(
          (item) =>
            item.label.toLowerCase() === cleanLabel.toLowerCase() ||
            item.value.toLowerCase() === String(val).trim().toLowerCase()
        );
        if (!alreadyExists) {
          structuredAttributes.push({
            label: cleanLabel,
            value: String(val).trim(),
            accent: 'from-fuchsia-500/20 to-cyan-500/10 border-white/20 text-amber-300'
          });
        }
      }
    });
  }

  const username = mappedProfile.name;

  return (
    <div className="w-full h-[calc(100dvh-115px)] overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y pb-44 space-y-8 bg-[#030305]">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handlePhotoUpload}
      />

      {/* 1. CARDI-STYLE FULL-BLEED CINEMATIC HERO */}
      <div className="relative w-full h-[54vh] min-h-[390px] shrink-0 overflow-hidden">
        {displayPhotos[0] ? (
          <motion.img
            src={displayPhotos[0]}
            className="absolute inset-0 w-full h-full object-cover z-0"
            initial={{ scale: 1.06 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-neutral-900 via-[#0a0a0f] to-black flex items-center justify-center z-0">
            <span className="text-5xl font-black text-white/15 tracking-tighter">
              NO COVER PHOTO
            </span>
          </div>
        )}

        {/* Multi-layer luxury vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030305] via-[#030305]/45 to-black/25 z-10" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#030305] to-transparent z-10" />

        {/* Hero Identity Overlay */}
        <div className="absolute bottom-6 left-0 w-full px-6 z-20 flex flex-col gap-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tighter drop-shadow-[0_10px_25px_rgba(0,0,0,0.95)]">
              {username}
            </h1>
            {mappedProfile.isVerified && <VerifiedTick />}
          </div>

          {mappedProfile.location && (
            <div className="flex items-center gap-2 text-white/95 font-bold mt-1">
              <div className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
                <MapPin size={13} className="text-rose-400" />
              </div>
              <span className="text-base sm:text-lg tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70 font-extrabold">
                {mappedProfile.location}
              </span>
            </div>
          )}
        </div>

        {/* Floating Action Buttons (Settings untouched + Edit Profile) */}
        <div className="absolute top-4 right-5 z-30 flex items-center gap-3">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="backdrop-blur-2xl bg-black/45 ring-1 ring-white/25 rounded-full p-2.5 transition active:scale-95 text-white shadow-[0_8px_25px_rgba(0,0,0,0.6)]"
          >
            <Settings size={18} />
          </button>
          <button
            disabled={isSaving}
            onClick={isEditing ? handleSaveProfile : () => setIsEditing(true)}
            className={`backdrop-blur-2xl bg-black/45 ring-1 rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-wider transition active:scale-95 shadow-[0_8px_25px_rgba(0,0,0,0.6)] ${
              isEditing
                ? 'bg-emerald-500/25 ring-emerald-400 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.4)] animate-pulse'
                : 'ring-white/25 text-white hover:bg-white/10'
            }`}
          >
            {isEditing ? (isSaving ? 'Saving...' : 'Save Changes') : 'Edit Profile'}
          </button>
        </div>
      </div>

      {!mappedProfile.isVerified && (
          <div className="mx-5 -mt-2 mb-4 z-40 relative">
              <button
                  onClick={() => setShowVerificationModal(true)}
                  className="w-full bg-gradient-to-r from-zinc-900 via-black to-zinc-900 border border-amber-500/30 hover:border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.15)] text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-100 to-amber-300 font-semibold tracking-wider text-sm py-3.5 px-6 rounded-2xl transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-2"
              >
                  <ShieldCheck size={18} className="text-amber-300" />
                  Verify Identity
              </button>
          </div>
      )}

      {/* 2. THE 6-IMAGE CINEMATIC VAULT */}
      <div className="mx-5 p-[1.5px] rounded-[28px] bg-gradient-to-br from-fuchsia-500/60 via-amber-500/25 to-cyan-500/60 shadow-[0_20px_60px_rgba(0,0,0,0.85)]">
        <div className="bg-[#060609] rounded-[26.5px] p-4">
          <div className="flex items-center justify-between px-1 mb-3">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60 flex items-center gap-1.5">
              <Sparkles size={13} className="text-fuchsia-400" /> Visual Vault (6)
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-400/80">
              {isEditing ? 'Tap any slot to upload' : 'Tap to view 4K'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {displayPhotos.slice(0, 6).map((imgUrl, index) => (
              <motion.div
                key={index}
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  if (isEditing) {
                    setSelectedSlotIndex(index);
                    fileInputRef.current?.click();
                  } else if (imgUrl) {
                    setFullscreenImage(imgUrl);
                  }
                }}
                className="aspect-[4/5] rounded-2xl overflow-hidden ring-1 ring-white/15 relative group shadow-[inset_0_0_15px_rgba(255,255,255,0.12)] cursor-pointer bg-neutral-900/70"
              >
                {isUploading && selectedSlotIndex === index ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-black/60">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="w-7 h-7 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                    />
                  </div>
                ) : imgUrl ? (
                  <>
                    <img
                      src={imgUrl}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover rounded-2xl transition duration-500 group-hover:scale-105"
                    />
                    {isEditing && (
                      <div className="absolute inset-0 bg-black/55 backdrop-blur-xs flex flex-col items-center justify-center">
                        <div className="w-9 h-9 rounded-full bg-emerald-500/25 border border-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                          <span className="text-emerald-300 text-sm font-black">↻</span>
                        </div>
                        <span className="text-white text-[10px] font-black uppercase tracking-wider mt-1.5">
                          Replace
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center bg-white/[0.02] hover:bg-white/[0.06] transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSlotIndex(index);
                      setIsEditing(true);
                      fileInputRef.current?.click();
                    }}
                  >
                    <div className="w-11 h-11 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                      <span className="text-emerald-400 text-2xl font-black">+</span>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. LUXURY EDITORIAL BIO */}
      <div className="px-5">
        {isEditing ? (
          <div className="rounded-[28px] p-5 bg-neutral-950/90 border border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.12)]">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400 block mb-2.5">
              About Me / Bio
            </label>
            <textarea
              value={editForm.bio !== undefined ? editForm.bio : mappedProfile.bio}
              onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              className="w-full bg-black/60 border border-white/15 text-white text-lg font-bold leading-relaxed rounded-2xl p-4 focus:outline-none focus:border-emerald-400 resize-none"
              rows={3}
              placeholder="Write a bold, unforgettable bio..."
            />
          </div>
        ) : (
          <div className="rounded-[28px] p-[1px] bg-gradient-to-br from-white/20 via-white/5 to-fuchsia-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
            <div className="bg-[#08080c]/95 rounded-[27px] p-6 relative overflow-hidden backdrop-blur-3xl">
              <div className="absolute -top-6 -right-6 w-28 h-28 bg-fuchsia-500/10 rounded-full blur-2xl pointer-events-none" />
              <span className="text-xs text-fuchsia-400 font-black uppercase tracking-[0.25em] mb-3 flex items-center gap-2">
                <Crown size={14} className="text-amber-400" /> About {username}
              </span>
              <p className="text-2xl sm:text-3xl font-black text-white leading-snug tracking-tight">
                {mappedProfile.bio || 'Living life on the EarnMega stage. Tap Edit Profile to add your bio.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 4. BOLD ONBOARDING QUESTION ANSWERS & LIFESTYLE VAULT */}
      <div className="px-5 space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h4 className="text-sm font-black uppercase tracking-[0.22em] text-white flex items-center gap-2">
              <Flame size={16} className="text-amber-400" /> Onboarding Answers & Vibe
            </h4>
            <p className="text-xs text-white/50 font-semibold mt-0.5">
              Identity, lifestyle & personal highlights
            </p>
          </div>
        </div>

        {isEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-neutral-950/90 border border-emerald-500/30 rounded-[28px] p-5 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
            {[
              { key: 'gender', label: 'Gender / Identity', placeholder: 'e.g. Male / Female', val: mappedProfile.gender },
              { key: 'location', label: 'Location / Country', placeholder: 'e.g. United Kingdom', val: mappedProfile.location },
              { key: 'intent', label: 'Looking For', placeholder: 'e.g. Serious Relationship / VIP Networking', val: mappedProfile.intent },
              { key: 'vibe', label: 'Current Vibe', placeholder: 'e.g. High Energy & Ambition', val: mappedProfile.vibe },
              { key: 'zodiac_sign', label: 'Zodiac Sign', placeholder: 'e.g. Leo ♌', val: mappedProfile.zodiac },
              { key: 'education_level', label: 'Education', placeholder: 'e.g. Masters Degree', val: mappedProfile.education },
              { key: 'job_title', label: 'Career / Profession', placeholder: 'e.g. Entrepreneur & Creator', val: mappedProfile.job },
              { key: 'hobbies', label: 'Hobbies & Passions', placeholder: 'e.g. Travel, Music, Luxury Dining', val: mappedProfile.hobbies },
              { key: 'communication_style', label: 'Communication Style', placeholder: 'e.g. Direct, Loyal & Authentic', val: mappedProfile.communicationStyle }
            ].map((field) => (
              <div key={field.key} className="flex flex-col space-y-1.5 bg-black/60 border border-white/10 rounded-2xl p-3.5 focus-within:border-emerald-400 transition-all">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                  {field.label}
                </span>
                <input
                  type="text"
                  value={editForm[field.key] !== undefined ? editForm[field.key] : field.val || ''}
                  onChange={(e) => setEditForm({ ...editForm, [field.key]: e.target.value })}
                  className="bg-transparent text-white text-base font-black w-full focus:outline-none placeholder:text-white/25"
                  placeholder={field.placeholder}
                />
              </div>
            ))}
          </div>
        ) : structuredAttributes.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {structuredAttributes.map((attr, idx) => (
              <motion.div
                key={idx}
                whileTap={{ scale: 0.98 }}
                className={`rounded-3xl p-4 bg-gradient-to-br ${attr.accent} border backdrop-blur-2xl shadow-[0_12px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between min-h-[100px] ${
                  idx === 0 || attr.value.length > 22 ? 'col-span-2' : 'col-span-1'
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-[0.22em] opacity-80 block">
                  {attr.label}
                </span>
                <span className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug mt-2 break-words">
                  {attr.value}
                </span>
              </motion.div>
            ))}
          </div>
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="rounded-3xl border border-dashed border-white/20 bg-white/[0.02] p-6 text-center cursor-pointer hover:bg-white/[0.05] transition"
          >
            <p className="text-lg font-black text-white">No Onboarding Answers Added Yet</p>
            <p className="text-xs text-fuchsia-400 font-bold uppercase tracking-widest mt-1">
              Tap here to fill out your vibe, zodiac, career & lifestyle
            </p>
          </div>
        )}
      </div>

      {/* 5. SUBSCRIPTION TIER BADGE */}
      {mappedProfile.tier && (
        <div className="px-5">
          <div className="p-5 bg-gradient-to-r from-amber-500/15 via-fuchsia-500/15 to-indigo-500/15 rounded-3xl border border-amber-400/30 backdrop-blur-xl shadow-[0_15px_40px_rgba(0,0,0,0.6)] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-300 block mb-1">
                EarnMega Membership
              </span>
              <h3 className="text-2xl font-black text-white tracking-tight">
                {mappedProfile.tier} Member
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-2xl shadow-[0_0_25px_rgba(251,191,36,0.3)]">
              💎
            </div>
          </div>
        </div>
      )}

      {/* 6. DEEP PROFILE PROMPTS (BOLD, LUXURIOUS Q&A CARDS) */}
      <div className="px-5 space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h4 className="text-sm font-black uppercase tracking-[0.22em] text-white flex items-center gap-2">
              <Sparkles size={16} className="text-fuchsia-400" /> Deep Profile Prompts
            </h4>
            <p className="text-xs text-white/50 font-semibold mt-0.5">
              Bold icebreakers & personal stories
            </p>
          </div>
        </div>

        {[
          {
            num: 1,
            qKey: 'prompt_1_q',
            aKey: 'prompt_1_a',
            defaultQ: 'My hidden talent or superpower is...',
            qVal: mappedProfile.prompt_1_q,
            aVal: mappedProfile.prompt_1_a,
            gradient: 'from-fuchsia-600/25 via-purple-900/15 to-[#09090e] border-fuchsia-500/35',
            badgeText: 'text-fuchsia-300'
          },
          {
            num: 2,
            qKey: 'prompt_2_q',
            aKey: 'prompt_2_a',
            defaultQ: 'The most spontaneous thing I have ever done...',
            qVal: mappedProfile.prompt_2_q,
            aVal: mappedProfile.prompt_2_a,
            gradient: 'from-amber-500/20 via-rose-900/15 to-[#09090e] border-amber-500/35',
            badgeText: 'text-amber-300'
          },
          {
            num: 3,
            qKey: 'prompt_3_q',
            aKey: 'prompt_3_a',
            defaultQ: 'We will get along best if you love...',
            qVal: mappedProfile.prompt_3_q,
            aVal: mappedProfile.prompt_3_a,
            gradient: 'from-cyan-500/25 via-indigo-900/15 to-[#09090e] border-cyan-500/35',
            badgeText: 'text-cyan-300'
          }
        ].map((prompt) =>
          isEditing ? (
            <div
              key={prompt.num}
              className="bg-neutral-950/95 border border-emerald-500/40 rounded-3xl p-5 shadow-[0_0_25px_rgba(16,185,129,0.12)] space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                  Prompt #{prompt.num} Question
                </span>
              </div>
              <input
                type="text"
                value={
                  editForm[prompt.qKey] !== undefined
                    ? editForm[prompt.qKey]
                    : prompt.qVal || ''
                }
                onChange={(e) =>
                  setEditForm({ ...editForm, [prompt.qKey]: e.target.value })
                }
                className="bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm font-extrabold text-white w-full focus:outline-none focus:border-emerald-400"
                placeholder={prompt.defaultQ}
              />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 block pt-1">
                Your Bold Answer
              </span>
              <textarea
                value={
                  editForm[prompt.aKey] !== undefined
                    ? editForm[prompt.aKey]
                    : prompt.aVal || ''
                }
                onChange={(e) =>
                  setEditForm({ ...editForm, [prompt.aKey]: e.target.value })
                }
                className="w-full bg-black/60 border border-white/15 rounded-xl p-4 text-white text-xl font-black leading-snug resize-none focus:outline-none focus:border-emerald-400 placeholder:text-white/25"
                rows={3}
                placeholder="Write a bold answer..."
              />
            </div>
          ) : prompt.aVal ? (
            <div
              key={prompt.num}
              className={`bg-gradient-to-br ${prompt.gradient} border rounded-[28px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.75)] relative overflow-hidden backdrop-blur-2xl`}
            >
              <Quote
                size={48}
                className="absolute top-4 right-4 text-white/[0.06] pointer-events-none"
              />
              <span
                className={`text-xs uppercase tracking-[0.22em] ${prompt.badgeText} font-black block mb-3`}
              >
                {prompt.qVal || prompt.defaultQ}
              </span>
              <p className="text-2xl sm:text-3xl text-white font-black leading-tight tracking-tight break-words">
                “{prompt.aVal}”
              </p>
            </div>
          ) : (
            <div
              key={prompt.num}
              onClick={() => setIsEditing(true)}
              className="rounded-3xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] p-5 transition cursor-pointer flex items-center justify-between"
            >
              <div>
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 block">
                  {prompt.qVal || prompt.defaultQ}
                </span>
                <p className="text-base font-extrabold text-white/70 mt-1">
                  Tap to add your Prompt #{prompt.num} answer
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400 font-black text-lg">
                +
              </div>
            </div>
          )
        )}

        {/* Bottom Save Button when Editing so user doesn't have to scroll back up */}
        {isEditing && (
          <button
            disabled={isSaving}
            onClick={handleSaveProfile}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-base uppercase tracking-widest shadow-[0_0_30px_rgba(16,185,129,0.5)] active:scale-98 transition flex items-center justify-center gap-2 mt-4"
          >
            <Check size={20} strokeWidth={3} />
            {isSaving ? 'Saving Profile...' : 'Save All Profile Changes'}
          </button>
        )}
      </div>

      {/* 4K FULLSCREEN IMAGE MODAL */}
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
              className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center z-10 active:scale-95"
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

      {/* SETTINGS MODAL (UNTOUCHED FULLSCREEN BEHAVIOR) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userProfile={liveProfile}
      />

      {showVerificationModal && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/90 backdrop-blur-sm">
              <FacialVerification
                  onCancel={() => setShowVerificationModal(false)}
                  onComplete={() => {
                      setShowVerificationModal(false);
                      setLiveProfile({ ...liveProfile, isVerified: true, is_verified: true });
                      window.dispatchEvent(new Event('verification_complete'));
                  }}
                  onStartProcessing={(promise) => {
                      setShowVerificationModal(false);
                      const toastId = toast.loading('Analyzing Biometric Matrix... Your verification is processing in the background. You will receive your Blue Badge once confirmed.', { duration: 5000 });
                      promise.then(() => {
                          toast.success('Identity Verified', { id: toastId });
                          setLiveProfile({ ...liveProfile, isVerified: true, is_verified: true });
                          window.dispatchEvent(new Event('verification_complete'));
                      }).catch((err) => {
                          toast.error(err.message || 'Verification failed. Please ensure good lighting and a clear view of your face.', { id: toastId, duration: 4000 });
                      });
                  }}
              />
          </div>
      )}
    </div>
  );
}
