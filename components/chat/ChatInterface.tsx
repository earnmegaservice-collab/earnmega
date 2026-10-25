'use client';

import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useWallet } from "../../context/WalletContext";
import { useCall } from "../../context/CallContext";
import { useAuth } from "../../context/AuthContext";
import { UserProfileDetails } from "../../components/profile/UserProfileModal";
import { supabase } from "../../utils/supabase";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from 'framer-motion';
import { MediaPreview } from './MediaPreview';
import VerifiedBadge from '../ui/VerifiedBadge';
import { Camera, Mic, Gift, Send, Check, CheckCheck, Clock, Menu, Play, Pause, X, Store, Lock, EyeOff, Video, Phone, PhoneMissed, Users, MoreVertical, Search, Share, ShieldAlert, Trash2, Ban, Bookmark, ChevronRight, BellOff, Download, UserPlus, ArrowLeft, UserMinus } from 'lucide-react';
import { toast } from 'react-hot-toast';

const UserProfileModal = dynamic(() => import("../../components/profile/UserProfileModal"), { ssr: false });
const CoinStoreModal = dynamic(() => import("../../components/wallet/CoinStoreModal"), { ssr: false });
const GiftModal = dynamic(() => import("../../components/chat/GiftModal"), { ssr: false });
const NavigationDrawer = dynamic(() => import("../../components/chat/NavigationDrawer"), { ssr: false });
const StatusTab = dynamic(() => import("../../components/status/StatusTab"), { ssr: false });
const StatusViewer = dynamic(() => import("../../components/status/StatusViewer"), { ssr: false });
const ChatList = dynamic(() => import("./ChatList"), { ssr: false });
const MessageForwardModal = dynamic(() => import("./MessageForwardModal"), { ssr: false });
const CreateGroupModal = dynamic(() => import("./CreateGroupModal"), { ssr: false });
const GroupInfoDrawer = dynamic(() => import("./GroupInfoDrawer"), { ssr: false });

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'other';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  reactions: string[];
  imageUrl?: string;
  audioUrl?: string;
  replyToId?: string;
  replyToText?: string;
  replyToSender?: 'user' | 'other';
  isViewOnce?: boolean;
  viewedBy?: string[];
  isDeleted?: boolean;
  isSystemMessage?: boolean;
  systemEventType?: string;
  hiddenFor?: string[];
  messageType?: 'missed_call' | 'text' | 'image' | 'audio' | 'gift' | 'completed_call';
  duration?: string;
  giftName?: string;
  giftCost?: number;
}

const GOD_MODE = true;
const DEFAULT_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏'];

// Helper to parse basic formatting
const formatText = (text: string) => {
  // Simple regex for **bold**, *italic*, ~strikethrough~
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|~.*?~)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('~') && part.endsWith('~')) {
      return <del key={index} className="opacity-70">{part.slice(1, -1)}</del>;
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
};


const AudioPlayer = ({ src }: { src: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [durationStr, setDurationStr] = useState('Voice Note');
  const [currentStr, setCurrentStr] = useState('0:00');
  const audioRef = useRef<HTMLAudioElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const formatDuration = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      setProgress((current / total) * 100);
      setCurrentStr(formatDuration(current));
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && isFinite(audioRef.current.duration)) {
      setDurationStr(formatDuration(audioRef.current.duration));
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentStr('0:00');
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (audioRef.current && sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percentage = x / rect.width;
      const newTime = percentage * audioRef.current.duration;
      audioRef.current.currentTime = newTime;
      setProgress(percentage * 100);
    }
  };


  return (
    <div className="flex items-center space-x-3 w-[220px] bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-2.5 shadow-lg" onClick={e => e.stopPropagation()}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        className="hidden"
      />
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={togglePlay}
        className="w-10 h-10 shrink-0 bg-gradient-to-br from-indigo-500/80 to-purple-600/80 hover:from-indigo-400 hover:to-purple-500 rounded-full flex items-center justify-center transition-colors text-white shadow-md shadow-purple-500/20"
      >
        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
      </motion.button>
      <div className="flex-1 flex flex-col justify-center">
        <div
          ref={sliderRef}
          className="h-2 bg-black/40 rounded-full overflow-hidden mb-1.5 relative cursor-pointer group"
          onClick={handleSeek}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 absolute left-0 top-0 shadow-[0_0_10px_rgba(167,139,250,0.5)] rounded-full"
            style={{ width: `${progress}%` }}
            layout
          />
        </div>
        <div className="flex justify-between items-center text-[10px] text-white/70 font-bold tracking-wider">
          <span>{currentStr}</span>
          <span>{durationStr}</span>
        </div>
      </div>

      </div>
  );
};

import FacialVerification from '../profile/FacialVerification';

import ExploreFeed from '../explore/ExploreFeed';
import DiscoveryContainer from '../explore/DiscoveryContainer';
import MyProfileView from '../profile/MyProfileView';

