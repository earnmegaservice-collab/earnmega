import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { X, Edit2, Upload, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: any) => void;
  onProfileUpdated?: () => void;
}

export default function NavigationDrawer({ isOpen, onClose, onSelectUser, onProfileUpdated }: NavigationDrawerProps) {
  const [users, setUsers] = useState<any[]>([]);
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'EXPLORE' | 'EDIT_PROFILE'>('EXPLORE');

  // Edit Profile State
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'EXPLORE') {
        loadUsers();
      } else if (activeTab === 'EDIT_PROFILE' && user) {
        loadCurrentUserProfile();
      }
    }
  }, [isOpen, activeTab, user]);

  const loadCurrentUserProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setEditUsername(data.username || '');
        setEditBio(data.bio || '');
        setAvatarUrl(data.avatar_url || null);
      }
    } catch (err) {
      console.error('Failed to load user profile', err);
    }
  };

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
        const formattedUsers = filteredUsers.map(u => {
          try {
            return {
              id: u.id,
              name: u.username || 'Unknown User',
              avatarInitials: (u.username?.[0] || 'U').toUpperCase() + (u.username?.[1] || 'S').toUpperCase(),
              avatarUrl: u.avatar_url,
              bio: u.bio || 'Earnmega user',
              joinDate: u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Unknown',
              tier: 'FREE', // Default fallback
              isOnline: true,
              coinsGifted: u.coins_gifted || 0,
              isSelf: false,
              last_seen: u.updated_at || u.created_at,
              unreadCount: 0
            };
          } catch(e) {
            return null;
          }
        }).filter(Boolean);

        setUsers(formattedUsers);
      }
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);

      // Auto-save the profile when avatar is successfully uploaded
      if (user) {
        await supabase
          .from('profiles')
          .update({
            avatar_url: data.publicUrl,
          })
          .eq('id', user.id);

        if (onProfileUpdated) {
            onProfileUpdated();
        }
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: editUsername,
          bio: editBio,
          avatar_url: avatarUrl,
        })
        .eq('id', user.id);

      if (error) throw error;

      if (onProfileUpdated) {
          onProfileUpdated();
      }

      // Give feedback by switching back to explore
      setActiveTab('EXPLORE');
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSaving(false);
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
            <div className="p-4 border-b border-white/10 flex flex-col gap-4 bg-white/5 backdrop-blur-md">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-white">Menu</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white p-2 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex bg-gray-800/50 p-1 rounded-xl">
                 <button
                   onClick={() => setActiveTab('EXPLORE')}
                   className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'EXPLORE' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-gray-400 hover:text-gray-200'}`}
                 >
                   Explore
                 </button>
                 <button
                   onClick={() => setActiveTab('EDIT_PROFILE')}
                   className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'EDIT_PROFILE' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-gray-400 hover:text-gray-200'}`}
                 >
                   My Profile
                 </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeTab === 'EXPLORE' ? (
                isLoading ? (
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
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-bold text-sm">{u.avatarInitials}</span>
                        )}
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
                )
              ) : (
                <div className="flex flex-col gap-6 pt-2">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center overflow-hidden shadow-xl">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <Camera size={32} className="text-gray-500" />
                        )}
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"
                      >
                        {isUploading ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Upload size={14} />}
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                    <div className="text-xs text-gray-400">Upload a square image for best results</div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Username</label>
                      <input
                        type="text"
                        value={editUsername}
                        onChange={e => setEditUsername(e.target.value)}
                        className="w-full px-3 py-2.5 bg-black/40 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                        placeholder="Your username"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Bio</label>
                      <textarea
                        value={editBio}
                        onChange={e => setEditBio(e.target.value)}
                        className="w-full px-3 py-2.5 bg-black/40 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none h-24"
                        placeholder="Tell us about yourself"
                      />
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSaveProfile}
                    disabled={isSaving || isUploading}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 mt-4"
                  >
                    {isSaving ? 'Saving...' : 'Save Profile'}
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
