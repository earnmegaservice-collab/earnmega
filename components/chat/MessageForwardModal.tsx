'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Search } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';

interface User {
  id: string;
  username: string;
  avatar_url: string;
}

interface MessageForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onForward: (userIds: string[]) => Promise<void>;
}

export default function MessageForwardModal({ isOpen, onClose, onForward }: MessageForwardModalProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && user) {
      const fetchUsers = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .neq('id', user.id)
          .limit(20);
        if (!error && data) setUsers(data);
      };
      fetchUsers();
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const filteredUsers = users.filter(u => u.username?.toLowerCase().includes(search.toLowerCase()));

  const toggleSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const handleSend = async () => {
    if (selectedUsers.size === 0) return;
    setIsSending(true);
    await onForward(Array.from(selectedUsers));
    setIsSending(false);
    setSelectedUsers(new Set());
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-2xl flex items-end justify-center sm:items-center"
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="w-full sm:max-w-md bg-black/40 backdrop-blur-2xl border border-white/10 sm:rounded-3xl rounded-t-3xl flex flex-col h-[70vh] sm:h-[60vh] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
        >
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-bold text-white">Forward to...</h3>
            <button onClick={onClose} className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition active:scale-95 shadow-lg">
              <X size={20} />
            </button>
          </div>

          <div className="p-4 relative">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 transition-colors shadow-inner"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {filteredUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer border border-transparent hover:border-white/10" onClick={() => toggleSelection(u.id)}>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px] shadow-lg">
                    <img src={u.avatar_url || ''} alt={u.username} className="w-full h-full rounded-full object-cover bg-black" />
                  </div>
                  <span className="font-bold text-white tracking-wide">{u.username}</span>
                </div>
                <div className="w-6 h-6 rounded border border-white/20 flex items-center justify-center transition-colors">
                  {selectedUsers.has(u.id) && (
                    <div className="w-4 h-4 bg-purple-500 rounded-sm" />
                  )}
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
               <div className="p-8 text-center text-white/40 font-medium">No users found</div>
            )}
          </div>

          <div className="p-4 border-t border-white/10">
            <button
              onClick={handleSend}
              disabled={isSending || selectedUsers.size === 0}
              className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isSending ? 'Sending...' : `Forward (${selectedUsers.size})`}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
