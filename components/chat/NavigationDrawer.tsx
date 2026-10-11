import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: any) => void;
}

export default function NavigationDrawer({ isOpen, onClose, onSelectUser }: NavigationDrawerProps) {
  const [users, setUsers] = useState<any[]>([]);
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) throw error;

      if (data) {
        // filter out current user
        const filteredUsers = data.filter(u => !user || u.id !== user.id);

        // Map to user format expected by app
        const formattedUsers = filteredUsers.map(u => ({
          id: u.id,
          name: u.username || 'Unknown User',
          avatarInitials: (u.username?.[0] || 'U').toUpperCase() + (u.username?.[1] || 'S').toUpperCase(),
          bio: 'Earnmega user',
          joinDate: new Date(u.created_at).toLocaleDateString(),
          tier: 'FREE', // Default fallback
          isOnline: true,
          coinsGifted: 0,
          isSelf: false,
          last_seen: u.updated_at || u.created_at,
          unreadCount: 0 // Mocking unread counts requires a complex unread messages table which doesn't exist yet, we will default to 0 for now unless requested differently
        }));

        setUsers(formattedUsers);
      }
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative w-80 max-w-[80vw] h-full bg-white/5 backdrop-blur-2xl border-r border-white/10 shadow-2xl flex flex-col"
          >
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5 backdrop-blur-md">
              <h2 className="text-lg font-bold text-white">Explore Users</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-white p-2">
                <X size={20} />
              </button>
            </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="text-center text-gray-500 py-8">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No users found.</div>
          ) : (
            users.map(u => (
              <div
                key={u.id}
                onClick={() => {
                  onSelectUser(u);
                  onClose();
                }}
                className="flex items-center space-x-3 p-3 bg-gray-800/50 hover:bg-gray-800 rounded-xl cursor-pointer transition-colors border border-gray-700/50 hover:border-gray-600"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
                  <span className="text-white font-bold text-sm">{u.avatarInitials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <h3 className="text-sm font-bold text-gray-100 truncate">{u.name}</h3>
                    {u.unreadCount > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {u.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{u.bio}</p>
                </div>
                <button className="px-3 py-1 bg-blue-600/20 text-blue-400 text-xs font-bold rounded-lg hover:bg-blue-600/30 transition-colors">
                  Chat
                </button>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
      )}
    </AnimatePresence>
  );
}
