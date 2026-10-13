'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { X, ExternalLink, LogOut, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  onProfileUpdated?: () => void;
}

export default function SettingsModal({ isOpen, onClose, userProfile, onProfileUpdated }: SettingsModalProps) {
  const { user } = useAuth();
  const [ghostMode, setGhostMode] = useState(false);
  const [hapticFeedback, setHapticFeedback] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    if (userProfile) {
      setGhostMode(userProfile.ghost_mode || false);
    }
  }, [userProfile]);

  const triggerHaptic = () => {
    if (hapticFeedback && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const handleToggleGhostMode = async () => {
    triggerHaptic();
    const newValue = !ghostMode;
    setGhostMode(newValue);
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ghost_mode: newValue })
        .eq('id', userProfile.id);
      if (error) throw error;
      if (onProfileUpdated) onProfileUpdated();
    } catch (error: any) {
      toast.error('Failed to update Ghost Mode');
      setGhostMode(!newValue); // Revert
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleHaptic = () => {
    const newValue = !hapticFeedback;
    setHapticFeedback(newValue);
    if (newValue && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const handleTogglePushNotifications = () => {
    triggerHaptic();
    setPushNotifications(!pushNotifications);
    // Future implementation: register/unregister push notifications
  };

  const handleLogOut = async () => {
    triggerHaptic();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    triggerHaptic();
    setIsUpdating(true);

    try {
      // Typically we'd use a server-side Edge Function for secure account deletion.
      // Here we assume cascading deletes will handle profiles and related data.

      // Delete the profile (which triggers cascading deletes via DB if set up)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userProfile.id);

      if (profileError) throw profileError;

      // Note: Calling admin level `supabase.auth.admin.deleteUser` requires a service role.
      // For this purely client-side approach without edge functions, we'll delete what we can
      // and sign out, rendering the account effectively defunct, or triggering a custom RPC.

      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error: any) {
      toast.error('Failed to delete account');
      setIsUpdating(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-3xl border-t border-white/10 flex flex-col overflow-hidden text-white font-sans"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-xl font-bold tracking-tight">Settings Hub</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Card A: Account Identity */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4">Account Identity</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Registered Email</label>
                <div className="text-white font-medium bg-black/40 rounded-xl px-4 py-3 mt-1 border border-white/5 truncate">
                  {user?.email || 'N/A'}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Phone Number</label>
                <div className="text-white font-medium bg-black/40 rounded-xl px-4 py-3 mt-1 border border-white/5 truncate">
                  {userProfile?.phone || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Card B: Privacy & Preferences */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4">Privacy & Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Ghost Mode</h4>
                  <p className="text-[10px] text-white/50 mt-0.5">Hide your online status</p>
                </div>
                <button
                  disabled={isUpdating}
                  onClick={handleToggleGhostMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${ghostMode ? 'bg-indigo-500' : 'bg-gray-700'}`}
                >
                  <motion.span
                    layout
                    transition={{ type: "spring", stiffness: 700, damping: 30 }}
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ghostMode ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>

              <div className="w-full h-px bg-white/5" />

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Haptic Feedback</h4>
                  <p className="text-[10px] text-white/50 mt-0.5">App vibrations and micro-interactions</p>
                </div>
                <button
                  onClick={handleToggleHaptic}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${hapticFeedback ? 'bg-indigo-500' : 'bg-gray-700'}`}
                >
                  <motion.span
                    layout
                    transition={{ type: "spring", stiffness: 700, damping: 30 }}
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${hapticFeedback ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>

              <div className="w-full h-px bg-white/5" />

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Push Notifications</h4>
                  <p className="text-[10px] text-white/50 mt-0.5">Status & message alerts</p>
                </div>
                <button
                  onClick={handleTogglePushNotifications}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${pushNotifications ? 'bg-indigo-500' : 'bg-gray-700'}`}
                >
                  <motion.span
                    layout
                    transition={{ type: "spring", stiffness: 700, damping: 30 }}
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${pushNotifications ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Card C: Legal & Community */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4">Legal & Community</h3>
            <div>
               <h4 className="text-sm font-bold text-white mb-2">Rules & Regulations</h4>
               <p className="text-xs text-white/60 mb-4 leading-relaxed">
                 By using EarnMega, you agree to adhere to our community standards, fostering a safe and respectful environment.
               </p>
               <a
                 href="https://drive.google.com/drive/folders/1ucsTJMPzgUVWj5dqeSyyBAgXVpWztXT6"
                 target="_blank"
                 rel="noopener noreferrer"
                 className="flex items-center justify-center space-x-2 w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-colors font-medium text-sm text-white"
               >
                 <span>Learn More</span>
                 <ExternalLink size={14} />
               </a>
            </div>
          </div>

          {/* Card D: The Danger Zone */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4">The Danger Zone</h3>
            <div className="space-y-4">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleLogOut}
                className="flex items-center justify-center w-full py-3 space-x-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors text-white font-medium"
              >
                <LogOut size={16} />
                <span>Log Out</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center justify-center w-full py-3 space-x-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-colors text-rose-500 font-bold"
              >
                <Trash2 size={16} />
                <span>Delete Account</span>
              </motion.button>
            </div>
          </div>

          <div className="pb-8" />
        </div>

        {/* Delete Confirmation Modal Overlay */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
            >
               <motion.div
                 initial={{ scale: 0.9, y: 20 }}
                 animate={{ scale: 1, y: 0 }}
                 exit={{ scale: 0.9, y: 20 }}
                 transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                 className="bg-zinc-900 border border-rose-500/50 rounded-3xl p-6 w-full max-w-sm shadow-[0_0_50px_rgba(225,29,72,0.3)] text-center relative"
               >
                 <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
                    <Trash2 className="w-8 h-8 text-rose-500" />
                 </div>
                 <h3 className="text-xl font-bold text-white mb-2">Are you sure?</h3>
                 <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                   This action is permanent and will destroy all your coins, chats, and statuses.
                 </p>
                 <div className="space-y-4">
                   <input
                     type="text"
                     placeholder='Type "DELETE" to confirm'
                     value={deleteConfirmText}
                     onChange={(e) => setDeleteConfirmText(e.target.value)}
                     className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-center text-white font-mono tracking-widest focus:outline-none focus:border-rose-500/50"
                   />
                   <motion.button
                     whileTap={{ scale: 0.96 }}
                     onClick={handleDeleteAccount}
                     disabled={deleteConfirmText !== 'DELETE' || isUpdating}
                     className="w-full py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:bg-rose-900/50 text-white rounded-xl font-bold transition-colors"
                   >
                     {isUpdating ? 'Deleting...' : 'Permanently Delete'}
                   </motion.button>
                   <button
                     onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText('');
                     }}
                     className="w-full py-3 text-gray-400 hover:text-white font-medium transition-colors"
                   >
                     Cancel
                   </button>
                 </div>
               </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </AnimatePresence>
  );
}