import { User } from 'lucide-react';
export const renderMessageContent = (message: any, currentUserId: string) => {
  if (message.text && message.text.startsWith('$$PROFILE_SHARE$$')) {
     const sharedId = message.text.split('$$')[2];
     return (
        <div className="w-[250px] p-4 rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-fuchsia-600/20 border border-fuchsia-500 flex items-center justify-center shrink-0">
              <User className="text-fuchsia-500" size={24} />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Shared Contact</p>
              <p className="text-white/50 text-[10px] uppercase tracking-wider">Tap to view profile</p>
            </div>
          </div>
          <button onClick={() => window.dispatchEvent(new CustomEvent('open_profile', { detail: { id: sharedId } }))} className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-fuchsia-400 text-xs font-black tracking-widest uppercase transition-all">
            View Profile
          </button>
        </div>
     );
  }

  if (message.messageType === 'call_started') {
  return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col p-4 rounded-3xl bg-emerald-950/40 border border-emerald-500/40 w-[300px] my-3 backdrop-blur-xl shadow-2xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
             <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <Video size={24}/>
             </div>
             <div className="flex flex-col">
                <span className="text-emerald-400 font-extrabold text-[16px] tracking-wide">Call in Progress</span>
                <span className="text-emerald-300/60 text-xs font-medium mt-0.5 animate-pulse">Live now</span>
             </div>
          </div>

          <button
             onClick={() => window.dispatchEvent(new CustomEvent('join_call', { detail: { roomId: message.room_id || message.sender_id, type: 'video' } }))}
             className="w-full py-3.5 bg-emerald-500/20 hover:bg-emerald-500/40 rounded-2xl text-sm font-black text-emerald-300 transition-all active:scale-95 border border-emerald-500/30 uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
          >
             <Phone size={16} /> Join Call
          </button>
        </motion.div>
     );
  }

  if (message.messageType === 'completed_call') {

  return (
        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 backdrop-blur-md w-72 my-1">
           <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
               <Phone size={16} />
           </div>
           <div className="flex flex-col text-left">
               <span className="text-emerald-400 font-semibold text-sm">Call Ended</span>
               {message.duration && <span className="text-emerald-200/70 text-xs font-mono">{message.duration}</span>}
           </div>
        </div>
     );
  }
    if (message.messageType === 'missed_call') {

  return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between p-4 rounded-3xl bg-rose-950/40 border border-rose-500/40 w-80 my-2 backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-rose-500/20 rounded-2xl text-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.3)]"><PhoneMissed size={22}/></div>
             <div className="flex flex-col"><span className="text-rose-400 font-extrabold text-[15px] tracking-wide">Missed Call</span><span className="text-rose-300/60 text-xs font-medium mt-0.5">{new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
          </div>
          <button onClick={() => window.dispatchEvent(new CustomEvent('initiate_call', { detail: { id: message.sender_id, type: 'audio' } }))} className="px-5 py-2.5 bg-rose-500/20 hover:bg-rose-500/40 rounded-xl text-xs font-black text-rose-300 transition-all active:scale-95 border border-rose-500/30 uppercase tracking-widest shadow-md">Call Back</button>
        </motion.div>
     );
  }

  const isMe = message.sender === 'user';
  const rawContent = message.text || '';

  const isForwarded = rawContent.startsWith('[FORWARDED]\n');
  const displayContent = isForwarded ? rawContent.replace('[FORWARDED]\n', '') : rawContent;

  // Format check for status reply: [REPLY:statusId:mediaPreview] text
  const replyMatch = rawContent.match(/^\[REPLY:([^:]+):([^\]]+)\]\s*(.*)$/);

  if (replyMatch) {
    const [, statusId, mediaPreview, actualText] = replyMatch;


  return (
      <div className={`flex flex-col space-y-1.5 max-w-[80%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
        {isForwarded && (
          <span className="text-[10px] italic text-white/50 mb-1 flex items-center"><Send size={10} className="mr-1 inline" /> Forwarded</span>
        )}
        {/* Sleek status thumbnail reply card */}
        <div className="flex items-center space-x-2.5 p-2 rounded-2xl bg-white/[0.06] border border-white/15 backdrop-blur-2xl shadow-lg">
          <div className="w-10 h-12 rounded-lg overflow-hidden bg-black/50 border border-white/10 shrink-0">
            {mediaPreview && mediaPreview.startsWith('http') ? (
              <img src={mediaPreview} alt="Status thumbnail" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full p-1 bg-gradient-to-tr from-purple-800 to-indigo-900 flex items-center justify-center text-[7px] text-center font-bold text-white overflow-hidden">
                {mediaPreview ? mediaPreview.slice(0, 15) + '...' : 'Status'}
              </div>
            )}
          </div>
          <div className="pr-2">
            <span className="text-[10px] font-bold text-purple-400 block tracking-tight">Status Update</span>
            <span className="text-[11px] text-white/70 italic">Replying to status</span>
          </div>
        </div>

        {/* User response text */}
        {actualText && (
          <div className={`px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed break-words whitespace-pre-wrap font-medium shadow-[0_4px_16px_rgba(0,0,0,0.3)] ${
            isMe
              ? 'bg-white/10 backdrop-blur-xl border border-amber-500/20 text-white rounded-tr-sm'
              : 'bg-white/5 backdrop-blur-2xl text-gray-100 border border-white/10 rounded-tl-sm'
          }`}>
            {formatText(actualText)}
          </div>
        )}
      </div>
    );
  }

  // Regular standard chat message processing (handles bold, italic formatting from formatText)

  return (
    <div className="text-[15px] leading-relaxed break-words whitespace-pre-wrap font-medium">
      {isForwarded && (
        <span className="text-[10px] italic text-white/50 mb-1 flex items-center"><Send size={10} className="mr-1 inline" /> Forwarded</span>
      )}
      {formatText(displayContent)}

      </div>
  );
};


import { AppShell } from '../layout/AppShell';

export default function ChatInterface({ activeTab, setAppTab }: { activeTab: 'explore' | 'find' | 'chats' | 'status' | 'profile', setAppTab: (tab: 'explore' | 'find' | 'chats' | 'status' | 'profile') => void }) {
  const { subscriptionTier, balance, setBalance } = useWallet();
  const { initiateCall, joinCall } = useCall();
  useEffect(() => {
    const handleJoinCall = (e: CustomEvent) => {
       if (e.detail && e.detail.roomId) {
           joinCall(e.detail.roomId, e.detail.type || 'video');
       }
    };
    window.addEventListener('join_call', handleJoinCall as EventListener);
    return () => window.removeEventListener('join_call', handleJoinCall as EventListener);
  }, [joinCall]);

  const { user, isLoading } = useAuth();
  const [selectedProfile, setSelectedProfile] = useState<UserProfileDetails | null>(null);

  // Onboarding & Verification states
    const [needsVerification, setNeedsVerification] = useState(false);
  const [showVerificationGateModal, setShowVerificationGateModal] = useState(false);

  // Status State
  const [viewingStatuses, setViewingStatuses] = useState<{ groupId: string, statuses: any[], profile: any } | null>(null);
  const [userStatusMap, setUserStatusMap] = useState<Map<string, string[]>>(new Map());

  // Determine if a user's statuses are all viewed. Since activeStatusUsers just tells us they have one,
  // we might need to know if they have unviewed ones. For now, activeStatusUsers means they have *any* status in 24h.
  // A better check: userHasUnviewedStatus(userId). We need their status IDs.
  // Let's store a map of userId -> statusIds instead of just a Set.

  const [activeStatusUsers, setActiveStatusUsers] = useState<Set<string>>(new Set());
  const [viewedStatuses, setViewedStatuses] = useState<Set<string>>(new Set());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [storeTab, setStoreTab] = useState<'UPGRADES' | 'BUY_COINS'>('UPGRADES');
  const [isTierLockModalOpen, setIsTierLockModalOpen] = useState(false);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isGroupInfoDrawerOpen, setIsGroupInfoDrawerOpen] = useState(false);
  const [activeGift, setActiveGift] = useState<{ id: string, icon: React.ReactNode } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxMessageId, setLightboxMessageId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isViewOnceMode, setIsViewOnceMode] = useState(false);
  const [shatterEffectId, setShatterEffectId] = useState<string | null>(null);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  // Phase 4 states


const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);
  const [isGroupMoreMenuOpen, setIsGroupMoreMenuOpen] = useState(false);
  const [isExitGroupConfirmOpen, setIsExitGroupConfirmOpen] = useState(false);
  const [reportOnExit, setReportOnExit] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [activeWallpaper, setActiveWallpaper] = useState<string>('bg-[#050505]');
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [isBlockedByThem, setIsBlockedByThem] = useState(false);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportOtherText, setReportOtherText] = useState('');
  const [isForwardContactModalOpen, setIsForwardContactModalOpen] = useState(false);
  const [isClearChatConfirmOpen, setIsClearChatConfirmOpen] = useState(false);

  const [messageToForward, setMessageToForward] = useState<Message | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const channelRef = useRef<any>(null);

  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfileDetails | null>(null);











  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);






  const currentUserProfileRef = useRef(currentUserProfile);



  const fetchCurrentUserProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (!error && data) {
      if (data.has_completed_onboarding === false) {
                }

      // If completed onboarding but not verified
      if (data.has_completed_onboarding && data.is_verified === false) {
          setNeedsVerification(true);
      }

      setCurrentUserProfile({
        id: user.id,
        name: data.username || user.email?.split('@')[0] || 'User',
        avatarInitials: (data.username?.[0] || user.email?.[0] || 'U').toUpperCase() + (data.username?.[1] || user.email?.[1] || 'S').toUpperCase(),
        avatarUrl: data.avatar_url,
        bio: data.bio || 'Avid Earnmega user',
        joinDate: data.created_at ? new Date(data.created_at).toLocaleDateString() : 'Oct 2023',
        tier: subscriptionTier,
        phone: data.phone,
        isOnline: true,
        coinsGifted: data.coins_gifted || 0,
        isSelf: true,
        // Optional verification flag addition, can be useful later
        isVerified: data.is_verified,
        ghost_mode: data.ghost_mode || false,
      } as any);
    } else {
      setCurrentUserProfile({
        id: user.id,
        name: user.email?.split('@')[0] || 'User',
        avatarInitials: (user.email?.[0] || 'U').toUpperCase() + (user.email?.[1] || 'S').toUpperCase(),
        bio: 'Avid Earnmega user',
        joinDate: 'Oct 2023',
        tier: subscriptionTier,
        isOnline: true,
        coinsGifted: 1500,
        isSelf: true,
        ghost_mode: false,
      });
    }
  };

  useEffect(() => { fetchCurrentUserProfile(); }, [user, subscriptionTier]);


  // WebRTC configuration

















  const [otherUserProfile, setOtherUserProfile] = useState<UserProfileDetails | null>(null);
 

  const blockedUserIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fetchBlockedUsers = async () => {
       if (!user) return;
       const { data: blockedByMe } = await supabase.from('blocked_users').select('blocked_id').eq('blocker_id', user.id);
       const { data: blockedByThem } = await supabase.from('blocked_users').select('blocker_id').eq('blocked_id', user.id);

       const blockedIds = new Set<string>();
       if (blockedByMe) blockedByMe.forEach(b => blockedIds.add(b.blocked_id));
       if (blockedByThem) blockedByThem.forEach(b => blockedIds.add(b.blocker_id));
       blockedUserIdsRef.current = blockedIds;
    };
    fetchBlockedUsers();

    // Set up realtime listener for blocks (optional, but good for completeness)
    const channel = supabase.channel(`blocked_users_${user?.id}`)
       .on('postgres_changes', { event: '*', schema: 'public', table: 'blocked_users' }, () => {
           fetchBlockedUsers();
       })
       .subscribe();

    return () => {
       supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const checkBlocked = async () => {
       if (!otherUserProfile) {
           setIsBlockedByMe(false);
           setIsBlockedByThem(false);
           return;
       }
       if (blockedUserIdsRef.current.has(otherUserProfile.id)) {
           // Refetch specifically to determine who blocked who for the UI
           const { data: myBlock } = await supabase.from('blocked_users').select('*').eq('blocker_id', user?.id).eq('blocked_id', otherUserProfile.id).maybeSingle();
           if (myBlock) setIsBlockedByMe(true);
           else setIsBlockedByMe(false);

           const { data: theirBlock } = await supabase.from('blocked_users').select('*').eq('blocker_id', otherUserProfile.id).eq('blocked_id', user?.id).maybeSingle();
           if (theirBlock) setIsBlockedByThem(true);
           else setIsBlockedByThem(false);
       } else {
           setIsBlockedByMe(false);
           setIsBlockedByThem(false);
       }
    };
    checkBlocked();
  }, [user, otherUserProfile, blockedUserIdsRef.current]);

  // Phase 4 Load Wallpaper
  useEffect(() => {
    if (!otherUserProfile || !user) return;
    const key = `wallpaper_${user.id}_${otherUserProfile.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
       setActiveWallpaper(saved);
    } else {
       setActiveWallpaper('bg-[#050505]');
    }
  }, [otherUserProfile, user]);


  const toggleBlock = async () => {
     if (!user || !otherUserProfile) return;
     if (isBlockedByMe) {
        const { error } = await supabase.from('blocked_users').delete().eq('blocker_id', user.id).eq('blocked_id', otherUserProfile.id);
        if (error) {
           toast.error(`Database Error: ${error.message}`);
           console.error(error);
           return;
        }
        setIsBlockedByMe(false);
        toast.success('User unblocked');
     } else {
        const { error } = await supabase.from('blocked_users').insert({ blocker_id: user.id, blocked_id: otherUserProfile.id });
        if (error) {
           toast.error(`Database Error: ${error.message}`);
           console.error(error);
           return;
        }
        setIsBlockedByMe(true);
        toast.success('User blocked');
     }
  };

  const saveWallpaper = (val: string) => {
     setActiveWallpaper(val);
     if (user && otherUserProfile) {
        localStorage.setItem(`wallpaper_${user.id}_${otherUserProfile.id}`, val);
     }
  };



  const [exploreUsers, setExploreUsers] = useState<UserProfileDetails[]>([]);
  const [isChatsLoading, setIsChatsLoading] = useState(true);
  const [chatsFetchError, setChatsFetchError] = useState<any>(null);
  const [refreshChatsKey, setRefreshChatsKey] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);


  useEffect(() => {
    if (!user) return;

    const fetchGlobalStatuses = async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('statuses')
        .select('id, user_id')
        .gt('created_at', twentyFourHoursAgo);

      if (!error && data) {
        const usersWithStatuses = new Set<string>();
        const statusMap = new Map<string, string[]>();
        data.forEach(s => {
          usersWithStatuses.add(s.user_id);
          if (!statusMap.has(s.user_id)) statusMap.set(s.user_id, []);
          statusMap.get(s.user_id)!.push(s.id);
        });
        setActiveStatusUsers(usersWithStatuses);
        setUserStatusMap(statusMap);
      }
    };

    const fetchViewedStatuses = async () => {
      const { data, error } = await supabase
        .from('status_views')
        .select('status_id')
        .eq('user_id', user.id);

      if (!error && data) {
        const viewed = new Set<string>();
        data.forEach(v => viewed.add(v.status_id));
        setViewedStatuses(viewed);
      }
    };

    fetchGlobalStatuses();
    fetchViewedStatuses();

    const uniqueStatusesChannel = `global-status-updates-${Date.now()}`;
    const statusesChannel = supabase.channel(uniqueStatusesChannel)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'statuses' }, () => {
        fetchGlobalStatuses();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'status_views', filter: `user_id=eq.${user.id}` }, () => {
        fetchViewedStatuses();
      })
      .subscribe();


  return () => {
      supabase.removeChannel(statusesChannel);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // For presence, we must use a shared channel name
    const presenceChannel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const newState = presenceChannel.presenceState();
        const users = new Set<string>();
        Object.keys(newState).forEach(key => users.add(key));
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.add(key);
          return newSet;
        });
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ online_at: new Date().toISOString() });
        }
      });


  return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channelId = `chat-updates-${Date.now()}`;
    // Using a more complex filter with postgres_changes isn't natively supported for full .or() strings via realtime filter param natively (it only supports simple eq).
    // We filter inside the callback to emulate the exact strict `or` condition for isolation.
    const channel = supabase.channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload: any) => {
          if (payload.new) {
              const msg = payload.new;
              const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
              if (otherId && blockedUserIdsRef.current.has(otherId)) return;

              // Strict isolation check to prevent data bleed from other bot chats
              // Only refresh if the message involves the current user and the current viewing profile (if not a group)
              let isRelevant = false;
              if (currentOtherUserProfile && !(currentOtherUserProfile as any).isGroup) {
                  isRelevant = (msg.sender_id === user.id && msg.receiver_id === currentOtherUserProfile.id) ||
                               (msg.sender_id === currentOtherUserProfile.id && msg.receiver_id === user.id);
              } else if (currentOtherUserProfile && (currentOtherUserProfile as any).isGroup) {
                  isRelevant = msg.room_id === currentOtherUserProfile.id;
              } else {
                  // Fallback for general updates (e.g. ChatList) if no specific profile is focused
                  isRelevant = msg.receiver_id === user.id || msg.sender_id === user.id || msg.room_id;
              }

              if (isRelevant) {
                  setRefreshChatsKey(prev => prev + 1);
              }
          }
      })
      .subscribe();


  return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Dynamically derive `isOnline` for `currentOtherUserProfile` based on `onlineUsers` state
  const currentOtherUserProfile = otherUserProfile ? {
    ...otherUserProfile,
    isOnline: onlineUsers.has(otherUserProfile.id)
  } : null;

  useEffect(() => {
    if (currentOtherUserProfile === null) {
      const fetchExploreUsers = async () => {
        if (!user) return;
        setIsChatsLoading(true);
        setChatsFetchError(null);
        try {
          // 1. Fetch Groups the user is part of
          const { data: groupsData, error: groupsError } = await supabase
              .from('room_participants')
              .select('room_id, rooms ( id, name, created_at )')
              .eq('user_id', user.id);

          if (groupsError) throw groupsError;

          const groupsFormatted = (groupsData && !groupsError) ? groupsData.map((gm: any) => ({
               id: gm.rooms.id,
               name: gm.rooms.name,
               avatarInitials: (gm.rooms.name?.[0] || 'G').toUpperCase() + (gm.rooms.name?.[1] || 'R').toUpperCase(),
               bio: 'Group Chat',
               joinDate: new Date(gm.rooms.created_at).toLocaleDateString(),
               tier: 'FREE' as const,
               isOnline: true,
               coinsGifted: 0,
               isSelf: false,
               isGroup: true,
               unreadCount: 0,
               lastMessageTime: 0
          })) : [];

          // 2. Fetch Direct Messages (chats)
          const { data: chatsData, error: chatsError } = await supabase
            .from('chats')
            .select('id, user1_id, user2_id, updated_at, unread_count, latest_message_id, user1:profiles!chats_user1_id_fkey(*), user2:profiles!chats_user2_id_fkey(*)')
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
            .order('updated_at', { ascending: false });

          const statsMap = new Map<string, { unreadCount: number, lastMessageTime: number }>();
          let formattedProfiles: UserProfileDetails[] = [];

          if (chatsData && chatsData.length > 0) {
            chatsData.forEach(chat => {
              const user1Obj = Array.isArray(chat.user1) ? chat.user1[0] : chat.user1;
              const user2Obj = Array.isArray(chat.user2) ? chat.user2[0] : chat.user2;

              const otherUser = chat.user1_id === user.id ? user2Obj : user1Obj;
              if (otherUser) {
                  const time = chat.updated_at ? new Date(chat.updated_at).getTime() : 0;
                  statsMap.set(otherUser.id, {
                      unreadCount: chat.unread_count || 0,
                      lastMessageTime: time
                  });
                  formattedProfiles.push({
                      id: otherUser.id,
                      name: otherUser.username || otherUser.name || 'User',
                      avatarInitials: (otherUser.username || otherUser.name || 'U').substring(0, 2).toUpperCase(),
                      avatarUrl: otherUser.avatar_url,
                      bio: otherUser.bio || 'Earnmega user',
                      joinDate: otherUser.created_at ? new Date(otherUser.created_at).toLocaleDateString() : 'Unknown',
                      tier: otherUser.subscription_tier || 'FREE',
                      isOnline: onlineUsers.has(otherUser.id),
                      coinsGifted: otherUser.coins_gifted || 0,
                      isSelf: false,
                      unreadCount: chat.unread_count || 0,
                      lastMessageTime: time
                  });
              }
            });
          }

          // 3. Fetch Unread Counters and Latest Message Time for Groups correctly
          if (groupsFormatted.length > 0) {
              const groupIds = groupsFormatted.map(g => g.id);
              const { data: messagesData, error: msgError } = await supabase
                .from('messages')
                .select('id, sender_id, receiver_id, room_id, created_at, status, is_read')
                .in('room_id', groupIds)
                .order('created_at', { ascending: false })
                .limit(500);

              if (!msgError && messagesData) {
                messagesData.forEach(msg => {
                  const targetId = msg.room_id;
                  if (!targetId) return;

                  const time = new Date(msg.created_at).getTime();
                  // Correct unread logic using read-receipt/status
                  const isUnread = msg.sender_id !== user.id && (msg.is_read === false || (msg.is_read == null && msg.status !== 'read'));

                  if (!statsMap.has(targetId)) {
                    statsMap.set(targetId, { unreadCount: 0, lastMessageTime: 0 });
                  }

                  const stats = statsMap.get(targetId)!;
                  stats.lastMessageTime = Math.max(stats.lastMessageTime, time);
                  if (isUnread) {
                    stats.unreadCount += 1;
                  }
                });
              }
          }

          // 4. Fallback for new users (Discovery)
          if (formattedProfiles.length === 0) {
              const { data: defaultProfiles, error: defaultError } = await supabase
                .from('profiles')
                .select('*')
                .neq('id', user.id)
                .order('updated_at', { ascending: false })
                .limit(20);

              if (!defaultError && defaultProfiles) {
                  formattedProfiles = defaultProfiles.map(u => ({
                      id: u.id,
                      name: u.username || u.name || 'User',
                      avatarInitials: (u.username || u.name || 'U').substring(0, 2).toUpperCase(),
                      avatarUrl: u.avatar_url,
                      bio: u.bio || 'Earnmega user',
                      joinDate: u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Unknown',
                      tier: u.subscription_tier || 'FREE',
                      isOnline: onlineUsers.has(u.id),
                      coinsGifted: u.coins_gifted || 0,
                      isSelf: false,
                      unreadCount: 0,
                      lastMessageTime: 0
                  }));
              }
          }

          // 5. Unify and Sort WhatsApp Style (newest activity at the absolute top)
          let allUsers = [...groupsFormatted, ...formattedProfiles];

          allUsers = allUsers.map(u => {
             const stats = statsMap.get(u.id);
             if (stats) {
               return { ...u, unreadCount: stats.unreadCount, lastMessageTime: stats.lastMessageTime };
             }
             return u;
          });

          // Sort strictly by lastMessageTime DESCENDING
          allUsers.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

          setExploreUsers(allUsers);
        } catch (error) {
          console.error("Failed to fetch chats:", error);
          setChatsFetchError(error);
        } finally {
          setIsChatsLoading(false);
        }
      };
      fetchExploreUsers();
    }
  }, [currentOtherUserProfile, user?.id, onlineUsers, refreshChatsKey]);

  useEffect(() => {
    async function fetchMessages() {
      if (!currentOtherUserProfile || !user) return;
      setIsLoadingMessages(true);
      try {
        let query = supabase.from('messages').select('*');

        if ((currentOtherUserProfile as any).isGroup) {
             query = query.eq('room_id', currentOtherUserProfile.id);
        } else {
             query = query.or(`and(sender_id.eq.${user.id},receiver_id.eq.${currentOtherUserProfile.id}),and(sender_id.eq.${currentOtherUserProfile.id},receiver_id.eq.${user.id})`);
        }

        query = query.order('created_at', { ascending: true });

        const { data, error } = await query;

        if (error) {
          console.error("Failed to fetch messages", error);
          setMessages([]);
          return;
        }

        if (data && data.length > 0) {
          const formattedMessages: Message[] = data.map(msg => {
            let text = msg.content || '';
            let replyToId, replyToSender, replyToText;

            const replyMatch = text.match(/^\[REPLY:(.*?):(user|other):(.*?)\]\n\n/);
            if (replyMatch) {
               replyToId = replyMatch[1];
               // Ensure correct reply sender attribution relative to current viewing user
               replyToSender = replyMatch[2] === (msg.sender_id === user.id ? 'user' : 'other') ? 'user' : 'other';
               replyToText = replyMatch[3];
               text = text.replace(/^\[REPLY:.*?\]\n\n/, '');
            }

            return {
              id: msg.id,
              text,
              sender:
 msg.sender_id === user.id ? 'user' : 'other',
              timestamp: new Date(msg.created_at),
              reactions: [],
              status: msg.status || 'read',
              imageUrl: msg.image_url,
              audioUrl: msg.audio_url,
              replyToId,
              replyToSender,
              replyToText,
              isSystemMessage: msg.is_system_message || false,
              systemEventType: msg.system_event_type || null
            };
          });

          setMessages(formattedMessages);

          // Mark unread messages from the other user as read
          const unreadMessageIds = data
            .filter(msg => msg.sender_id === currentOtherUserProfile.id && msg.status !== 'read')
            .map(msg => msg.id);

          // Clear local unread badge count unconditionally when opening chat
          setExploreUsers(prev => prev.map(u =>
            u.id === currentOtherUserProfile.id ? { ...u, unreadCount: 0 } : u
          ));

          if (unreadMessageIds.length > 0) {
            await supabase
              .from('messages')
              .update({ status: 'read', is_read: true })
              .in('id', unreadMessageIds);

            // Broadcast read status
            channelRef.current?.send({
               type: 'broadcast',
               event: 'messages_read',
               payload: { readerId: user.id, senderId: currentOtherUserProfile.id }
            });
          }
        } else {
          setMessages([]);
        }
      } catch (e) {
        console.error("Error fetching messages", e);
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    }

    fetchMessages();
  }, [currentOtherUserProfile?.id, user?.id]);

  const openProfile = (userProfile: UserProfileDetails) => {
    setSelectedProfile(userProfile);
    setIsProfileOpen(true);
  };
  const [inputValue, setInputValue] = useState('');
  const [activeReactionId, setActiveReactionId] = useState<string | null>(null);
  const [activeContextMenuId, setActiveContextMenuId] = useState<string | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaCaption, setMediaCaption] = useState<string>('');


  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // For broadcast, we must use a shared channel name
    const channel = supabase.channel('chat-events')
      .on('broadcast', { event: 'gift_received' }, (payload) => {
        // SECURITY GATE: Before mounting the 3D portal or inserting the receipt into the chat feed,
        // verify that the authenticated user's ID exactly matches either the sender_id or receiver_id.
        // If it does not match, ignore the payload entirely.
        if (currentUserProfile?.id !== payload.payload.senderId && currentUserProfile?.id !== payload.payload.receiverId) {
          return; // Ignore entirely if not sender or receiver
        }

        if (payload.payload.senderId !== currentUserProfile?.id) {
          // Trigger local animation via custom event so GiftOverlay can pick it up instantly for the receiver
          const customEvent = new CustomEvent('gift_received_local', { detail: { giftData: payload.payload.gift_type, senderId: payload.payload.senderId, receiverId: payload.payload.receiverId } });
          window.dispatchEvent(customEvent);

          const newMessage: Message = {
            id: Date.now().toString(),
            text: `Received a ${payload.payload.gift_type.name} (${payload.payload.gift_type.cost} Coins)`,
            sender: 'other',
            timestamp: new Date(),
            reactions: [],
            messageType: 'gift',
            giftName: payload.payload.gift_type.name,
            giftCost: payload.payload.gift_type.cost,
          };

          // Only add to chat feed if the current active chat is with the sender
          if (currentOtherUserProfile?.id === payload.payload.senderId) {
             setMessages((prev) => [...prev, newMessage]);
          }
        }
      })
      .on('broadcast', { event: 'new_message' }, async (payload) => {
        if (payload.payload.senderId && blockedUserIdsRef.current.has(payload.payload.senderId)) return;

        const isToMe = payload.payload.receiverId === currentUserProfile?.id;
        const isFromOtherToMe = isToMe && payload.payload.senderId === currentOtherUserProfile?.id;
        const isGroupMatch = payload.payload.roomId && currentOtherUserProfile?.id === payload.payload.roomId;

        // Strict isolation check to prevent cross-contamination from other chats/bots
        // We only append to the active message list if it exactly matches our current active 1-on-1 or group.
        if (isFromOtherToMe || isGroupMatch || (isToMe && !currentOtherUserProfile)) {
          // Fetch the message from DB to get full details
          const { data, error } = await supabase
             .from('messages')
             .select('*')
             .eq('id', payload.payload.messageId)
             .single();

          if (!error && data) {
             let text = data.content || '';
             let replyToId, replyToSender, replyToText;

             const replyMatch = text.match(/^\[REPLY:(.*?):(user|other):([\s\S]*?)\]\n\n/);
             if (replyMatch) {
               replyToId = replyMatch[1];
               replyToSender = 'other'; // if it's incoming, the original msg was sent by us
               if (replyMatch[2] === 'other') replyToSender = 'user';
               replyToText = replyMatch[3];
               text = text.replace(/^\[REPLY:[\s\S]*?\]\n\n/, '');
             }

             const newMessage: Message = {
               id: data.id,
               text,
               sender: 'other',
               timestamp: new Date(data.created_at),
               reactions: [],
               status: 'delivered',
               imageUrl: data.image_url,
               audioUrl: data.audio_url,
               replyToId,
               replyToSender,
               replyToText
             };
             setMessages((prev) => [...prev, newMessage]);

             // Bump sender to top in exploreUsers
             const senderIdToUpdate = payload.payload.roomId || payload.payload.senderId;
             setExploreUsers(prev => {
               const updated = [...prev];
               const idx = updated.findIndex(u => u.id === senderIdToUpdate);
               if (idx !== -1) {
                 const userToMove = updated[idx];
                 updated.splice(idx, 1);
                 updated.unshift({
                   ...userToMove,
                   lastMessageTime: new Date(data.created_at).getTime(),
                   unreadCount: (currentOtherUserProfile && currentOtherUserProfile.id === senderIdToUpdate) ? 0 : (userToMove.unreadCount || 0) + 1
                 });
               }
               return updated;
             });

             // If we are currently chatting with the sender, mark as read immediately
             if (currentOtherUserProfile && payload.payload.senderId === currentOtherUserProfile.id) {
               await supabase
                 .from('messages')
                 .update({ status: 'read' })
                 .eq('id', data.id);

               channelRef.current?.send({
                 type: 'broadcast',
                 event: 'messages_read',
                 payload: { readerId: currentUserProfile.id, senderId: payload.payload.senderId }
               });
             }
          }
        }
      })
      .on('broadcast', { event: 'messages_read' }, (payload) => {
        // If the other user read our messages, update our local state
        if (payload.payload.senderId === currentUserProfile?.id) {
          setMessages(prev => prev.map(msg =>
            msg.sender === 'user' && msg.status !== 'read'
              ? { ...msg, status: 'read' }
              : msg
          ));
        }
      })
      .on('broadcast', { event: 'delete_message' }, (payload) => {
        // Instantly mark message as deleted to show tombstone
        if (payload.payload.isDeleted) {
          setMessages(prev => prev.map(msg => msg.id === payload.payload.messageId ? { ...msg, isDeleted: true } : msg));

          // Also close lightbox if the deleted message is currently being viewed
          setLightboxMessageId(currentLightboxMessageId => {
             if (currentLightboxMessageId === payload.payload.messageId) {
                 setLightboxImage(null);
                 return null;
             }
             return currentLightboxMessageId;
          });
        } else {
          setMessages(prev => prev.filter(msg => msg.id !== payload.payload.messageId));
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = channel;
        }
      });


  return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [currentUserProfile?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle outside clicks to close reaction tray & context menu
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveReactionId(null);
      setActiveContextMenuId(null);
    };
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('scroll', handleClickOutside, true);

  return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('scroll', handleClickOutside, true);
    };
  }, []);

  const handleUnlockViewOnce = async (message: Message) => {
    if (!user) return;
    try {
      if ((!GOD_MODE && subscriptionTier === 'FREE')) {
        if ((!GOD_MODE && balance < 10)) {
          toast.error("Insufficient coins (Need 10).");
          return;
        }

        const { error: deductError } = GOD_MODE ? { error: null } : await supabase.rpc('deduct_coins', {
          user_id: user.id,
          amount: 10
        });

        if (deductError) throw deductError;
        setBalance(prev => prev - 10);
      }

      if (typeof window !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      setShatterEffectId(message.id);

      setTimeout(() => {
        setShatterEffectId(null);
        setLightboxImage(message.imageUrl!);
        setLightboxMessageId(message.id);
      }, 600);
    } catch (err) {
      console.error("Failed to unlock media:", err);
      toast.error("Failed to unlock media");
    }
  };

  const closeLightbox = async () => {
    if (lightboxMessageId && user) {
      const msg = messages.find(m => m.id === lightboxMessageId);
      if (msg && msg.isViewOnce) {
        const newViewedBy = [...(msg.viewedBy || []), user.id];
        setMessages(prev => prev.map(m => m.id === lightboxMessageId ? { ...m, viewedBy: newViewedBy } : m));

        await supabase
          .from('messages')
          .update({ viewed_by: newViewedBy })
          .eq('id', lightboxMessageId);
      }
    }
    setLightboxImage(null);
    setLightboxMessageId(null);
  };

  const handleDeleteForEveryone = async (messageId: string) => {
    try {
      // Soft-delete in DB
      await supabase.from('messages').update({ is_deleted: true }).eq('id', messageId);

      // Update local state to show tombstone
      setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, isDeleted: true } : msg));
      setActiveContextMenuId(null);

      // Broadcast deletion tombstone to other user
      channelRef.current?.send({
         type: 'broadcast',
         event: 'delete_message',
         payload: { messageId, senderId: user?.id, isDeleted: true }
      });

      toast.success("Message deleted for everyone");
    } catch (err) {
      console.error("Failed to delete message for everyone", err);
      toast.error("Failed to delete message");
    }
  };

  const handleDeleteForMe = async (messageId: string) => {
    if (!user) return;
    try {
      const msg = messages.find(m => m.id === messageId);
      if (!msg) return;

      const newHiddenFor = [...(msg.hiddenFor || []), user.id];

      await supabase.from('messages').update({ hidden_for: newHiddenFor }).eq('id', messageId);

      // Update local state to hide message completely
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, hiddenFor: newHiddenFor } : m));
      setActiveContextMenuId(null);

      toast.success("Message deleted for you");
    } catch (err) {
      console.error("Failed to delete message for me", err);
      toast.error("Failed to delete message");
    }
  };

  const handleForwardMessage = async (receiverIds: string[]) => {
    if (!messageToForward || !user) return;

    const content = messageToForward.text ? `[FORWARDED]\n${messageToForward.text}` : '';

    try {
      for (const receiverId of receiverIds) {
        const msgId = uuidv4();
        await supabase.from('messages').insert({
          id: msgId,
          sender_id: user.id,
          receiver_id: receiverId,
          content,
          image_url: messageToForward.imageUrl || null,
          audio_url: messageToForward.audioUrl || null,
          is_view_once: messageToForward.isViewOnce || false,
          status: 'sent'
        });

        channelRef.current?.send({
          type: 'broadcast',
          event: 'new_message',
          payload: { messageId: msgId, senderId: user.id, receiverId }
        });

        if (receiverId === currentOtherUserProfile?.id) {
           const optimisticMessage: Message = {
              id: msgId,
              text: content,
              sender: 'user',
              timestamp: new Date(),
              status: 'sent',
              reactions: [],
              imageUrl: messageToForward.imageUrl,
              audioUrl: messageToForward.audioUrl,
              isViewOnce: messageToForward.isViewOnce,
           };
           setMessages(prev => [...prev, optimisticMessage]);
        }
      }
      toast.success("Message forwarded!");
    } catch (err) {
      console.error("Failed to forward:", err);
      toast.error("Failed to forward message");
    } finally {
      setMessageToForward(null);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !user || !currentOtherUserProfile) return;

    let textContent = inputValue.trim();

    // Format reply prefix if replying
    let finalContentToSave = textContent;
    if (replyingTo) {
       finalContentToSave = `[REPLY:${replyingTo.id}:${replyingTo.sender}:${replyingTo.text.substring(0, 50).replace(/\[REPLY:[\s\S]*?\]\n\n/g, '')}]` + "\n\n" + textContent;
    }

    setInputValue('');
    const currentReplyingTo = replyingTo;
    setReplyingTo(null);

    const optimisticMessage: Message = {
      id: uuidv4(),
      text: textContent,
      sender: 'user',
      timestamp: new Date(),
      status: 'sending',
      reactions: [],
      replyToId: currentReplyingTo?.id,
      replyToText: currentReplyingTo?.text.replace(/\[REPLY:[\s\S]*?\]\n\n/g, ''),
      replyToSender: currentReplyingTo?.sender,
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const insertData: any = {
          id: optimisticMessage.id,
          sender_id: user.id,
          receiver_id: currentOtherUserProfile.id,
          content: finalContentToSave,
          status: 'sent'
      };

      if ((currentOtherUserProfile as any).isGroup) {
          insertData.room_id = currentOtherUserProfile.id;
          insertData.receiver_id = null;
      }

      const { data, error } = await supabase
        .from('messages')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Dynamically set status based on recipient's online state
      const nextStatus = currentOtherUserProfile.isOnline ? 'delivered' : 'sent';
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === optimisticMessage.id ? { ...msg, status: nextStatus } : msg
        )
      );

      // Bump current chat to top
      setExploreUsers(prev => {
         const updated = [...prev];
         const idx = updated.findIndex(u => u.id === currentOtherUserProfile.id);
         if (idx !== -1) {
            const userToMove = updated[idx];
            updated.splice(idx, 1);
            updated.unshift({
               ...userToMove,
               lastMessageTime: new Date().getTime()
            });
         }
         return updated;
      });

      // Notify recipient via channel to trigger read receipts or notification
      channelRef.current?.send({
         type: 'broadcast',
         event: 'new_message',
         payload: {
            messageId: optimisticMessage.id,
            senderId: user.id,
            receiverId: (currentOtherUserProfile as any).isGroup ? null : currentOtherUserProfile.id,
            roomId: (currentOtherUserProfile as any).isGroup ? currentOtherUserProfile.id : undefined
         }
      });

      if (currentOtherUserProfile.is_bot) {
        try {
          const pastMessagesForAI = messages.slice(-10).map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text
          }));
          pastMessagesForAI.push({ role: 'user', content: finalContentToSave });

          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: pastMessagesForAI,
              userId: user.id,
              botId: currentOtherUserProfile.id,
              botType: 'ai_friend'
            })
          });
          const data = await res.json();

          if (data.reply) {
            const aiMessageId = uuidv4();
            const aiMessage: Message = {
              id: aiMessageId,
              text: data.reply,
              sender: 'other',
              timestamp: new Date(),
              status: 'delivered',
              reactions: []
            };
            setMessages(prev => [...prev, aiMessage]);

            // Bump bot to top
            setExploreUsers(prev => {
               const updated = [...prev];
               const idx = updated.findIndex(u => u.id === currentOtherUserProfile.id);
               if (idx !== -1) {
                  const userToMove = updated[idx];
                  updated.splice(idx, 1);
                  updated.unshift({
                     ...userToMove,
                     lastMessageTime: new Date().getTime()
                  });
               }
               return updated;
            });
          }
        } catch (e) {
          console.error("Failed to call AI endpoint", e);
        }
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
      toast.error('Failed to send message.');
    }
  };

  const handleMediaClick = () => {
    if ((!GOD_MODE && subscriptionTier === 'FREE')) {
      setIsTierLockModalOpen(true);
      return false;
    }
    return true;
  };

  const handleCameraClick = () => {
    if (handleMediaClick()) {
      fileInputRef.current?.click();
    }
  };

  const handleGiftSent = (giftData: any) => {
    // We will let the GiftOverlay listen to 'public:notifications' for local animation to avoid duplicate
    // But memory specifies we need to use broadcast for real-time. We'll fire both or rely on the broadcast.
    // The instruction: "Ensure the sendGift bypass instantly fires channel.send({ type: 'broadcast', event: 'gift_received', payload: { gift_type: selectedGift } })"

    // We update the active gift for the current user using the overlay which can be triggered by custom event or state if needed.
    // The memory states: "The receiver's screen MUST instantly mount the exact same React.createPortal 3D animation"
    // We will just do the broadcast.

    const newMessage: Message = {
      id: Date.now().toString(),
      text: `Sent a ${giftData.name} (${giftData.cost} Coins)`,
      sender: 'user',
      timestamp: new Date(),
      status: 'sent',
      reactions: [],
      messageType: 'gift',
      giftName: giftData.name,
      giftCost: giftData.cost,
    };
    setMessages((prev) => [...prev, newMessage]);

    // Insert the luxury gift receipt into the database
    supabase.from('messages').insert({
      id: newMessage.id,
      sender_id: user?.id,
      receiver_id: currentOtherUserProfile?.id,
      content: `GIFT:${giftData.name}:${giftData.cost}`,
      message_type: 'gift',
      status: 'sent'
    }).then(({ error }) => {
       if (error) console.error("Error inserting gift message", error);
    });

    // Trigger local animation via custom event for sender
    const customEvent = new CustomEvent('gift_received_local', { detail: { giftData: giftData, senderId: currentUserProfile?.id, receiverId: currentOtherUserProfile?.id, isSender: true } });
    window.dispatchEvent(customEvent);

    // Broadcast gift event via Supabase Realtime
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'gift_received',
        payload: { gift_type: giftData, senderId: currentUserProfile?.id, receiverId: currentOtherUserProfile?.id }
      });
    }

    // Simulate delivery
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessage.id ? { ...msg, status: 'delivered' } : msg
        )
      );
    }, 1000);
  };

  const toggleRecording = async () => {
    if (!handleMediaClick()) return;

    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach(track => track.stop()); // Clean up microphone
          await uploadMediaFile(audioBlob, 'audio');
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Error accessing microphone:', err);
        alert('Could not access microphone. Please check permissions.');
      }
    }
  };

  const uploadMediaFile = async (file: File | Blob, type: 'image' | 'audio', originalName?: string) => {
    setIsUploading(true);
    try {
      let fileName;
      if (originalName) {
        const fileExt = originalName.split('.').pop() || (type === 'audio' ? 'webm' : 'jpg');
        fileName = `${uuidv4()}.${fileExt}`;
      } else {
        fileName = `${uuidv4()}.${type === 'audio' ? 'webm' : 'jpg'}`;
      }

      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      const newMessage: Message = {
        id: uuidv4(),
        text: '',
        ...(type === 'image' ? { imageUrl: publicUrl } : { audioUrl: publicUrl }),
        sender: 'user',
        timestamp: new Date(),
        status: 'sent',
        reactions: [],
        isViewOnce: type === 'image' ? isViewOnceMode : false,
        viewedBy: [],
      };

      setMessages((prev) => [...prev, newMessage]);

      if (user && currentOtherUserProfile) {
        await supabase.from('messages').insert({
           id: newMessage.id,
           sender_id: user.id,
           receiver_id: currentOtherUserProfile.id,
           content: '',
           image_url: type === 'image' ? publicUrl : null,
           audio_url: type === 'audio' ? publicUrl : null,
           status: 'sent',
           is_view_once: type === 'image' ? isViewOnceMode : false,
        });

        channelRef.current?.send({
           type: 'broadcast',
           event: 'new_message',
           payload: { messageId: newMessage.id, senderId: user.id, receiverId: currentOtherUserProfile.id }
        });
      }

      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === newMessage.id ? { ...msg, status: 'delivered' } : msg
          )
        );
      }, 1000);
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      // Fallback: mock if bucket isn't correctly configured
      const mockUrl = URL.createObjectURL(file as Blob);
      const newMessage: Message = {
        id: uuidv4(),
        text: '',
        ...(type === 'image' ? { imageUrl: mockUrl } : { audioUrl: mockUrl }),
        sender: 'user',
        timestamp: new Date(),
        status: 'sent',
        reactions: [],
        isViewOnce: type === 'image' ? isViewOnceMode : false,
        viewedBy: [],
      };
      setMessages((prev) => [...prev, newMessage]);
    } finally {
      setIsUploading(false);
      setIsViewOnceMode(false); // Reset toggle after upload
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        if (event.target?.result) {
            setMediaPreviewUrl(event.target.result as string);
            setMediaFile(file);
            setMediaCaption('');
        }
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleMediaSend = async () => {
     if (!mediaFile) return;
     setIsUploading(true);
     await uploadMediaFile(mediaFile, 'image', mediaCaption);
     setIsUploading(false);
     cancelMediaPreview();
  };

  const cancelMediaPreview = () => {
     setMediaPreviewUrl(null);
     setMediaFile(null);
     setMediaCaption('');
  };

  const handleReaction = (messageId: string, emoji: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          const hasReaction = msg.reactions.includes(emoji);
          return {
            ...msg,
            reactions: hasReaction
              ? msg.reactions.filter((r) => r !== emoji)
              : [...msg.reactions, emoji],
          };
        }
        return msg;
      })
    );
    setActiveReactionId(null);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderStatus = (status?: 'sending' | 'sent' | 'delivered' | 'read') => {
    if (!status) return null;

  return (
      <motion.span
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="ml-1 flex items-center shrink-0"
      >
        {status === 'sending' && <Clock size={12} className="text-gray-400 drop-shadow-sm opacity-70" />}
        {status === 'sent' && <Check size={14} className="text-gray-400 drop-shadow-sm" />}
        {status === 'delivered' && <CheckCheck size={14} className="text-gray-400 drop-shadow-sm" />}
        {status === 'read' && <CheckCheck size={14} className="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" />}
      </motion.span>
    );
  };


  // Helper to determine ring class based on status
  const getStatusRingClass = (userId: string) => {
    if (!activeStatusUsers.has(userId)) return '';
    const userStatuses = userStatusMap.get(userId) || [];
    if (userStatuses.length === 0) return '';

    // Check if ALL statuses are viewed
    const allViewed = userStatuses.every(id => viewedStatuses.has(id));
    return allViewed ? 'status-ring-viewed' : 'status-ring-active';
  };

    const handleStatusClick = async (groupId: string, statuses: any[], profile: any) => {
    // If called from ChatList with empty statuses, fetch them here
    if (statuses.length === 0) {
       try {
         const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
         const { data, error } = await supabase
           .from('statuses')
           .select('*')
           .eq('user_id', groupId)
           .gt('created_at', twentyFourHoursAgo)
           .order('created_at', { ascending: true });

         if (data && !error) {
             setViewingStatuses({ groupId, statuses: data, profile });
         }
       } catch (err) {
         console.error("Failed to fetch statuses for viewer", err);
       }
    } else {
       setViewingStatuses({ groupId, statuses, profile });
    }
  };

  if (needsVerification) {
      return <FacialVerification onComplete={() => { setNeedsVerification(false); fetchCurrentUserProfile(); }} />;
  }

  if (!currentOtherUserProfile) {

  return (
      <AppShell
        activeTab={activeTab}
        setActiveTab={setAppTab}
        coinBalance={balance}
        unreadCount={0}
        onOpenStore={() => {
          setStoreTab('BUY_COINS');
          setIsStoreOpen(true);
        }}
      >
        <div className="flex flex-col h-full font-sans text-gray-100 selection:bg-purple-500/30 relative">
          <div className="relative z-10 flex flex-col h-full">

            <main className="flex-1 overflow-y-auto relative z-10">
              {activeTab === 'explore' && (
                <ExploreFeed
                   onStartChat={(u) => {
                      if ((currentUserProfile as any)?.isVerified === false) {
                          setShowVerificationGateModal(true);
                          return;
                      }
                      setOtherUserProfile(u);
                   }}
                   currentUserProfile={currentUserProfile}
                />
              )}

                        {activeTab === 'find' && (
              <DiscoveryContainer
                onStartChat={(u) => {
                  setSelectedProfile(u);
                  setAppTab('chats');
                  setIsDrawerOpen(false);
                }}
              />
            )}

            {activeTab === 'chats' && (
              <div className="h-full relative">
                <ChatList
                  exploreUsers={exploreUsers}
                  chats={exploreUsers}
                  setChats={setExploreUsers}
                  getStatusRingClass={getStatusRingClass}
                  currentUserProfile={currentUserProfile}
                  setShowVerificationGateModal={setShowVerificationGateModal}
                  setOtherUserProfile={setOtherUserProfile}
                  isLoading={isChatsLoading}
                  fetchError={chatsFetchError}
                  onStatusClick={handleStatusClick}
                  activeStatusUsers={activeStatusUsers}
                  userStatusMap={userStatusMap}
                  blockedUserIds={blockedUserIdsRef.current}
                />
                <button
                   onClick={() => setIsGroupModalOpen(true)}
                   className="absolute bottom-6 right-6 w-14 h-14 bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)] rounded-full flex items-center justify-center transition-all z-50"
                >
                   <Users size={24} />
                </button>
              </div>
            )}

            {activeTab === 'status' && (
              <StatusTab onStatusClick={handleStatusClick} currentUserProfile={currentUserProfile} />
            )}

            {activeTab === 'profile' && currentUserProfile && (
              <MyProfileView
                profile={currentUserProfile}
                onEditClick={() => {
                  setIsDrawerOpen(true);
                }}
              />
            )}
          </main>

          {/* Status Viewer */}
          {viewingStatuses && (
                                    <StatusViewer
              statuses={viewingStatuses.statuses.map(s => ({
                id: s.id,
                userId: viewingStatuses.profile.id,
                username: viewingStatuses.profile.username,
                avatarUrl: viewingStatuses.profile.avatar_url,
                mediaUrl: s.media_url,
                mediaType: s.media_type,
                textContent: s.text_content,
                backgroundGradient: s.background_gradient,
                viewsCount: 0,
                isOwner: user?.id === viewingStatuses.groupId
              }))}
              onClose={() => setViewingStatuses(null)}
                            onSendReply={async (statusId, text, mediaPreview) => {
                 if (!user) return;
                 const finalContent = `[REPLY:${statusId}:${mediaPreview}] ${text}`;
                 const msgId = uuidv4();

                 // Optimistic UI update could be handled here or by just letting standard chat sync
                 await supabase.from('messages').insert({
                    id: msgId,
                    sender_id: user.id,
                    receiver_id: viewingStatuses.groupId,
                    content: finalContent,
                    status: 'sent'
                 });

                 channelRef.current?.send({
                    type: 'broadcast',
                    event: 'new_message',
                    payload: { messageId: msgId, senderId: user.id, receiverId: viewingStatuses.groupId }
                 });

                 toast.success("Reply sent!");
                 setViewingStatuses(null); // Close viewer after reply
              }}
              onSendLike={async (statusId) => {
                 if (!user) return;
                 const msgId = uuidv4();
                 await supabase.from('messages').insert({
                    id: msgId,
                    sender_id: user.id,
                    receiver_id: viewingStatuses.groupId,
                    content: `[STATUS_LIKE]\n\nLiked your status`,
                    status: 'sent'
                 });

                 channelRef.current?.send({
                    type: 'broadcast',
                    event: 'new_message',
                    payload: { messageId: msgId, senderId: user.id, receiverId: viewingStatuses.groupId }
                 });
              }}
              onForward={async (statusId, receiverId) => {
                 if (!user) return;
                 const msgId = uuidv4();
                 const content = `[FORWARDED_STATUS:${statusId}:${viewingStatuses.groupId}]`;

                 // Save message
                 await supabase.from('messages').insert({
                    id: msgId,
                    sender_id: user.id,
                    receiver_id: receiverId,
                    content: content,
                    status: 'sent'
                 });

                 channelRef.current?.send({
                    type: 'broadcast',
                    event: 'new_message',
                    payload: { messageId: msgId, senderId: user.id, receiverId: receiverId }
                 });

                 toast.success("Status forwarded!");
              }}
            />
          )}

            <NavigationDrawer
              isOpen={isDrawerOpen}
              onClose={() => setIsDrawerOpen(false)}
              onSelectUser={setOtherUserProfile}
              onProfileUpdated={fetchCurrentUserProfile}
            />
            <CoinStoreModal
              isOpen={isStoreOpen}
              onClose={() => setIsStoreOpen(false)}
              initialTab={storeTab}
            />
          </div>
        </div>

      {currentOtherUserProfile?.isGroup && user?.id && (
         <GroupInfoDrawer
           isOpen={isGroupInfoDrawerOpen}
           onClose={() => setIsGroupInfoDrawerOpen(false)}
           groupId={currentOtherUserProfile.id}
           groupName={currentOtherUserProfile.name}
           groupAvatar={currentOtherUserProfile.avatarUrl}
           currentUserId={user.id}
           onGroupUpdated={() => {
              // Optionally trigger a chat list refresh if needed, for now just close
           }}
         />
      )}
    </AppShell>
    );
  }


  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden font-sans text-gray-100 selection:bg-purple-500/30 relative bg-neutral-950">
      {/* Verification Gate Modal */}
      <AnimatePresence>
          {showVerificationGateModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
               <motion.div
                 initial={{ scale: 0.9, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 exit={{ scale: 0.9, opacity: 0 }}
                 className="bg-white/5 backdrop-blur-3xl border border-white/20 p-8 rounded-3xl shadow-2xl max-w-sm text-center relative"
               >
                  <button onClick={() => setShowVerificationGateModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                     <X size={20} />
                  </button>
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/50">
                     <Camera size={32} className="text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Security Check</h3>
                  <p className="text-gray-400 mb-6">Verify your face to unlock messaging and ensure community safety.</p>

                  <motion.button
                     whileTap={{ scale: 0.95 }}
                     onClick={() => {
                         setShowVerificationGateModal(false);
                         setNeedsVerification(true);
                     }}
                     className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl shadow-lg transition-colors"
                  >
                     Verify Now
                  </motion.button>
               </motion.div>
            </div>
          )}
      </AnimatePresence>

      {/* Tier Lock Modal */}
      <AnimatePresence>
        {isTierLockModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center"
            >
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
                <span className="text-3xl">🔒</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Media Sharing is a Pro Feature</h3>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Upgrade to Pro or Premium to unlock media sharing and voice notes to your network.
              </p>
              <div className="flex flex-col space-y-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setIsTierLockModalOpen(false);
                    setStoreTab('UPGRADES');
                    setIsStoreOpen(true);
                  }}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all"
                >
                  Upgrade Now
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsTierLockModalOpen(false)}
                  className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl font-medium transition-colors"
                >
                  Maybe Later
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={selectedProfile}
        onUpgradeClick={() => {
          setIsProfileOpen(false);
          setStoreTab('UPGRADES');
          setIsStoreOpen(true);
        }}
      />
      <CoinStoreModal
        isOpen={isStoreOpen}
        onClose={() => setIsStoreOpen(false)}
        initialTab={storeTab}
      />
      <GiftModal
        isOpen={isGiftModalOpen}
        onClose={() => setIsGiftModalOpen(false)}
        recipientId={currentOtherUserProfile.id}
        onGiftSent={handleGiftSent}
        onOpenStore={() => {
          setIsGiftModalOpen(false);
          setStoreTab('BUY_COINS');
          setIsStoreOpen(true);
        }}
      />
      <MessageForwardModal
        isOpen={isForwardModalOpen}
        onClose={() => {
          setIsForwardModalOpen(false);
          setMessageToForward(null);
        }}
        onForward={handleForwardMessage}
      />
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelectUser={setOtherUserProfile}
        onProfileUpdated={fetchCurrentUserProfile}
      />

      <AnimatePresence>
        {activeGift && (
          <motion.div
            key="gift-overlay"
            initial={{ opacity: 0, scale: 0, y: 150, rotate: -45 }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0, 2.5, 2.8, 0],
              y: [150, -100, -120, -300],
              rotate: [-45, 10, -5, 20]
            }}
            transition={{
              duration: 3,
              times: [0, 0.4, 0.8, 1],
              ease: "easeOut"
            }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="relative flex items-center justify-center">
              {/* Radial Glow */}
              <motion.div
                animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-yellow-500/40 to-orange-500/40 blur-3xl rounded-full w-[300px] h-[300px] -m-[150px]"
              />
              {/* Particles */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                  animate={{
                    opacity: 0,
                    scale: Math.random() * 2 + 1,
                    x: (Math.random() - 0.5) * 400,
                    y: (Math.random() - 0.5) * 400
                  }}
                  transition={{ duration: 1.5, delay: 0.2 + (i * 0.1), ease: "easeOut" }}
                  className="absolute w-4 h-4 bg-yellow-300 rounded-full blur-[2px]"
                />
              ))}
              {/* Main Icon */}
              <span className="relative z-10 text-[12rem] drop-shadow-[0_0_50px_rgba(255,215,0,1)] filter">
                {activeGift.icon}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-3xl p-4 cursor-zoom-out"
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-colors"
            >
              <X size={20} />
            </button>
            <motion.img
              layoutId={`image-${lightboxImage}`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              src={lightboxImage}
              alt="Fullscreen media"
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/10"
              onClick={e => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-black/60 backdrop-blur-xl px-4 py-3 border-b border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.37)] flex items-center shrink-0 sticky top-0 z-20">
        <button
          onClick={() => setOtherUserProfile(null)}
          className="mr-3 p-1.5 rounded-full hover:bg-white/10 text-white/70 transition-colors"
        >
          <X size={20} />
        </button>

        <div
          onClick={() => openProfile(currentOtherUserProfile)}
          className={`relative w-8 h-8 rounded-full flex items-center justify-center shadow-lg mr-3 shrink-0 cursor-pointer ${
            currentOtherUserProfile.tier?.toLowerCase() === 'premium' ? 'p-[2px]' :
            currentOtherUserProfile.tier?.toLowerCase() === 'pro' ? 'bg-gradient-to-tr from-amber-400 to-yellow-600 p-[2px]' :
            'border border-white/10 p-1 bg-white/5'
          } ${getStatusRingClass(currentOtherUserProfile.id)}`}
        >
           {currentOtherUserProfile.tier?.toLowerCase() === 'premium' && (
             <div className="absolute inset-[-2px] rounded-full bg-gradient-to-r from-amber-400 via-purple-500 to-amber-400 animate-spin-slow" />
           )}
           <div className="relative w-full h-full rounded-full bg-neutral-900 flex items-center justify-center overflow-hidden z-10">
             {currentOtherUserProfile.avatarUrl ? (
               <img src={currentOtherUserProfile.avatarUrl} alt={currentOtherUserProfile.name} className="w-full h-full object-cover rounded-full" />
             ) : (
               <span className="text-white font-bold text-sm tracking-tighter drop-shadow-md">{currentOtherUserProfile.avatarInitials}</span>
             )}
           </div>
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { if ((currentOtherUserProfile as any).isGroup) setIsGroupInfoDrawerOpen(true); else openProfile(currentOtherUserProfile); }}>
          <div className="flex items-center">
            <h1 className={`text-base leading-tight truncate drop-shadow-sm mr-2 ${
              currentOtherUserProfile.is_bot ? 'bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 via-purple-400 to-cyan-400 drop-shadow-[0_0_10px_rgba(232,121,249,0.8)] font-extrabold' :
              currentOtherUserProfile.tier?.toLowerCase() === 'premium' ? 'bg-gradient-to-r from-purple-400 via-pink-500 to-amber-400 bg-[length:200%_auto] animate-pulse bg-clip-text text-transparent font-extrabold' :
              currentOtherUserProfile.tier?.toLowerCase() === 'pro' ? 'text-amber-400 font-bold' :
              'text-neutral-200 font-bold'
            }`}>
              {currentOtherUserProfile.is_bot && typeof window !== 'undefined' && localStorage.getItem(`bot_name_${currentOtherUserProfile.id}`) ? localStorage.getItem(`bot_name_${currentOtherUserProfile.id}`) : currentOtherUserProfile.name}
            </h1>
            {currentOtherUserProfile.isVerified && <VerifiedBadge />}
            {currentOtherUserProfile.tier?.toLowerCase() === 'premium' && (
               <motion.span
                 animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                 transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                 className="px-1.5 py-0.5 rounded-sm text-[8px] font-black tracking-widest uppercase bg-gradient-to-r from-yellow-300 via-yellow-600 to-yellow-300 bg-[length:200%_auto] text-black shadow-[0_0_10px_rgba(250,204,21,0.5)] border border-yellow-400/50"
               >
                 PREMIUM
               </motion.span>
            )}
            {currentOtherUserProfile.tier?.toLowerCase() === 'pro' && (
               <motion.span
                 animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                 transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                 className="px-1.5 py-0.5 rounded-sm text-[8px] font-black tracking-widest uppercase bg-gradient-to-r from-blue-300 via-blue-600 to-blue-300 bg-[length:200%_auto] text-white shadow-[0_0_10px_rgba(96,165,250,0.5)] border border-blue-400/50"
               >
                 PRO
               </motion.span>
            )}
          </div>
          {!currentOtherUserProfile.ghost_mode && currentOtherUserProfile.isOnline ? (
            <div className="flex items-center space-x-1.5">
               <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
               <p className="text-[11px] text-white/60 font-medium">Active now</p>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5">
               <span className="w-2 h-2 rounded-full bg-white/30" />
               <p className="text-[11px] text-white/50 font-medium">Last seen {currentOtherUserProfile.last_seen && !currentOtherUserProfile.ghost_mode ? new Date(currentOtherUserProfile.last_seen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'recently'}</p>
            </div>
          )}
        </div>

        {/* Phase 3 Call Actions */}
        <div className="flex items-center space-x-3 mr-4">
            <button onClick={() => { if (currentOtherUserProfile) initiateCall(currentOtherUserProfile.id, currentOtherUserProfile.name, currentOtherUserProfile.avatarUrl, 'audio', (currentOtherUserProfile as any).isGroup); }} className="text-amber-500 hover:text-amber-400 cursor-pointer transition-all hover:scale-110 drop-shadow-md">
               <Phone size={20} />
            </button>
            <button onClick={() => { if (currentOtherUserProfile) initiateCall(currentOtherUserProfile.id, currentOtherUserProfile.name, currentOtherUserProfile.avatarUrl, 'video', (currentOtherUserProfile as any).isGroup); }} className="text-amber-500 hover:text-amber-400 cursor-pointer transition-all hover:scale-110 drop-shadow-md">
               <Video size={22} />
            </button>
        </div>

        {/* Top-up Store Icon */}
        <button
          onClick={() => {
            setStoreTab('BUY_COINS');
            setIsStoreOpen(true);
          }}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/20 hover:from-amber-400/40 hover:to-amber-600/40 border border-amber-400/30 flex items-center justify-center transition-all ml-2 shrink-0"
        >
          <Store size={14} className="text-amber-400" />
        </button>

        {/* Phase 4: Chat Options Menu */}
        <div className="relative ml-2">
            <button
               onClick={() => setIsChatMenuOpen(!isChatMenuOpen)}
               className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
               <MoreVertical size={20} />
            </button>
            <AnimatePresence>
               {isChatMenuOpen && (
                  <>
                     <div
                        className="fixed inset-0 w-[100vw] h-[100vh] z-[90]"
                        onClick={(e) => {
                           e.stopPropagation();
                           setIsChatMenuOpen(false);
                        }}
                     />
                     <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute right-0 top-12 z-[100] bg-[#050505]/95 backdrop-blur-3xl border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.9)] rounded-2xl p-2 min-w-[200px]"
                     >
                        <div className="flex flex-col">
                           <button onClick={() => { setIsChatMenuOpen(false); setIsThemeModalOpen(true); }} className="px-4 py-2.5 text-sm text-left text-white/90 hover:bg-white/10 transition-colors duration-200 flex items-center gap-3 rounded-lg">
                              <Camera size={16} className="text-white/50" /> Theme & Wallpaper
                           </button>
                           <button onClick={() => { setIsChatMenuOpen(false); setIsForwardContactModalOpen(true); }} className="px-4 py-2.5 text-sm text-left text-white/90 hover:bg-white/10 transition-colors duration-200 flex items-center gap-3 rounded-lg">
                              <Share size={16} className="text-white/50" /> Forward Account
                           </button>
                           <button onClick={() => { setIsChatMenuOpen(false); toggleBlock(); }} className="px-4 py-2.5 text-sm text-left text-white/90 hover:bg-white/10 transition-colors duration-200 flex items-center gap-3 rounded-lg">
                              <Ban size={16} className="text-white/50" /> {isBlockedByMe ? 'Unblock' : 'Block'} User
                           </button>
                           <button onClick={() => { setIsChatMenuOpen(false); setIsReportModalOpen(true); }} className="px-4 py-2.5 text-sm text-left text-rose-400 hover:bg-white/10 transition-colors duration-200 flex items-center gap-3 rounded-lg">
                              <ShieldAlert size={16} className="text-rose-400/50" /> Report
                           </button>
                           <button onClick={() => { setIsChatMenuOpen(false); toast('Search coming soon!', { icon: '🔍' }); }} className="px-4 py-2.5 text-sm text-left text-white/90 hover:bg-white/10 transition-colors duration-200 flex items-center gap-3 rounded-lg">
                              <Search size={16} className="text-white/50" /> Search Chat
                           </button>
                           <div className="h-px w-full bg-white/10 my-1"></div>
                           <button onClick={() => { setIsChatMenuOpen(false); setIsClearChatConfirmOpen(true); }} className="px-4 py-2.5 text-sm text-left text-rose-400 hover:bg-white/10 transition-colors duration-200 flex items-center gap-3 rounded-lg">
                              <Trash2 size={16} className="text-rose-400/50" /> Clear Message History
                           </button>
                        </div>
                     </motion.div>
                  </>
               )}
            </AnimatePresence>
        </div>
      </header>

      {/* Messages Area */}
      <main
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto p-4 space-y-6 relative z-10 w-full ${
          currentOtherUserProfile.is_bot ? 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fuchsia-900/20 via-[#020202] to-[#020202]' :
          activeWallpaper.startsWith('bg-') ? activeWallpaper : 'bg-cover bg-center'
        }`}
        style={currentOtherUserProfile.is_bot ? {} : activeWallpaper.startsWith('url') ? { backgroundImage: activeWallpaper } : {}}
      >
        <div className="absolute inset-0 bg-black/40 pointer-events-none z-0"></div>

        {messages.filter(m => !m.hiddenFor?.includes(user?.id || '')).map((message) => {

          if (message.isSystemMessage) {
              return (
                  <div key={message.id} className="w-full flex justify-center my-4">
                      <div className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/5 text-[11px] font-bold text-white/70 shadow-sm text-center max-w-[80%] break-words">
                          {message.text}
                      </div>
                  </div>
              );
          }

          const isUser = message.sender === 'user';

          const isTrayOpen = activeReactionId === message.id;

          if (message.isDeleted) {

  return (
               <motion.div
                 layout
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                 key={message.id}
                 className={`flex flex-col group ${isUser ? 'items-end' : 'items-start'}`}
               >
                 <div className="flex items-end space-x-2 max-w-[85%] relative">
                   <div className={`px-4 py-2.5 rounded-2xl border border-white/10 italic text-white/50 text-sm ${isUser ? 'bg-white/5 rounded-tr-sm' : 'bg-white/5 rounded-tl-sm'}`}>
                     🚫 This message was deleted.
                   </div>
                 </div>
               </motion.div>
             );
          }


  return (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              key={message.id}
              className={`flex flex-col group ${isUser ? 'items-end' : 'items-start'}`}
            >
              {/* Sender Name and Badge (Pro/Premium) */}
              <div className={`flex items-center space-x-1.5 mb-1 ${isUser ? 'mr-1' : 'ml-9'}`}>
                {isUser && (subscriptionTier?.toLowerCase() === 'premium' || subscriptionTier?.toLowerCase() === 'pro') && (
                   <motion.span animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} className="px-1 py-0.5 rounded-sm text-[7px] font-black tracking-widest uppercase bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 bg-[length:200%_auto] text-black shadow-[0_0_5px_rgba(251,191,36,0.4)] border border-amber-400/50">VIP</motion.span>
                )}

                <span className={`text-xs drop-shadow-sm font-bold ${
                  (isUser && (subscriptionTier?.toLowerCase() === 'premium' || subscriptionTier?.toLowerCase() === 'pro')) || (!isUser && (currentOtherUserProfile.tier?.toLowerCase() === 'premium' || currentOtherUserProfile.tier?.toLowerCase() === 'pro'))
                    ? 'bg-gradient-to-r from-fuchsia-400 via-pink-400 to-amber-400 bg-clip-text text-transparent drop-shadow-md font-black'
                    : 'text-white/70'
                }`}>
                  {isUser && currentUserProfile ? currentUserProfile.name : currentOtherUserProfile.name}
                </span>

                {!isUser && (currentOtherUserProfile.tier?.toLowerCase() === 'premium' || currentOtherUserProfile.tier?.toLowerCase() === 'pro') && (
                   <motion.span animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} className="px-1 py-0.5 rounded-sm text-[7px] font-black tracking-widest uppercase bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 bg-[length:200%_auto] text-black shadow-[0_0_5px_rgba(251,191,36,0.4)] border border-amber-400/50">VIP</motion.span>
                )}
              </div>

              {/* Message Bubble Row */}
              <div className={`flex items-end space-x-2 max-w-[85%] relative`}>

                {/* Avatar for other */}
                {!isUser && (
                  <div
                    onClick={() => openProfile(currentOtherUserProfile)}
                    className={`relative w-6 h-6 rounded-full flex items-center justify-center shrink-0 mb-1 cursor-pointer transition-colors shadow-[0_4px_16px_rgba(0,0,0,0.3)] ${
                      currentOtherUserProfile.tier?.toLowerCase() === 'premium' ? 'p-[1.5px]' :
                      currentOtherUserProfile.tier?.toLowerCase() === 'pro' ? 'bg-gradient-to-tr from-amber-400 to-yellow-600 p-[1.5px]' :
                      'border border-white/20 hover:border-white/40 bg-white/5 backdrop-blur-md'
                    }`}
                  >
                    {currentOtherUserProfile.tier?.toLowerCase() === 'premium' && (
                      <div className="absolute inset-[-1.5px] rounded-full bg-gradient-to-r from-amber-400 via-purple-500 to-amber-400 animate-spin-slow" />
                    )}
                    <div className="relative w-full h-full rounded-full bg-neutral-900 flex items-center justify-center overflow-hidden z-10">
                      {currentOtherUserProfile.avatarUrl ? (
                         <img src={currentOtherUserProfile.avatarUrl} alt={currentOtherUserProfile.name} className="w-full h-full object-cover rounded-full" />
                      ) : (
                         <span className="text-[10px] text-white/70 font-bold">{currentOtherUserProfile.avatarInitials}</span>
                      )}
                    </div>
                  </div>
                )}

                {isUser && currentUserProfile && (
                  <div
                    onClick={() => openProfile(currentUserProfile)}
                    className={`relative w-6 h-6 rounded-full flex items-center justify-center shrink-0 mb-1 cursor-pointer order-last ml-2 shadow-[0_4px_16px_rgba(0,0,0,0.3)] ${
                      currentUserProfile.tier?.toLowerCase() === 'premium' ? 'p-[1.5px]' :
                      currentUserProfile.tier?.toUpperCase() === 'PRO' ? 'bg-gradient-to-tr from-amber-400 to-yellow-600 p-[1.5px]' :
                      'border border-white/20 hover:border-white/40 bg-white/5 backdrop-blur-md transition-colors'
                    }`}
                  >
                    {currentUserProfile.tier?.toLowerCase() === 'premium' && (
                      <div className="absolute inset-[-1.5px] rounded-full bg-gradient-to-r from-amber-400 via-purple-500 to-amber-400 animate-spin-slow" />
                    )}
                    <div className="relative w-full h-full rounded-full bg-neutral-900 flex items-center justify-center overflow-hidden z-10">
                      {currentUserProfile.avatarUrl ? (
                        <img src={currentUserProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <span className="text-[10px] text-white/70 font-bold">{currentUserProfile.avatarInitials}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Bubble Container */}
                <motion.div
                  className="relative flex flex-col"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.1}
                  onDragEnd={(e, info) => {
                    if (Math.abs(info.offset.x) > 50) {
                      setReplyingTo(message);
                    }
                  }}
                >
                  {/* Reaction Tray (Popover) */}
                  {isTrayOpen && (
                    <div
                      className={`absolute bottom-full mb-2 ${isUser ? 'right-0' : 'left-0'} z-30 flex items-center space-x-1 p-1.5 bg-white/10 backdrop-blur-3xl border border-white/20 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)]`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {DEFAULT_EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={(e) => handleReaction(message.id, emoji, e)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full hover:scale-110 transition-transform focus:outline-none"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setActiveReactionId(isTrayOpen ? null : message.id);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (isUser) {
                         setActiveContextMenuId(message.id);
                      }
                    }}
                    onTouchStart={() => {
                      if (isUser) {
                        longPressTimerRef.current = setTimeout(() => {
                           setActiveContextMenuId(message.id);
                        }, 500); // 500ms for long press
                      }
                    }}
                    onTouchEnd={() => {
                       if (longPressTimerRef.current) {
                         clearTimeout(longPressTimerRef.current);
                         longPressTimerRef.current = null;
                       }
                    }}
                    onTouchMove={() => {
                       if (longPressTimerRef.current) {
                         clearTimeout(longPressTimerRef.current);
                         longPressTimerRef.current = null;
                       }
                    }}
                    className={`px-4 py-2.5 relative transition-all duration-200 cursor-pointer ${
                      isUser
                        ? 'bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-amber-500/20 text-white rounded-2xl rounded-tr-sm shadow-[0_8px_32px_rgba(0,0,0,0.37)]'
                        : currentOtherUserProfile.is_bot
                        ? 'bg-white/5 backdrop-blur-md border border-white/10 shadow-[0_0_20px_rgba(192,38,211,0.05)] text-white rounded-2xl rounded-tl-sm'
                        : 'bg-white/5 hover:bg-white/10 backdrop-blur-2xl text-gray-100 border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.3)] rounded-2xl rounded-tl-sm'
                    } ${(message.imageUrl || message.audioUrl) && !message.text ? '!p-1.5' : ''}`}
                  >

                    {/* Delete Context Menu */}
                    <AnimatePresence>
                      {activeContextMenuId === message.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className={`absolute bottom-full mb-1 ${isUser ? 'right-0' : 'left-0'} z-50`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col py-1 min-w-[160px]">
                            <button
                               onClick={() => {
                                 setReplyingTo(message);
                                 setActiveContextMenuId(null);
                               }}
                               className="px-4 py-2 text-sm font-bold text-white hover:bg-white/10 flex items-center justify-between transition-colors w-full"
                            >
                               <span>Reply</span>
                            </button>
                            <button
                               onClick={() => {
                                 // Handle pin (simplified logic)
                                 toast.success('Message pinned');
                                 setActiveContextMenuId(null);
                               }}
                               className="px-4 py-2 text-sm font-bold text-white hover:bg-white/10 flex items-center justify-between transition-colors w-full"
                            >
                               <span>Pin</span>
                            </button>
                            <button
                               onClick={() => {
                                 // Handle keep (simplified logic)
                                 toast.success('Message kept');
                                 setActiveContextMenuId(null);
                               }}
                               className="px-4 py-2 text-sm font-bold text-white hover:bg-white/10 flex items-center justify-between transition-colors w-full"
                            >
                               <span>Keep</span>
                            </button>
                            <button
                               onClick={() => {
                                 navigator.clipboard.writeText(message.text || '');
                                 toast.success('Copied to clipboard');
                                 setActiveContextMenuId(null);
                               }}
                               className="px-4 py-2 text-sm font-bold text-white hover:bg-white/10 flex items-center justify-between transition-colors w-full"
                            >
                               <span>Copy</span>
                            </button>
                            <button
                               onClick={() => {
                                 setMessageToForward(message);
                                 setIsForwardModalOpen(true);
                                 setActiveContextMenuId(null);
                               }}
                               className="px-4 py-2 text-sm font-bold text-white hover:bg-white/10 flex items-center justify-between transition-colors w-full"
                            >
                               <span>Forward</span>
                            </button>
                            <button
                               onClick={() => handleDeleteForMe(message.id)}
                               className="px-4 py-2 text-sm font-bold text-white hover:bg-white/10 flex items-center justify-between transition-colors w-full"
                            >
                               <span>Delete for me</span>
                            </button>
                            <button onClick={() => setIsGroupModalOpen(true)} className="px-4 py-2 text-sm font-bold text-white hover:bg-white/10 flex items-center justify-between transition-colors w-full">
                               <span>Create Group with User</span>
                            </button>
                            {isUser && (
                               <button
                                  onClick={() => handleDeleteForEveryone(message.id)}
                                  className="px-4 py-2 text-sm font-bold text-red-400 hover:bg-white/10 flex items-center justify-between transition-colors w-full"
                               >
                                  <span>Delete for everyone</span>
                               </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {message.replyToText && (
                      <div className={`mb-2 p-2 rounded-lg text-sm border-l-2 backdrop-blur-md shadow-inner ${isUser ? 'bg-white/10 border-blue-300 text-blue-50' : 'bg-black/20 border-white/30 text-gray-200'}`}>
                         <span className="font-bold text-[10px] uppercase tracking-wider opacity-75 mb-0.5 block">
                           {message.replyToSender === 'user' ? (currentUserProfile?.name || 'You') : (currentOtherUserProfile?.name || 'User')}
                         </span>
                         <span className="line-clamp-2 text-xs italic">{message.replyToText}</span>
                      </div>
                    )}
                    {message.text?.startsWith('[FORWARDED]\n') && !message.text?.replace('[FORWARDED]\n', '') && (
                      <span className="text-[10px] italic text-white/50 mb-1 flex items-center"><Send size={10} className="mr-1 inline" /> Forwarded</span>
                    )}
                    {message.imageUrl && (
                      <div
                        className={`mb-1.5 relative overflow-hidden rounded-xl border border-white/10 ${message.isViewOnce && !message.viewedBy?.includes(user?.id || '') ? 'cursor-pointer' : (message.isViewOnce && message.viewedBy?.includes(user?.id || '') ? 'cursor-default' : 'cursor-zoom-in group')} bg-white/5 backdrop-blur-2xl`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (message.isViewOnce) {
                            if (!message.viewedBy?.includes(user?.id || '')) {
                              handleUnlockViewOnce(message);
                            }
                          } else {
                            setLightboxImage(message.imageUrl!);
                            setLightboxMessageId(message.id);
                          }
                        }}
                      >
                        {message.isViewOnce ? (
                           message.viewedBy?.includes(user?.id || '') ? (
                             <div className="w-[200px] h-[150px] bg-white/5 flex flex-col items-center justify-center text-white/40">
                               <EyeOff size={32} className="mb-2 opacity-50" />
                               <span className="text-xs font-bold uppercase tracking-widest">Opened</span>
                             </div>
                           ) : (
                             <div className="w-[200px] h-[150px] relative overflow-hidden rounded-xl">
                               <div className="absolute inset-0 bg-black/80 backdrop-blur-3xl z-10 flex flex-col items-center justify-center text-amber-500">
                                 {shatterEffectId === message.id ? (
                                   <div className="relative w-full h-full">
                                     {/* Shatter shards */}
                                     {[...Array(6)].map((_, i) => (
                                       <motion.div
                                         key={i}
                                         initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
                                         animate={{
                                           x: (Math.random() - 0.5) * 200,
                                           y: (Math.random() - 0.5) * 200,
                                           opacity: 0,
                                           scale: 0,
                                           rotate: (Math.random() - 0.5) * 180
                                         }}
                                         transition={{ duration: 0.6, ease: "easeOut" }}
                                         className="absolute top-1/2 left-1/2 w-8 h-8 bg-white/90"
                                         style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
                                       />
                                     ))}
                                   </div>
                                 ) : (
                                   <>
                                     <Lock size={36} className="mb-3 animate-pulse drop-shadow-[0_0_20px_rgba(245,158,11,0.9)]" />
                                     <span className="text-[10px] font-bold uppercase tracking-widest text-center px-4 leading-tight text-amber-400">Tap to Unlock<br/>(10 Coins)</span>
                                   </>
                                 )}
                               </div>
                             </div>
                           )
                        ) : (
                          <>
                            <motion.img
                              layoutId={`image-${message.imageUrl}`}
                              src={message.imageUrl}
                              alt="Uploaded media"
                              className="max-w-[200px] w-full rounded-xl object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                          </>
                        )}
                      </div>
                    )}

                    {message.messageType === 'missed_call' && (
                      <div className="flex items-center space-x-2 p-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                        <Phone className="w-5 h-5 text-red-400" />
                        <div className="flex flex-col">
                          <span className="text-red-400 font-semibold text-sm">Missed Call</span>
                          <span className="text-white/60 text-xs">Tap to call back</span>
                        </div>
                      </div>
                    )}

                    {message.messageType === 'gift' && (
                      <div className={`p-4 rounded-xl border relative overflow-hidden flex flex-col items-center shadow-lg ${
                        message.giftName === 'Coffee' ? 'bg-amber-950/40 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]' :
                        message.giftName === 'Rose' ? 'bg-rose-950/40 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]' :
                        message.giftName === 'Diamond' ? 'bg-cyan-950/40 border-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.3)]' :
                        message.giftName === 'Crown' ? 'bg-gradient-to-br from-amber-500/20 to-purple-900/40 border-yellow-400/50 shadow-[0_0_20px_rgba(250,204,21,0.4)]' :
                        message.giftName === 'Galaxy' ? 'bg-black border border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]' :
                        'bg-white/10 border-white/20'
                      }`}>
                         {message.giftName === 'Galaxy' && (
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-fuchsia-600/20 via-purple-900/20 to-transparent z-0"></div>
                         )}
                         <div className={`relative z-10 font-bold text-center ${
                             message.giftName === 'Galaxy' ? 'bg-gradient-to-r from-purple-400 via-pink-500 to-amber-400 bg-[length:200%_auto] animate-pulse bg-clip-text text-transparent' :
                             message.giftName === 'Crown' ? 'text-yellow-400 drop-shadow-md' :
                             'text-white'
                         }`}>
                             Sent a {message.giftName} ({message.giftCost} Coins)
                         </div>
                      </div>
                    )}

                    {message.audioUrl && (
                      <div className="mb-1.5">
                        <AudioPlayer src={message.audioUrl} />
                      </div>
                    )}

                    {/* Render message text natively with our new function */}
                    {message.text && message.messageType !== 'gift' && renderMessageContent(message, user?.id || '')}

                    {/* Meta Row (Time & Status) */}
                    <div
                      className={`flex items-center justify-end mt-1.5 space-x-1.5 opacity-80 ${
                        isUser ? 'text-blue-100' : 'text-gray-400'
                      }`}
                    >
                      <span className="text-[10px] tracking-wide font-medium">{formatTime(message.timestamp)}</span>
                      {isUser && renderStatus(message.status)}
                    </div>
                  </div>

                  {/* Active Reactions Display */}
                  {message.reactions.length > 0 && (
                     <div className={`absolute -bottom-3.5 ${isUser ? 'right-2' : 'left-2'} z-10 flex items-center bg-white/10 backdrop-blur-xl border border-white/20 rounded-full px-1.5 py-0.5 shadow-[0_4px_16px_rgba(0,0,0,0.3)]`}>
                       {message.reactions.map((r, i) => (
                         <span key={i} className="text-[11px] leading-none drop-shadow-md">{r}</span>
                       ))}
                     </div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} className="h-2" />
      </main>

      {/* Input Area */}
      <footer className={`bg-white/5 backdrop-blur-xl border-t border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.37)] ${isBlockedByMe || isBlockedByThem ? 'p-0' : 'p-4 pb-safe'} shrink-0 w-full flex flex-col`}>
        {(isBlockedByMe || isBlockedByThem) ? (
          isBlockedByMe ? (
            <div className="w-full p-4 bg-[#050505]/95 backdrop-blur-xl border-t border-white/5 flex justify-center items-center">
              <button onClick={toggleBlock} className="px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/70 text-xs font-bold tracking-widest uppercase flex items-center gap-2">
                <Lock size={16} className="text-red-500" />
                You blocked this contact. Tap to unblock.
              </button>
            </div>
          ) : (
            <div className="w-full p-4 bg-red-950/40 backdrop-blur-xl border-t border-red-900/50 flex flex-col items-center justify-center cursor-not-allowed">
              <Lock className="text-red-500 mb-2" size={24} />
              <p className="text-red-400 font-bold tracking-widest text-xs uppercase">User Blocked</p>
              <p className="text-red-500/60 text-[10px] mt-1">You cannot send or receive messages.</p>
            </div>
          )
        ) : (
          <>

        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 10, height: 0 }}
              className="bg-white/5 backdrop-blur-3xl border border-white/20 rounded-t-2xl px-4 py-2 flex items-center justify-between mb-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
            >
               <div className="flex flex-col flex-1 truncate pr-4">
                 <span className="text-xs font-bold text-blue-400 mb-0.5">
                    Replying to {replyingTo.sender === 'user' ? 'yourself' : (currentOtherUserProfile?.name || 'User')}
                 </span>
                 <span className="text-sm text-gray-300 truncate">{replyingTo.text}</span>
               </div>
               <button type="button" onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-white p-1 bg-gray-700/50 rounded-full">
                 <X size={16} />
               </button>
            </motion.div>
          )}
        </AnimatePresence>
        <form
          onSubmit={handleSendMessage}
          className="flex items-end bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl pr-1.5 pl-4 py-1.5 focus-within:ring-1 focus-within:ring-white/20 transition-shadow shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative z-10"
        >
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder="Type a message... (use **bold** or *italic*)"
            rows={1}
            className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-white/50 py-2.5 outline-none text-[15px] resize-none min-h-[44px] max-h-32"
          />
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="flex items-center space-x-1.5 ml-2 mb-0.5 self-end">
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={handleCameraClick}
              disabled={isUploading}
              className="w-10 h-10 shrink-0 text-gray-400 hover:text-gray-200 bg-gray-900/50 hover:bg-gray-700/80 rounded-full flex items-center justify-center transition-all backdrop-blur-sm shadow-sm disabled:opacity-50"
              aria-label="Upload Image"
            >
              {isUploading ? (
                <div className="w-4 h-4 border-2 border-t-blue-500 border-gray-400 rounded-full animate-spin"></div>
              ) : (
                <Camera size={20} />
              )}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={toggleRecording}
              disabled={isUploading && !isRecording}
              className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all backdrop-blur-sm shadow-sm disabled:opacity-50 ${
                isRecording
                  ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 animate-pulse'
                  : 'bg-gray-900/50 text-gray-400 hover:text-gray-200 hover:bg-gray-700/80'
              }`}
              aria-label="Record Voice Note"
            >
              {isRecording ? (
                <span className="w-3 h-3 bg-red-500 rounded-sm"></span>
              ) : (
                <Mic size={20} />
              )}
            </motion.button>
            {!(currentOtherUserProfile as any)?.isGroup && !currentOtherUserProfile.is_bot && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => setIsGiftModalOpen(true)}
              className="w-10 h-10 shrink-0 text-gray-400 hover:text-yellow-500 bg-gray-900/50 hover:bg-gray-700/80 rounded-full flex items-center justify-center transition-all backdrop-blur-sm shadow-sm"
              aria-label="Send Gift"
            >
              <Gift size={20} />
            </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="submit"
              disabled={!inputValue.trim()}
              className="w-10 h-10 shrink-0 bg-blue-600 text-white rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:bg-gray-700 transition-colors"
            >
              <Send size={20} />
            </motion.button>
          </div>
        </form>
        <p className="text-center text-[10px] text-gray-600 mt-2 font-medium tracking-wide">
          Double-tap a message to react
        </p>
        </>
        )}
      </footer>

      <AnimatePresence>
         {isGroupModalOpen && (
            <CreateGroupModal
               isOpen={isGroupModalOpen}
               onClose={() => setIsGroupModalOpen(false)}
               userId={user?.id || ''}
               onGroupCreated={() => {
                   setIsGroupModalOpen(false);
                   setRefreshChatsKey(prev => prev + 1);
               }}
            />
         )}
      </AnimatePresence>





      {/* Theme & Wallpaper Modal */}
      <AnimatePresence>
        {isThemeModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-white font-bold text-lg">Theme & Wallpaper</h3>
                <button onClick={() => setIsThemeModalOpen(false)} className="p-2 text-white/50 hover:text-white rounded-full bg-white/5">
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 max-h-[60vh] overflow-y-auto space-y-6">
                <div>
                  <h4 className="text-white/70 text-sm font-semibold mb-3 uppercase tracking-wider">Solid Colors</h4>
                  <div className="grid grid-cols-5 gap-3">
                    {[
                      { id: 'default', value: 'bg-[#050505]', label: 'Default' },
                      { id: 'onyx', value: 'bg-[#0f1115]', label: 'Onyx' },
                      { id: 'emerald', value: 'bg-[#022c22]', label: 'Emerald' },
                      { id: 'indigo', value: 'bg-[#1e1b4b]', label: 'Indigo' },
                      { id: 'ochre', value: 'bg-[#431407]', label: 'Ochre' },
                      { id: 'charcoal', value: 'bg-[#171717]', label: 'Charcoal' }
                    ].map(theme => (
                      <div key={theme.id} className="flex flex-col items-center gap-1.5">
                        <button
                          onClick={() => saveWallpaper(theme.value)}
                          className={`w-12 h-12 rounded-full border-2 transition-all ${activeWallpaper === theme.value ? 'border-fuchsia-500 scale-110' : 'border-white/10 hover:scale-105'}`}
                          style={theme.value.startsWith('bg-[') ? {} : { backgroundColor: theme.value.replace('bg-', '') }}
                          title={theme.label}
                        >
                           <div className={`w-full h-full rounded-full ${theme.value}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-white/70 text-sm font-semibold mb-3 uppercase tracking-wider">Abstract & Patterns</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                       onClick={() => saveWallpaper('bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a]')}
                       className={`h-24 rounded-2xl border-2 transition-all bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] flex items-end p-2 ${activeWallpaper === 'bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a]' ? 'border-fuchsia-500' : 'border-white/10'}`}
                    >
                       <span className="text-xs font-bold text-white shadow-sm">Cosmic</span>
                    </button>
                    <button
                       onClick={() => saveWallpaper('bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-700 via-gray-900 to-black')}
                       className={`h-24 rounded-2xl border-2 transition-all bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-700 via-gray-900 to-black flex items-end p-2 ${activeWallpaper === 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-700 via-gray-900 to-black' ? 'border-fuchsia-500' : 'border-white/10'}`}
                    >
                       <span className="text-xs font-bold text-white shadow-sm">Wireframe</span>
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-white/70 text-sm font-semibold mb-3 uppercase tracking-wider">Premium Backdrops</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                       onClick={() => saveWallpaper('url(https://images.unsplash.com/photo-1534796636918-9ce8e18fb635?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80)')}
                       className={`h-24 rounded-2xl border-2 transition-all bg-cover bg-center flex items-end p-2 ${activeWallpaper.includes('1534796636918') ? 'border-fuchsia-500' : 'border-white/10'}`}
                       style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1534796636918-9ce8e18fb635?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80)' }}
                    >
                       <span className="text-xs font-bold text-white drop-shadow-md">Nebula</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-white/10 bg-white/5">
                <button
                  onClick={() => saveWallpaper('bg-[#050505]')}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-bold transition-all"
                >
                  Reset to Default
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase 4: Report Modal */}
      <AnimatePresence>
         {isReportModalOpen && (
            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            >
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
                        This report will be sent to the EarnMega Trust & Safety team. The user will not be notified.
                     </p>
                  </div>

                  <div className="space-y-3 mb-6">
                     {['Spam or scam', 'Inappropriate content', 'Harassment', 'Other'].map(reason => (
                        <button
                           key={reason}
                           onClick={() => setReportReason(reason)}
                           className={`w-full py-3 px-4 rounded-xl text-sm font-medium transition-all text-left ${reportReason === reason ? 'bg-rose-500 text-white border border-rose-400/50' : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'}`}
                        >
                           {reason}
                        </button>
                     ))}
                     <AnimatePresence>
                        {reportReason === 'Other' && (
                           <motion.textarea
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: '120px', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              value={reportOtherText}
                              onChange={(e) => setReportOtherText(e.target.value)}
                              className="w-full mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-fuchsia-500 resize-none transition-all"
                              placeholder="Type your exact reason here..."
                           />
                        )}
                     </AnimatePresence>
                  </div>

                  <div className="flex gap-3">
                     <button
                        onClick={() => { setIsReportModalOpen(false); setReportReason(''); setReportOtherText(''); }}
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-bold transition-all text-sm"
                     >
                        Cancel
                     </button>
                     <button
                        disabled={reportReason === "" || (reportReason === 'Other' && reportOtherText.trim() === "")}
                        onClick={async () => {
                           if (reportReason === "" || (reportReason === 'Other' && reportOtherText.trim() === "")) {
                              toast.error('Please provide a reason');
                              return;
                           }

                           const { error } = await supabase.from('reports').insert({
                              reporter_id: user?.id,
                              reported_user_id: currentOtherUserProfile?.id,
                              reason: reportReason === 'Other' ? reportOtherText : reportReason
                           });

                           if (error) {
                              toast.error(`Report Failed: ${error.message}`);
                              console.error(error);
                              return;
                           }

                           if (typeof navigator !== 'undefined' && navigator.vibrate) {
                              navigator.vibrate([50, 50, 50]);
                           }
                           toast.success('Report secured.', { icon: '🛡️', position: 'top-center' });

                           setIsReportModalOpen(false);
                           setReportReason('');
                           // Option to block immediately
                           if (!isBlockedByMe) {
                              toggleBlock();
                           }
                        }}
                        className="flex-1 py-3 bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 rounded-xl text-white font-bold transition-all text-sm shadow-[0_0_30px_rgba(225,29,72,0.5)]"
                     >
                        Submit Report
                     </button>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* Phase 4: Forward Contact Modal */}
      <AnimatePresence>
         {isForwardContactModalOpen && (
            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            >
               <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 20 }}
                  className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
               >
                  <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                     <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <Share size={18} className="text-fuchsia-400" /> Share Contact
                     </h3>
                     <button onClick={() => setIsForwardContactModalOpen(false)} className="p-2 text-white/50 hover:text-white rounded-full hover:bg-white/10">
                        <X size={20} />
                     </button>
                  </div>

                  <div className="p-4 flex-1 overflow-y-auto space-y-2">
                     <p className="text-xs text-white/50 mb-4 px-1 uppercase tracking-wider font-semibold">Select a chat to share with:</p>

                     {Array.from(exploreUsers).filter((u: any) => u.id !== currentOtherUserProfile?.id && !u.isGroup).map((u: any) => (
                        <div key={u.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/10 cursor-pointer transition-colors border border-transparent hover:border-white/10" onClick={async () => {
                           // Forward logic
                           setIsForwardContactModalOpen(false);
                           const toastId = toast.loading('Sharing contact...');
                           try {
                              await supabase.from('messages').insert({
                                 sender_id: user?.id,
                                 receiver_id: u.id,
                                 content: `$$PROFILE_SHARE$$${currentOtherUserProfile?.id}`,
                                 status: 'sent'
                              });
                              toast.success('Profile forwarded to DM.', { id: toastId });
                           } catch (err) {
                              toast.error('Failed to share contact', { id: toastId });
                           }
                        }}>
                           <div className="flex items-center gap-3">
                              <img src={u.avatarUrl || '/placeholder.svg'} alt={u.name} className="w-10 h-10 rounded-full object-cover border border-white/20" />
                              <span className="text-white font-medium text-sm">{u.name}</span>
                           </div>
                           <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 group-hover:text-fuchsia-400 group-hover:bg-fuchsia-500/20 transition-all">
                              <Send size={14} />
                           </div>
                        </div>
                     ))}
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* WhatsApp Exit Group Confirmation Modal */}
      <AnimatePresence>
         {isExitGroupConfirmOpen && (
            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            >
               <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 20 }}
                  className="bg-[#111820] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden p-6 shadow-2xl"
               >
                  <h3 className="text-xl font-bold text-white mb-2">Exit group: "{currentOtherUserProfile?.name}"?</h3>
                  <p className="text-sm text-white/60 mb-4">Only admins are notified when you leave a group.</p>

                  <div className="bg-white/5 p-3.5 rounded-2xl mb-6 flex items-start gap-3 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setReportOnExit(!reportOnExit)}>
                     <div className={`w-5 h-5 rounded border mt-0.5 flex items-center justify-center transition-all ${reportOnExit ? 'bg-emerald-500 border-emerald-500' : 'border-white/30'}`}>
                        {reportOnExit && <Check size={14} className="text-black font-bold" />}
                     </div>
                     <div className="flex-1">
                        <span className="text-white text-sm font-bold block">Report group</span>
                        <span className="text-[11px] text-white/50 leading-tight block mt-1">The last 5 messages in this group will be sent to EarnMega Trust & Safety. No one in this group will know about this report.</span>
                     </div>
                  </div>

                  <div className="flex flex-col gap-2">
                     <button
                        onClick={async () => {
                           if (!user || !currentOtherUserProfile) return;
                           const targetId = currentOtherUserProfile.id;

                           if (reportOnExit) {
                               await supabase.from('reports').insert({
                                  reporter_id: user.id,
                                  reported_user_id: targetId,
                                  content_type: 'group',
                                  reason: 'Reported on exit'
                               });
                           }

                           await supabase.from('group_members').delete().match({ group_id: targetId, user_id: user.id });
                           await supabase.from('messages').insert({
                               id: uuidv4(),
                               sender_id: user.id,
                               room_id: targetId,
                               content: `~ ${user.user_metadata?.username || user.email} left`,
                               message_type: 'system'
                           });

                           setIsExitGroupConfirmOpen(false);
                           setAppTab('chats');
                        }}
                        className="w-full py-3.5 bg-white/5 hover:bg-emerald-500/10 rounded-xl text-emerald-400 font-bold transition-all text-sm"
                     >
                        Exit group
                     </button>
                     <button
                        onClick={async () => {
                           if (!user || !currentOtherUserProfile) return;
                           const targetId = currentOtherUserProfile.id;

                           if (reportOnExit) {
                               await supabase.from('reports').insert({
                                  reporter_id: user.id,
                                  reported_user_id: targetId,
                                  content_type: 'group',
                                  reason: 'Reported on exit'
                               });
                           }

                           await supabase.from('group_members').delete().match({ group_id: targetId, user_id: user.id });
                           await supabase.from('messages').insert({
                               id: uuidv4(),
                               sender_id: user.id,
                               room_id: targetId,
                               content: `~ ${user.user_metadata?.username || user.email} left`,
                               message_type: 'system'
                           });

                           let deletedList = [];
                           try {
                               deletedList = JSON.parse(localStorage.getItem(`earnmega_deleted_chats_${user.id}`) || '[]');
                           } catch(e){}
                           deletedList.push({ id: targetId, timestamp: new Date().toISOString() });
                           localStorage.setItem(`earnmega_deleted_chats_${user.id}`, JSON.stringify(deletedList));

                           setIsExitGroupConfirmOpen(false);
                           setAppTab('chats');
                        }}
                        className="w-full py-3.5 bg-white/5 hover:bg-rose-500/10 rounded-xl text-rose-500 font-bold transition-all text-sm"
                     >
                        Exit and delete for me
                     </button>
                     <button
                        onClick={() => setIsExitGroupConfirmOpen(false)}
                        className="w-full py-3.5 bg-transparent hover:bg-white/5 rounded-xl text-white/60 font-bold transition-all text-sm mt-1"
                     >
                        Cancel
                     </button>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* Phase 4: Clear Chat Confirm Modal */}
      <AnimatePresence>
         {isClearChatConfirmOpen && (
            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            >
               <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 20 }}
                  className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6"
               >
                  <div className="flex flex-col items-center text-center">
                     <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mb-4">
                        <Trash2 size={32} className="text-rose-500" />
                     </div>
                     <h3 className="text-xl font-bold text-white mb-2">Clear History</h3>
                     <p className="text-sm text-white/60 mb-6">
                        Are you sure you want to delete all messages in this chat? This cannot be undone.
                     </p>
                  </div>

                  <div className="flex gap-3">
                     <button
                        onClick={() => setIsClearChatConfirmOpen(false)}
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-bold transition-all text-sm"
                     >
                        Cancel
                     </button>
                     <button
                        onClick={async () => {
                           if (!user || !currentOtherUserProfile) return;
                           const targetId = currentOtherUserProfile.id; // Ensure you grab the correct ID of the person being chatted with

                           // 1. Permanently delete from Supabase
                           const { error } = await supabase
                             .from('messages')
                             .delete()
                             .or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${user.id})`);

                           if (error) {
                             toast.error(`Database Error: ${error.message}`);
                             console.error(error);
                             return;
                           }

                           // 2. Clear UI state
                           setMessages([]);
                           setIsClearChatConfirmOpen(false);
                           setIsChatMenuOpen(false);
                           toast.success("Chat history permanently erased.");
                           if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([30, 50, 30]);
                        }}
                        className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 rounded-xl text-white font-bold transition-all text-sm shadow-[0_0_15px_rgba(225,29,72,0.4)]"
                     >
                        Clear Chat
                     </button>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>
</div>
  );
}
