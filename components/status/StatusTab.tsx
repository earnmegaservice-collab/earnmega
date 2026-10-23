'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Play, Camera, Image as ImageIcon } from 'lucide-react';
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
  
  const statusFileInputRef = useRef<HTMLInputElement>(null);
  const ppFileInputRef = useRef<HTMLInputElement>(null);

  const fetchStatuses = async () => {
    if (!user) return;
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

      const groups = new Map<string, any>();
      data?.forEach((status) => {
        const userId = status.user_id;
        if (!groups.has(userId)) {
          groups.set(userId, {
            userId: userId,
            profile: status.profiles,
            statuses: [],
            latestUpdate: status.created_at,
          });
        }
        groups.get(userId).statuses.push(status);
        groups.get(userId).latestUpdate = status.created_at;
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
    fetchStatuses();

    const uniqueChannel = `status-updates-${Date.now()}`;
    const channel = supabase.channel(uniqueChannel)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'statuses' }, () => {
        fetchStatuses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // --- STRICT ISOLATED P.P. UPLOAD ---
  const handleProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingPP(true);
    const toastId = toast.loading('Upgrading Profile Picture...');

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}-${uuidv4()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars') // Standard bucket for PPs
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success('Profile Picture Updated 📸', { id: toastId });
      // Triggers a visual refresh if needed, but Context usually handles this globally
      setTimeout(() => window.location.reload(), 1500); 
    } catch (error: any) {
      console.error('PP Upload Failed:', error);
      toast.error('Upload failed. Check storage permissions.', { id: toastId });
    } finally {
      setIsUploadingPP(false);
      if (ppFileInputRef.current) ppFileInputRef.current.value = '';
    }
  };

  // --- STATUS UPLOAD ---
  const handleStatusUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingStatus(true);
    const toastId = toast.loading('Processing 4K Media...');

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const isVideo = file.type.startsWith('video/');
      const fileName = `${uuidv4()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('statuses')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('statuses')
        .getPublicUrl(fileName);

      const { data: insertedData, error: insertError } = await supabase
        .from('statuses')
        .insert({
          user_id: user.id,
          media_url: publicUrl,
          media_type: isVideo ? 'video' : 'image',
        })
        .select(`id, user_id, media_url, media_type, created_at, profiles:user_id (id, username, avatar_url)`)
        .single();

      if (insertError) throw insertError;

      toast.success('Status Live!', { id: toastId });
      fetchStatuses();
    } catch (error: any) {
      console.error('Status Upload Failed:', error);
      toast.error(error.message || 'Failed to upload status', { id: toastId });
    } finally {
      setIsUploadingStatus(false);
      if (statusFileInputRef.current) statusFileInputRef.current.value = '';
    }
  };

  const myStatusGroup = groupedStatuses.find(g => g.userId === user?.id);
  const otherStatusGroups = groupedStatuses.filter(g => g.userId !== user?.id);

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto pb-24">
      
      {/* PHASE 1: ISOLATED "MY PROFILE" HD UPLOAD HERO */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-[#050505]/80 backdrop-blur-[50px] border border-white/10 rounded-[32px] p-6 flex items-center gap-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-fuchsia-600/20 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative">
          <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr from-white/20 to-white/5">
            <img 
              src={currentUserProfile?.avatar_url || 'https://via.placeholder.com/150'} 
              className="w-full h-full rounded-full object-cover border-2 border-black"
              alt="Profile"
            />
          </div>
          
          <button 
            onClick={() => ppFileInputRef.current?.click()}
            disabled={isUploadingPP}
            className="absolute bottom-0 right-0 p-2.5 bg-white/10 backdrop-blur-xl border border-white/30 rounded-full text-white shadow-xl hover:bg-white/20 transition-all active:scale-95"
          >
            {isUploadingPP ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera size={16} />}
          </button>
          <input type="file" accept="image/*" ref={ppFileInputRef} onChange={handleProfilePicUpload} className="hidden" />
        </div>

        <div className="flex flex-col">
          <h2 className="text-xl font-black text-white tracking-tight">{currentUserProfile?.username || 'Premium User'}</h2>
          <p className="text-sm text-fuchsia-400 font-medium tracking-wide">Update Profile Picture</p>
        </div>
      </motion.div>

      {/* PHASE 2: 4K STATUS GRID */}
      <div>
        <h3 className="text-white/50 text-xs font-bold uppercase tracking-[0.2em] mb-4 ml-2">Recent Updates</h3>
        <div className="grid grid-cols-3 gap-4">
          
          {/* Create Status Card */}
          <motion.div
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (myStatusGroup?.statuses?.length > 0) {
                onStatusClick(myStatusGroup.userId, myStatusGroup.statuses, myStatusGroup.profile);
              } else {
                if (!isUploadingStatus) statusFileInputRef.current?.click();
              }
            }}
            className="relative bg-[#111418]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 flex flex-col items-center justify-center shadow-xl hover:bg-white/5 transition-all cursor-pointer group aspect-[3/4] overflow-hidden"
          >
            {myStatusGroup?.statuses[0]?.media_url ? (
              myStatusGroup.statuses[myStatusGroup.statuses.length - 1].media_type === 'video' ? (
                <video src={myStatusGroup.statuses[myStatusGroup.statuses.length - 1].media_url} className="absolute inset-0 w-full h-full object-cover opacity-50" autoPlay loop muted playsInline />
              ) : (
                <img src={myStatusGroup.statuses[myStatusGroup.statuses.length - 1].media_url} className="absolute inset-0 w-full h-full object-cover opacity-50" alt="My Status" />
              )
            ) : null}

            <div
              className="relative z-10 w-14 h-14 rounded-full bg-gradient-to-br from-fuchsia-500 to-rose-500 flex items-center justify-center shadow-lg shadow-fuchsia-500/30 mb-3 border-2 border-white/20 group-hover:scale-105 transition-transform"
              onClick={(e) => {
                if (myStatusGroup?.statuses?.length > 0) {
                  e.stopPropagation();
                  if (!isUploadingStatus) statusFileInputRef.current?.click();
                }
              }}
            >
              {isUploadingStatus ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus size={24} className="text-white drop-shadow-md" />
              )}
            </div>
            <h3 className="text-sm font-bold text-white relative z-10 drop-shadow-md">My Status</h3>
            <p className="text-[10px] text-white/80 relative z-10 font-bold mt-1 bg-black/40 px-2 py-0.5 rounded-full">
              {myStatusGroup?.statuses?.length > 0 ? 'Tap to view' : 'Add update'}
            </p>

            <input type="file" accept="image/*,video/*" ref={statusFileInputRef} onChange={handleStatusUpload} className="hidden" />
          </motion.div>

          {/* Other Users' Statuses */}
          <AnimatePresence>
            {!isLoading && otherStatusGroups.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="col-span-2 bg-[#111418]/50 backdrop-blur-xl border border-white/5 rounded-3xl p-4 flex flex-col items-center justify-center aspect-[3/4]"
              >
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                  <ImageIcon size={20} className="text-white/20" />
                </div>
                <p className="text-xs text-white/40 font-medium text-center px-4">No recent updates from your network</p>
              </motion.div>
            )}

            {!isLoading && otherStatusGroups.map((group, i) => (
              <motion.div
                key={group.userId}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
                onClick={() => onStatusClick(group.userId, group.statuses, group.profile)}
                className="relative bg-black backdrop-blur-2xl border border-white/10 rounded-3xl p-4 flex flex-col items-center justify-center shadow-2xl hover:border-fuchsia-500/50 transition-all cursor-pointer group aspect-[3/4] overflow-hidden"
              >
                {/* 4K Video/Image Previews */}
                {group.statuses[group.statuses.length - 1].media_type === 'video' ? (
                  <video src={group.statuses[group.statuses.length - 1].media_url} className="absolute inset-0 w-full h-full object-cover opacity-60" autoPlay loop muted playsInline />
                ) : (
                  <img src={group.statuses[group.statuses.length - 1].media_url} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Status preview" />
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />

                {/* THE 4K GLOWING STATUS RING */}
                <div className="relative z-10 w-16 h-16 rounded-full p-[3px] bg-gradient-to-tr from-fuchsia-500 via-rose-500 to-amber-500 mb-3 shadow-[0_0_20px_rgba(217,70,239,0.4)] group-hover:scale-105 transition-transform">
                   <div className="w-full h-full bg-[#050505] rounded-full border-2 border-transparent p-0.5">
                     {group.profile?.avatar_url ? (
                       <img src={group.profile.avatar_url} alt={group.profile.username} className="w-full h-full object-cover rounded-full" />
                     ) : (
                       <div className="w-full h-full bg-white/10 rounded-full flex items-center justify-center text-white font-black">
                         {(group.profile?.username?.[0] || 'U').toUpperCase()}
                       </div>
                     )}
                   </div>
                </div>

                <h3 className="text-xs font-black text-white relative z-10 drop-shadow-md truncate w-full text-center">
                  {group.profile?.username || 'User'}
                </h3>
                <p className="text-[9px] text-white/60 relative z-10 font-bold mt-1 tracking-wider">
                  {new Date(group.latestUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
