"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, Check } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import { UserProfileDetails } from '../profile/UserProfileModal';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onGroupCreated: () => void;
}

export default function CreateGroupModal({ isOpen, onClose, userId, onGroupCreated }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedGroupUsers, setSelectedGroupUsers] = useState<Set<string>>(new Set());
  const [isFetchingModalUsers, setIsFetchingModalUsers] = useState(false);
  const [modalUsers, setModalUsers] = useState<UserProfileDetails[]>([]);

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
    }
  }, [isOpen, userId]);

  const handleCreateGroup = async () => {
      if (!userId || !groupName.trim() || selectedGroupUsers.size === 0) return;

      const createPromise = async () => {
          const { data: room, error: roomError } = await supabase
              .from('groups')
              .insert({
                  name: groupName.trim(),
                  description: groupDescription.trim() || 'Tap here for group info',
                  created_by: userId,
                  type: 'group'
              })
              .select()
              .single();

          if (roomError) throw roomError;

          const memberIds = Array.from(selectedGroupUsers);
          const participants = [
              { group_id: room.id, user_id: userId, role: 'admin' },
              ...memberIds.map(id => ({ group_id: room.id, user_id: id, role: 'member' }))
          ];

          const { error: partError } = await supabase
              .from('group_members')
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
                  group_id: room.id,
                  sender_id: userId,
                  content: `${creatorName} created group "${groupName.trim()}"`,
                  message_type: 'system',
                  system_event_type: 'group_created'
              });

          if (msgError) console.error("Failed to insert genesis system message", msgError);

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
          <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors">
             <X size={24} />
          </button>

          <h3 className="text-2xl font-black text-white mb-6 flex items-center tracking-tight">
              <Users className="mr-3 text-fuchsia-500" size={28} /> Create Group
          </h3>

          <div className="space-y-4">
              <input
                 type="text"
                 placeholder="Group Subject"
                 value={groupName}
                 onChange={(e) => setGroupName(e.target.value)}
                 className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/40 focus:outline-none focus:border-fuchsia-500/50 focus:bg-white/10 transition-all font-medium text-lg"
              />

              <input
                 type="text"
                 placeholder="Group Description / Bio (Optional)"
                 value={groupDescription}
                 onChange={(e) => setGroupDescription(e.target.value)}
                 className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/40 focus:outline-none focus:border-fuchsia-500/50 focus:bg-white/10 transition-all font-medium text-sm"
              />

              <div className="text-xs font-bold text-white/50 uppercase tracking-widest pl-2">Select Members ({selectedGroupUsers.size})</div>

              <div className="max-h-[40vh] sm:max-h-60 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
                 {isFetchingModalUsers ? (
                     <div className="flex justify-center items-center py-8">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fuchsia-500"></div>
                     </div>
                 ) : (
                     modalUsers.map(u => (
                        <div
                          key={u.id}
                          className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${selectedGroupUsers.has(u.id) ? 'bg-fuchsia-500/10 border border-fuchsia-500/20' : 'hover:bg-white/5 border border-transparent'}`}
                          onClick={() => {
                           const newSet = new Set(selectedGroupUsers);
                           if (newSet.has(u.id)) newSet.delete(u.id);
                           else newSet.add(u.id);
                           setSelectedGroupUsers(newSet);
                           if (navigator.vibrate) navigator.vibrate(10);
                        }}>
                           <div className="flex items-center space-x-4">
                              <div className="relative">
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border-2 ${selectedGroupUsers.has(u.id) ? 'border-fuchsia-500' : 'border-white/10'} bg-[#111418]`}>
                                      {u.avatarUrl ? (
                                        <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="text-white/60 font-bold">{u.avatarInitials}</span>
                                      )}
                                  </div>
                                  {selectedGroupUsers.has(u.id) && (
                                    <div className="absolute -bottom-1 -right-1 bg-fuchsia-500 rounded-full p-0.5 border-2 border-black">
                                        <Check size={12} className="text-white" />
                                    </div>
                                  )}
                              </div>
                              <div className="flex flex-col">
                                  <span className={`font-bold ${selectedGroupUsers.has(u.id) ? 'text-white' : 'text-white/90'}`}>{u.name}</span>
                                  <span className="text-xs text-white/40 truncate w-32">{u.bio}</span>
                              </div>
                           </div>
                           <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedGroupUsers.has(u.id) ? 'bg-fuchsia-500 border-fuchsia-500' : 'border-white/20 bg-black/40'}`}>
                                {selectedGroupUsers.has(u.id) && <Check size={14} className="text-white font-bold" />}
                           </div>
                        </div>
                     ))
                 )}
              </div>

              <button
                 onClick={handleCreateGroup}
                 disabled={!groupName.trim() || selectedGroupUsers.size === 0}
                 className="w-full bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 hover:from-fuchsia-500 hover:to-fuchsia-400 text-white shadow-[0_0_20px_rgba(217,70,239,0.3)] font-black text-lg py-4 rounded-2xl transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed mt-2 active:scale-[0.98]"
              >
                 {selectedGroupUsers.size > 0 ? `Create Group (${selectedGroupUsers.size + 1})` : 'Create Group'}
              </button>
          </div>
       </motion.div>
    </div>,
    document.body
  );
}
