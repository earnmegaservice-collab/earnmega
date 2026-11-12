"use client";

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowLeft, Heart, Sparkles } from 'lucide-react';
import { UserProfileDetails } from '../profile/UserProfileModal';
import VerifiedBadge from '../ui/VerifiedBadge';
import { MoreVertical, Pin, PinOff, Trash2, Bell, BellOff, Check, X, Users, ShieldAlert, ShieldCheck, Eye } from 'lucide-react';
import { submitUserReport } from '../../app/actions/submitUserReport';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import { deleteConversationPermanently } from '../../utils/deleteUtils';
import {
  AI_FRIENDS_BOT_ID,
  SUPPORT_BOT_ID,
  ConnectionRequestItem,
  isRealPremiumOrVip,
  isRealVip,
  isRealPremium,
  isRealVerified,
} from '../../utils/connectionsStore';

interface ChatListProps {
  setChats?: React.Dispatch<React.SetStateAction<any[]>>;
  chats?: any[];
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
  blockedUserIds?: Set<string>;
  incomingRequests?: ConnectionRequestItem[];
  onAcceptRequest?: (req: ConnectionRequestItem) => Promise<void> | void;
  onDeclineRequest?: (req: ConnectionRequestItem) => Promise<void> | void;
  onInspectRequesterProfile?: (req: ConnectionRequestItem) => void;
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
  setChats,
  chats,
  userStatusMap,
  blockedUserIds: parentBlockedUserIds,
  incomingRequests = [],
  onAcceptRequest,
  onDeclineRequest,
  onInspectRequesterProfile,
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
  const [showThreeDotMenu, setShowThreeDotMenu] = useState(false);

  // Deletion state
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // HD Viewer State
  const [hdViewerUser, setHdViewerUser] = useState<UserProfileDetails | null>(null);

  // Report Form State
  const [reportCategory, setReportCategory] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Requests' | 'Unread' | 'Groups' | 'VIP'>('All');
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  // Blocked State
  const [localBlockedUserIds, setLocalBlockedUserIds] = useState<Set<string>>(new Set(parentBlockedUserIds || []));

  // Ref to trigger re-renders
  const [renderTrigger, setRenderTrigger] = useState(0);

