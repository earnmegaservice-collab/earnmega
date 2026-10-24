'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { X, ExternalLink, LogOut, Trash2, ArrowLeft, Mail, MessageCircle } from 'lucide-react';
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
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(100);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [isLoadingBlocked, setIsLoadingBlocked] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    if (userProfile) {
      setGhostMode(userProfile.ghost_mode ?? false);
      setHapticFeedback(userProfile.haptic_feedback ?? true);
      setPushNotifications(userProfile.push_notifications ?? true);
      setMinAge(userProfile.min_age ?? 18);
      setMaxAge(userProfile.max_age ?? 100);
    }
  }, [userProfile]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (!userProfile) return;
      if (minAge === (userProfile.min_age ?? 18) && maxAge === (userProfile.max_age ?? 100)) return;
      try {
        await supabase.from('profiles').update({ min_age: minAge, max_age: maxAge }).eq('id', userProfile.id);
        if (onProfileUpdated) onProfileUpdated();
      } catch (error) {
        console.error('Failed to update age preferences', error);
      }
    }, 800);
    return () => clearTimeout(timeoutId);
  }, [minAge, maxAge, userProfile]);

  const triggerHaptic = () => {
    if (hapticFeedback && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  const handleToggleGhostMode = async () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
    const newValue = !ghostMode;
    setGhostMode(newValue);
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('profiles').update({ ghost_mode: newValue }).eq('id', userProfile.id);
      if (error) throw error;
      if (onProfileUpdated) onProfileUpdated();
    } catch (error: any) {
      toast.error('Failed to update Ghost Mode');
      setGhostMode(!newValue);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleHaptic = async () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
    const newValue = !hapticFeedback;
    setHapticFeedback(newValue);
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('profiles').update({ haptic_feedback: newValue }).eq('id', userProfile.id);
      if (error) throw error;
      if (onProfileUpdated) onProfileUpdated();
    } catch (error: any) {
      toast.error('Failed to update Haptic Feedback');
      setHapticFeedback(!newValue);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTogglePushNotifications = async () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
    const newValue = !pushNotifications;
    setPushNotifications(newValue);
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('profiles').update({ push_notifications: newValue }).eq('id', userProfile.id);
      if (error) throw error;
      if (onProfileUpdated) onProfileUpdated();
    } catch (error: any) {
      toast.error('Failed to update Push Notifications');
      setPushNotifications(!newValue);
    } finally {
      setIsUpdating(false);
    }
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


  const fetchBlockedUsers = async () => {
    setIsLoadingBlocked(true);
    try {
      if (!user) return;
      const { data, error } = await supabase
        .from('blocked_users')
        .select(`
          id,
          blocked_id,
          profiles:blocked_id (id, full_name, username, avatar_url)
        `)
        .eq('blocker_id', user.id);

      if (error) throw error;
      setBlockedUsers(data || []);
    } catch (error: any) {
      console.error('Failed to fetch blocked users:', error);
    } finally {
      setIsLoadingBlocked(false);
    }
  };

  const handleUnblockUser = async (blockedRowId: string, blockedUserId: string) => {
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('id', blockedRowId);
      if (error) throw error;

      setBlockedUsers(prev => prev.filter(u => u.id !== blockedRowId));
      toast.success('User unblocked successfully');
    } catch (error: any) {
      toast.error('Failed to unblock user');
    }
  };


  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-[999] bg-[#020202] overflow-y-auto w-full h-full text-white font-sans"
      >
        {/* THE STICKY LUXURY HEADER */}
        <div className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-[#020202]/80 backdrop-blur-3xl border-b border-white/5">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500">Settings</h1>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pt-4">

          {/* Card A: Account Identity */}
          <div className="mx-4 mb-6 p-5 rounded-[24px] bg-[#0a0a0a]/60 backdrop-blur-2xl border border-white/[0.08] shadow-[0_0_30px_rgba(255,255,255,0.02)]">
            <h3 className="text-xs font-black tracking-[0.2em] text-gray-500 uppercase mb-4">Account Identity</h3>
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
          <div className="mx-4 mb-6 p-5 rounded-[24px] bg-[#0a0a0a]/60 backdrop-blur-2xl border border-white/[0.08] shadow-[0_0_30px_rgba(255,255,255,0.02)]">
            <h3 className="text-xs font-black tracking-[0.2em] text-gray-500 uppercase mb-4">Privacy & Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Ghost Mode</h4>
                  <p className="text-[10px] text-white/50 mt-0.5">Hide your online status</p>
                </div>
                <button
                  disabled={isUpdating}
                  onClick={handleToggleGhostMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none ${ghostMode ? 'bg-gradient-to-r from-fuchsia-600 to-cyan-500 shadow-[0_0_15px_rgba(192,38,211,0.5)]' : 'bg-white/10'}`}
                >
                  <motion.span
                    layout
                    transition={{ type: "spring", stiffness: 700, damping: 30 }}
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${ghostMode ? 'translate-x-6' : 'translate-x-1'}`}
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
                  disabled={isUpdating}
                  onClick={handleToggleHaptic}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none ${hapticFeedback ? 'bg-gradient-to-r from-fuchsia-600 to-cyan-500 shadow-[0_0_15px_rgba(192,38,211,0.5)]' : 'bg-white/10'}`}
                >
                  <motion.span
                    layout
                    transition={{ type: "spring", stiffness: 700, damping: 30 }}
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${hapticFeedback ? 'translate-x-6' : 'translate-x-1'}`}
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
                  disabled={isUpdating}
                  onClick={handleTogglePushNotifications}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none ${pushNotifications ? 'bg-gradient-to-r from-fuchsia-600 to-cyan-500 shadow-[0_0_15px_rgba(192,38,211,0.5)]' : 'bg-white/10'}`}
                >
                  <motion.span
                    layout
                    transition={{ type: "spring", stiffness: 700, damping: 30 }}
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${pushNotifications ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>

              <div className="w-full h-px bg-white/5" />

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Blocked Users</h4>
                  <p className="text-[10px] text-white/50 mt-0.5">Manage users you have blocked</p>
                </div>
                <button
                  onClick={() => {
                    fetchBlockedUsers();
                    setShowBlockedUsers(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-xs font-bold"
                >
                  Manage
                </button>
              </div>

            </div>
          </div>

          {/* Card C: Legal & Community */}
          <div className="mx-4 mb-6 p-5 rounded-[24px] bg-[#0a0a0a]/60 backdrop-blur-2xl border border-white/[0.08] shadow-[0_0_30px_rgba(255,255,255,0.02)]">
            <h3 className="text-xs font-black tracking-[0.2em] text-gray-500 uppercase mb-4">Legal & Community</h3>
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

          {/* Holographic Age Range Matchmaker */}
          <div className="mx-4 mb-6 p-5 rounded-[24px] bg-[#0a0a0a]/60 backdrop-blur-2xl border border-white/[0.08] shadow-[0_0_30px_rgba(255,255,255,0.02)]">
            <h3 className="text-xs font-black tracking-[0.2em] text-gray-500 uppercase mb-4">Matchmaking Preferences</h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-bold text-white">Age Range</h4>
                  <div className="px-2 py-1 bg-white/10 rounded-md backdrop-blur-md border border-white/5 opacity-0">
                    <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">
                      {minAge} - {maxAge}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-white/50 mb-8">Show people within this age range</p>

                <div className="relative px-2 mb-8">
                  {/* Min Age Slider */}
                  <div className="relative w-full mb-8">
                    <div
                      className="absolute -top-8 -ml-4 w-8 h-6 bg-white/10 backdrop-blur-md border border-white/20 rounded flex items-center justify-center pointer-events-none shadow-[0_0_10px_rgba(217,70,239,0.3)] z-10"
                      style={{ left: `${((minAge - 1) / 99) * 100}%` }}
                    >
                      <span className="text-[10px] font-bold text-white">{minAge}</span>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-white/20" />
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={minAge}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val <= maxAge) { setMinAge(val); triggerHaptic(); }
                      }}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-fuchsia-500 relative z-0"
                    />
                  </div>

                  {/* Max Age Slider */}
                  <div className="relative w-full">
                    <div
                      className="absolute -top-8 -ml-4 w-8 h-6 bg-white/10 backdrop-blur-md border border-white/20 rounded flex items-center justify-center pointer-events-none shadow-[0_0_10px_rgba(34,211,238,0.3)] z-10"
                      style={{ left: `${((maxAge - 1) / 99) * 100}%` }}
                    >
                      <span className="text-[10px] font-bold text-white">{maxAge}</span>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-white/20" />
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={maxAge}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val >= minAge) { setMaxAge(val); triggerHaptic(); }
                      }}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500 relative z-0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Elite Concierge */}
          <div className="mx-4 mb-6 p-5 rounded-[24px] bg-[#0a0a0a]/60 backdrop-blur-2xl border border-white/[0.08] shadow-[0_0_30px_rgba(255,255,255,0.02)]">
            <h3 className="text-xs font-black tracking-[0.2em] text-gray-500 uppercase mb-4">24/7 Concierge</h3>
            <div className="space-y-4">
              <a
                href="mailto:earnmegadesk@gmail.com"
                className="flex items-center justify-between w-full p-4 bg-[#111] hover:bg-[#1a1a1a] border border-white/5 rounded-xl transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <Mail className="w-5 h-5 text-white/70" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-white">Email Support</h4>
                    <p className="text-[10px] text-white/50">earnmegadesk@gmail.com</p>
                  </div>
                </div>
                <ExternalLink size={16} className="text-white/30 group-hover:text-white/70 transition-colors" />
              </a>

              <a
                href="https://wa.me/233534671381"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full p-4 bg-[#111] hover:bg-[#1a1a1a] border border-[#25D366]/20 hover:border-[#25D366]/40 rounded-xl transition-all group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#25D366]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center space-x-3 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center group-hover:bg-[#25D366]/20 transition-colors">
                    <MessageCircle className="w-5 h-5 text-[#25D366]" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-white">WhatsApp VIP Line</h4>
                    <p className="text-[10px] text-[#25D366]/70">Fastest response time</p>
                  </div>
                </div>
                <ExternalLink size={16} className="text-white/30 group-hover:text-[#25D366] transition-colors relative z-10" />
              </a>
            </div>
          </div>

          {/* Card D: The Danger Zone */}
          <div className="mx-4 mb-6 p-5 rounded-[24px] bg-[#0a0a0a]/60 backdrop-blur-2xl border border-white/[0.08] shadow-[0_0_30px_rgba(255,255,255,0.02)]">
            <h3 className="text-xs font-black tracking-[0.2em] text-gray-500 uppercase mb-4">The Danger Zone</h3>
            <div className="space-y-4">
              <button
                onClick={handleLogOut}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all font-bold tracking-wide"
              >
                <LogOut size={16} />
                <span>Log Out</span>
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-4 mt-3 rounded-xl bg-red-950/20 border border-red-900/50 text-red-500 hover:bg-red-900/40 hover:shadow-[0_0_20px_rgba(220,38,38,0.2)] transition-all font-bold tracking-wide"
              >
                <Trash2 size={16} />
                <span>Delete Account</span>
              </button>
            </div>
          </div>

          <div className="pb-8" />
        </div>

        {/* Delete Confirmation Modal Overlay */}

        {/* Blocked Users Modal */}
        <AnimatePresence>
          {showBlockedUsers && (
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="absolute inset-0 z-[105] bg-black/95 backdrop-blur-xl flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-zinc-900/50">
                <h2 className="text-xl font-bold tracking-tight text-white">Blocked Users</h2>
                <button
                  onClick={() => setShowBlockedUsers(false)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoadingBlocked ? (
                  <div className="flex justify-center p-8 text-white/50">Loading...</div>
                ) : blockedUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-white/50">
                    <p>No blocked users.</p>
                  </div>
                ) : (
                  blockedUsers.map(bUser => {
                    const prof = Array.isArray(bUser.profiles) ? bUser.profiles[0] : bUser.profiles;
                    const name = prof?.full_name || prof?.username || 'Unknown User';
                    const avatar = prof?.avatar_url;

                    return (
                      <div key={bUser.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                            {avatar ? (
                              <img src={avatar} alt={name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white text-sm font-bold">{name.charAt(0)}</span>
                            )}
                          </div>
                          <span className="text-white font-medium">{name}</span>
                        </div>
                        <button
                          onClick={() => handleUnblockUser(bUser.id, bUser.blocked_id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 text-xs font-bold transition-colors"
                        >
                          Unblock
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
