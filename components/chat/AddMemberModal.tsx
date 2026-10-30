"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Check, UserPlus } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import debounce from 'lodash.debounce';
import { v4 as uuidv4 } from "uuid";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  currentUserId: string;
  onMembersAdded: () => void;
  existingParticipantIds: string[];
}

// Rules of Hooks verified: all hooks declared unconditionally above early returns
export default function AddMemberModal({ isOpen, onClose, groupId, currentUserId, onMembersAdded, existingParticipantIds }: AddMemberModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .not('id', 'in', `(${existingParticipantIds.join(',')})`)
        .limit(20);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      performSearch(query);
    }, 300),
    [existingParticipantIds]
  );

  useEffect(() => {
    setIsSearching(true);
    debouncedSearch(searchQuery);
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchQuery, debouncedSearch]);

  const toggleUserSelection = (user: any) => {
    if (selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;
    setIsAdding(true);

    try {
      // 1. Insert into room_participants
      const participantsToInsert = selectedUsers.map(u => ({
        room_id: groupId,
        user_id: u.id,
        role: 'member'
      }));

      const { error: insertError } = await supabase
        .from('room_participants')
        .insert(participantsToInsert);

      if (insertError) throw insertError;

      // 2. Audit Trail System Messages
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', currentUserId)
        .single();

      const adminName = adminProfile?.full_name || adminProfile?.username || 'Admin';

      const messagesToInsert = selectedUsers.map(u => {
        const memberName = u.full_name || u.username;
        return {
          room_id: groupId,
          sender_id: currentUserId,
          content: `$$SYSTEM$$ ${adminName} added ${memberName}`,
          is_system_message: true,
          system_event_type: 'user_added',
          created_at: new Date().toISOString(),
          id: uuidv4()
        };
      });

      const { error: messagesError } = await supabase
        .from('messages')
        .insert(messagesToInsert);

      if (messagesError) throw messagesError;

      console.info("[MATRIX] Expansion Protocol Executed: System Message Injected");
      toast.success(`Added ${selectedUsers.length} members`);

      // Cleanup & Close
      setSelectedUsers([]);
      setSearchQuery('');
      onMembersAdded();
      onClose();

    } catch (error: any) {
      console.error("Error adding members:", error);
      toast.error(error.message || "Failed to add members");
    } finally {
      setIsAdding(false);
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
         className="bg-neutral-950/90 backdrop-blur-2xl border-t border-white/10 sm:border p-6 rounded-t-[32px] sm:rounded-3xl shadow-2xl w-full max-w-md h-[80vh] sm:h-[600px] flex flex-col relative"
       >
          <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 sm:hidden shrink-0" />

          <div className="flex justify-between items-center mb-6 shrink-0">
             <h3 className="text-2xl font-black text-white flex items-center tracking-tight">
                 <UserPlus className="mr-3 text-fuchsia-500" size={28} /> Add Members
             </h3>
             <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white/60 hover:text-white transition-colors">
                <X size={20} />
             </button>
          </div>

          <div className="relative mb-6 shrink-0">
             <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40" />
             <input
                 type="text"
                 placeholder="Search users..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-fuchsia-500/50 transition-colors"
             />
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-2">
             {isSearching ? (
                 <div className="flex justify-center py-10">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fuchsia-500"></div>
                 </div>
             ) : searchResults.length > 0 ? (
                 searchResults.map(user => {
                     const isSelected = selectedUsers.some(u => u.id === user.id);
                     return (
                         <div
                             key={user.id}
                             onClick={() => toggleUserSelection(user)}
                             className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${isSelected ? 'bg-fuchsia-500/20 border border-fuchsia-500/50' : 'hover:bg-white/5 border border-transparent'}`}
                         >
                             <div className="flex items-center space-x-4">
                                 <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 border border-white/20">
                                     {user.avatar_url ? (
                                         <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                                     ) : (
                                         <div className="w-full h-full flex items-center justify-center text-white/60 font-bold bg-neutral-800">
                                             {(user.full_name || user.username || '?').charAt(0).toUpperCase()}
                                         </div>
                                     )}
                                 </div>
                                 <div>
                                     <span className="font-bold text-white block">{user.full_name || user.username}</span>
                                     <span className="text-xs text-white/40 block">@{user.username}</span>
                                 </div>
                             </div>
                             <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-fuchsia-500 border-fuchsia-500 text-white' : 'border-white/20'}`}>
                                 {isSelected && <Check size={14} strokeWidth={3} />}
                             </div>
                         </div>
                     );
                 })
             ) : searchQuery.trim() !== '' ? (
                 <div className="text-center py-10 text-white/40">No users found</div>
             ) : (
                 <div className="text-center py-10 text-white/40">Type to search for users</div>
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
                     `Add ${selectedUsers.length > 0 ? selectedUsers.length : ''} Members`
                 )}
             </button>
          </div>
       </motion.div>
    </div>,
    document.body
  );
}