  React.useEffect(() => {
    const fetchBlockedUsers = async () => {
      if (!currentUserProfile) return;

      const { data } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', currentUserProfile.id);

      if (data) {
        const blocks = new Set<string>();
        data.forEach(b => blocks.add(b.blocked_id));
        setLocalBlockedUserIds(blocks);
      }
    };

    fetchBlockedUsers();

    if (!currentUserProfile) return;

    const channel = supabase.channel(`chatlist_blocked_users_${currentUserProfile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blocked_users' }, () => {
        fetchBlockedUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserProfile?.id]);

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
    if (id === AI_FRIENDS_BOT_ID) return; // AI Friends is permanently pinned and cannot be deleted
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
  const pressTimer = React.useRef<NodeJS.Timeout | null>(null);
  const handleTouchStart = (chatId: string) => {
    if (chatId === AI_FRIENDS_BOT_ID) return;
    pressTimer.current = setTimeout(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40);
      setIsMultiSelectMode(true);
      toggleSelection(chatId);
    }, 600);
  };
  const handleTouchMove = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };
  const handleTouchEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  // Deduplicate by id and keep AI Friends permanently pinned, while hiding Support bot
  const uniqueExploreUsers = React.useMemo(() => {
    const map = new Map<string, UserProfileDetails>();
    for (const u of exploreUsers) {
      if (!u || !u.id) continue;
      // Hide support bot from main chat list, but ALWAYS allow AI Friends bot
      if (u.id === SUPPORT_BOT_ID || (u.id !== AI_FRIENDS_BOT_ID && u.is_bot && (u.name || '').toLowerCase().includes('support'))) {
        continue;
      }
      if (!map.has(u.id)) {
        map.set(u.id, u);
      }
    }
    return Array.from(map.values());
  }, [exploreUsers]);

  const filteredUsers = uniqueExploreUsers.filter(u => {
    if (!u.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    if (activeFilter === 'All') return true;
    if (activeFilter === 'Requests') return false; // Requests tab exclusively shows incoming requests
    if (activeFilter === 'Unread') return (u.unreadCount ?? 0) > 0;
    if (activeFilter === 'Groups') return Boolean((u as any).isGroup || (u as any).is_group || (u as any).type === 'group' || (u as any).room_type === 'group');
    if (activeFilter === 'VIP') return isRealPremiumOrVip(u);

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

  const confirmPermanentDelete = async () => {
    if (!currentUserProfile || !chatToDelete || chatToDelete === AI_FRIENDS_BOT_ID) return;
    setIsDeleting(true);

    try {
        const chatObj = exploreUsers.find(u => u.id === chatToDelete);
        const isGroup = chatObj?.isGroup === true;
        await deleteConversationPermanently(currentUserProfile.id, chatToDelete, isGroup, false);

        if (setChats) {
          setChats(prev => prev.filter((c: any) => c.id !== chatToDelete));
        }

        setChatToDelete(null);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([50, 100, 50]);
        }
        toast.success("Chat permanently erased.");
    } catch (error: any) {
        toast.error(`Database Error: ${error.message}`);
        console.error(error);
    } finally {
        setIsDeleting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!currentUserProfile) return;

    const idsArray = Array.from(selectedChats).filter(id => id !== AI_FRIENDS_BOT_ID);
    for (const targetUserId of idsArray) {
        const chatObj = exploreUsers.find(u => u.id === targetUserId);
        const isGroup = chatObj?.isGroup === true;
        try {
            await deleteConversationPermanently(currentUserProfile.id, targetUserId, isGroup, false);
        } catch (error: any) {
            toast.error(`Database Error: ${error.message}`);
            console.error(error);
            return;
        }
    }

    if (setChats) {
      setChats(prev => prev.filter((c: any) => !idsArray.includes(c.id)));
    }
    setSelectedChats(new Set());
    setShowDeleteConfirm(false);
    setIsMultiSelectMode(false);
    setShowThreeDotMenu(false);
    toast.success("Chat history permanently erased.");
  };

  const handleSelectAll = () => {
    setSelectedChats(new Set(uniqueExploreUsers.filter(c => c.id !== AI_FRIENDS_BOT_ID).map(chat => chat.id)));
    setShowThreeDotMenu(false);
  };

  const handleClearSelection = () => {
    setSelectedChats(new Set());
    setShowThreeDotMenu(false);
  };

  const handleForwardProfile = async (profileId: string) => {
    const profileLink = `${window.location.origin}/profile/${profileId}`;
    await navigator.clipboard.writeText(profileLink);
    toast.success("Profile link copied to clipboard!");
    setShowThreeDotMenu(false);
  };

  const handleBlockUser = async (userIdToBlock: string) => {
    if (!currentUserProfile) return;
    const { error } = await supabase.from('blocked_users').insert({ blocker_id: currentUserProfile.id, blocked_id: userIdToBlock });
    if (error) {
      toast.error(`Database Error: ${error.message}`);
      console.error(error);
      return;
    }
    setShowThreeDotMenu(false);
    setSelectedChats(new Set());
    toast.success("User frozen.");
  };

  const handleReportUserSubmit = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (!reportCategory || !currentUserProfile) return;
    const finalReason = reportCategory === 'Other' ? reportDescription : reportCategory;

    const reportedId = Array.from(selectedChats)[0];
    const targetId = typeof reportedId === 'string' ? reportedId : (reportedId as any)?.id;

    if (!targetId) {
      toast.error("Invalid target user ID.");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();

    const formData = new FormData();
    formData.append('reportedUserId', targetId);
    formData.append('reason', finalReason);
    formData.append('contentType', 'user');
    if (session?.user?.id) formData.append('reporterId', session.user.id);
    if (session?.access_token) formData.append('accessToken', session.access_token);

    const result = await submitUserReport(formData);

    if (!result.success) {
      toast.error(`Report Failed: ${result.error}`);
      console.error(result.error);
      return;
    }
    toast.success('Report submitted securely');

    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-[#111] shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-white/10`}>
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <ShieldCheck className="text-emerald-500" size={24} />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-white">Report secured.</p>
              <p className="mt-1 text-sm text-gray-400">Trust & Safety notified.</p>
            </div>
          </div>
        </div>
      </div>
    ));

    setShowReportModal(false);
    setShowThreeDotMenu(false);
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
              <button onClick={() => { handleDeleteSelected(); if (navigator.vibrate) navigator.vibrate(20); }} className="text-rose-500 hover:bg-rose-500/20 p-2.5 rounded-full transition-colors active:scale-90"><Trash2 size={20} /></button>
              <button onClick={() => { handleBulkMute(); if (navigator.vibrate) navigator.vibrate(15); }} className="text-white hover:bg-white/10 p-2.5 rounded-full transition-colors active:scale-90">
                {Array.from(selectedChats).every(id => mutedChats.has(id)) ? <BellOff size={20} /> : <Bell size={20} />}
              </button>
              <button onClick={() => { setShowThreeDotMenu(!showThreeDotMenu); if (navigator.vibrate) navigator.vibrate(10); }} className="text-white hover:bg-white/10 p-2.5 rounded-full transition-colors active:scale-90"><MoreVertical size={20} /></button>

