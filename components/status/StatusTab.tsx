'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Play } from 'lucide-react';
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
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStatuses = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Fetch statuses within last 24 hours
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

      // Group by user
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
        groups.get(userId).latestUpdate = status.created_at; // Update to latest
      });

      // Convert to array and sort by latest update descending
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

    const channel = supabase.channel('status_updates_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'statuses' }, () => {
        fetchStatuses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    const toastId = toast.loading('Processing Media...');

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
        .select(`
          id,
          user_id,
          media_url,
          media_type,
          created_at,
          profiles:user_id (id, username, avatar_url)
        `)
        .single();

      if (insertError) {
        toast.error(insertError.message || 'Failed to upload status', { id: toastId });
        throw insertError;
      }

      toast.success('Status uploaded!', { id: toastId });
      // Fetch statuses immediately to update UI optimistically
      if (insertedData) {
        setGroupedStatuses((prev) => {
          const userIndex = prev.findIndex((g) => g.userId === user.id);
          if (userIndex >= 0) {
            const newGroups = [...prev];
            newGroups[userIndex] = { ...newGroups[userIndex], statuses: [...newGroups[userIndex].statuses, insertedData] };
            newGroups[userIndex].latestUpdate = insertedData.created_at;
            return newGroups.sort((a, b) => new Date(b.latestUpdate).getTime() - new Date(a.latestUpdate).getTime());
          }
          // Fetch full if not existed yet
          fetchStatuses();
          return prev;
        });
      }
    } catch (error: any) {
      console.error('Failed to upload status:', error);
      toast.error(error.message || 'Failed to upload status', { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const myStatusGroup = groupedStatuses.find(g => g.userId === user?.id);
  const otherStatusGroups = groupedStatuses.filter(g => g.userId !== user?.id);

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Create Status Card */}
      <motion.div
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          if (myStatusGroup?.statuses?.length > 0) {
            onStatusClick(myStatusGroup.userId, myStatusGroup.statuses, myStatusGroup.profile);
          } else {
            if (!isUploading) fileInputRef.current?.click();
          }
        }}
        className="relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 flex flex-col items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:bg-white/10 transition-all cursor-pointer group aspect-[3/4] overflow-hidden"
      >
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl -mr-12 -mt-12 transition-transform group-hover:scale-150" />

        {myStatusGroup?.statuses[0]?.media_url ? (
          <img src={myStatusGroup.statuses[myStatusGroup.statuses.length - 1].media_url} className="absolute inset-0 w-full h-full object-cover opacity-50" alt="My Status" />
        ) : null}

        <div
          className="relative z-10 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 mb-3 border-2 border-white/20 group-hover:scale-105 transition-transform"
          onClick={(e) => {
            if (myStatusGroup?.statuses?.length > 0) {
              e.stopPropagation(); // prevent opening viewer when clicking plus to add more
              if (!isUploading) fileInputRef.current?.click();
            }
          }}
        >
          {isUploading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Plus size={24} className="text-white drop-shadow-md" />
          )}
        </div>
        <h3 className="text-sm font-bold text-white relative z-10 drop-shadow-sm">My Status</h3>
        <p className="text-[10px] text-white/60 relative z-10 font-medium mt-1">
          {myStatusGroup?.statuses?.length > 0 ? 'Tap to view' : 'Tap to add update'}
        </p>

        <input
          type="file"
          accept="image/*,video/*"
          ref={fileInputRef}
          onChange={handleUpload}
          className="hidden"
        />
      </motion.div>

      {/* Other Users' Statuses */}
      <AnimatePresence>
        {!isLoading && otherStatusGroups.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="col-span-2 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 flex flex-col items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.2)] aspect-[3/4]"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-3">
              <Play size={20} className="text-white/40 ml-1" />
            </div>
            <h3 className="text-sm font-bold text-white relative z-10 drop-shadow-sm mb-1">No Updates</h3>
            <p className="text-[10px] text-white/60 relative z-10 font-medium text-center px-2">Check back later for updates from your network</p>
          </motion.div>
        )}
        {!isLoading && otherStatusGroups.map((group, i) => (
          <motion.div
            key={group.userId}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
            onClick={() => onStatusClick(group.userId, group.statuses, group.profile)}
            className="relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 flex flex-col items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:bg-white/10 transition-all cursor-pointer group aspect-[3/4] overflow-hidden"
          >
            {/* Background preview */}
            {group.statuses[group.statuses.length - 1].media_type === 'image' ? (
              <img src={group.statuses[group.statuses.length - 1].media_url} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Status preview" />
            ) : (
              <div className="absolute inset-0 w-full h-full bg-black/40 flex items-center justify-center">
                 <Play size={24} className="text-white/50" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            <div className={`relative z-10 w-14 h-14 rounded-full p-0.5 mb-3 group-hover:scale-105 transition-transform ${group.profile?.subscription_tier?.toUpperCase() === 'PRO' || group.profile?.subscription_tier?.toUpperCase() === 'PREMIUM' ? 'bg-gradient-to-r from-amber-400 via-purple-500 to-amber-400 animate-spin-slow !p-[2px] !border-none' : 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500'}`}>
               <div className="w-full h-full bg-black/80 rounded-full border-2 border-transparent p-0.5">
                 {group.profile?.avatar_url ? (
                   <img src={group.profile.avatar_url} alt={group.profile.username} className="w-full h-full object-cover rounded-full" />
                 ) : (
                   <div className="w-full h-full bg-white/10 rounded-full flex items-center justify-center text-white font-bold text-sm">
                     {(group.profile?.username?.[0] || 'U').toUpperCase()}
                   </div>
                 )}
               </div>
            </div>

            <h3 className="text-xs font-bold text-white relative z-10 drop-shadow-sm truncate w-full text-center">
              {group.profile?.username || 'User'}
            </h3>
            <p className="text-[10px] text-white/80 relative z-10 font-medium mt-1">
              {new Date(group.latestUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
