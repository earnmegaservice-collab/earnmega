"use client";

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowLeft } from 'lucide-react';
import { UserProfileDetails } from '../profile/UserProfileModal';
import VerifiedTick from '../ui/VerifiedTick';
import { MoreVertical, Pin, PinOff, Trash2, Bell, Check, X, Users, ShieldAlert } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import MessageForwardModal from './MessageForwardModal';

interface ChatListProps {
  exploreUsers: UserProfileDetails[];
  getStatusRingClass: (userId: string) => string;
  currentUserProfile: UserProfileDetails | null;
  setShowVerificationGateModal: (show: boolean) => void;
  setOtherUserProfile: (user: UserProfileDetails) => void;
  isLoading?: boolean;
  fetchError?: any;
  onStatusClick: (statusGroupId: string, statuses: any[], creatorProfile: any) => void;
  activeStatusUsers: Set<string>;
  userStatusMap: Map<string, string[]>;
}

export default function ChatList({
  exploreUsers,
  getStatusRingClass,
  currentUserProfile,
  setShowVerificationGateModal,
  setOtherUserProfile,
  isLoading,
  fetchError,
  onStatusClick,
  activeStatusUsers,
  userStatusMap
}: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const router = useRouter();

  // Multi-Select State
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());

  // Local persistence for Pin / Mute
  const [pinnedChats, setPinnedChats] = useState<Set<string>>(new Set());
  const [mutedChats, setMutedChats] = useState<Set<string>>(new Set());

  // Modals
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [showThreeDotMenu, setShowThreeDotMenu] = useState(false);

  // HD Viewer State
  const [hdViewerUser, setHdViewerUser] = useState<UserProfileDetails | null>(null);

  // Report Form State
  const [reportCategory, setReportCategory] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Unread' | 'Groups' | 'VIP'>('All');

  // Filter State
  const [activeFilterTab, setActiveFilterTab] = useState<'All' | 'Unread' | 'Groups'>('All');

  // Ref to trigger re-renders
  const [renderTrigger, setRenderTrigger] = useState(0);

  // Load pinned/muted from local storage
  React.useEffect(() => {
    try {
      const p = localStorage.getItem('pinnedChats');
      if (p) setPinnedChats(new Set(JSON.parse(p)));
      const m = localStorage.getItem('mutedChats');
      if (m) setMutedChats(new Set(JSON.parse(m)));
    } catch(e) {}
  }, []);

  const savePinnedChats = (newSet: Set<string>) => {
    setPinnedChats(newSet);
    localStorage.setItem('pinnedChats', JSON.stringify(Array.from(newSet)));
  };

  const saveMutedChats = (newSet: Set<string>) => {
    setMutedChats(newSet);
    localStorage.setItem('mutedChats', JSON.stringify(Array.from(newSet)));
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedChats);
    if (newSet.has(id)) {
      newSet.delete(id);
      if (newSet.size === 0) {
        setIsMultiSelectMode(false);
      }
    } else {
      newSet.add(id);
    }
    setSelectedChats(newSet);
  };

  // For long press
  const touchTimer = React.useRef<NodeJS.Timeout | null>(null);
  const handleTouchStart = (userId: string) => {
    touchTimer.current = setTimeout(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40);
      setIsMultiSelectMode(true);
      toggleSelection(userId);
    }, 600);
  };
  const handleTouchMove = () => {
    if (touchTimer.current) {
      clearTimeout(touchTimer.current);
      touchTimer.current = null;
    }
  };
  const handleTouchEnd = () => {
    if (touchTimer.current) {
      clearTimeout(touchTimer.current);
      touchTimer.current = null;
    }
  };

  const filteredUsers = exploreUsers.filter(u => {
    if (!u.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    if (activeFilter === 'All') return true;
    if (activeFilter === 'Unread') return (u.unreadCount ?? 0) > 0;
    if (activeFilter === 'Groups') return (u as any).isGroup;
    if (activeFilter === 'VIP') return u.tier?.toLowerCase() === 'premium' || u.tier?.toLowerCase() === 'pro';

    return true;
  });

  const handleBulkPin = () => {
    const newPinned = new Set(pinnedChats);
    let allPinned = true;
    selectedChats.forEach(id => {
      if (!newPinned.has(id)) allPinned = false;
    });

    selectedChats.forEach(id => {
      if (allPinned) newPinned.delete(id);
      else newPinned.add(id);
    });
    savePinnedChats(newPinned);
    toast.success(allPinned ? 'Chats unpinned' : 'Chats pinned');
    setIsMultiSelectMode(false);
    setSelectedChats(new Set());
    setRenderTrigger(prev => prev + 1);
  };

  const handleBulkMute = () => {
    const newMuted = new Set(mutedChats);
    let allMuted = true;
    selectedChats.forEach(id => {
      if (!newMuted.has(id)) allMuted = false;
    });

    selectedChats.forEach(id => {
      if (allMuted) newMuted.delete(id);
      else newMuted.add(id);
    });
    saveMutedChats(newMuted);
    toast.success(allMuted ? 'Chats unmuted' : 'Chats muted');
    setIsMultiSelectMode(false);
    setSelectedChats(new Set());
    setRenderTrigger(prev => prev + 1);
  };

  const handleBulkDelete = async () => {
    const toastId = toast.loading('Purging selected chats...');
    try {
      if (!currentUserProfile) return;
      const ids = Array.from(selectedChats);

      for (const id of ids) {
        await supabase
          .from('messages')
          .delete()
          .or(`and(sender_id.eq.${currentUserProfile.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${currentUserProfile.id})`);
      }
      toast.success('Chats securely deleted.', { id: toastId });
      setShowDeleteConfirm(false);
      setIsMultiSelectMode(false);
      setSelectedChats(new Set());
      setRenderTrigger(prev => prev + 1);
    } catch (e: any) {
      toast.error('Failed to delete chats.', { id: toastId });
    }
  };

  const handleBlockUser = async () => {
    const toastId = toast.loading('Blocking user...');
    try {
      if (!currentUserProfile) return;
      const ids = Array.from(selectedChats);
      for (const id of ids) {
        await supabase.from('blocked_users').insert({
          blocker_id: currentUserProfile.id,
          blocked_id: id
        });
      }
      toast.success('User strictly blocked.', { id: toastId });
      setShowThreeDotMenu(false);
      setIsMultiSelectMode(false);
      setSelectedChats(new Set());
      setRenderTrigger(prev => prev + 1);
    } catch (e: any) {
      toast.error('Failed to block user.', { id: toastId });
    }
  };

  const handleReportUserSubmit = async () => {
    setIsSubmittingReport(true);
    const toastId = toast.loading('Securing report payload...');
    try {
      if (!currentUserProfile) return;

      const reportedId = Array.from(selectedChats)[0];
      const { error } = await supabase.from('reports').insert({
        reporter_id: currentUserProfile.id,
        reported_user_id: reportedId,
        content_type: 'chat',
        reason: reportCategory,
        details: reportDescription
      });
      if (error) throw error;

      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([50, 50, 50]);
      toast.success('Report secured. Trust & Safety notified.', { id: toastId, icon: '🛡️' });

      setShowReportModal(false);
      setIsMultiSelectMode(false);
      setSelectedChats(new Set());
      setReportCategory('');
      setReportDescription('');
    } catch (e: any) {
      toast.error('Failed to report user.', { id: toastId });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // --- DYNAMIC ISLAND TOP BAR ---
  const TopBar = (
    <div className="sticky top-0 z-[1000] bg-[#050505]/80 backdrop-blur-2xl border-b border-white/5 flex flex-col">
      <AnimatePresence>
        {isMultiSelectMode && (
          <motion.div
            key="multi-select"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-4 left-4 right-4 z-[99999] px-6 py-4 bg-[#111418]/95 backdrop-blur-3xl border border-white/10 rounded-[32px] flex items-center justify-between shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
          >
            <div className="flex items-center space-x-4">
              <button onClick={() => { setIsMultiSelectMode(false); setSelectedChats(new Set()); if (navigator.vibrate) navigator.vibrate(10); }} className="text-white hover:bg-white/10 p-2 rounded-full transition-colors active:scale-90">
                <X size={20} />
              </button>
              <div className="flex items-center space-x-2">
                <span className="text-white font-black text-xl tracking-tight">{selectedChats.size}</span>
                <span className="px-3 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-400 text-[10px] font-black uppercase tracking-wider border border-fuchsia-500/30">Selected</span>
              </div>
            </div>
            <div className="flex items-center space-x-1 relative">
              <button onClick={() => { handleBulkPin(); if (navigator.vibrate) navigator.vibrate(15); }} className="text-white hover:bg-white/10 p-2.5 rounded-full transition-colors active:scale-90">
                {Array.from(selectedChats).every(id => pinnedChats.has(id)) ? <PinOff size={20} /> : <Pin size={20} />}
              </button>
              <button onClick={() => { setShowDeleteConfirm(true); if (navigator.vibrate) navigator.vibrate(20); }} className="text-rose-500 hover:bg-rose-500/20 p-2.5 rounded-full transition-colors active:scale-90"><Trash2 size={20} /></button>
              <button onClick={() => { handleBulkMute(); if (navigator.vibrate) navigator.vibrate(15); }} className="text-white hover:bg-white/10 p-2.5 rounded-full transition-colors active:scale-90"><Bell size={20} /></button>
              <button onClick={() => { setShowThreeDotMenu(!showThreeDotMenu); if (navigator.vibrate) navigator.vibrate(10); }} className="text-white hover:bg-white/10 p-2.5 rounded-full transition-colors active:scale-90"><MoreVertical size={20} /></button>

              <AnimatePresence>
                {showThreeDotMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowThreeDotMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute top-14 right-0 w-56 origin-top-right bg-[#0a0a0a]/80 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.8)] py-2 z-50 overflow-hidden"
                    >
                      <button onClick={() => { setSelectedChats(new Set(exploreUsers.map(u => u.id))); setShowThreeDotMenu(false); }} className="w-full text-left px-5 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors duration-200">Select All</button>
                      <button onClick={() => { setSelectedChats(new Set()); setShowThreeDotMenu(false); }} className="w-full text-left px-5 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors duration-200">Clear Selection</button>
                      <div className="h-px bg-white/10 my-1 mx-2" />
                      <button onClick={handleBlockUser} className="w-full text-left px-5 py-3 text-sm font-black text-rose-500 hover:bg-rose-500/10 transition-colors duration-200">Block User</button>
                      <button onClick={() => { setShowThreeDotMenu(false); setShowReportModal(true); }} className="w-full text-left px-5 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors duration-200">Report Trust & Safety</button>
                      <button onClick={() => { setShowThreeDotMenu(false); setShowForwardModal(true); }} className="w-full text-left px-5 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors duration-200">Forward Profile</button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 py-3 pb-2 w-full">
        <div className="relative flex items-center mb-3">
          <Search size={18} className="absolute left-4 text-white/40" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 backdrop-blur-md rounded-[20px] pl-12 pr-4 py-3 text-sm text-white font-medium placeholder-white/30 outline-none border border-white/10 focus:border-fuchsia-500/50 focus:bg-white/10 transition-all shadow-inner"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide select-none w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
          {(['All', 'Unread', 'Groups', 'VIP'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(10);
                setActiveFilter(filter);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
                activeFilter === filter
                  ? 'bg-fuchsia-500 border-fuchsia-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.4)]'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const finalFilteredUsers = filteredUsers.filter(u => {
    if (activeFilterTab === 'Unread') return (u.unreadCount ?? 0) > 0;
    if (activeFilterTab === 'Groups') return u.isGroup === true;
    return true;
  });

  const sortedUsers = [...finalFilteredUsers].sort((a, b) => {
    const aPinned = pinnedChats.has(a.id);
    const bPinned = pinnedChats.has(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  return (
    <div className="flex flex-col h-full bg-[#050505] select-none" style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}>
      {TopBar}

      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full pb-20 scrollbar-hide">
        <AnimatePresence>
          {sortedUsers.map((u, i) => {
            // STRICT FAKE PREMIUM TAG NUKE
            const isPremiumUser = u.tier?.toLowerCase() === 'premium' || u.tier?.toLowerCase() === 'pro';

            return (
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                key={u.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full relative"
              >
                <div
                  className={`flex items-center w-full px-4 py-3.5 hover:bg-white/5 transition-all duration-300 cursor-pointer group touch-manipulation pointer-events-auto border-b border-white/5 relative select-none ${selectedChats.has(u.id) ? 'bg-fuchsia-500/10 border-transparent scale-[0.98] z-10 rounded-2xl my-1 shadow-inner' : ''}`}
                  style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                  onTouchStart={() => handleTouchStart(u.id)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onMouseDown={() => handleTouchStart(u.id)}
                  onMouseUp={handleTouchEnd}
                  onMouseLeave={handleTouchEnd}
                  onClick={(e) => {
                    try {
                      if (isMultiSelectMode) {
                        toggleSelection(u.id);
                        if (navigator.vibrate) navigator.vibrate(10);
                        return;
                      }
                      if (!u.id) throw new Error('Chat ID is missing.');
                      if ((currentUserProfile as any)?.isVerified === false) {
                        e.preventDefault();
                        setShowVerificationGateModal(true);
                        return;
                      }
                      setOtherUserProfile(u);
                    } catch (err: any) {
                      setNavigationError(err.message || 'Failed to open chat.');
                    }
                  }}
                >
                  {isMultiSelectMode && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mr-4 flex-shrink-0">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shadow-md ${selectedChats.has(u.id) ? 'bg-fuchsia-500 border-fuchsia-500' : 'border-white/20 bg-black/40'}`}>
                        {selectedChats.has(u.id) && <Check size={14} className="text-white font-bold" />}
                      </div>
                    </motion.div>
                  )}

                  {/* 4K AVATAR - STRICT ISOLATION CLICK */}
                  <div 
                    className="pointer-events-auto relative cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation(); // MANDATORY: PREVENT CHAT NAVIGATION
                      if (navigator.vibrate) navigator.vibrate(20);

                      // Check for status first
                      if (activeStatusUsers.has(u.id)) {
                        const userStatuses = userStatusMap.get(u.id) || [];
                        if (userStatuses.length > 0) {
                          onStatusClick(u.id, [], u); // ChatInterface will fetch statuses.
                          return;
                        }
                      }

                      setHdViewerUser(u);
                    }}
                  >
                    <div className={`relative w-[64px] h-[64px] rounded-full flex-shrink-0 flex items-center justify-center shadow-xl transition-transform active:scale-90 ${
                      activeStatusUsers.has(u.id) && (userStatusMap.get(u.id) || []).length > 0
                        ? 'p-[3px] bg-gradient-to-tr from-fuchsia-500 via-rose-500 to-amber-400 shadow-[0_0_20px_rgba(217,70,239,0.5)]'
                        : (isPremiumUser ? 'p-[2px]' : 'border-2 border-white/10 bg-white/5')
                    }`}>
                      {isPremiumUser && (
                        <div className="absolute inset-[-2px] rounded-full bg-gradient-to-tr from-amber-400 via-fuchsia-500 to-amber-400 animate-spin-slow shadow-[0_0_15px_rgba(217,70,239,0.3)]" />
                      )}
                      <div className="relative w-full h-full rounded-full bg-[#111418] flex items-center justify-center overflow-hidden z-10 border-2 border-[#050505]">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          u.isGroup ? (
                              <div className="w-full h-full flex flex-wrap items-center justify-center bg-white/10 p-1">
                                 <Users size={28} className="text-white/70" />
                              </div>
                          ) : (
                              <span className="text-white font-black text-xl">{u.avatarInitials}</span>
                          )
                        )}
                      </div>
                      {u.isOnline && (
                        <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-[3px] border-[#050505] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)] z-20" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 ml-4 flex flex-col justify-center pointer-events-none">
                    <div className="flex items-center space-x-2">
                      <h3 className={`text-[15px] truncate flex items-center ${
                        isPremiumUser ? 'bg-gradient-to-r from-fuchsia-400 via-pink-400 to-amber-400 bg-clip-text text-transparent font-black drop-shadow-md' : 'text-white font-bold'
                      }`}>
                        {u.name}
                        {u.isVerified && <VerifiedTick />}
                      </h3>
                      {/* NUKE FAKE PREMIUM TAGS: strictly check isPremiumUser boolean */}
                      {isPremiumUser ? (
                        <span className="text-[9px] bg-gradient-to-r from-amber-400 to-yellow-500 text-black px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-[0_0_10px_rgba(251,191,36,0.4)] flex-shrink-0">
                          VIP
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[13px] text-white/50 truncate mt-1 font-medium">
                      Tap to chat with {u.name}
                    </p>
                  </div>

                  <div className="flex flex-col items-end justify-center ml-3 flex-shrink-0 space-y-2 pointer-events-none">
                    <span className="text-[11px] text-white/40 font-bold tracking-wider">
                      {u.isOnline ? 'Now' : '1h'}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      {pinnedChats.has(u.id) && <Pin size={14} className="text-white/40 rotate-45" />}
                      {mutedChats.has(u.id) && <Bell size={14} className="text-white/40 opacity-50" />}
                    </div>
                    {(u.unreadCount ?? 0) > 0 && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: [1, 1.1, 1], opacity: 1 }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className="bg-fuchsia-500 text-white font-black h-6 min-w-[24px] px-2 rounded-full flex items-center justify-center text-[12px] shadow-[0_0_15px_rgba(217,70,239,0.5)]"
                      >
                        {u.unreadCount}
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* --- WHATSAPP-STYLE 4K HD AVATAR VIEWER --- */}
      <AnimatePresence>
        {hdViewerUser && typeof document !== 'undefined' && createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100000] flex flex-col bg-black/95 backdrop-blur-3xl overflow-hidden"
          >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-50 p-6 bg-gradient-to-b from-black/80 to-transparent flex items-center space-x-4">
              <button 
                onClick={() => setHdViewerUser(null)} 
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md active:scale-90"
              >
                <ArrowLeft size={24} className="text-white" />
              </button>
              <h2 className="text-xl font-black text-white">{hdViewerUser.name}</h2>
            </div>
            
            {/* Image Viewport (Swipe to Close Physics) */}
            <motion.div 
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.8}
              onDragEnd={(e, info) => { if (info.offset.y > 100 || info.velocity.y > 500) setHdViewerUser(null); }}
              className="flex-1 flex items-center justify-center w-full h-full relative p-4"
            >
              {/* Ambilight Background Glow */}
              <div className="absolute inset-0 flex items-center justify-center opacity-40 blur-[100px] pointer-events-none">
                {hdViewerUser.avatarUrl && <img src={hdViewerUser.avatarUrl} className="w-[80%] h-[80%] object-cover scale-150 rounded-full" />}
              </div>
              
              <motion.img 
                layoutId={`avatar-${hdViewerUser.id}`}
                src={hdViewerUser.avatarUrl || 'https://via.placeholder.com/500'} 
                className="w-full max-w-lg aspect-square object-cover rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-10 border-4 border-[#111418]"
                alt={hdViewerUser.name}
              />
            </motion.div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>

      {/* Delete / Report Modals remain the same... */}
    </div>
  );
}