              {showThreeDotMenu && (
                <div className="fixed inset-0 z-[9999] w-[100vw] h-[100vh]">
                  <div
                    className="absolute inset-0 w-full h-full cursor-default"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowThreeDotMenu(false); }}
                  />
                  <div className="absolute right-4 top-16 z-[10000] bg-[#050505]/95 backdrop-blur-3xl border border-white/10 shadow-2xl rounded-2xl p-2 min-w-[200px]">
                    <div className="flex flex-col">
                      <button onClick={handleSelectAll} className="px-5 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors duration-200 text-left rounded-lg">Select All</button>
                      <button onClick={handleClearSelection} className="px-5 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors duration-200 text-left rounded-lg">Clear Selection</button>
                      <div className="h-px bg-white/10 my-1 mx-2" />
                      <button onClick={() => handleBlockUser(Array.from(selectedChats)[0])} className="px-5 py-3 text-sm font-black text-rose-500 hover:bg-rose-500/10 transition-colors duration-200 text-left rounded-lg">Block User</button>
                      <button onClick={() => { setShowThreeDotMenu(false); setShowReportModal(true); }} className="px-5 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors duration-200 text-left rounded-lg">Report Trust & Safety</button>
                      <button onClick={() => handleForwardProfile(Array.from(selectedChats)[0])} className="px-5 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors duration-200 text-left rounded-lg">Forward Profile</button>
                    </div>
                  </div>
                </div>
              )}
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
          {(['All', 'Requests', 'Unread', 'Groups', 'VIP'] as const).map(filter => {
            const isRequestsTab = filter === 'Requests';
            const reqCount = incomingRequests.length;
            return (
              <button
                key={filter}
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(10);
                  setActiveFilter(filter);
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border flex items-center gap-1.5 ${
                  activeFilter === filter
                    ? 'bg-fuchsia-500 border-fuchsia-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.4)]'
                    : isRequestsTab && reqCount > 0
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                {isRequestsTab && <Heart size={12} className={reqCount > 0 ? 'fill-rose-500 text-rose-500' : ''} />}
                <span>{filter}</span>
                {isRequestsTab && reqCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black min-w-[18px] text-center shadow-[0_0_8px_rgba(244,63,94,0.6)]">
                    {reqCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    // PHASE 1: Permanently pin AI Friends chat at the very top of the Chat List for every account
    const aIsAiFriend = a.id === AI_FRIENDS_BOT_ID;
    const bIsAiFriend = b.id === AI_FRIENDS_BOT_ID;
    if (aIsAiFriend && !bIsAiFriend) return -1;
    if (!aIsAiFriend && bIsAiFriend) return 1;

    const aPinned = pinnedChats.has(a.id);
    const bPinned = pinnedChats.has(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return (b.lastMessageTime || 0) - (a.lastMessageTime || 0);
  });

  const filteredRequests = incomingRequests.filter(req => {
    if (!searchQuery.trim()) return true;
    const name = req.senderProfile?.name || req.senderProfile?.username || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const showRequestsSection =
    (activeFilter === 'All' && filteredRequests.length > 0) ||
    activeFilter === 'Requests';

  return (
    <div className="flex flex-col h-full bg-[#050505] select-none" style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}>
      {TopBar}

      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full pb-20 scrollbar-hide">
        {/* PHASE 3: INCOMING LOVE / CONNECTION REQUESTS SECTION */}
        {showRequestsSection && (
          <div className="w-full px-4 pt-3 pb-2 border-b border-white/10 bg-gradient-to-b from-rose-500/10 via-fuchsia-500/5 to-transparent">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
                  <Heart size={13} className="text-rose-400 fill-rose-400" />
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Connection Requests
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black shadow-[0_0_10px_rgba(244,63,94,0.5)]">
                  {filteredRequests.length}
                </span>
              </div>
              <span className="text-[11px] text-white/50 font-medium">
                Tap profile to inspect before accepting
              </span>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="py-10 text-center text-white/40 text-sm font-medium">
                No pending Love requests right now.
              </div>
            ) : (
              <div className="space-y-2.5 mb-2">
                {filteredRequests.map((req) => {
                  const sender = req.senderProfile;
                  const senderName = sender?.name || sender?.username || 'User';
                  const senderAvatar = sender?.avatar_url;
                  const senderVerified = isRealVerified(sender);
                  const senderVip = isRealVip(sender);
                  const senderPremium = isRealPremium(sender);
                  const isBusy = processingRequestId === req.id;

                  return (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="w-full rounded-2xl bg-[#111418]/95 border border-rose-500/30 p-3.5 shadow-[0_8px_25px_rgba(0,0,0,0.5)] flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        {/* Clickable Avatar & Name for Mandatory Profile Inspection */}
                        <div
                          onClick={() => onInspectRequesterProfile?.(req)}
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
                        >
                          <div className="relative w-12 h-12 rounded-full overflow-hidden bg-white/10 border-2 border-rose-500/50 flex-shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform">
                            {senderAvatar ? (
                              <img src={senderAvatar} alt={senderName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white font-black text-base">
                                {senderName.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-extrabold text-white truncate group-hover:text-rose-300 transition-colors">
                                {senderName}
                              </span>
                              {senderVerified && <VerifiedBadge />}
                              {senderVip && (
                                <span className="text-[9px] bg-gradient-to-r from-amber-400 to-yellow-500 text-black px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest">
                                  VIP
                                </span>
                              )}
                              {!senderVip && senderPremium && (
                                <span className="text-[9px] bg-gradient-to-r from-amber-400 to-yellow-500 text-black px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest">
                                  PREMIUM
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-rose-300/90 truncate font-medium mt-0.5">
                              Sent you a Love request ❤️
                              {sender?.country ? ` • ${sender.country}` : ''}
                              {sender?.age ? `, ${sender.age}` : ''}
                            </p>
                          </div>
                        </div>

                        {/* Explicit View Profile Button */}
                        <button
                          type="button"
                          onClick={() => onInspectRequesterProfile?.(req)}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] font-bold text-white/90 flex items-center gap-1.5 transition-all active:scale-95 flex-shrink-0"
                        >
                          <Eye size={13} className="text-fuchsia-400" />
                          <span>View Profile</span>
                        </button>
                      </div>

                      {/* Accept & Decline Action Buttons */}
                      <div className="flex items-center gap-2.5 pt-1">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={async () => {
                            if (!onAcceptRequest) return;
                            setProcessingRequestId(req.id);
                            try {
                              await onAcceptRequest(req);
                            } finally {
                              setProcessingRequestId(null);
                            }
                          }}
                          className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <Check size={15} strokeWidth={3} />
                          <span>{isBusy ? 'Accepting...' : 'Accept'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={async () => {
                            if (!onDeclineRequest) return;
                            setProcessingRequestId(req.id);
                            try {
                              await onDeclineRequest(req);
                            } finally {
                              setProcessingRequestId(null);
                            }
                          }}
                          className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/40 text-white/80 hover:text-rose-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <X size={15} />
                          <span>Decline</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {isLoading ? (
            <div className="flex flex-col w-full px-4 pt-4 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 animate-pulse">
                  <div className="w-14 h-14 bg-white/5 rounded-full shrink-0"></div>
                  <div className="flex-1 space-y-3 py-1">
                    <div className="h-3 bg-white/5 rounded w-3/4"></div>
                    <div className="h-2 bg-white/5 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
        ) : activeFilter !== 'Requests' ? (
        <AnimatePresence>
          {sortedUsers.map((u) => {
            const isAiFriendsChat = u.id === AI_FRIENDS_BOT_ID;
            // PHASE 5: STRICT REAL BADGE CHECK (No fake PREMIUM or VIP on free users)
            const isVipUser = isRealVip(u);
            const isPremiumUser = isRealPremium(u);
            const hasRealUpgrade = isVipUser || isPremiumUser;
            const hasRealVerified = isRealVerified(u);

            // UNIFIED BOT IDENTITY
            let displayName = isAiFriendsChat
              ? 'AI Friends'
              : (u?.name || (u as any)?.username || (u as any)?.participants?.[0]?.username || "Unknown User");
            if (u.is_bot && !isAiFriendsChat) {
                const storedBotName = typeof window !== 'undefined' ? localStorage.getItem(`bot_name_${u.id}`) : null;
                if (storedBotName) {
                    displayName = storedBotName;
                }
            }

            return (
              <div key={u.id} className="relative w-full overflow-hidden border-b border-white/5 shadow-inner bg-[#050505]">
                {/* Background actions layer */}
                {!isAiFriendsChat && (
                  <div className="absolute inset-0 flex z-0">
                     {/* Left side: Mute/Unmute (Yellow) */}
                     <div className="w-1/2 h-full bg-amber-500/20 flex items-center justify-start px-6">
                       {mutedChats.has(u.id) ? <Bell size={24} className="text-amber-500 drop-shadow-md" /> : <BellOff size={24} className="text-amber-500 drop-shadow-md" />}
                     </div>
                     {/* Right side: Delete (Red) */}
                     <div className="w-1/2 h-full bg-rose-600/90 flex items-center justify-end px-6">
                       <Trash2 size={24} className="text-white drop-shadow-md" />
                     </div>
                  </div>
                )}

              <motion.div
                layout
                drag={isAiFriendsChat ? false : "x"}
                dragConstraints={{ left: -100, right: 100 }}
                onDragEnd={(e, info) => {
                  if (isAiFriendsChat) return;
                  if (info.offset.x < -70) {
                    setChatToDelete(u.id);
                  } else if (info.offset.x > 70) {
                    const newMuted = new Set(mutedChats);
                    if (newMuted.has(u.id)) {
                      newMuted.delete(u.id);
                      toast.success("Chat unmuted.");
                    } else {
                      newMuted.add(u.id);
                      toast.success("Chat muted.");
                    }
                    saveMutedChats(newMuted);
                    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                  }
                }}
                whileDrag={{ scale: 0.98 }}
                dragSnapToOrigin={true}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`w-full relative z-10 bg-[#050505] ${localBlockedUserIds.has(u.id) ? 'opacity-50 grayscale transition-all' : ''}`}
              >
                <div
                  className={`flex items-center w-full px-4 py-3.5 hover:bg-white/5 transition-all duration-300 cursor-pointer group touch-manipulation pointer-events-auto relative z-10 border-b border-white/5 select-none ${
                    isAiFriendsChat ? 'bg-gradient-to-r from-fuchsia-500/10 via-purple-500/5 to-transparent' : ''
                  } ${selectedChats.has(u.id) ? 'bg-fuchsia-500/10 border-transparent scale-[0.98] rounded-2xl my-1 shadow-inner' : ''}`}
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
                      if ((currentUserProfile as any)?.isVerified === false && !isAiFriendsChat) {
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
                  {isMultiSelectMode && !isAiFriendsChat && (
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

                      if (activeStatusUsers.has(u.id)) {
                        const userStatuses = userStatusMap.get(u.id) || [];
                        if (userStatuses.length > 0) {
                          onStatusClick(u.id, [], u);
                          return;
                        }
                      }

                      setHdViewerUser(u);
                    }}
                  >
                    <div className={`relative w-[64px] h-[64px] rounded-full flex-shrink-0 flex items-center justify-center shadow-xl transition-transform active:scale-90 ${
                      activeStatusUsers.has(u.id) && (userStatusMap.get(u.id) || []).length > 0
                        ? 'p-[3px] bg-gradient-to-tr from-fuchsia-500 via-rose-500 to-amber-400 shadow-[0_0_20px_rgba(217,70,239,0.5)]'
                        : isAiFriendsChat
                        ? 'p-[2px] bg-gradient-to-tr from-fuchsia-500 via-purple-500 to-cyan-400 shadow-[0_0_15px_rgba(217,70,239,0.4)]'
                        : (hasRealUpgrade ? 'p-[2px]' : 'border-2 border-white/10 bg-white/5')
                    }`}>
                      {hasRealUpgrade && (
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
                      <h3 className={`text-[15px] truncate flex items-center gap-1 ${
                        isAiFriendsChat || u.is_bot ? 'bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 via-purple-400 to-cyan-400 drop-shadow-[0_0_10px_rgba(232,121,249,0.8)] font-extrabold' :
                        hasRealUpgrade ? 'bg-gradient-to-r from-fuchsia-400 via-pink-400 to-amber-400 bg-clip-text text-transparent font-black drop-shadow-md' : 'text-white font-bold'
                      }`}>
                        {displayName}
                        {hasRealVerified ? <VerifiedBadge /> : null}
                      </h3>
                      {isAiFriendsChat && (
                        <span className="text-[9px] bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300 px-2 py-0.5 rounded-full font-black uppercase tracking-widest flex items-center gap-1 flex-shrink-0">
                          <Sparkles size={10} /> AI Companion
                        </span>
                      )}
                      {/* PHASE 5: Render VIP / PREMIUM badge ONLY when user has real DB upgrade */}
                      {isVipUser ? (
                        <span className="text-[9px] bg-gradient-to-r from-amber-400 to-yellow-500 text-black px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-[0_0_10px_rgba(251,191,36,0.4)] flex-shrink-0">
                          VIP
                        </span>
                      ) : isPremiumUser ? (
                        <span className="text-[9px] bg-gradient-to-r from-amber-400 to-yellow-500 text-black px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-[0_0_10px_rgba(251,191,36,0.4)] flex-shrink-0">
                          PREMIUM
                        </span>
                      ) : null}
                      {localBlockedUserIds.has(u.id) && (
                        <span className="ml-2 px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/30 text-[9px] text-red-500 font-bold uppercase tracking-widest flex-shrink-0">Restricted</span>
                      )}
                    </div>
                    <p className="text-[13px] text-white/50 truncate mt-1 font-medium">
                      {isAiFriendsChat
                        ? 'Your 24/7 AI Companion • Tap to chat anytime'
                        : `Tap to chat with ${displayName}`}
                    </p>
                  </div>

                  <div className="flex flex-col items-end justify-center ml-3 flex-shrink-0 space-y-2 pointer-events-none">
                    <span className="text-[11px] text-white/40 font-bold tracking-wider">
                      {isAiFriendsChat ? 'Pinned' : u.isOnline ? 'Now' : '1h'}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      {(isAiFriendsChat || pinnedChats.has(u.id)) && <Pin size={14} className={isAiFriendsChat ? "text-fuchsia-400 rotate-45" : "text-white/40 rotate-45"} />}
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
              </div>
            );
          })}
        </AnimatePresence>
        ) : null}
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

      <AnimatePresence>
        {chatToDelete && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#0a0a0a] border border-red-500/30 p-6 rounded-3xl w-full max-w-sm shadow-[0_0_40px_rgba(239,68,68,0.15)] flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                <Trash2 size={32} className="text-red-500 drop-shadow-md" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Permanently Delete Chat?</h3>
              <p className="text-sm text-white/60 mb-6">
                This action cannot be undone. All message history will be permanently erased from the database.
              </p>

              <div className="flex w-full gap-3">
                <button
                  disabled={isDeleting}
                  onClick={() => setChatToDelete(null)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-bold transition-all text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={isDeleting}
                  onClick={confirmPermanentDelete}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl text-white font-bold transition-all text-sm shadow-[0_0_15px_rgba(239,68,68,0.4)] disabled:opacity-50 flex items-center justify-center"
                >
                  {isDeleting ? (
                    <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                  ) : (
                    "Yes, Erase"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mb-4">
                  <ShieldAlert size={32} className="text-rose-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Report User</h3>
                <p className="text-sm text-white/60 mb-6">
                  This report will be sent to the HorPal Trust & Safety team.
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {['Spam or scam', 'Inappropriate content', 'Harassment', 'Other'].map(reason => (
                  <button
                    key={reason}
                    onClick={() => setReportCategory(reason)}
                    className={`w-full py-3 px-4 rounded-xl text-sm font-medium transition-all text-left ${reportCategory === reason ? 'bg-rose-500 text-white border border-rose-400/50' : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'}`}
                  >
                    {reason}
                  </button>
                ))}
                <AnimatePresence>
                  {reportCategory === 'Other' && (
                    <motion.textarea
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: '120px', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      className="w-full mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-fuchsia-500 resize-none transition-all"
                      placeholder="Type your exact reason here..."
                    />
                  )}
                </AnimatePresence>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowReportModal(false); setReportCategory(''); setReportDescription(''); }}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-bold transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  disabled={reportCategory === "" || (reportCategory === 'Other' && reportDescription.trim() === "")}
                  onClick={async (e) => {
                    if (reportCategory === "" || (reportCategory === 'Other' && reportDescription.trim() === "")) {
                      toast.error('Please provide a reason');
                      return;
                    }
                    handleReportUserSubmit(e);
                  }}
                  className={`flex-1 py-3 rounded-xl text-white font-bold transition-all text-sm shadow-[0_0_15px_rgba(244,63,94,0.4)] ${
                    (reportCategory === "" || (reportCategory === 'Other' && reportDescription.trim() === ""))
                      ? 'bg-rose-600/50 cursor-not-allowed text-white/50'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {isSubmittingReport ? 'Reporting...' : 'Submit Report'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
