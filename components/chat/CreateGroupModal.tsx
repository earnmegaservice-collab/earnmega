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
