import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Users, Image as ImageIcon } from 'lucide-react';
import { UserProfileDetails } from '../profile/UserProfileModal';

interface GroupCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  friends: UserProfileDetails[];
  onCreateGroup: (name: string, members: string[], avatarFile: File | null) => void;
}

export default function GroupCreationModal({ isOpen, onClose, friends, onCreateGroup }: GroupCreationModalProps) {
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const toggleFriend = (id: string) => {
    const newSet = new Set(selectedFriends);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedFriends(newSet);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (groupName.trim() && selectedFriends.size > 0) {
      onCreateGroup(groupName, Array.from(selectedFriends), avatarFile);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-[#0a0a0c] border border-white/10 rounded-3xl p-6 shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="text-amber-500" />
                New Group
              </h2>
              <button onClick={onClose} className="text-white/50 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="flex items-center gap-4 mb-6">
                 <div className="relative w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 group">
                    {avatarPreview ? (
                        <img src={avatarPreview} alt="Group Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <ImageIcon className="text-white/30 w-8 h-8 group-hover:text-amber-500 transition-colors" />
                    )}
                    <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                 </div>
                 <div className="flex-1">
                     <input
                        type="text"
                        placeholder="Group Name"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className="w-full bg-transparent border-b border-white/20 focus:border-amber-500 text-white placeholder-white/40 py-2 outline-none text-lg transition-colors"
                        required
                     />
                 </div>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-semibold text-white/70 mb-3">Add Participants ({selectedFriends.size})</h3>
                <div className="space-y-2">
                  {friends.map((friend) => (
                    <motion.div
                      key={friend.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleFriend(friend.id)}
                      className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border ${selectedFriends.has(friend.id) ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                    >
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden relative">
                             {friend.avatarUrl ? (
                                <img src={friend.avatarUrl} alt={friend.name} className="w-full h-full object-cover" />
                             ) : (
                                <span className="text-sm font-bold text-white">{friend.avatarInitials}</span>
                             )}
                          </div>
                          <div>
                             <p className="text-white font-medium text-sm">{friend.name}</p>
                             <p className="text-white/50 text-xs truncate max-w-[150px]">{friend.bio}</p>
                          </div>
                       </div>
                       <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedFriends.has(friend.id) ? 'bg-amber-500 border-amber-500 text-black' : 'border-white/30'}`}>
                          {selectedFriends.has(friend.id) && <Check size={12} strokeWidth={4} />}
                       </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={!groupName.trim() || selectedFriends.size === 0}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-black font-bold py-3.5 rounded-2xl mt-4 disabled:opacity-50 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
              >
                Create Group
              </motion.button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
