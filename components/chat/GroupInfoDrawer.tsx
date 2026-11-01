"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, MoreVertical, Edit2, UserPlus, Image as ImageIcon, ShieldAlert, UserMinus, Camera, Check, Link as LinkIcon, Copy, Clock, CheckCircle, Phone, Video, Search, MessageCircle, User } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import { UserProfileDetails } from '../profile/UserProfileModal';
import AddMemberModal from './AddMemberModal';
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

// Rules of Hooks verified: all hooks declared unconditionally above early returns
export default function GroupInfoDrawer({ isOpen, onClose, groupId, groupName, groupAvatar, currentUserId, onGroupUpdated }: GroupInfoDrawerProps) {
  const [participants, setParticipants] = useState<(UserProfileDetails & { role: string })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState('member');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState(groupName);
  const [groupBio, setGroupBio] = useState('');
  const [newGroupBio, setNewGroupBio] = useState('');
  const [groupCreatedAt, setGroupCreatedAt] = useState<string | null>(null);
  const [creatorName, setCreatorName] = useState<string>('admin');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [isRequestsLoading, setIsRequestsLoading] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

  useEffect(() => {
    setNewGroupName(groupName);
  }, [groupName]);

  const fetchRoomInfo = async () => {
    if (!groupId) return;
    try {
      const { data, error } = await supabase.from('rooms').select('description, created_at').eq('id', groupId).single();
      if (data && !error) {
        setGroupBio(data.description || '');
        if (data.created_at) setGroupCreatedAt(new Date(data.created_at).toLocaleDateString());
        setNewGroupBio(data.description || '');
      }
    } catch (err) {
      console.error("Failed to fetch room info:", err);
    }
  };

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
        const ownerOrAdmin = participantData.find((p: any) => p.role === 'owner' || p.role === 'admin');
        if (ownerOrAdmin && ownerOrAdmin.profiles) {
            setCreatorName((ownerOrAdmin.profiles as any)[0]?.name || (ownerOrAdmin.profiles as any)[0]?.username || (ownerOrAdmin.profiles as any)?.name || (ownerOrAdmin.profiles as any)?.username || 'admin');
        }
        setCurrentUserRole(myRole);
      }
    } catch (err) {
      console.error("Failed to fetch group participants:", err);
    } finally {
      setIsLoading(false);
    }
  };


  const fetchJoinRequests = async () => {
      if (currentUserRole !== 'admin') return;
      setIsRequestsLoading(true);
      try {
          const { data, error } = await supabase
              .from('group_join_requests')
              .select('id, user_id, status, created_at, profiles(id, full_name, avatar_url, username)')
              .eq('room_id', groupId)
              .eq('status', 'pending');
          if (error) throw error;
          setJoinRequests(data || []);
      } catch (err) {
          console.error("Failed to fetch join requests", err);
      } finally {
          setIsRequestsLoading(false);
      }
  };

  useEffect(() => {
      if (isOpen && currentUserRole === 'admin') {
          fetchJoinRequests();
      }
  }, [isOpen, currentUserRole, groupId]);

  const generateInviteLink = async () => {
      try {
          const code = uuidv4().substring(0, 8);
          const { error } = await supabase.from('group_invites').insert({
              room_id: groupId,
              created_by: currentUserId,
              code: code,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
          });
          if (error) throw error;
          const link = `${window.location.origin}/invite/${code}`;
          setInviteLink(link);
          toast.success("Invite link generated!");
      } catch (err) {
          console.error("Failed to generate invite", err);
          toast.error("Failed to generate link");
      }
  };

  const handleRequestAction = async (requestId: string, userId: string, action: 'approved' | 'rejected') => {
      try {
          const { error } = await supabase
              .from('group_join_requests')
              .update({ status: action })
              .eq('id', requestId);

          if (error) throw error;

          if (action === 'approved') {
              await supabase.from('room_participants').insert({
                  room_id: groupId,
                  user_id: userId,
                  role: 'member'
              });
              toast.success("User approved and added!");
              fetchParticipants();
          } else {
              toast.success("Request rejected.");
          }
          fetchJoinRequests();
      } catch (err) {
          console.error("Failed action", err);
          toast.error("Failed to process request");
      }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRoomInfo();
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
    const isNameChanged = newGroupName.trim() && newGroupName.trim() !== groupName;
    const isBioChanged = newGroupBio.trim() !== groupBio;

    if (!isNameChanged && !isBioChanged) {
        setIsEditingName(false);
        return;
    }

    const updatePromise = async () => {
        const updates: any = {};
        if (isNameChanged) updates.name = newGroupName.trim();
        if (isBioChanged) updates.description = newGroupBio.trim();

        const { error } = await supabase.from('rooms').update(updates).eq('id', groupId);
        if (error) throw error;

        if (isNameChanged) {
            await fireSystemMessage(`Group name changed to "${newGroupName.trim()}"`, 'group_name_changed');
        }
        if (isBioChanged) {
            await fireSystemMessage(`Group bio updated`, 'group_bio_changed');
        }
    };

    const p = updatePromise();
    toast.promise(p, {
        loading: 'Updating info...',
        success: 'Group info updated',
        error: 'Failed to update info'
    });

    try {
        await p;
        setGroupBio(newGroupBio.trim());
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
      if (currentUserRole !== 'admin') {
         console.info("[RBAC] User Authority Evaluated:", { isAdmin: false });
         toast.error("Unauthorized action.");
         return;
      }
      console.info("[RBAC] User Authority Evaluated:", { isAdmin: true });
      const removePromise = async () => {
          // Optimistically remove from state FIRST
          setParticipants(prev => prev.filter(p => p.id !== userId));

          const { error } = await supabase.rpc('remove_participant', { room_id_param: groupId, target_user_id: userId });
          if (error) {
              console.warn("[SECURITY] Unauthorized Mutation Attempt Blocked", error);
              throw error;
          }
          console.info("[DB] Mutation Successful - Participant removed");

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
          setActiveMenuId(null);
      } catch (err) {
          // Re-fetch if optimistic update failed
          fetchParticipants();
      }
  };

  const handleLeaveGroup = async () => {
      const leavePromise = async () => {
          const { error } = await supabase.from('room_participants').delete().match({ room_id: groupId, user_id: currentUserId });
          if (error) {
              console.warn("[SECURITY] Unauthorized Mutation Attempt Blocked", error);
              throw error;
          }
          console.info("[DB] Mutation Successful - User left group");
          await fireSystemMessage(`User left the group`, 'user_left');
      };

      const p = leavePromise();
      toast.promise(p, {
          loading: 'Leaving group...',
          success: 'Left group',
          error: 'Failed to leave group'
      });

      try {
          await p;
          onClose();
          onGroupUpdated();
      } catch (err) {}
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
                 <button onClick={() => setIsEditingName(true)} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-all">
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
                     <div className="space-y-3">
                         <input
                            type="text"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white font-black text-3xl focus:outline-none"
                            placeholder="Group Name"
                            autoFocus
                         />
                         <div className="flex items-center space-x-2">
                             <input
                                type="text"
                                value={newGroupBio}
                                onChange={(e) => setNewGroupBio(e.target.value)}
                                className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white/70 font-medium text-base focus:outline-none flex-1"
                                placeholder="Group Bio"
                             />
                             <button onClick={handleUpdateGroupName} className="p-3 bg-fuchsia-500 rounded-xl text-white">
                                 <Check size={24} />
                             </button>
                         </div>
                     </div>
                 ) : (
                     <div className="group">
                         <div className="flex items-center justify-between">
                             <h2 className="text-3xl font-black text-white">{groupName}</h2>
                             {currentUserRole === 'admin' && (
                                 <button onClick={() => setIsEditingName(true)} className="text-white/40 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                                     <Edit2 size={20} />
                                 </button>
                             )}
                         </div>
                         {groupBio && <p className="text-white/80 font-medium mt-2">{groupBio}</p>}
<p className="text-white/40 text-xs mt-2">Created by {creatorName} on {groupCreatedAt || new Date().toLocaleDateString()}</p>
                     </div>
                 )}
                 <p className="text-white/50 font-medium mt-2">Group • {participants.length} participants</p>
             </div>

             {/* Action Bar */}
             <div className="px-6 mb-8 flex gap-3">
                <button className="flex-1 bg-white/10 hover:bg-white/15 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center transition-all">
                   <Phone size={24} className="text-green-400 mb-2" />
                   <span className="text-xs font-bold text-white tracking-wide">Audio</span>
                </button>
                <button className="flex-1 bg-white/10 hover:bg-white/15 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center transition-all">
                   <Video size={24} className="text-blue-400 mb-2" />
                   <span className="text-xs font-bold text-white tracking-wide">Video</span>
                </button>
                <button className="flex-1 bg-white/10 hover:bg-white/15 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center transition-all">
                   <Search size={24} className="text-fuchsia-400 mb-2" />
                   <span className="text-xs font-bold text-white tracking-wide">Search</span>
                </button>
             </div>

             {/* Admin Section: Invites & Requests */}
        {currentUserRole === 'admin' && (
            <div className="p-6 border-b border-white/5 space-y-6">
                <div>
                    <h4 className="text-white/50 text-xs font-bold uppercase tracking-wider mb-4 flex items-center justify-between">
                        Invite Link
                    </h4>
                    {!inviteLink ? (
                        <button onClick={generateInviteLink} className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-amber-500 font-bold flex items-center justify-center gap-2 transition-all">
                            <LinkIcon size={16} /> Generate Invite Link
                        </button>
                    ) : (
                        <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-xl p-3">
                            <span className="text-white/70 text-sm truncate mr-4">{inviteLink}</span>
                            <button onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success("Copied!"); }} className="p-2 bg-amber-500/10 text-amber-500 rounded-lg hover:bg-amber-500/20 transition-colors">
                                <Copy size={16} />
                            </button>
                        </div>
                    )}
                </div>

                {joinRequests.length > 0 && (
                    <div>
                        <h4 className="text-white/50 text-xs font-bold uppercase tracking-wider mb-4 flex items-center justify-between">
                            Pending Requests
                            <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">{joinRequests.length}</span>
                        </h4>
                        <div className="space-y-3">
                            {joinRequests.map(req => (
                                <div key={req.id} className="flex items-center justify-between bg-white/5 border border-white/5 p-3 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <img src={req.profiles?.avatar_url || '/dummy.jpg'} className="w-10 h-10 rounded-full object-cover" />
                                        <div>
                                            <p className="text-white text-sm font-bold">{req.profiles?.full_name || req.profiles?.username}</p>
                                            <p className="text-white/40 text-xs flex items-center gap-1"><Clock size={10}/> {new Date(req.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleRequestAction(req.id, req.user_id, 'approved')} className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all"><CheckCircle size={18} /></button>
                                        <button onClick={() => handleRequestAction(req.id, req.user_id, 'rejected')} className="p-2 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/30 transition-all"><X size={18} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* Participants List */}
             <div className="px-6 pb-20">
                 <div className="flex items-center justify-between mb-4">
                     <h3 className="text-sm font-black text-white/50 uppercase tracking-widest">Participants</h3>
                     {currentUserRole === 'admin' && (
                         <button onClick={() => setIsAddMemberModalOpen(true)} className="flex items-center gap-2 text-fuchsia-400 text-sm font-bold hover:text-fuchsia-300 transition-colors">
                             <UserPlus size={16} />
                             Add Members
                         </button>
                     )}
                 </div>
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

                                {!p.isSelf && (
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
                                                        <button
                                                            className="w-full text-left px-4 py-3 hover:bg-white/5 text-sm text-white font-medium flex items-center gap-2"
                                                        >
                                                            <MessageCircle size={16} />
                                                            Message {p.name}
                                                        </button>
                                                        <button
                                                            className="w-full text-left px-4 py-3 hover:bg-white/5 text-sm text-white font-medium flex items-center gap-2"
                                                        >
                                                            <User size={16} />
                                                            View Profile
                                                        </button>
                                                        {currentUserRole === 'admin' && p.role !== 'admin' && (
                                                            <button
                                                                onClick={() => handleMakeAdmin(p.id, p.name)}
                                                                className="w-full text-left px-4 py-3 hover:bg-white/5 text-sm text-white font-medium flex items-center gap-2"
                                                            >
                                                                <ShieldAlert size={16} className="text-fuchsia-400" />
                                                                Promote to Admin
                                                            </button>
                                                        )}
                                                        {currentUserRole === 'admin' && (
                                                            <button
                                                                onClick={() => handleRemoveUser(p.id, p.name)}
                                                                className="w-full text-left px-4 py-3 hover:bg-red-500/10 text-sm text-red-500 font-medium flex items-center gap-2"
                                                            >
                                                                <UserMinus size={16} />
                                                                Remove Member
                                                            </button>
                                                        )}
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
                 <div className="mt-8">
                     <button
                         onClick={handleLeaveGroup}
                         className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-2xl text-red-500 font-bold flex items-center justify-center gap-2 transition-all"
                     >
                         <UserMinus size={18} />
                         Leave Group
                     </button>
                 </div>
             </div>
          </div>
        </motion.div>
      )}

      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        groupId={groupId}
        currentUserId={currentUserId}
        onMembersAdded={fetchParticipants}
        existingParticipantIds={participants.map(p => p.id)}
      />
    </AnimatePresence>
  );
}
