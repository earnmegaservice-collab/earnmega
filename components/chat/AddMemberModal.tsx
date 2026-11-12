"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Search, X, Check, UserPlus } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import {
  AI_FRIENDS_BOT_ID,
  SUPPORT_BOT_ID,
  fetchUserConnectionsAndRequests,
  insertScopedNotification,
} from '../../utils/connectionsStore';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  currentUserId: string;
  onMembersAdded: () => void;
  existingParticipantIds: string[];
}

// Rules of Hooks verified: all hooks declared unconditionally above early returns
export default function AddMemberModal({
  isOpen,
  onClose,
  groupId,
  currentUserId,
  onMembersAdded,
  existingParticipantIds,
}: AddMemberModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [acceptedFriends, setAcceptedFriends] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!isOpen || !currentUserId) return;
    let isCancelled = false;

    const loadAcceptedFriends = async () => {
      setIsLoadingFriends(true);
      try {
        // Strictly populate selectable users ONLY from accepted 1-on-1 connections
        const { acceptedUserIds } = await fetchUserConnectionsAndRequests(currentUserId);
        const existingSet = new Set(existingParticipantIds || []);
        const eligibleIds = Array.from(acceptedUserIds).filter(
          (id) =>
            id !== currentUserId &&
            id !== AI_FRIENDS_BOT_ID &&
            id !== SUPPORT_BOT_ID &&
            !existingSet.has(id)
        );

        if (eligibleIds.length === 0) {
          if (!isCancelled) setAcceptedFriends([]);
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, name, username, avatar_url, is_bot')
          .in('id', eligibleIds);

        if (error) throw error;
        if (!isCancelled) {
          setAcceptedFriends(
            (data || []).filter(
              (u: any) =>
                u.id !== AI_FRIENDS_BOT_ID &&
                u.id !== SUPPORT_BOT_ID &&
                u.is_bot !== true &&
                !existingSet.has(u.id)
            )
          );
        }
      } catch (error) {
        console.error('Error loading accepted friends:', error);
        if (!isCancelled) setAcceptedFriends([]);
      } finally {
        if (!isCancelled) setIsLoadingFriends(false);
      }
    };

    loadAcceptedFriends();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, currentUserId, existingParticipantIds]);

  const filteredFriends = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return acceptedFriends;
    return acceptedFriends.filter((u) => {
      const name = (u.full_name || u.name || '').toLowerCase();
      const uname = (u.username || '').toLowerCase();
      return name.includes(q) || uname.includes(q);
    });
  }, [acceptedFriends, searchQuery]);

  const toggleUserSelection = (user: any) => {
    if (selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;
    setIsAdding(true);

    try {
      const allowedIds = new Set(acceptedFriends.map((u) => u.id));
      const validUsers = selectedUsers.filter((u) => allowedIds.has(u.id));
      if (validUsers.length === 0) {
        toast.error('Connect with people in Explore or Find first to add them to a group.');
        setIsAdding(false);
        return;
      }

      const participantsToInsert = validUsers.map((u) => ({
        room_id: groupId,
        user_id: u.id,
        role: 'member',
      }));

      const { error: insertError } = await supabase
        .from('room_participants')
        .insert(participantsToInsert);

      if (insertError) throw insertError;

      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', currentUserId)
        .single();

      const adminName = adminProfile?.full_name || adminProfile?.username || 'Admin';

      const messagesToInsert = validUsers.map((u) => {
        const memberName = u.full_name || u.name || u.username;
        return {
          room_id: groupId,
          sender_id: currentUserId,
          content: `$$SYSTEM$$ ${adminName} added ${memberName}`,
          is_system_message: true,
          system_event_type: 'user_added',
          created_at: new Date().toISOString(),
          id: uuidv4(),
        };
      });

      const { error: messagesError } = await supabase
        .from('messages')
        .insert(messagesToInsert);

      if (messagesError) throw messagesError;

      await Promise.allSettled(
        validUsers.map((u) =>
          insertScopedNotification({
            recipientId: u.id,
            senderId: currentUserId,
            type: 'GROUP_INVITE',
            message: `${adminName} added you to a group chat`,
          })
        )
      );

      toast.success(`Added ${validUsers.length} member(s)`);

      setSelectedUsers([]);
      setSearchQuery('');
      onMembersAdded();
      onClose();
    } catch (error: any) {
      console.error('Error adding members:', error);
      toast.error(error.message || 'Failed to add members');
    } finally {
      setIsAdding(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4">
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-neutral-950/90 backdrop-blur-2xl border-t border-white/10 sm:border p-6 rounded-t-[32px] sm:rounded-3xl shadow-2xl w-full max-w-md h-[80vh] sm:h-[600px] flex flex-col relative"
      >
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 sm:hidden shrink-0" />

        <div className="flex justify-between items-center mb-6 shrink-0">
          <h3 className="text-2xl font-black text-white flex items-center tracking-tight">
            <UserPlus className="mr-3 text-fuchsia-500" size={28} /> Add Friends
          </h3>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 rounded-full text-white/60 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative mb-6 shrink-0">
          <Search
            size={20}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40"
          />
          <input
            type="text"
            placeholder="Filter your connected friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-fuchsia-500/50 transition-colors"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-2">
          {isLoadingFriends ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fuchsia-500"></div>
            </div>
          ) : acceptedFriends.length === 0 ? (
            <div className="text-center py-10 px-4 text-white/60 text-sm bg-white/[0.03] border border-white/10 rounded-2xl leading-relaxed">
              Connect with people in Explore or Find first to add them to a group.
            </div>
          ) : filteredFriends.length > 0 ? (
            filteredFriends.map((user) => {
              const isSelected = selectedUsers.some((u) => u.id === user.id);
              return (
                <div
                  key={user.id}
                  onClick={() => toggleUserSelection(user)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-fuchsia-500/20 border border-fuchsia-500/50'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 border border-white/20">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/60 font-bold bg-neutral-800">
                          {(user.full_name || user.username || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-white block">
                        {user.full_name || user.name || user.username}
                      </span>
                      <span className="text-xs text-white/40 block">@{user.username}</span>
                    </div>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-fuchsia-500 border-fuchsia-500 text-white'
                        : 'border-white/20'
                    }`}
                  >
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 text-white/40">
              No matching friends in your Chat List
            </div>
          )}
        </div>

        <div className="mt-6 shrink-0 pt-4 border-t border-white/10">
          <button
            onClick={handleAddMembers}
            disabled={selectedUsers.length === 0 || isAdding}
            className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 disabled:bg-white/5 disabled:text-white/40 text-white font-bold text-lg py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center"
          >
            {isAdding ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              `Add ${selectedUsers.length > 0 ? selectedUsers.length : ''} Friend${
                selectedUsers.length === 1 ? '' : 's'
              }`
            )}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
