"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, MoreVertical, Edit2, UserPlus, Image as ImageIcon, ShieldAlert, UserMinus, Camera, Check } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import { UserProfileDetails } from '../profile/UserProfileModal';
import { v4 as uuidv4 } from "uuid";

interface GroupInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  groupAvatar?: string;
  currentUserId: string;
  onGroupUpdated: () => void;
}

export default function GroupInfoDrawer({ isOpen, onClose, groupId, groupName, groupAvatar, currentUserId, onGroupUpdated }: GroupInfoDrawerProps) {
  const [participants, setParticipants] = useState<(UserProfileDetails & { role: string })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState('member');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState(groupName);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setNewGroupName(groupName);
  }, [groupName]);

  const fetchParticipants = async () => {
    if (!groupId) return;
    setIsLoading(true);
    try {
      const { data: participantData, error: participantError } = await supabase
        .from('room_participants')
        .select('user_id, role, profiles(*)')
        .eq('room_id', groupId);

      if (participantError) throw participantError;

      if (participantData) {
        const formatted = participantData.map((p: any) => {
          const u = p.profiles;
          return {
            id: u?.id || p.user_id,
            name: u?.name || u?.username || 'Unknown User',
            avatarInitials: (u?.name || u?.username || 'U').substring(0, 2).toUpperCase(),
            avatarUrl: u?.avatar_url,
            bio: u?.bio || '',
            joinDate: u?.created_at ? new Date(u.created_at).toLocaleDateString() : 'Unknown',
            tier: u?.subscription_tier || 'FREE',
            isOnline: false,
            coinsGifted: u?.coins_gifted || 0,
            isSelf: p.user_id === currentUserId,
            isVerified: u?.is_verified || false,
            role: p.role || 'member'
          };
        });
        setParticipants(formatted);
        const myRole = participantData.find((p: any) => p.user_id === currentUserId)?.role || 'member';
        setCurrentUserRole(myRole);
      }
    } catch (err) {
      console.error("Failed to fetch group participants:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchParticipants();
    }
  }, [isOpen, groupId]);

  const fireSystemMessage = async (content: string, type: string) => {
      try {
        await supabase.from('messages').insert({
            id: uuidv4(),
            sender_id: currentUserId,
            room_id: groupId,
            content,
            is_system_message: true,
            system_event_type: type
        });
      } catch (err) {
          console.error("System message failed:", err);
      }
  };

  const handleUpdateGroupName = async () => {
    if (!newGroupName.trim() || newGroupName === groupName) {
        setIsEditingName(false);
        return;
    }

    const updatePromise = async () => {
        const { error } = await supabase.from('rooms').update({ name: newGroupName.trim() }).eq('id', groupId);
        if (error) throw error;
        await fireSystemMessage(`Group name changed to "${newGroupName.trim()}"`, 'group_name_changed');
    };

    const p = updatePromise();
    toast.promise(p, {
        loading: 'Updating name...',
        success: 'Group name updated',
        error: 'Failed to update name'
    });

    try {
        await p;
        setIsEditingName(false);
        onGroupUpdated();
    } catch (e) {}
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${groupId}-${Math.random()}.${fileExt}`;

    const uploadPromise = async () => {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('rooms')
        .update({ avatar_url: publicUrlData.publicUrl })
        .eq('id', groupId);

      if (dbError) throw dbError;
      await fireSystemMessage(`Group icon changed`, 'group_icon_changed');
    };

    const p = uploadPromise();
    toast.promise(p, {
      loading: 'Uploading photo...',
      success: 'Group photo updated',
      error: 'Upload failed'
    });

    try {
      await p;
      onGroupUpdated();
    } catch (err) {}
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
      const removePromise = async () => {
          const { error } = await supabase.from('room_participants').delete().match({ room_id: groupId, user_id: userId });
          if (error) throw error;
          await fireSystemMessage(`${userName} was removed from the group`, 'user_removed');
      };

      const p = removePromise();
      toast.promise(p, {
          loading: 'Removing user...',
          success: 'User removed',
          error: 'Failed to remove user'
      });

      try {
          await p;
          fetchParticipants();
          setActiveMenuId(null);
      } catch (e) {}
  };

  const handleMakeAdmin = async (userId: string, userName: string) => {
      const adminPromise = async () => {
          const { error } = await supabase.from('room_participants').update({ role: 'admin' }).match({ room_id: groupId, user_id: userId });
          if (error) throw error;
          await fireSystemMessage(`${userName} is now an admin`, 'admin_promoted');
      };

      const p = adminPromise();
      toast.promise(p, {
          loading: 'Promoting to admin...',
          success: 'User is now an admin',
          error: 'Failed to promote'
      });

      try {
          await p;
          fetchParticipants();
          setActiveMenuId(null);
      } catch (e) {}
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed inset-0 z-[200] bg-[#050505]/95 backdrop-blur-3xl border-l border-white/10 sm:left-auto sm:w-[400px] overflow-hidden flex flex-col right-0"
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
             <button onClick={onClose} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-all">
                <X size={24} />
             </button>
             {currentUserRole === 'admin' && (
                 <button className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-all">
                     <Edit2 size={20} />
                 </button>
             )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
             {/* Hero Image Section */}
             <div className="relative w-full h-80 bg-neutral-900 group">
                {groupAvatar ? (
                    <img src={groupAvatar} alt="Group" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
                        <Users size={80} className="text-white/20" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />

                {currentUserRole === 'admin' && (
                    <div className="absolute bottom-6 right-6 z-20">
                        <input
                           type="file"
                           ref={fileInputRef}
                           onChange={handleImageUpload}
                           accept="image/*"
                           className="hidden"
                        />
                        <button
                           onClick={() => fileInputRef.current?.click()}
                           className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-full text-white hover:bg-white/20 transition-all shadow-xl"
                        >
                            <Camera size={24} />
                        </button>
                    </div>
                )}
             </div>

             <div className="px-6 pb-6 -mt-8 relative z-20">
                 {isEditingName ? (
                     <div className="flex items-center space-x-2">
                         <input
                            type="text"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white font-black text-3xl focus:outline-none flex-1"
                            autoFocus
                         />
                         <button onClick={handleUpdateGroupName} className="p-3 bg-fuchsia-500 rounded-xl text-white">
                             <Check size={24} />
                         </button>
                     </div>
                 ) : (
                     <div className="flex items-center justify-between group">
                         <h2 className="text-3xl font-black text-white">{groupName}</h2>
                         {currentUserRole === 'admin' && (
                             <button onClick={() => setIsEditingName(true)} className="text-white/40 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                                 <Edit2 size={20} />
                             </button>
                         )}
                     </div>
                 )}
                 <p className="text-white/50 font-medium mt-1">Group • {participants.length} participants</p>
             </div>

             {/* Admin Controls */}
             {currentUserRole === 'admin' && (
                <div className="px-6 mb-8 flex gap-3">
                   <button className="flex-1 bg-white/10 hover:bg-white/15 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center transition-all">
                      <UserPlus size={24} className="text-fuchsia-400 mb-2" />
                      <span className="text-xs font-bold text-white tracking-wide">Add Members</span>
                   </button>
                   <button className="flex-1 bg-white/10 hover:bg-white/15 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center transition-all">
                      <ImageIcon size={24} className="text-blue-400 mb-2" />
                      <span className="text-xs font-bold text-white tracking-wide">Media</span>
                   </button>
                </div>
             )}

             {/* Participants List */}
             <div className="px-6 pb-20">
                 <h3 className="text-sm font-black text-white/50 uppercase tracking-widest mb-4">Participants</h3>
                 <div className="mb-4">
                     <input
                         type="text"
                         placeholder="Search members..."
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-fuchsia-500/50"
                     />
                 </div>

                 {isLoading ? (
                     <div className="flex justify-center py-10">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fuchsia-500"></div>
                     </div>
                 ) : (
                     <div className="space-y-2">
                        {participants.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
                            <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all relative">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 border border-white/20 flex items-center justify-center">
                                        {p.avatarUrl ? (
                                            <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-white/60 font-bold">{p.avatarInitials}</span>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white">{p.name}</span>
                                            {p.role === 'admin' && (
                                                <span className="text-[9px] font-black text-fuchsia-400 bg-fuchsia-500/10 px-1.5 py-0.5 rounded text-center border border-fuchsia-500/20">ADMIN</span>
                                            )}
                                        </div>
                                        <span className="text-xs text-white/40 block max-w-[150px] truncate">{p.bio || 'Available'}</span>
                                    </div>
                                </div>

                                {currentUserRole === 'admin' && !p.isSelf && (
                                    <div className="relative">
                                        <button
                                            onClick={() => setActiveMenuId(activeMenuId === p.id ? null : p.id)}
                                            className="p-2 text-white/40 hover:text-white transition-colors"
                                        >
                                            <MoreVertical size={20} />
                                        </button>

                                        <AnimatePresence>
                                            {activeMenuId === p.id && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)} />
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                        className="absolute right-0 top-10 mt-2 w-48 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                                                    >
                                                        {p.role !== 'admin' && (
                                                            <button
                                                                onClick={() => handleMakeAdmin(p.id, p.name)}
                                                                className="w-full text-left px-4 py-3 hover:bg-white/5 text-sm text-white font-medium flex items-center gap-2"
                                                            >
                                                                <ShieldAlert size={16} className="text-fuchsia-400" />
                                                                Make Admin
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleRemoveUser(p.id, p.name)}
                                                            className="w-full text-left px-4 py-3 hover:bg-red-500/10 text-sm text-red-500 font-medium flex items-center gap-2"
                                                        >
                                                            <UserMinus size={16} />
                                                            Remove User
                                                        </button>
                                                    </motion.div>
                                                </>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>
                        ))}
                     </div>
                 )}
             </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
