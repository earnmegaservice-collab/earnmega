'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Play,
  Camera,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Sparkles,
  ArrowLeft,
  Check,
  RefreshCw,
  Layers,
  ShieldCheck
} from 'lucide-react';
import FacialVerification from '../profile/FacialVerification';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

interface StatusTabProps {
  onStatusClick: (statusGroupId: string, statuses: any[], creatorProfile: any) => void;
  currentUserProfile: any;
}

export default function StatusTab({ onStatusClick, currentUserProfile }: StatusTabProps) {
  const { user } = useAuth();
  const [groupedStatuses, setGroupedStatuses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingStatus, setIsUploadingStatus] = useState(false);
  const [isUploadingPP, setIsUploadingPP] = useState(false);

  // Active Filter Tab: 'all' | 'hidden'
  const [activeTab, setActiveTab] = useState<'all' | 'hidden'>('all');
  const [mutedUserIds, setMutedUserIds] = useState<Set<string>>(new Set());

  // Truth-Synced Profile Picture & Username State
  const [myAvatarUrl, setMyAvatarUrl] = useState<string>('');
  const [myUsername, setMyUsername] = useState<string>('');
  const [isHdAvatarOpen, setIsHdAvatarOpen] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  const statusFileInputRef = useRef<HTMLInputElement>(null);
  const ppFileInputRef = useRef<HTMLInputElement>(null);

  // Format relative time (e.g., "Just now", "14m ago", "2h ago")
  const formatRelativeTime = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recently';
    }
  };

  // --- SYNC CURRENT USER PROFILE & AVATAR FROM DB + PROPS + LOCALSTORAGE ---
  useEffect(() => {
    const initProfile = async () => {
      if (!user?.id) return;

      // 1. Check local cache & incoming prop (supports both camelCase and snake_case)
      const cachedAvatar =
        typeof window !== 'undefined' ? localStorage.getItem(`earnmega_avatar_${user.id}`) : null;
      const propAvatar =
        currentUserProfile?.avatarUrl ||
        currentUserProfile?.avatar_url ||
        (user as any)?.user_metadata?.avatar_url ||
        '';
      const propName =
        currentUserProfile?.name ||
        currentUserProfile?.username ||
        (user as any)?.user_metadata?.username ||
        'VIP Member';

      if (cachedAvatar || propAvatar) setMyAvatarUrl(cachedAvatar || propAvatar);
      if (propName) setMyUsername(propName);
      if (currentUserProfile?.is_verified !== undefined) {
          setIsVerified(currentUserProfile.is_verified);
      }

      // 2. Fetch fresh row directly from Supabase profiles table
      try {
        const { data } = await supabase
          .from('profiles')
          .select('username, avatar_url, is_verified')
          .eq('id', user.id)
          .single();

        if (data) {
          if (data.avatar_url) {
            setMyAvatarUrl(data.avatar_url);
            if (typeof window !== 'undefined') {
              localStorage.setItem(`earnmega_avatar_${user.id}`, data.avatar_url);
            }
            if (currentUserProfile) {
              currentUserProfile.avatarUrl = data.avatar_url;
              currentUserProfile.avatar_url = data.avatar_url;
            }
          }
          if (data.username) {
            setMyUsername(data.username);
          }
          setIsVerified(data.is_verified || false);
        }
      } catch {
        // Fallback silently to prop/cache
      }
    };

    initProfile();
  }, [user, currentUserProfile]);

  // --- LOAD MUTED / HIDDEN USERS ---
  const fetchMutedUsers = async () => {
    if (!user?.id) return;
    const localMutes =
      typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem(`earnmega_muted_statuses_${user.id}`) || '[]')
        : [];
    const muteSet = new Set<string>(localMutes);

    try {
      const { data, error } = await supabase
        .from('status_mutes')
        .select('muted_id')
        .eq('muter_id', user.id);

      if (data && Array.isArray(data)) {
        data.forEach((row: any) => {
          const targetId = row.muted_id;
          if (targetId) muteSet.add(targetId);
        });
      }
    } catch {
      // Uses localStorage mutes if table schema differs
    }

    setMutedUserIds(muteSet);
  };

  // --- HIDE / UNHIDE USER STATUSES ---
  const handleToggleMuteUser = async (targetUserId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user?.id || !targetUserId) return;

    const isCurrentlyMuted = mutedUserIds.has(targetUserId);
    const updatedSet = new Set(mutedUserIds);

    if (isCurrentlyMuted) {
      updatedSet.delete(targetUserId);
      setMutedUserIds(updatedSet);
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          `earnmega_muted_statuses_${user.id}`,
          JSON.stringify(Array.from(updatedSet))
        );
      }
      try {
        const { error } = await supabase
          .from('status_mutes')
          .delete()
          .match({ muter_id: user.id, muted_id: targetUserId });

        if (error) throw error;
      } catch (err: any) {
        console.error('Failed to unhide user:', err);
        toast.error('Failed to unhide user');
        return; // Revert optimistic update? For now just return
      }
      toast.success('User unhidden! Updates restored to your feed.');
    } else {
      updatedSet.add(targetUserId);
      setMutedUserIds(updatedSet);
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          `earnmega_muted_statuses_${user.id}`,
          JSON.stringify(Array.from(updatedSet))
        );
      }
      try {
        const { error } = await supabase.from('status_mutes').insert({
          muter_id: user.id,
          muted_id: targetUserId
        });
        if (error && error.code !== '23505') throw error;
      } catch (err: any) {
        console.error('Failed to hide user:', err);
        toast.error('Failed to hide user');
        return;
      }
      toast.success('Status updates hidden.');
    }
  };

  // --- FETCH ACTIVE STATUSES (LAST 24H) ---
  const fetchStatuses = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('statuses')
        .select(`
          id,
          user_id,
          media_url,
          media_type,
          created_at,
          profiles:user_id (id, username, avatar_url)
        `)
        .gt('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Non-blocking view counts fetch so creator sees accurate views
      const viewCountsMap = new Map<string, number>();
      try {
        const statusIds = (data || []).map((s: any) => s.id);
        if (statusIds.length > 0) {
          const { data: viewsData } = await supabase
            .from('status_views')
            .select('status_id, user_id')
            .in('status_id', statusIds);

          if (viewsData && Array.isArray(viewsData)) {
            const uniqueTracker = new Map<string, Set<string>>();
            viewsData.forEach((v: any) => {
              if (!uniqueTracker.has(v.status_id)) {
                uniqueTracker.set(v.status_id, new Set());
              }
              uniqueTracker.get(v.status_id)?.add(v.user_id);
            });
            uniqueTracker.forEach((userSet, sId) => {
              viewCountsMap.set(sId, userSet.size);
            });
          }
        }
      } catch {
        // Ignore if status_views table is empty
      }

      const groups = new Map<string, any>();
      data?.forEach((status: any) => {
        const userId = status.user_id;
        // Strict normalization in case Supabase returns joined profile as array or object
        const rawProfile = Array.isArray(status.profiles) ? status.profiles[0] : status.profiles;
        const resolvedAvatar =
          userId === user.id
            ? myAvatarUrl || rawProfile?.avatar_url || currentUserProfile?.avatarUrl || ''
            : rawProfile?.avatar_url || '';
        const resolvedUsername =
          userId === user.id
            ? myUsername || rawProfile?.username || currentUserProfile?.name || 'Me'
            : rawProfile?.username || 'User';

        const normalizedProfile = {
          id: userId,
          username: resolvedUsername,
          avatar_url: resolvedAvatar,
          avatarUrl: resolvedAvatar
        };

        const enrichedStatus = {
          ...status,
          userId: userId,
          username: resolvedUsername,
          avatarUrl: resolvedAvatar,
          mediaUrl: status.media_url,
          mediaType: status.media_type,
          viewsCount: viewCountsMap.get(status.id) || 0,
          isOwner: userId === user.id,
          profiles: normalizedProfile
        };

        if (!groups.has(userId)) {
          groups.set(userId, {
            userId: userId,
            profile: normalizedProfile,
            statuses: [],
            latestUpdate: status.created_at,
            totalViews: 0
          });
        }

        const groupObj = groups.get(userId);
        groupObj.statuses.push(enrichedStatus);
        groupObj.latestUpdate = status.created_at;
        groupObj.totalViews += enrichedStatus.viewsCount;
      });

      const groupedArray = Array.from(groups.values()).sort(
        (a, b) => new Date(b.latestUpdate).getTime() - new Date(a.latestUpdate).getTime()
      );

      setGroupedStatuses(groupedArray);
    } catch (err) {
      console.error('Error fetching statuses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMutedUsers();
    fetchStatuses();

    const uniqueChannel = `status-updates-${Date.now()}`;
    const channel = supabase
      .channel(uniqueChannel)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'statuses' }, () => {
        fetchStatuses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, myAvatarUrl]);

  // --- BULLETPROOF ISOLATED P.P. UPLOAD (SYNCED EVERYWHERE) ---
  const handleProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // File validation
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size exceeds 10MB limit.');
      if (ppFileInputRef.current) ppFileInputRef.current.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type. Only images are allowed.');
      if (ppFileInputRef.current) ppFileInputRef.current.value = '';
      return;
    }

    // 1. Instant Optimistic Preview on UI
    const optimisticBlobUrl = URL.createObjectURL(file);
    const previousAvatar = myAvatarUrl;
    setMyAvatarUrl(optimisticBlobUrl);
    setIsUploadingPP(true);

    const toastId = toast.loading('Uploading 4K Profile Picture...');

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `avatars/${user.id}-${uuidv4()}.${fileExt}`;

      // 2. Upload to 'profile_images' bucket exclusively
      let finalPublicUrl = '';
      const { error: uploadErr } = await supabase.storage
        .from('profile_images')
        .upload(fileName, file, { upsert: true });

      if (uploadErr) {
         throw uploadErr;
      }

      const { data: urlData } = supabase.storage.from('profile_images').getPublicUrl(fileName);
      finalPublicUrl = urlData.publicUrl;

      // 3. Persist to Supabase `profiles` table
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('publicImages, profile_images')
        .eq('id', user.id)
        .single();

      const currentPublicImages = currentProfile?.publicImages || [];
      const currentProfileImages = currentProfile?.profile_images || [];

      // Avoid duplicates
      const updatedPublicImages = [...new Set([...currentPublicImages, finalPublicUrl])];
      const updatedProfileImages = [...new Set([...currentProfileImages, finalPublicUrl])];

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: finalPublicUrl,
          publicImages: updatedPublicImages,
          profile_images: updatedProfileImages,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // 4. Sync with Supabase Auth User Metadata for global session access
      try {
        await supabase.auth.updateUser({
          data: { avatar_url: finalPublicUrl, picture: finalPublicUrl }
        });
      } catch {}

      // 5. Update state, parent reference (for ChatList/ChatInterface), and localStorage
      setMyAvatarUrl(finalPublicUrl);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`earnmega_avatar_${user.id}`, finalPublicUrl);
      }
      if (currentUserProfile) {
        currentUserProfile.avatarUrl = finalPublicUrl;
        currentUserProfile.avatar_url = finalPublicUrl;
      }

      // 6. Update any active status cards for current user immediately
      setGroupedStatuses((prev) =>
        prev.map((g) =>
          g.userId === user.id
            ? {
                ...g,
                profile: { ...g.profile, avatar_url: finalPublicUrl, avatarUrl: finalPublicUrl },
                statuses: g.statuses.map((s: any) => ({ ...s, avatarUrl: finalPublicUrl }))
              }
            : g
        )
      );

      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(25);
      toast.success('HD Profile Picture Live Everywhere!', { id: toastId });
    } catch (error: any) {
      console.error('PP Upload Failed:', error);
      setMyAvatarUrl(previousAvatar);
      toast.error(error?.message || 'Failed to update profile picture', { id: toastId });
    } finally {
      setIsUploadingPP(false);
      if (ppFileInputRef.current) ppFileInputRef.current.value = '';
    }
  };

  // --- STATUS MEDIA UPLOAD ---
  const handleStatusUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Media Validation
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size exceeds 50MB limit.');
      if (statusFileInputRef.current) statusFileInputRef.current.value = '';
      return;
    }
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) {
      toast.error('Invalid file type. Only images and videos are allowed.');
      if (statusFileInputRef.current) statusFileInputRef.current.value = '';
      return;
    }

    setIsUploadingStatus(true);
    const toastId = toast.loading('Publishing 4K Status...');

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${uuidv4()}.${fileExt}`; // Segment by user_id for better security/RLS

      const { error: uploadError } = await supabase.storage.from('statuses').upload(fileName, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl }
      } = supabase.storage.from('statuses').getPublicUrl(fileName);

      const { error: insertError } = await supabase.from('statuses').insert({
        user_id: user.id,
        media_url: publicUrl,
        media_type: isVideo ? 'video' : 'image'
      });

      if (insertError) throw insertError;

      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([15, 30, 15]);
      toast.success('4K Status Published!', { id: toastId });
      await fetchStatuses();
    } catch (error: any) {
      console.error('Status Upload Failed:', error);
      toast.error(error?.message || 'Failed to upload status', { id: toastId });
    } finally {
      setIsUploadingStatus(false);
      if (statusFileInputRef.current) statusFileInputRef.current.value = '';
    }
  };

  const myStatusGroup = groupedStatuses.find((g) => g.userId === user?.id);
  const hasMyActiveStatus = Boolean(myStatusGroup && myStatusGroup.statuses.length > 0);

  const visibleOtherGroups = groupedStatuses.filter(
    (g) => g.userId !== user?.id && !mutedUserIds.has(g.userId)
  );
  const hiddenOtherGroups = groupedStatuses.filter(
    (g) => g.userId !== user?.id && mutedUserIds.has(g.userId)
  );

  const displayedGroups = activeTab === 'all' ? visibleOtherGroups : hiddenOtherGroups;

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto pb-28 px-1 select-none">
      {/* =========================================================
          PHASE 1: 4K LUXURY IDENTITY & PROFILE PICTURE STUDIO
         ========================================================= */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-gradient-to-br from-[#12131a]/95 via-[#090a0f]/98 to-[#050507] backdrop-blur-3xl border border-white/10 rounded-[36px] p-5 sm:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden"
      >
        {/* Ambient Luxury Glows */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-fuchsia-600/20 blur-[90px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amber-500/10 blur-[90px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            {/* Avatar Container with Active Status Ring + Camera Trigger */}
            <div className="relative flex-shrink-0">
              <motion.div
                whileTap={{ scale: 0.94 }}
                onClick={() => setIsHdAvatarOpen(true)}
                className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full cursor-pointer flex items-center justify-center transition-all duration-300 ${
                  hasMyActiveStatus
                    ? 'p-[3px] bg-gradient-to-tr from-fuchsia-500 via-rose-500 to-amber-400 shadow-[0_0_25px_rgba(217,70,239,0.55)]'
                    : 'p-[2px] bg-gradient-to-tr from-white/30 via-white/10 to-white/5 shadow-xl'
                }`}
              >
                <div className="w-full h-full rounded-full bg-[#0a0b0e] overflow-hidden border-2 border-[#050505] flex items-center justify-center relative">
                  {myAvatarUrl ? (
                    <img
                      src={myAvatarUrl}
                      alt={myUsername || 'Profile'}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-2xl font-black bg-gradient-to-br from-fuchsia-400 to-amber-300 bg-clip-text text-transparent">
                      {(myUsername?.[0] || 'U').toUpperCase()}
                    </span>
                  )}

                  {isUploadingPP && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-fuchsia-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Floating Frosted Camera Button (Isolated P.P. Upload) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isUploadingPP) ppFileInputRef.current?.click();
                }}
                disabled={isUploadingPP}
                title="Upload New Profile Picture"
                className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-gradient-to-tr from-fuchsia-600 to-rose-500 border-2 border-[#050505] text-white flex items-center justify-center shadow-[0_4px_15px_rgba(217,70,239,0.6)] hover:scale-110 active:scale-90 transition-transform z-20"
              >
                <Camera size={15} />
              </button>

              <input
                type="file"
                accept="image/*"
                ref={ppFileInputRef}
                onChange={handleProfilePicUpload}
                className="hidden"
              />
            </div>

            {/* Identity Details & Quick Actions */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight truncate">
                  {myUsername || 'VIP Member'}
                </h2>
                {isVerified && (
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                    <ShieldCheck size={10} />
                    VERIFIED
                  </span>
                )}
                {!isVerified && (
                    <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/30">
                      4K HD
                    </span>
                )}
              </div>

              <p className="text-xs text-white/50 font-medium mt-0.5 truncate">
                {hasMyActiveStatus
                  ? `${myStatusGroup.statuses.length} active ${
                      myStatusGroup.statuses.length === 1 ? 'story' : 'stories'
                    } • ${myStatusGroup.totalViews || 0} views`
                  : 'Tap avatar for Full HD • Camera to change photo'}
              </p>

              {/* Dedicated Action Pills */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => ppFileInputRef.current?.click()}
                  disabled={isUploadingPP}
                  className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] font-bold text-white flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Camera size={12} className="text-fuchsia-400" />
                  <span>Change Photo</span>
                </button>

                {myAvatarUrl && (
                  <button
                    type="button"
                    onClick={() => setIsHdAvatarOpen(true)}
                    className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-white/80 flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <Sparkles size={12} className="text-amber-400" />
                    <span>View HD</span>
                  </button>
                )}
              </div>

              {!isVerified && (
                  <div className="mt-4 flex w-full">
                      <button
                          onClick={() => setShowVerificationModal(true)}
                          className="w-full bg-gradient-to-r from-zinc-900 via-black to-zinc-900 border border-amber-500/30 hover:border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.15)] text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-100 to-amber-300 font-semibold tracking-wider text-sm py-3.5 px-6 rounded-2xl transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                          <ShieldCheck size={18} className="text-amber-300" />
                          Verify Identity
                      </button>
                  </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>


      {showVerificationModal && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/90 backdrop-blur-sm">
              <FacialVerification
                  onCancel={() => setShowVerificationModal(false)}
                  onComplete={() => {
                      setShowVerificationModal(false);
                      setIsVerified(true);
                          window.dispatchEvent(new Event('verification_complete'));
                      window.dispatchEvent(new Event('verification_complete'));
                  }}
                  onStartProcessing={(promise) => {
                      setShowVerificationModal(false);
                      const toastId = toast.loading('Analyzing Biometric Matrix... Your verification is processing in the background. You will receive your Blue Badge once confirmed.', { duration: 5000 });
                      promise.then(() => {
                          toast.success('Identity Verified', { id: toastId });
                          setIsVerified(true);
                          window.dispatchEvent(new Event('verification_complete'));
                      }).catch((err) => {
                          toast.error(err.message || 'Verification failed. Please ensure good lighting and a clear view of your face.', { id: toastId, duration: 4000 });
                      });
                  }}
              />
          </div>
      )}

            {/* =========================================================
          PHASE 2: FEED NAVIGATION & PRIVACY FILTER BAR
         ========================================================= */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 bg-[#111418]/90 p-1 rounded-2xl border border-white/10 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-1.5 rounded-xl text-xs font-black tracking-wide transition-all ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-fuchsia-600 to-rose-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.4)]'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Live Stories ({visibleOtherGroups.length + (hasMyActiveStatus ? 1 : 0)})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hidden')}
            className={`px-4 py-1.5 rounded-xl text-xs font-black tracking-wide flex items-center gap-1.5 transition-all ${
              activeTab === 'hidden'
                ? 'bg-white/15 text-white border border-white/20 shadow-lg'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <EyeOff size={12} />
            <span>Hidden ({hiddenOtherGroups.length})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => fetchStatuses()}
          className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all active:rotate-180"
          title="Refresh Stories"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin text-fuchsia-400' : ''} />
        </button>
      </div>

      {/* =========================================================
          PHASE 3: 4K BENTO STATUS GRID
         ========================================================= */}
      {activeTab === 'all' ? (
        <div className="grid grid-cols-3 gap-3.5 sm:gap-4">
          {/* --- MY STATUS CARD --- */}
          <motion.div
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              if (hasMyActiveStatus) {
                onStatusClick(myStatusGroup.userId, myStatusGroup.statuses, myStatusGroup.profile);
              } else if (!isUploadingStatus) {
                statusFileInputRef.current?.click();
              }
            }}
            className="relative bg-gradient-to-b from-[#161922] to-[#090a0f] border border-white/15 hover:border-fuchsia-500/50 rounded-[28px] p-3.5 flex flex-col items-center justify-between shadow-[0_15px_35px_rgba(0,0,0,0.6)] cursor-pointer group aspect-[3/4] overflow-hidden transition-all"
          >
            {/* Background Media Preview if Active */}
            {hasMyActiveStatus ? (
              myStatusGroup.statuses[myStatusGroup.statuses.length - 1].media_type === 'video' ? (
                <video
                  src={myStatusGroup.statuses[myStatusGroup.statuses.length - 1].media_url}
                  className="absolute inset-0 w-full h-full object-cover opacity-65 group-hover:scale-105 transition-transform duration-500"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={myStatusGroup.statuses[myStatusGroup.statuses.length - 1].media_url}
                  className="absolute inset-0 w-full h-full object-cover opacity-65 group-hover:scale-105 transition-transform duration-500"
                  alt="My Status"
                />
              )
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.18),transparent_65%)]" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/40" />

            {/* Top Segment Indicators & Views Badge */}
            <div className="relative z-10 w-full flex flex-col gap-1.5">
              {hasMyActiveStatus && (
                <div className="flex gap-1 w-full">
                  {myStatusGroup.statuses.map((s: any) => (
                    <div
                      key={s.id}
                      className="h-1 flex-1 rounded-full bg-gradient-to-r from-fuchsia-400 to-amber-400 shadow-[0_0_8px_rgba(217,70,239,0.8)]"
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between w-full">
                {hasMyActiveStatus ? (
                  <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[9px] font-black text-white flex items-center gap-1">
                    <Eye size={10} className="text-fuchsia-400" />
                    {myStatusGroup.totalViews || 0}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/30 text-[9px] font-black text-fuchsia-300">
                    NEW
                  </span>
                )}
              </div>
            </div>

            {/* Center Add / Plus Button */}
            <div
              onClick={(e) => {
                if (hasMyActiveStatus) {
                  e.stopPropagation();
                  if (!isUploadingStatus) statusFileInputRef.current?.click();
                }
              }}
              title="Add New Status"
              className="relative z-10 w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-fuchsia-500 via-rose-500 to-amber-500 shadow-[0_0_25px_rgba(217,70,239,0.5)] group-hover:scale-110 transition-transform flex items-center justify-center"
            >
              <div className="w-full h-full rounded-full bg-[#090a0f]/90 flex items-center justify-center">
                {isUploadingStatus ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus size={24} className="text-white" />
                )}
              </div>
            </div>

            {/* Bottom Label */}
            <div className="relative z-10 w-full text-center">
              <h3 className="text-xs sm:text-sm font-black text-white tracking-tight drop-shadow-md">
                My Story
              </h3>
              <p className="text-[10px] text-fuchsia-300 font-bold mt-0.5">
                {hasMyActiveStatus ? 'Tap to view • + to add' : 'Tap to post 4K'}
              </p>
            </div>

            <input
              type="file"
              accept="image/*,video/*"
              ref={statusFileInputRef}
              onChange={handleStatusUpload}
              className="hidden"
            />
          </motion.div>

          {/* --- OTHER USERS' STATUS CARDS --- */}
          <AnimatePresence>
            {!isLoading && visibleOtherGroups.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="col-span-2 bg-[#0d0f14]/80 backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 flex flex-col items-center justify-center text-center aspect-[3/2]"
              >
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                  <ImageIcon size={20} className="text-white/30" />
                </div>
                <h4 className="text-sm font-black text-white mb-1">No Network Stories Yet</h4>
                <p className="text-[11px] text-white/40 max-w-[200px]">
                  Stories posted by people in your network over the last 24 hours will appear here in 4K.
                </p>
              </motion.div>
            )}

            {!isLoading &&
              visibleOtherGroups.map((group, i) => {
                const latestStatus = group.statuses[group.statuses.length - 1];
                const isVideo = latestStatus?.media_type === 'video';
                const avatarSrc = group.profile?.avatar_url || group.profile?.avatarUrl;

                return (
                  <motion.div
                    key={group.userId}
                    initial={{ opacity: 0, scale: 0.92, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    onClick={() => onStatusClick(group.userId, group.statuses, group.profile)}
                    className="relative bg-[#090a0f] border border-white/15 hover:border-fuchsia-500/60 rounded-[28px] p-3 flex flex-col items-center justify-between shadow-[0_15px_35px_rgba(0,0,0,0.7)] cursor-pointer group aspect-[3/4] overflow-hidden transition-all"
                  >
                    {/* 4K Story Media Preview */}
                    {isVideo ? (
                      <video
                        src={latestStatus.media_url}
                        className="absolute inset-0 w-full h-full object-cover opacity-75 group-hover:scale-105 transition-transform duration-500"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={latestStatus.media_url}
                        className="absolute inset-0 w-full h-full object-cover opacity-75 group-hover:scale-105 transition-transform duration-500"
                        alt={group.profile?.username || 'Story'}
                      />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/50" />

                    {/* Top Bar: Segment Count + Quick Hide Button */}
                    <div className="relative z-10 w-full flex flex-col gap-1.5">
                      <div className="flex gap-1 w-full">
                        {group.statuses.map((s: any) => (
                          <div
                            key={s.id}
                            className="h-1 flex-1 rounded-full bg-white/80 shadow-sm"
                          />
                        ))}
                      </div>

                      <div className="flex items-center justify-between w-full">
                        <span className="px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[9px] font-bold text-white/90 flex items-center gap-1">
                          {isVideo ? <Play size={8} className="fill-white" /> : <Layers size={9} />}
                          {group.statuses.length}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => handleToggleMuteUser(group.userId, e)}
                          title="Hide User's Statuses"
                          className="w-6 h-6 rounded-full bg-black/50 hover:bg-rose-500/80 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                        >
                          <EyeOff size={11} />
                        </button>
                      </div>
                    </div>

                    {/* Glowing 4K Ring Avatar */}
                    <div className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[2.5px] bg-gradient-to-tr from-fuchsia-500 via-rose-500 to-amber-400 shadow-[0_0_20px_rgba(217,70,239,0.55)] group-hover:scale-105 transition-transform my-auto">
                      <div className="w-full h-full bg-[#050505] rounded-full p-[1.5px] overflow-hidden flex items-center justify-center">
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt={group.profile?.username || 'User'}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <span className="text-white font-black text-sm">
                            {(group.profile?.username?.[0] || 'U').toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Username & Timestamp */}
                    <div className="relative z-10 w-full text-center">
                      <h3 className="text-xs font-black text-white truncate w-full drop-shadow-md">
                        {group.profile?.username || 'User'}
                      </h3>
                      <p className="text-[9px] text-white/65 font-bold mt-0.5">
                        {formatRelativeTime(group.latestUpdate)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
          </AnimatePresence>
        </div>
      ) : (
        /* =========================================================
           PHASE 4: HIDDEN / MUTED STATUSES DRAWER (UNHIDE ANYTIME)
           ========================================================= */
        <div className="flex flex-col gap-3">
          {hiddenOtherGroups.length === 0 ? (
            <div className="bg-[#0d0f14]/80 border border-white/10 rounded-[28px] p-8 flex flex-col items-center justify-center text-center">
              <Eye size={28} className="text-white/25 mb-2" />
              <h4 className="text-sm font-black text-white">No Hidden Statuses</h4>
              <p className="text-xs text-white/40 mt-1">
                Users you hide from your status feed will appear here so you can unhide them anytime.
              </p>
            </div>
          ) : (
            hiddenOtherGroups.map((group) => {
              const avatarSrc = group.profile?.avatar_url || group.profile?.avatarUrl;
              return (
                <div
                  key={group.userId}
                  className="bg-[#11141c]/90 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4"
                >
                  <div
                    onClick={() => onStatusClick(group.userId, group.statuses, group.profile)}
                    className="flex items-center gap-3.5 cursor-pointer min-w-0 flex-1"
                  >
                    <div className="w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden bg-black flex-shrink-0 flex items-center justify-center">
                      {avatarSrc ? (
                        <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold">
                          {(group.profile?.username?.[0] || 'U').toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-white truncate">
                        {group.profile?.username || 'User'}
                      </h4>
                      <p className="text-xs text-white/40">
                        {group.statuses.length} hidden {group.statuses.length === 1 ? 'update' : 'updates'} • Tap to preview
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleToggleMuteUser(group.userId, e)}
                    className="px-4 py-2 rounded-full bg-fuchsia-500/20 hover:bg-fuchsia-500 border border-fuchsia-500/40 text-fuchsia-300 hover:text-white text-xs font-black transition-all flex items-center gap-1.5 flex-shrink-0"
                  >
                    <Check size={14} />
                    <span>Unhide</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* =========================================================
          PHASE 5: WHATSAPP-STYLE 4K FULLSCREEN AVATAR VIEWER
         ========================================================= */}
      <AnimatePresence>
        {isHdAvatarOpen &&
          typeof document !== 'undefined' &&
          createPortal(
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100000] bg-black/95 backdrop-blur-3xl flex flex-col justify-between overflow-hidden select-none"
            >
              {/* Top Action Header */}
              <div className="relative z-20 px-5 py-5 bg-gradient-to-b from-black/90 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsHdAvatarOpen(false)}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white active:scale-90 transition-all"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div>
                    <h3 className="text-base font-black text-white">{myUsername || 'My Profile'}</h3>
                    <p className="text-[11px] text-fuchsia-400 font-bold">4K Ultra HD Profile Picture</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsHdAvatarOpen(false);
                    setTimeout(() => ppFileInputRef.current?.click(), 150);
                  }}
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-600 to-rose-500 text-white text-xs font-black flex items-center gap-2 shadow-[0_0_20px_rgba(217,70,239,0.5)] active:scale-95 transition-all"
                >
                  <Camera size={14} />
                  <span>Update Photo</span>
                </button>
              </div>

              {/* Swipe-to-Close 4K Viewport with Ambilight Glow */}
              <motion.div
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.75}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 100 || info.velocity.y > 500) {
                    setIsHdAvatarOpen(false);
                  }
                }}
                className="relative flex-1 flex items-center justify-center p-6 overflow-hidden"
              >
                {myAvatarUrl && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-35 blur-[110px] pointer-events-none">
                    <img
                      src={myAvatarUrl}
                      alt=""
                      className="w-4/5 h-4/5 object-cover rounded-full scale-125"
                    />
                  </div>
                )}

                {myAvatarUrl ? (
                  <motion.img
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    src={myAvatarUrl}
                    alt={myUsername}
                    className="relative z-10 w-full max-w-md aspect-square object-cover rounded-[36px] border-2 border-white/15 shadow-[0_25px_80px_rgba(0,0,0,0.95)]"
                  />
                ) : (
                  <div className="relative z-10 w-72 h-72 rounded-[36px] bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-3">
                    <Camera size={42} className="text-white/30" />
                    <p className="text-sm text-white/50 font-bold">No profile photo uploaded yet</p>
                  </div>
                )}
              </motion.div>

              <div className="pb-8 text-center text-[11px] text-white/40 font-semibold">
                Swipe down or tap the back arrow to exit
              </div>
            </motion.div>,
            document.body
          )}
      </AnimatePresence>
    </div>
  );
}
