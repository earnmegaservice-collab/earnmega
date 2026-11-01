"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, Check, Camera } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import { dispatchNotificationAction } from '../../app/actions/dispatchNotificationAction';
import { UserProfileDetails } from '../profile/UserProfileModal';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onGroupCreated: () => void;
}

// Rules of Hooks verified: all hooks declared unconditionally above early returns
export default function CreateGroupModal({ isOpen, onClose, userId, onGroupCreated }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedGroupUsers, setSelectedGroupUsers] = useState<Set<string>>(new Set());
  const [isFetchingModalUsers, setIsFetchingModalUsers] = useState(false);
  const [modalUsers, setModalUsers] = useState<UserProfileDetails[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && userId) {
        const fetchUsers = async () => {
            setIsFetchingModalUsers(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .neq('id', userId)
                    .limit(50);

                if (data && !error) {
                    const formatted = data.map((u: any) => ({
                        id: u.id,
                        name: u.username || u.name || 'User',
                        avatarInitials: (u.username || u.name || 'U').substring(0, 2).toUpperCase(),
                        avatarUrl: u.avatar_url,
                        bio: u.bio || 'Earnmega user',
                        joinDate: u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Unknown',
                        tier: u.subscription_tier || 'FREE',
                        isOnline: false,
                        coinsGifted: u.coins_gifted || 0,
                        isSelf: false,
                        isVerified: u.is_verified || false
                    }));
                    setModalUsers(formatted);
                }
            } catch (err) {
                console.error("Failed to fetch modal users", err);
            } finally {
                setIsFetchingModalUsers(false);
            }
        };
        fetchUsers();
    } else {
        setGroupName('');
        setGroupDescription('');
        setSelectedGroupUsers(new Set());
        setAvatarFile(null);
        setAvatarPreview(null);
    }
  }, [isOpen, userId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
          toast.error("Image must be less than 5MB");
          return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCreateGroup = async () => {
      if (!userId || !groupName.trim() || selectedGroupUsers.size === 0) return;

      const createPromise = async () => {
          let avatarUrl = null;

          const { data: room, error: roomError } = await supabase
              .from('rooms')
              .insert({
                  name: groupName.trim(),
                  description: groupDescription.trim() || 'Tap here for group info',
                  created_by: userId,
                  type: 'group'
              })
              .select()
              .single();

          if (roomError) throw roomError;

          if (avatarFile) {
              const fileExt = avatarFile.name.split('.').pop();
              const fileName = `${room.id}-${Math.random()}.${fileExt}`;
              const { error: uploadError } = await supabase.storage
                  .from('avatars')
                  .upload(fileName, avatarFile);

              if (!uploadError) {
                  const { data: publicUrlData } = supabase.storage
                      .from('avatars')
                      .getPublicUrl(fileName);
                  avatarUrl = publicUrlData.publicUrl;

                  await supabase.from('rooms').update({ avatar_url: avatarUrl }).eq('id', room.id);
              }
          }

          const memberIds = Array.from(selectedGroupUsers);
          const participants = [
              { room_id: room.id, user_id: userId, role: 'admin' },
              ...memberIds.map(id => ({ room_id: room.id, user_id: id, role: 'member' }))
          ];

          const { error: partError } = await supabase
              .from('room_participants')
              .insert(participants);

          if (partError) throw partError;

          // Fetch the creator's username
          const { data: creatorProfile } = await supabase
              .from('profiles')
              .select('username, name')
              .eq('id', userId)
              .single();

          const creatorName = creatorProfile?.username || creatorProfile?.name || 'User';

          // Insert WhatsApp Genesis System Message
          const { error: msgError } = await supabase
              .from('messages')
              .insert({
                  room_id: room.id,
                  sender_id: userId,
                  content: `${creatorName} created group "${groupName.trim()}"`,
                  message_type: 'system',
                  system_event_type: 'group_created'
              });

          if (msgError) console.error("Failed to insert genesis system message", msgError);

          // Dispatch GROUP_INVITE notification to all members
          const dispatchPromises = memberIds.map(memberId =>
             dispatchNotificationAction({
               recipientId: memberId,
               actorId: userId,
               type: 'GROUP_INVITE',
               title: 'New Group Invite',
               body: `${creatorName} added you to "${groupName.trim()}"`
             })
          );
          Promise.all(dispatchPromises).catch(console.error);

          return room;
      };

      const promise = createPromise();
      toast.promise(promise, {
          loading: 'Securing Group Channel...',
          success: 'Group Chat Created Successfully!',
          error: (err) => `Creation Failed: ${err.message}`
      });

      try {
          await promise;
          onGroupCreated();
          onClose();
      } catch (err) {
          // Toast handles the error display
      }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4">
       <motion.div
         initial={{ y: "100%", opacity: 0 }}
         animate={{ y: 0, opacity: 1 }}
         exit={{ y: "100%", opacity: 0 }}
         transition={{ type: "spring", damping: 25, stiffness: 200 }}
         className="bg-neutral-950/90 backdrop-blur-2xl border-t border-white/10 sm:border p-6 rounded-t-[32px] sm:rounded-3xl shadow-2xl w-full max-w-md relative pb-10 sm:pb-6"
       >
          <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 sm:hidden" />

          <h3 className="text-2xl font-black text-white mb-6 flex items-center tracking-tight">
              <Users className="mr-3 text-fuchsia-500" size={28} /> Group Setup
          </h3>

          <div className="flex justify-center mb-6">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-white/10 border-2 border-dashed border-white/20 flex items-center justify-center transition-all group-hover:border-fuchsia-500">
                      {avatarPreview ? (
                          <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                          <Camera className="text-white/40 group-hover:text-fuchsia-500 transition-colors" size={32} />
                      )}
                  </div>
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                      <span className="text-white text-xs font-bold">Upload</span>
                  </div>
                  <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      accept="image/*"
                      className="hidden"
                  />
              </div>
          </div>

          <div className="space-y-4 mb-6">
              <div>
                  <label className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2 block">Group Name</label>
                  <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Enter group name"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-fuchsia-500/50"
                  />
              </div>
              <div>
                  <label className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2 block">Group Bio</label>
                  <input
                      type="text"
                      value={groupDescription}
                      onChange={(e) => setGroupDescription(e.target.value)}
                      placeholder="What's this group about?"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-fuchsia-500/50"
                  />
              </div>

              <div>
                  <label className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2 block">Select Members</label>
                  <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                      {isFetchingModalUsers ? (
                          <div className="text-white/50 text-sm text-center py-4">Loading users...</div>
                      ) : modalUsers.length === 0 ? (
                          <div className="text-white/50 text-sm text-center py-4">No users available</div>
                      ) : (
                          modalUsers.map(user => (
                              <div key={user.id} onClick={() => {
                                  const newSet = new Set(selectedGroupUsers);
                                  if (newSet.has(user.id)) newSet.delete(user.id);
                                  else newSet.add(user.id);
                                  setSelectedGroupUsers(newSet);
                              }} className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${selectedGroupUsers.has(user.id) ? 'bg-fuchsia-500/20 border border-fuchsia-500/30' : 'bg-white/5 border border-white/5 hover:bg-white/10'}`}>
                                  <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                                          {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-white/50">{user.avatarInitials}</span>}
                                      </div>
                                      <span className="text-white text-sm font-bold">{user.name}</span>
                                  </div>
                                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedGroupUsers.has(user.id) ? 'bg-fuchsia-500 border-fuchsia-500 text-white' : 'border-white/20'}`}>
                                      {selectedGroupUsers.has(user.id) && <Check size={12} />}
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>

          <button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedGroupUsers.size === 0}
              className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold text-lg py-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-3"
          >
              Create Group
          </button>

          <button
             onClick={onClose}
             className="w-full bg-white/10 hover:bg-white/20 text-white font-bold text-lg py-4 rounded-2xl transition-all mt-2 active:scale-[0.98]"
          >
             Cancel
          </button>
       </motion.div>
    </div>,
    document.body
  );
}
