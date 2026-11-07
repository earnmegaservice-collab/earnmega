'use client';

import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useWallet } from "../../context/WalletContext";
import { useCall } from "../../context/CallContext";
import LiveArena from "../live/LiveArena";
import { useAuth } from "../../context/AuthContext";
import { UserProfileDetails } from "../../components/profile/UserProfileModal";
import { supabase } from "../../utils/supabase";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from 'framer-motion';
import { MediaPreview } from './MediaPreview';
import VerifiedBadge from '../ui/VerifiedBadge';
import { Camera, Mic, Gift, Send, Check, CheckCheck, Clock, Menu, Play, Pause, X, Store, Lock, EyeOff, Video, Phone, PhoneMissed, Users, MoreVertical, Search, Share, ShieldAlert, Trash2, Ban, Bookmark, Settings, ChevronRight, BellOff, Download, UserPlus, ArrowLeft, UserMinus, ShieldCheck, AtSign, BarChart2, CalendarPlus, Plus, ImageIcon, FileText } from "lucide-react";
import { toast } from 'react-hot-toast';
import { submitUserReport } from '../../app/actions/submitUserReport';
import { dispatchNotificationAction } from '../../app/actions/dispatchNotificationAction';
import { deleteConversationPermanently, clearChatPermanently } from '../../utils/deleteUtils';

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
  senderId?: string;
  id: string;
  text: string;
  sender: 'user' | 'other';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  reactions: string[];
  imageUrl?: string;
  audioUrl?: string;
  replyToId?: string;
  mediaType?: 'image' | 'video' | 'audio' | string;
  replyToText?: string;
  replyToSender?: 'user' | 'other';
  replyToSenderName?: string;
  isViewOnce?: boolean;
  viewedBy?: string[];
  isDeleted?: boolean;
  isSystemMessage?: boolean;
  systemEventType?: string;
  hiddenFor?: string[];
  messageType?: 'missed_call' | 'text' | 'image' | 'audio' | 'gift' | 'completed_call' | 'system';
  duration?: string;
  giftName?: string;
  giftCost?: number;
  senderName?: string;
  senderAvatar?: string;
}

const getDeterministicColor = (id: string | undefined) => {
    if (!id) return 'text-white/70';
    const colors = [
        'text-emerald-400', 'text-amber-400', 'text-sky-400',
        'text-violet-400', 'text-rose-400', 'text-fuchsia-400',
        'text-cyan-400', 'text-indigo-400', 'text-teal-400'
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const GOD_MODE = true;
const DEFAULT_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏'];

// Helper to parse basic formatting
const formatText = (text: string) => {
  if (typeof text !== 'string' || !text) return text as any || null;
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

import { User } from "lucide-react";

const renderInviteLink = (text: string) => {
  if (typeof text !== 'string' || !text) return text as any || null;
  const inviteRegex = /https?:\/\/[^\s]+\/invite\/([a-zA-Z0-9_-]+)/g;
  const parts = text.split(inviteRegex);
  const matches = [...text.matchAll(inviteRegex)];

  if (matches.length === 0) return <span>{text}</span>;

  return (
    <span>
      {parts.map((part, i) => {
        if (i % 2 === 1) return <a key={i} href={`/invite/${part}`} className="text-blue-400 underline decoration-blue-400/50 hover:text-blue-300 font-semibold" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent("handle_invite_click", { detail: { code: part } })); }}>{matches[(i-1)/2][0]}</a>;
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

const renderTextWithMentions = (text: string) => {
  if (typeof text !== 'string' || !text) return text as any || null;
  const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
  const parts = text.split(mentionRegex);
  const matches = [...text.matchAll(mentionRegex)];

  if (matches.length === 0) return <span>{text}</span>;

  return (
    <span>
      {parts.map((part, i) => {
        if (i % 2 === 1) return <span key={i} className="text-fuchsia-400 font-bold bg-fuchsia-500/10 px-1 rounded-md cursor-pointer" onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.dispatchEvent(new CustomEvent("open_profile_by_username", { detail: { username: part } })); }}>@{matches[(i-1)/2][1]}</span>;
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

export const renderMessageContent = (message: any, currentUserId: string) => {
  const msgText = typeof message?.text === 'string' ? message.text : typeof (message as any)?.content === 'string' ? (message as any).content : '';
  if (!msgText && message.text) return <>{message.text}</>;
  if (msgText && msgText.startsWith('$PROFILE_SHARE$')) {
     const sharedId = msgText.split('$')[2];

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
  const rawContent = typeof message.text === 'string' ? message.text : typeof (message as any)?.content === 'string' ? (message as any).content : '';

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
              <img src={mediaPreview} alt="Status thumbnail" className="w-full h-full object-cover " />
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

const getCanonicalDmKey = (userA: string, userB: string) => ['dm', ...[String(userA), String(userB)].sort()].join('_');

export default function ChatInterface({ activeTab, setAppTab }: { activeTab: 'explore' | 'find' | 'chats' | 'status' | 'profile' | 'live', setAppTab: (tab: 'explore' | 'find' | 'chats' | 'status' | 'profile' | 'live') => void }) {
  const { subscriptionTier, balance, setBalance } = useWallet();
  const { initiateCall, joinCall } = useCall();
  useEffect(() => {
    const handleJoinCall = (e: CustomEvent) => {
       if (e.detail && e.detail.roomId) {
           joinCall?.(e.detail.roomId, e.detail.type || 'video');
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
  const setIsGroupInfoOpen = setIsGroupInfoDrawerOpen;
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

  const [groupPermissions, setGroupPermissions] = useState<{
    onlyAdminsCanSend: boolean;
    onlyAdminsCanEditInfo: boolean;
    onlyAdminsCanAddMembers: boolean;
    approveNewMembers: boolean;
  }>({
    onlyAdminsCanSend: false,
    onlyAdminsCanEditInfo: false,
    onlyAdminsCanAddMembers: false,
    approveNewMembers: false,
  });

  const currentUserProfileRef = useRef(currentUserProfile);
  const currentOtherUserRef = useRef<UserProfileDetails | null>(null);




  useEffect(() => {
    const handleVerificationComplete = () => {
      fetchCurrentUserProfile();
    };
    window.addEventListener('verification_complete', handleVerificationComplete);
    return () => window.removeEventListener('verification_complete', handleVerificationComplete);
  }, []);

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
        bio: data.bio || 'Avid HorPal user',
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
        bio: 'Avid HorPal user',
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

  useEffect(() => {
    currentOtherUserRef.current = otherUserProfile;
  }, [otherUserProfile]);

  useEffect(() => {
    if (activeTab !== 'chats') {
      setOtherUserProfile(null);
    }
  }, [activeTab]);

  const [groupDetails, setGroupDetails] = useState<any>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const isGroupChat = Boolean(otherUserProfile?.isGroup || otherUserProfile?.bio === 'Group Chat' || otherUserProfile?.bio?.toLowerCase() === 'group chat' || (otherUserProfile as any)?.room_id);


  const isAdmin = isGroupChat && groupMembers.some(m => m.user_id === user?.id && (m.role === 'admin' || m.role === 'owner'));

  useEffect(() => {
    if (isGroupChat) {
        console.info("[RBAC] User Authority Evaluated:", { isAdmin });
    }
  }, [isGroupChat, isAdmin]);

  useEffect(() => {
    if (!otherUserProfile) return;

    if (isGroupChat || otherUserProfile.isGroup || otherUserProfile.bio === 'Group Chat') {
      const fetchGroup = async () => {
        let { data: group } = await supabase.from('rooms').select('*').eq('id', otherUserProfile.id).maybeSingle();
        if (!group) {
          const { data: fallback } = await supabase.from('rooms').select('*').eq('name', otherUserProfile.name).limit(1).maybeSingle();
          group = fallback;
        }

        if (group) {
          setGroupDetails(group);
          const { data: members } = await supabase.from('room_participants').select('*, profiles(id, username, full_name, avatar_url)').eq('room_id', group.id);
          if (members) setGroupMembers(members);
        }
      };

      fetchGroup();

      const groupSub = supabase.channel(`group_updates_${otherUserProfile.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${otherUserProfile.id}` }, (payload) => {
           setGroupDetails(payload.new);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_participants', filter: `room_id=eq.${otherUserProfile.id}` }, async () => {
           const { data: members } = await supabase.from('room_participants').select('*, profiles(id, username, full_name, avatar_url)').eq('room_id', otherUserProfile.id);
           if (members) setGroupMembers(members);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(groupSub);
      };
    } else {
       setGroupDetails(null);
       setGroupMembers([]);
    }
  }, [otherUserProfile?.id, isGroupChat]);

 

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
                  // Real-Time Message Hydration (Optimistic update for incoming messages)
                  if (msg.sender_id !== user.id) {
                     let senderName;
                     let senderAvatar;

                     if (currentOtherUserProfile && (currentOtherUserProfile as any).isGroup && msg.message_type !== 'system' && !msg.is_system_message) {
                        const member = groupMembers.find(m => m.user_id === msg.sender_id);
                        if (member && member.profiles) {
                            senderName = member.profiles.full_name || member.profiles.username;
                            senderAvatar = member.profiles.avatar_url;
                        } else {
                            // Fallback fetch
                            supabase.from('profiles').select('full_name, username, avatar_url').eq('id', msg.sender_id).single().then(({data: p}) => {
                                if (p) {
                                    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, senderName: p.full_name || p.username, senderAvatar: p.avatar_url } : m));
                                }
                            });
                        }
                     }

                     setMessages(prev => {
                         // Check if already in list
                         if (prev.some(m => m.id === msg.id)) return prev;
                         const newMessage: Message = {
                            id: msg.id,
                            text: msg.content || '',
                            sender: 'other',
                            timestamp: new Date(msg.created_at || Date.now()),
                            status: msg.status || 'delivered',
                            reactions: [],
                            imageUrl: msg.image_url,
                            audioUrl: msg.audio_url,
                            isViewOnce: msg.is_view_once,
                            replyToId: msg.reply_to_id,
                            isSystemMessage: msg.message_type === 'system' || msg.is_system_message === true || false,
                            messageType: msg.message_type === 'system' ? 'system' : undefined,
                            systemEventType: msg.system_event_type || null,
                            senderName,
                            senderId: msg.sender_id,
                            senderAvatar,
                         };
                         return [...prev, newMessage];
                     });
                  } else {
                     setRefreshChatsKey(prev => prev + 1);
                  }
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

  const isGroupAdmin = Boolean(
    isGroupChat && (
      (currentOtherUserProfile as any)?.created_by === user?.id ||
      (currentOtherUserProfile as any)?.owner_id === user?.id ||
      groupMembers.some(m => (m.user_id === user?.id || m.profiles?.id === user?.id) && (m.role === 'admin' || m.role === 'owner'))
    )
  );

  useEffect(() => {
    if (currentOtherUserProfile === null) {
      const fetchExploreUsers = async () => {
        if (!user) return;
        setIsChatsLoading(true);
        setChatsFetchError(null);
        try {
          // 1. Fetch Groups the user is part of
          const { data: roomsData, error: roomsError } = await supabase
              .from('room_participants')
              .select('room_id, is_deleted, rooms ( id, name, created_at )')
              .eq('user_id', user.id);

          if (roomsError) throw roomsError;

          let localDeletedRooms: string[] = [];
          try {
             localDeletedRooms = JSON.parse(localStorage.getItem(`earnmega_deleted_rooms_${user.id}`) || '[]');
          } catch(e) {}

          let rawGroups = (roomsData || [])
            .filter(gm => gm.is_deleted !== true && gm.rooms != null && !localDeletedRooms.includes(gm.room_id))
            .map((gm: any) => ({
               id: gm.rooms?.id,
               name: gm.rooms?.name || "Unknown Group",
               avatarInitials: (gm.rooms?.name?.[0] || "G").toUpperCase() + (gm.rooms?.name?.[1] || "R").toUpperCase(),
               avatarUrl: undefined as string | undefined,
               bio: 'Group Chat',
               joinDate: new Date(gm.rooms?.created_at || Date.now()).toLocaleDateString(),
               tier: 'FREE' as const,
               isOnline: true,
               coinsGifted: 0,
               isSelf: false,
               isGroup: true,
               unreadCount: 0,
               lastMessageTime: 0
            }));

          const roomsFormatted = Array.from(new Map(rawGroups.map(r => [r.id, r])).values());

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
              if (otherUser && !localDeletedRooms.includes(otherUser.id)) {
                  statsMap.set(otherUser.id, {
                      unreadCount: 0,
                      lastMessageTime: 0
                  });
                  formattedProfiles.push({
                      id: otherUser.id,
                      name: otherUser.username || otherUser.name || 'User',
                      avatarInitials: (otherUser.username || otherUser.name || 'U').substring(0, 2).toUpperCase(),
                      avatarUrl: otherUser.avatar_url,
                      bio: otherUser.bio || 'HorPal user',
                      joinDate: otherUser.created_at ? new Date(otherUser.created_at).toLocaleDateString() : 'Unknown',
                      tier: otherUser.subscription_tier || 'FREE',
                      isOnline: onlineUsers.has(otherUser.id),
                      coinsGifted: otherUser.coins_gifted || 0,
                      isSelf: false,
                      unreadCount: 0,
                      lastMessageTime: 0,
                      isVerified: otherUser.is_verified || false
                  });
              }
            });
          }

          // 3. Fetch Unread Counters and Latest Message Time for Groups and DMs correctly
          const groupIds = roomsFormatted.map(g => g.id);
          let allTargetIds = [...groupIds];
          if (formattedProfiles.length > 0) {
              allTargetIds = [...allTargetIds, ...formattedProfiles.map(p => p.id)];
          }

          if (allTargetIds.length > 0) {
              const { data: messagesData, error: msgError } = await supabase
                .from('messages')
                .select('id, sender_id, receiver_id, room_id, created_at, status, is_read, content')
                .or(`room_id.in.(${groupIds.join(',')}),and(room_id.is.null,or(sender_id.eq.${user.id},receiver_id.eq.${user.id}))`)
                .order('created_at', { ascending: false })
                .limit(1000);

              if (!msgError && messagesData) {
                // Keep track of group config updates for avatars
                const latestConfigs = new Map<string, any>();

                messagesData.forEach(msg => {
                  let targetId = msg.room_id;
                  if (!targetId) {
                      targetId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
                  }
                  if (!targetId) return;

                  const time = new Date(msg.created_at).getTime();
                  const isConfigMsg = typeof msg.content === 'string' && msg.content.startsWith('[GROUP_CONFIG_JSON]');

                  if (isConfigMsg && msg.room_id) {
                      if (!latestConfigs.has(targetId)) {
                          try {
                              const conf = JSON.parse(msg.content.replace('[GROUP_CONFIG_JSON]', ''));
                              latestConfigs.set(targetId, conf);
                          } catch (e) {}
                      }
                  }

                  const isUnread = !isConfigMsg && msg.sender_id !== user.id && (time > Number(localStorage.getItem(`earnmega_last_read_${user.id}_${targetId}`) || 0)) && (msg.is_read === false || (msg.is_read == null && msg.status !== 'read'));

                  if (!statsMap.has(targetId)) {
                    statsMap.set(targetId, { unreadCount: 0, lastMessageTime: 0 });
                  }

                  const stats = statsMap.get(targetId)!;
                  if (!isConfigMsg) {
                      stats.lastMessageTime = Math.max(stats.lastMessageTime, time);
                  }

                  if (isUnread) {
                    stats.unreadCount += 1;
                  }
                });

                roomsFormatted.forEach(room => {
                    const conf = latestConfigs.get(room.id);
                    if (conf && conf.avatar_url) {
                        room.avatarUrl = conf.avatar_url;
                    } else if (conf && conf.name) {
                        room.name = conf.name;
                    }
                });
                if (isGroupChat && latestConfigs.has(currentOtherUserProfile.id)) {
                     // Pass latest permissions to state for the lock banner
                     const conf = latestConfigs.get(currentOtherUserProfile.id);
                     setGroupDetails(prev => ({ ...prev, ...conf }));
                }
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
                      bio: u.bio || 'HorPal user',
                      joinDate: u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Unknown',
                      tier: u.subscription_tier || 'FREE',
                      isOnline: onlineUsers.has(u.id),
                      coinsGifted: u.coins_gifted || 0,
                      isSelf: false,
                      unreadCount: 0,
                      lastMessageTime: 0,
                      isVerified: u.is_verified || false
                  }));
              }
          }

          // 5. Unify and Sort WhatsApp Style (newest activity at the absolute top)

          // 4.5 Fetch missing chat partners from recent activity
          let localActivity2: Record<string, {text: string, timestamp: number}> = {};
          try {
             const actStr = localStorage.getItem('horpal_chat_activity_' + user.id);
             if (actStr) localActivity2 = JSON.parse(actStr);
          } catch(e) {}

          const existingIds = new Set([...roomsFormatted.map(r => r.id), ...formattedProfiles.map(p => p.id)]);
          const missingIds = Object.keys(localActivity2).filter(id => !existingIds.has(id));

          if (missingIds.length > 0) {
             const { data: missingProfiles } = await supabase
                .from('profiles')
                .select('*')
                .in('id', missingIds);

             if (missingProfiles) {
                 const newFormatted = missingProfiles.map(u => ({
                      id: u.id,
                      name: u.username || u.name || 'User',
                      avatarInitials: (u.username || u.name || 'U').substring(0, 2).toUpperCase(),
                      avatarUrl: u.avatar_url,
                      bio: u.bio || 'HorPal user',
                      joinDate: u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Unknown',
                      tier: u.subscription_tier || 'FREE',
                      isOnline: onlineUsers.has(u.id),
                      coinsGifted: u.coins_gifted || 0,
                      isSelf: false,
                      unreadCount: 0,
                      lastMessageTime: 0,
                      isVerified: u.is_verified || false
                 }));
                 formattedProfiles.push(...newFormatted);
             }
          }

          let allUsers = [...roomsFormatted, ...formattedProfiles];

          let localActivity: Record<string, {text: string, timestamp: number}> = {};
          try {
             const actStr = localStorage.getItem('horpal_chat_activity_' + user.id);
             if (actStr) localActivity = JSON.parse(actStr);
          } catch(e) {}

          allUsers = allUsers.map(u => {
             const stats = statsMap.get(u.id);
             const unreadCount = stats ? stats.unreadCount : 0;
             let lastMessageTime = stats ? stats.lastMessageTime : 0;

             // Merge with local activity if newer
             if (localActivity[u.id] && localActivity[u.id].timestamp > lastMessageTime) {
                lastMessageTime = localActivity[u.id].timestamp;
             }

             return { ...u, unreadCount, lastMessageTime };
          });

          // Sort strictly by lastMessageTime DESCENDING
          allUsers.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

          console.info("[CHAT LIST] Hydrated Chats:", allUsers);
          setExploreUsers(allUsers);
        } catch (error) {
          console.error("[CHAT LIST ERROR] Failed to fetch conversations:", error);
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

      const cached = loadCachedChatMessages(user.id, currentOtherUserProfile.id);
      if (cached.length > 0) {
          setMessages(cached);
      } else {
          setMessages([]); // Clear stale messages if no cache
      }

      try {
        let query = supabase.from('messages').select('*');

        if (isGroupChat) {
             query = query.or(`room_id.eq.${currentOtherUserProfile.id},receiver_id.eq.${currentOtherUserProfile.id}`);
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

        let currentClearedAt: Date | null = null;
        if (isGroupChat && user) {
            const member = groupMembers.find(m => m.user_id === user.id);
            if (member && member.cleared_at) {
                currentClearedAt = new Date(member.cleared_at);
            }
        }

        if (data && data.length > 0) {
          const isGroupConfigRow = (text?: string | null) => Boolean(text && text.trim().startsWith('[GROUP_CONFIG_JSON]'));
          const formattedMessages: Message[] = data.filter(msg => {
             if (currentClearedAt) {
                 const msgTime = new Date(msg.created_at);
                 if (msgTime < currentClearedAt) return false;
             }
             if (isGroupConfigRow(msg.content || msg.text)) return false;
             return true;
          }).map(msg => {
            let text = msg.content || '';
            let replyToId, replyToSender, replyToText;
            let messageType = msg.message_type === 'system' ? 'system' : undefined;
            let giftName, giftCost;

            const giftMatch = text.match(/^\[GIFT:(.*?):(.*?):(\d+)\](.*)/);
            if (giftMatch) {
               messageType = 'gift';
               giftName = giftMatch[2];
               giftCost = Number(giftMatch[3]);
               text = msg.sender_id === user.id
                 ? `Sent a ${giftName} (${giftCost} Coins)`
                 : `Received a ${giftName} (${giftCost} Coins)`;
            }

            const replyMatch = text.match(/^\[REPLY:(.*?):(user|other):(.*?)\]\n\n/);
            if (replyMatch) {
               replyToId = replyMatch[1];
               // Ensure correct reply sender attribution relative to current viewing user
               replyToSender = replyMatch[2] === (msg.sender_id === user.id ? 'user' : 'other') ? 'user' : 'other';
               replyToText = replyMatch[3];
               text = text.replace(/^\[REPLY:.*?\]\n\n/, '');
            }

            let senderName;
            let senderAvatar;

            if (isGroupChat && msg.sender_id !== user.id && msg.message_type !== 'system' && !msg.is_system_message) {
                const member = groupMembers.find(m => m.user_id === msg.sender_id);
                if (member && member.profiles) {
                    senderName = member.profiles.full_name || member.profiles.username;
                    senderAvatar = member.profiles.avatar_url;
                }
            }

            return {
              id: msg.id,
              text,
              sender: msg.sender_id === user.id ? 'user' : 'other',
              timestamp: new Date(msg.created_at),
              reactions: [],
              status: msg.status || 'read',
              imageUrl: msg.image_url,
              audioUrl: msg.audio_url,
              replyToId,
              replyToSender,
              replyToText,
              isSystemMessage: msg.message_type === 'system' || msg.is_system_message === true || false,
              messageType: messageType as any,
              giftName,
              giftCost,
              systemEventType: msg.system_event_type || null,
              senderName,
                            senderId: msg.sender_id,
              senderAvatar,
            };
          });

          // Fetch fallback profiles for group members not in groupMembers state yet
          if (isGroupChat) {
             const missingSenderIds = [...new Set(data
                .filter(msg => msg.sender_id !== user?.id && msg.message_type !== 'system' && !msg.is_system_message)
                .map(msg => msg.sender_id)
                .filter(id => !groupMembers.some(m => m.user_id === id)))];

             if (missingSenderIds.length > 0) {
                 const { data: fallbackProfiles } = await supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', missingSenderIds);
                 if (fallbackProfiles) {
                     formattedMessages.forEach(msg => {
                         if (msg.sender === 'other' && !msg.senderName && missingSenderIds.includes(data.find(d => d.id === msg.id)?.sender_id)) {
                             const p = fallbackProfiles.find(fp => fp.id === data.find(d => d.id === msg.id)?.sender_id);
                             if (p) {
                                 msg.senderName = p.full_name || p.username;
                                 msg.senderAvatar = p.avatar_url;
                             }
                         }
                     });
                 }
             }
          }



          // Load deleted IDs
          let deletedIds: string[] = [];
          try {
             deletedIds = JSON.parse(localStorage.getItem(`horpal_deleted_msgs_${user.id}`) || '[]');
          } catch(e) {}

          // Merge with cache (Deduplicate by ID or identical sender+text within 10s)
          const merged = [...cached];
          formattedMessages.forEach(fm => {
             if (deletedIds.includes(fm.id) || fm.isDeleted) return; // Skip deleted

             const isDuplicate = merged.some(m =>
                 m.id === fm.id ||
                 (m.senderId === fm.senderId && m.text === fm.text && Math.abs(m.timestamp.getTime() - fm.timestamp.getTime()) < 10000)
             );

             if (!isDuplicate) {
                 merged.push(fm);
             }
          });
          merged.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          setMessages(merged);
          saveCachedChatMessages(user.id, currentOtherUserProfile.id, merged);

          // Mark unread messages from the other user as read
          const unreadMessageIds = data
            .filter(msg => msg.sender_id !== user.id && (msg.status !== 'read' || msg.is_read === false))
            .map(msg => msg.id);

          // Clear local unread badge count unconditionally when opening chat
          localStorage.setItem(`earnmega_last_read_${user.id}_${currentOtherUserProfile.id}`, String(Date.now()));
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



  // Block 3: BUMP CHAT HELPER
  const bumpChatToTop = (chatId: string, previewText: string, isIncoming = false) => {
    if (!user) return;
    const now = Date.now();
    try {
      const activityKey = 'horpal_chat_activity_' + user.id;
      const activityStr = localStorage.getItem(activityKey);
      const activity = activityStr ? JSON.parse(activityStr) : {};
      activity[chatId] = { text: previewText, timestamp: now };
      localStorage.setItem(activityKey, JSON.stringify(activity));
    } catch(e) {}

    setExploreUsers(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(u => u.id === chatId);
      let userToMove;
      if (idx !== -1) {
        userToMove = updated[idx];
        updated.splice(idx, 1);
      } else {
        // We shouldn't strictly create a blank profile here, but we'll try to find it via profiles if needed later
        // Just return prev for now if not found, since they should exist
        return prev;
      }
      updated.unshift({
        ...userToMove,
        lastMessageTime: now,
        unreadCount: isIncoming && currentOtherUserProfile?.id !== chatId ? (userToMove.unreadCount || 0) + 1 : (userToMove.unreadCount || 0)
      });
      return updated.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
    });
  };


  // Block 2: CACHE HELPERS
  const loadCachedChatMessages = (userId: string, chatId: string): Message[] => {
    try {
      const stored = localStorage.getItem('horpal_chat_msgs_' + userId + '_' + chatId);
      if (stored) {
         const parsed = JSON.parse(stored);
         return parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
         }));
      }
    } catch (e) {}
    return [];
  };

  const saveCachedChatMessages = (userId: string, chatId: string, msgs: Message[]) => {
    try {
      // Filter out blobs unless permanent url exists
      const safeMsgs = msgs.map(m => {
        if (m.imageUrl?.startsWith('blob:')) {
           return { ...m, imageUrl: undefined };
        }
        if (m.audioUrl?.startsWith('blob:')) {
           return { ...m, audioUrl: undefined };
        }
        return m;
      });
      // Keep last 100
      localStorage.setItem('horpal_chat_msgs_' + userId + '_' + chatId, JSON.stringify(safeMsgs.slice(-100)));
    } catch (e) {}
  };

  const openProfile = (userProfile: UserProfileDetails) => {
    setSelectedProfile(userProfile);
    setIsProfileOpen(true);
  };

  useEffect(() => {
    if (user?.id && currentOtherUserProfile?.id && messages.length > 0) {
       saveCachedChatMessages(user.id, currentOtherUserProfile.id, messages);
    }
  }, [messages, user?.id, currentOtherUserProfile?.id]);

  const [inputValue, setInputValue] = useState('');
  const [activeReactionId, setActiveReactionId] = useState<string | null>(null);
    const [activeContextMenuId, setActiveContextMenuId] = useState<string | null>(null);
  const [adminDeleteMessageId, setAdminDeleteMessageId] = useState<string | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaCaption, setMediaCaption] = useState<string>("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);



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
        if (currentOtherUserRef.current?.id === payload.payload.senderId) {
           setMessages((prev) => {
             // Deduplicate by ID just in case
             if (prev.some(m => m.id === newMessage.id)) return prev;
             return [...prev, newMessage];
           });
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
             let text = data.content || data.text || '';
             let replyToId, replyToSender, replyToText;
             let messageType = data.message_type === 'system' ? 'system' : undefined;
             let giftName, giftCost;

             const giftMatch = text.match(/^\[GIFT:(.*?):(.*?):(\d+)\](.*)/);
             if (giftMatch) {
               messageType = 'gift';
               giftName = giftMatch[2];
               giftCost = Number(giftMatch[3]);
               text = `Received a ${giftName} (${giftCost} Coins)`;
             }

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
               replyToText,
               messageType: messageType as any,
               giftName,
               giftCost
             };
             setMessages((prev) => {
               if (prev.some(m => m.id === newMessage.id)) return prev;
               return [...prev, newMessage];
             });

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
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("scroll", handleClickOutside, true);
    };
  }, []);

  useEffect(() => {
    const handleOpenProfileByUsername = async (e: CustomEvent) => {
       if (e.detail && e.detail.username) {
           const { data } = await supabase.from("profiles").select("*").eq("username", e.detail.username).maybeSingle();
           if (data) {
               openProfile(data);
           }
       }
    };
    window.addEventListener("open_profile_by_username", handleOpenProfileByUsername as EventListener);
    return () => window.removeEventListener("open_profile_by_username", handleOpenProfileByUsername as EventListener);
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

  const handleDeleteGroup = async () => {
    if (!user || !currentOtherUserProfile) return;
    const targetId = currentOtherUserProfile.id;

    try {
      const { error } = await supabase.rpc('delete_group', { room_id_param: targetId });

      if (error) {
        console.warn("[SECURITY] Unauthorized Mutation Attempt Blocked", error);
        toast.error("Failed to delete group. You may not have permission.");
        return;
      }

      console.info("[DB] Mutation Successful - Group deleted");
      toast.success("Group deleted successfully");
      setIsChatMenuOpen(false);
      setAppTab('chats');
    } catch (err) {
      console.warn("[SECURITY] Unauthorized Mutation Attempt Blocked", err);
      toast.error("An error occurred while deleting the group.");
    }
  };


  const handleForwardMessage = async (receiverIds: string[]) => {
    if (!messageToForward || !user) return;

    const content = typeof messageToForward.text === 'string' ? `[FORWARDED]\n${messageToForward.text}` : typeof (messageToForward as any)?.content === 'string' ? `[FORWARDED]\n${(messageToForward as any).content}` : '';

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
       const replyText = typeof replyingTo.text === 'string' ? replyingTo.text : typeof (replyingTo as any)?.content === 'string' ? (replyingTo as any).content : '';
       finalContentToSave = `[REPLY:${replyingTo.id}:${replyingTo.sender}:${replyText.substring(0, 50).replace(/\[REPLY:[\s\S]*?\]\n\n/g, '')}]` + "\n\n" + textContent;
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
      replyToText: typeof currentReplyingTo?.text === 'string' ? currentReplyingTo.text.replace(/\[REPLY:[\s\S]*?\]\n\n/g, '') : typeof (currentReplyingTo as any)?.content === 'string' ? (currentReplyingTo as any).content.replace(/\[REPLY:[\s\S]*?\]\n\n/g, '') : '',
      replyToSender: currentReplyingTo?.sender,
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      let finalChatId = undefined;
      if (!(currentOtherUserProfile as any).isGroup) {
         const dmKey = getCanonicalDmKey(user.id, currentOtherUserProfile.id);
         const { data: existingChat } = await supabase.from('chats')
            .select('id')
            .or(`id.eq.${dmKey},and(user1_id.eq.${user.id},user2_id.eq.${currentOtherUserProfile.id}),and(user1_id.eq.${currentOtherUserProfile.id},user2_id.eq.${user.id})`)
            .maybeSingle();

         if (!existingChat) {
            await supabase.from('chats').insert({
               id: dmKey,
               user1_id: user.id,
               user2_id: currentOtherUserProfile.id,
               updated_at: new Date().toISOString()
            });
         } else {
            // Update updated_at of existing chat
            await supabase.from('chats').update({ updated_at: new Date().toISOString() }).eq('id', existingChat.id);
         }
         finalChatId = existingChat ? existingChat.id : dmKey;
      }

      const isGroup = Boolean((currentOtherUserProfile as any)?.isGroup || (currentOtherUserProfile as any)?.is_group);

      const coreInsertData: Record<string, any> = {
          id: optimisticMessage.id,
          sender_id: user.id,
          content: finalContentToSave,
      };

      if (isGroup) {
          coreInsertData.room_id = currentOtherUserProfile.id;
      } else {
          coreInsertData.receiver_id = currentOtherUserProfile.id;
      }

      let { data, error } = await supabase
        .from('messages')
        .insert(coreInsertData)
        .select()
        .single();

      if (error) {
        // Retry without client-generated id
        const minimalPayload: Record<string, any> = {
          sender_id: user.id,
          content: finalContentToSave,
          ...(isGroup ? { room_id: currentOtherUserProfile.id } : { receiver_id: currentOtherUserProfile.id })
        };
        const retry = await supabase.from('messages').insert(minimalPayload).select().single();
        data = retry.data;
        error = retry.error;
        // Don't throw error to prevent message wiping!
        if (error) console.error("Failed to insert message:", error);
      }

      bumpChatToTop(currentOtherUserProfile.id, finalContentToSave, false);

      if (!(currentOtherUserProfile as any).isGroup) {
         try {
           await supabase.from('notifications').insert({
             user_id: currentOtherUserProfile.id,
             actor_id: user.id,
             type: 'MESSAGE',
             content: `New message: ${finalContentToSave.substring(0, 50)}`,
             is_read: false
           });
         } catch (e) {
           console.error("Failed to insert notification for DM", e);
         }
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
      // Keep optimistic message in UI for permanent cache, do NOT filter out
      setMessages((prev) => prev.map((msg) => msg.id === optimisticMessage.id ? { ...msg, status: 'sent' } : msg));
      toast.error('Network issue, message saved locally.');
    }
  };

    // Create isVideoMessage helper
  const isVideoMessage = (msg: Message) => {
    if (msg.mediaType === 'video') return true;
    if (msg.imageUrl && /\.(mp4|webm|ogg|mov|m4v|mkv)(\?.*|#.*)?$/i.test(msg.imageUrl)) return true;
    return false;
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
      content: `[GIFT:${giftData.id}:${giftData.name}:${giftData.cost}] Sent a ${giftData.name} (${giftData.cost} Coins)`,
      message_type: 'gift',
      status: 'sent'
    }).then(({ error }) => {
       if (error) console.error("Error inserting gift message", error);
    });

    supabase.from('notifications').insert({
       user_id: currentOtherUserProfile?.id,
       actor_id: user?.id,
       type: 'chat_gift',
       content: `🎁 Sent you a ${giftData.name} (${giftData.cost} Coins)`,
       title: `${currentUserProfile?.name || 'Someone'} sent you a gift in DM`,
       metadata: { gift_id: giftData.id, gift_name: giftData.name, gift_cost: giftData.cost, sender_id: user?.id, sender_name: currentUserProfile?.name }
    }).then(({ error }) => {
       if (error) console.error("Error inserting gift notification", error);
    });

    // Trigger local animation via custom event for sender
    const customEvent = new CustomEvent('gift_received_local', { detail: { giftData: giftData, senderId: currentUserProfile?.id, receiverId: currentOtherUserProfile?.id, isSender: true } });
    window.dispatchEvent(customEvent);

    // Broadcast gift event via Supabase Realtime
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'gift_received',
        payload: { messageId: newMessage.id, gift_type: giftData, senderId: currentUserProfile?.id, senderName: currentUserProfile?.name, senderAvatar: currentUserProfile?.avatarUrl, receiverId: currentOtherUserProfile?.id }
      });

      channelRef.current.send({
        type: 'broadcast',
        event: 'new_message',
        payload: {
           messageId: newMessage.id,
           senderId: user?.id,
           receiverId: currentOtherUserProfile?.id
        }
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

  const uploadMediaFile = async (file: File | Blob, type: 'image' | 'audio' | 'video', caption?: string, originalName?: string) => {
    setIsUploading(true);
    try {
      let fileExt = 'jpg';
      if (originalName) {
        fileExt = originalName.split('.').pop() || fileExt;
      } else {
        if (type === 'audio') fileExt = 'webm';
        if (type === 'video') fileExt = 'mp4';
      }
      let fileName = `${uuidv4()}.${fileExt}`;

      const filePath = `${fileName}`;

      let uploadErrorToThrow = null;
      let finalUrl = '';

      const { error: uploadError1 } = await supabase.storage.from('chat-media').upload(filePath, file);
      if (!uploadError1) {
        finalUrl = supabase.storage.from('chat-media').getPublicUrl(filePath).data.publicUrl;
      } else {
         const { error: uploadError2 } = await supabase.storage.from('public-assets').upload('chat-media/' + filePath, file);
         if (!uploadError2) {
             finalUrl = supabase.storage.from('public-assets').getPublicUrl('chat-media/' + filePath).data.publicUrl;
         } else {
             const { error: uploadError3 } = await supabase.storage.from('avatars').upload('chat-media/' + filePath, file);
             if (!uploadError3) {
                 finalUrl = supabase.storage.from('avatars').getPublicUrl('chat-media/' + filePath).data.publicUrl;
             } else {
                 // Try base64 fallback for images
                 if (type === 'image') {
                     finalUrl = await new Promise((resolve) => {
                         const reader = new FileReader();
                         reader.onload = (e) => {
                            const img = new Image();
                            img.onload = () => {
                                const canvas = document.createElement('canvas');
                                const MAX = 900;
                                let w = img.width; let h = img.height;
                                if (w > MAX) { h *= MAX/w; w = MAX; }
                                canvas.width = w; canvas.height = h;
                                canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
                                resolve(canvas.toDataURL('image/jpeg', 0.72));
                            };
                            img.src = e.target?.result as string;
                         };
                         reader.readAsDataURL(file as Blob);
                     });
                 } else {
                     throw new Error('All storage buckets failed');
                 }
             }
         }
      }

      const publicUrl = finalUrl;

      const msgId = uuidv4();
      const newMessage: Message = {
        id: msgId,
        text: caption || '',
        imageUrl: (type === 'image' || type === 'video') ? finalUrl : undefined,
        audioUrl: type === 'audio' ? finalUrl : undefined,
        sender: 'user',
        timestamp: new Date(),
        status: 'sent',
        reactions: [],
        isViewOnce: type === 'image' ? isViewOnceMode : false,
        viewedBy: [],
      };

      setMessages((prev) => [...prev, newMessage]);

      if (user && currentOtherUserProfile) {
        const isGroup = Boolean(isGroupChat || (currentOtherUserProfile as any)?.isGroup || (currentOtherUserProfile as any)?.is_group);
        const mediaInsert: Record<string, any> = {
           id: newMessage.id,
           sender_id: user.id,
           content: caption || (type === 'video' ? '[VIDEO]' : '[IMAGE]'),
           image_url: type === 'video' ? publicUrl + '#video' : (type === 'image' ? publicUrl : null),
           audio_url: type === 'audio' ? publicUrl : null,
           ...(isGroup ? { room_id: currentOtherUserProfile.id } : { receiver_id: currentOtherUserProfile.id })
        };

        let { error: mediaErr } = await supabase.from('messages').insert(mediaInsert);
        if (mediaErr && mediaErr.message?.includes('image_url')) {
           // Fallback to encode in content
           mediaInsert.content = `[MEDIA_URL:${publicUrl}]${caption || ''}`;
           mediaInsert.image_url = null;
           mediaInsert.audio_url = null;
           await supabase.from('messages').insert(mediaInsert);
        }
        bumpChatToTop(currentOtherUserProfile.id, mediaInsert.content || 'Media message', false);

        channelRef.current?.send({
           type: 'broadcast',
           event: 'new_message',
           payload: {
             messageId: msgId,
             id: msgId,
             senderId: user.id,
             senderName: currentUserProfile?.name,
             senderAvatar: currentUserProfile?.avatarUrl,
             receiverId: isGroupChat ? null : currentOtherUserProfile.id,
             roomId: isGroupChat ? currentOtherUserProfile.id : null,
             content: caption || '',
             imageUrl: (type === 'image' || type === 'video') ? finalUrl : undefined,
             audioUrl: type === 'audio' ? finalUrl : undefined,
             createdAt: new Date().toISOString()
           }
        });
      }

      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === msgId ? { ...msg, status: 'delivered' } : msg
          )
        );
      }, 1000);
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
      setIsViewOnceMode(false); // Reset toggle after upload
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File must be under 50MB');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    await uploadMediaFile(file, file.type.startsWith('video/') ? 'video' : 'image', file.name);
  };

  const handleMediaSend = async () => {
     if (!mediaFile) return;
     setIsUploading(true);
     const isVideo = typeof mediaFile.type === 'string' && (mediaFile.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|m4v|avi)$/i.test(mediaFile.name));
     await uploadMediaFile(mediaFile, isVideo ? 'video' : 'image', mediaCaption, mediaFile.name);
     setIsUploading(false);
     cancelMediaPreview();
  };

  const cancelMediaPreview = () => {
     setMediaPreviewUrl(null);
     setMediaFile(null);
     setMediaCaption('');
  };

  const handleAvatarProfileClick = async (userId: string) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (data && !error) {
        openProfile({
          id: data.id,
          name: data.username || data.full_name || "User",
          avatarInitials: (data.username || data.full_name || "U").substring(0, 2).toUpperCase(),
          avatarUrl: data.avatar_url,
          bio: data.bio || "Avid HorPal user",
          tier: data.subscription_tier,
          isVerified: data.is_verified,
          ...data
        });
      }
    } catch (err) {
      console.error("Failed to load profile", err);
    }
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
                   onClick={() => {
                     console.log('Create Group Button Tapped - State Updated');
                     setIsGroupModalOpen(true);
                   }}
                   className="absolute bottom-6 right-6 w-14 h-14 bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)] rounded-full flex items-center justify-center transition-all z-[9999] touch-manipulation cursor-pointer pointer-events-auto"
                >
                   <Users size={24} />
                </button>
              </div>
            )}

            {activeTab === 'status' && (
              <StatusTab onStatusClick={handleStatusClick} currentUserProfile={currentUserProfile} />
            )}

            <AnimatePresence>
              {activeTab === 'live' && (
                <LiveArena onClose={() => setAppTab('explore')} />
              )}
            </AnimatePresence>

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

                 dispatchNotificationAction({
                    recipientId: viewingStatuses.groupId,
                    actorId: user.id,
                    type: 'STATUS_LIKED',
                    title: 'Status Liked',
                    body: `${user.user_metadata?.username || 'Someone'} liked your status`
                 }).catch(console.error);

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
      <header className="bg-black/60 backdrop-blur-xl px-4 py-3 border-b border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.37)] flex items-center shrink-0 sticky top-0 z-20 cursor-pointer select-none" onClick={() => setIsGroupInfoOpen(true)}>
        <button
          onClick={(e) => { e.stopPropagation(); setOtherUserProfile(null); }}
          className="mr-3 p-1.5 rounded-full hover:bg-white/10 text-white/70 transition-colors"
        >
          <X size={20} />
        </button>

        <div
          onClick={(e) => { e.stopPropagation(); if (isGroupChat) setIsGroupInfoOpen(true); else openProfile(currentOtherUserProfile); }}
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
        <div className="flex-1 min-w-0 cursor-pointer" onClick={(e) => { e.stopPropagation(); if (isGroupChat) setIsGroupInfoOpen(true); else openProfile(currentOtherUserProfile); }}>
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
          <p className="text-xs text-white/50 truncate font-medium flex items-center">
              {isGroupChat ? (
                groupMembers.length > 0 ? (
                  <span className="truncate">~You, {groupMembers.map(m => '~' + (m.profiles?.username || m.profiles?.full_name || m.username || 'User')).join(', ')}</span>
                ) : (
                  <span className="cursor-pointer select-none" onClick={() => setIsGroupInfoDrawerOpen(true)}>Tap here for group info</span>
                )
              ) : (
                <>
                  <Clock size={10} className="mr-1 opacity-70" />
                  {currentOtherUserProfile.isOnline ? (
                    <span className="text-emerald-400">Online now</span>
                  ) : (
                    <span>Last seen {currentOtherUserProfile.last_seen && !currentOtherUserProfile.ghost_mode ? new Date(currentOtherUserProfile.last_seen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'recently'}</span>
                  )}
                </>
              )}
            </p>
        </div>

        {/* Header Icons */}
        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0 ml-auto mr-2" onClick={(e) => e.stopPropagation()}>
          {isGroupChat ? (
            <>
              <button onClick={() => toast("Search coming soon!", { icon: "🔍" })} className="p-2 sm:p-2.5 rounded-full hover:bg-white/10 text-white/70 transition-all active:scale-95 flex items-center justify-center">
                <Search size={20} className="sm:w-[22px] sm:h-[22px]" />
              </button>
              <div className="relative">
                <button
                   onClick={() => setIsChatMenuOpen(!isChatMenuOpen)}
                   className="p-2 sm:p-2.5 rounded-full hover:bg-white/10 text-white/70 transition-all active:scale-95 flex items-center justify-center"
                >
                   <MoreVertical size={20} className="sm:w-[22px] sm:h-[22px]" />
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
  <button
    onClick={() => {
      setIsChatMenuOpen(false);
      setIsGroupInfoDrawerOpen(true);
    }}
    className="px-4 py-2.5 text-sm text-left text-white/90 hover:bg-white/10 transition-colors duration-200 flex items-center gap-3 rounded-lg font-semibold"
  >
    <Users size={16} className="text-fuchsia-400" /> Group Info & Members
  </button>
  <button
    onClick={() => {
      setIsChatMenuOpen(false);
      setIsThemeModalOpen(true);
    }}
    className="px-4 py-2.5 text-sm text-left text-white/90 hover:bg-white/10 transition-colors duration-200 flex items-center gap-3 rounded-lg"
  >
    <Camera size={16} className="text-white/50" /> Theme & Wallpaper
  </button>
  <div className="h-px w-full bg-white/10 my-1"></div>
  <button
    onClick={() => {
      setIsChatMenuOpen(false);
      setIsClearChatConfirmOpen(true);
    }}
    className="px-4 py-2.5 text-sm text-left text-rose-400 hover:bg-white/10 transition-colors duration-200 flex items-center gap-3 rounded-lg"
  >
    <Trash2 size={16} className="text-rose-400/50" /> {groupMembers.some(m => m.user_id === user?.id && (m.role === 'admin' || m.role === 'owner')) ? 'Clear Message History' : 'Clear Chat for Me'}
  </button>
  <button
    onClick={() => {
      setIsChatMenuOpen(false);
      setIsExitGroupConfirmOpen(true);
    }}
    className="px-4 py-2.5 text-sm text-left text-amber-400 hover:bg-white/10 transition-colors duration-200 flex items-center gap-3 rounded-lg"
  >
    <UserMinus size={16} className="text-amber-400/70" /> Exit Group
  </button>
  {groupMembers.some(m => m.user_id === user?.id && (m.role === 'admin' || m.role === 'owner')) && (
    <button
      onClick={handleDeleteGroup}
      className="px-4 py-2.5 text-sm text-left text-red-500 hover:bg-red-500/10 transition-colors duration-200 flex items-center gap-3 rounded-lg font-bold"
    >
      <Trash2 size={16} className="text-red-500" /> Delete Group
    </button>
  )}
</div>
                         </motion.div>
                      </>
                   )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <button onClick={() => {
                if (currentOtherUserProfile) {
                  const roomId = `call_${uuidv4()}`;
                  // Broadcast to receivers
                  supabase.channel('public:calls').send({
                     type: 'broadcast',
                     event: 'INCOMING_CALL',
                     payload: { roomId, callerName: currentUserProfile?.name, callerAvatar: currentUserProfile?.avatarUrl, callType: 'audio', receiverId: currentOtherUserProfile.id }
                  });
                  // Local event
                  window.dispatchEvent(new CustomEvent('horpal:join-call', { detail: { roomId, callType: 'audio' } }));
                }
              }} className="p-2 sm:p-2.5 rounded-full hover:bg-white/10 text-emerald-400 transition-all active:scale-95 flex items-center justify-center bg-emerald-500/10">
                 <Phone size={20} className="sm:w-[22px] sm:h-[22px]" />
              </button>
              <button onClick={() => {
                if (currentOtherUserProfile) {
                  const roomId = `call_${uuidv4()}`;
                  // Broadcast to receivers
                  supabase.channel('public:calls').send({
                     type: 'broadcast',
                     event: 'INCOMING_CALL',
                     payload: { roomId, callerName: currentUserProfile?.name, callerAvatar: currentUserProfile?.avatarUrl, callType: 'video', receiverId: currentOtherUserProfile.id }
                  });
                  // Local event
                  window.dispatchEvent(new CustomEvent('horpal:join-call', { detail: { roomId, callType: 'video' } }));
                }
              }} className="p-2 sm:p-2.5 rounded-full hover:bg-white/10 text-emerald-400 transition-all active:scale-95 flex items-center justify-center bg-emerald-500/10">
                 <Video size={20} className="sm:w-[22px] sm:h-[22px]" />
              </button>
              <button
                onClick={() => {
                  setStoreTab('BUY_COINS');
                  setIsStoreOpen(true);
                }}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/20 hover:from-amber-400/40 hover:to-amber-600/40 border border-amber-400/30 flex items-center justify-center transition-all ml-2 shrink-0"
              >
                <Store size={14} className="text-amber-400" />
              </button>

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
                                    <Trash2 size={16} className="text-rose-400/50" /> Clear Chat for Me
                                 </button>
                              </div>
                           </motion.div>
                        </>
                     )}
                  </AnimatePresence>
              </div>
            </>
          )}
        </div>
</header>
      {showSearchBar && (
         <div className="bg-neutral-900 border-b border-white/10 p-3 sticky top-[72px] z-30">
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
                <input
                   type="text"
                   autoFocus
                   placeholder="Search in chat..."
                   onChange={(e) => {
                      const q = e.target.value.toLowerCase();
                      if (!q) return;
                      const msgElements = document.querySelectorAll('.text-\\[15px\\]');
                      msgElements.forEach(el => {
                         if (el.textContent?.toLowerCase().includes(q)) {
                             el.parentElement?.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                             (el.parentElement as HTMLElement).style.boxShadow = '0 0 0 2px #f59e0b';
                             setTimeout(() => {
                                 (el.parentElement as HTMLElement).style.boxShadow = 'none';
                             }, 2000);
                         }
                      });
                   }}
                   className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
                <button onClick={() => setShowSearchBar(false)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white">
                   <X size={16} />
                </button>
            </div>
         </div>
      )}
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
          const isVideo = message.imageUrl?.includes('#video') || message.imageUrl?.match(/\.(mp4|webm|ogg)$/i);
          const msgText = typeof message?.text === 'string' ? message.text : typeof (message as any)?.content === 'string' ? (message as any).content : '';

          if (message.isSystemMessage || (msgText && msgText.startsWith('$$SYSTEM$$')) || (message.messageType as any) === 'system') {
              const text = msgText.startsWith('$$SYSTEM$$') ? msgText.substring(10).trim() : msgText;
              return (
                  <div key={message.id} className="my-2 flex justify-center select-none">
                      <span className="px-3.5 py-1 rounded-full bg-zinc-900/90 border border-white/10 text-[11px] text-zinc-300 text-center shadow-sm max-w-[85%]">{text}</span>
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
                   {!isUser && isGroupChat && (
                      <div className="w-6 h-6 rounded-full self-end shrink-0 mb-1 flex items-center justify-center bg-white/10 overflow-hidden">
                        {message.senderAvatar ? (
                           <img src={message.senderAvatar} className="w-full h-full object-cover cursor-pointer" onClick={(e) => { e.stopPropagation(); const targetId = message.senderId || (message as any).sender_id; if (targetId) handleAvatarProfileClick(targetId); }} />
                        ) : (
                           <span className="text-[10px] font-bold text-white/50 cursor-pointer" onClick={(e) => { e.stopPropagation(); const targetId = message.senderId || (message as any).sender_id; if (targetId) handleAvatarProfileClick(targetId); }}>{(message.senderName || 'U').substring(0,2).toUpperCase()}</span>
                        )}
                      </div>
                   )}

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
              {!isUser && (
              <div className={`flex items-center space-x-1.5 mb-1 ${isUser ? 'mr-1' : 'ml-9'}`}>
                {isUser && (subscriptionTier?.toLowerCase() === 'premium' || subscriptionTier?.toLowerCase() === 'pro') && (
                   <motion.span animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} className="px-1 py-0.5 rounded-sm text-[7px] font-black tracking-widest uppercase bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 bg-[length:200%_auto] text-black shadow-[0_0_5px_rgba(251,191,36,0.4)] border border-amber-400/50">VIP</motion.span>
                )}

                <span
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isUser && isGroupChat && message.senderId) {
                        handleAvatarProfileClick(message.senderId);
                      }
                    }}
                    className={`text-xs drop-shadow-sm font-bold ${!isUser && isGroupChat ? 'cursor-pointer hover:underline ' + getDeterministicColor(message.senderId) : ''} ${
                  (isUser && (subscriptionTier?.toLowerCase() === 'premium' || subscriptionTier?.toLowerCase() === 'pro')) || (!isUser && !isGroupChat && (currentOtherUserProfile.tier?.toLowerCase() === 'premium' || currentOtherUserProfile.tier?.toLowerCase() === 'pro'))
                    ? 'bg-gradient-to-r from-fuchsia-400 via-pink-400 to-amber-400 bg-clip-text text-transparent drop-shadow-md font-black'
                    : (!isUser && isGroupChat ? '' : 'text-white/70')
                }`}>
                  {isUser && currentUserProfile ? currentUserProfile.name : (isGroupChat ? (message.senderName || 'User') : currentOtherUserProfile.name)}
                </span>

                {!isUser && !isGroupChat && (currentOtherUserProfile.tier?.toLowerCase() === 'premium' || currentOtherUserProfile.tier?.toLowerCase() === 'pro') && (
                   <motion.span animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} className="px-1 py-0.5 rounded-sm text-[7px] font-black tracking-widest uppercase bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 bg-[length:200%_auto] text-black shadow-[0_0_5px_rgba(251,191,36,0.4)] border border-amber-400/50">VIP</motion.span>
                )}
              </div>

              )}

              {/* Message Bubble Row */}
              <div className={`flex items-end space-x-2 max-w-[85%] relative`}>

                {/* Avatar for other */}
                {!isUser && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isGroupChat) {
                        const targetId = message.senderId || (message as any).sender_id;
                        if (targetId) handleAvatarProfileClick(targetId);
                      } else if (currentOtherUserProfile) {
                        openProfile(currentOtherUserProfile);
                      }
                    }}
                    className={`relative w-6 h-6 rounded-full flex items-center justify-center shrink-0 mb-1 cursor-pointer transition-colors shadow-[0_4px_16px_rgba(0,0,0,0.3)] ${
                      !isGroupChat && currentOtherUserProfile.tier?.toLowerCase() === 'premium' ? 'p-[1.5px]' :
                      !isGroupChat && currentOtherUserProfile.tier?.toLowerCase() === 'pro' ? 'bg-gradient-to-tr from-amber-400 to-yellow-600 p-[1.5px]' :
                      'border border-white/20 hover:border-white/40 bg-white/5 backdrop-blur-md'
                    }`}
                  >
                    {!isGroupChat && currentOtherUserProfile.tier?.toLowerCase() === 'premium' && (
                      <div className="absolute inset-[-1.5px] rounded-full bg-gradient-to-r from-amber-400 via-purple-500 to-amber-400 animate-spin-slow" />
                    )}
                    <div className="relative w-full h-full rounded-full bg-neutral-900 flex items-center justify-center overflow-hidden z-10">
                      {isGroupChat ? (
                          message.senderAvatar ? (
                             <img src={message.senderAvatar} className="w-full h-full object-cover rounded-full" />
                          ) : (
                             <span className="text-[10px] text-white/70 font-bold">{(message.senderName || 'U').substring(0,2).toUpperCase()}</span>
                          )
                      ) : (
                          currentOtherUserProfile.avatarUrl ? (
                             <img src={currentOtherUserProfile.avatarUrl} alt={currentOtherUserProfile.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                             <span className="text-[10px] text-white/70 font-bold">{currentOtherUserProfile.avatarInitials}</span>
                          )
                      )}
                    </div>
                  </div>
                )}

                {false && currentUserProfile && (
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
                      if (isUser || isAdmin) {
                         setActiveContextMenuId(message.id);
                      }
                    }}
                    onTouchStart={() => {
                      if (isUser || isAdmin) {
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
                            <button onClick={() => {
                              console.log('Create Group Button Tapped - State Updated');
                              setIsGroupModalOpen(true);
                            }} className="px-4 py-2 text-sm font-bold text-white hover:bg-white/10 flex items-center justify-between transition-colors w-full">
                               <span>Create Group with User</span>
                            </button>

                            <button
                               onClick={() => {
                                 if (isAdmin) {
                                    setAdminDeleteMessageId(message.id);
                                    setActiveContextMenuId(null);
                                 } else {
                                    handleDeleteForMe(message.id);
                                 }
                               }}
                               className="px-4 py-2 text-sm font-bold text-red-400 hover:bg-white/10 flex items-center justify-between transition-colors w-full"
                            >
                               <span>Delete</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {message.replyToText && (
                      <div className={`mb-2 p-2 rounded-lg text-sm border-l-2 backdrop-blur-md shadow-inner ${isUser ? 'bg-white/10 border-blue-300 text-blue-50' : 'bg-black/20 border-white/30 text-gray-200'}`}>
                         <span className="font-bold text-[10px] uppercase tracking-wider opacity-75 mb-0.5 block">
                           {message.replyToSender === 'user' ? (currentUserProfile?.name || 'You') : (message.replyToSenderName || (isGroupChat ? 'Member' : (currentOtherUserProfile?.name || 'User')))}
                         </span>
                         <span className="line-clamp-2 text-xs italic">{message.replyToText}</span>
                      </div>
                    )}
                    {msgText.startsWith('[FORWARDED]\n') && !msgText.replace('[FORWARDED]\n', '') && (
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
                            {isVideo ? (
                              <video
                                src={message.imageUrl}
                                controls
                                playsInline
                                className="max-w-[200px] w-full rounded-xl object-cover transition-transform duration-500 group-hover:scale-105"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <motion.img
                                layoutId={`image-${message.imageUrl}`}
                                src={message.imageUrl}
                                alt="Uploaded media"
                                className="max-w-[200px] w-full rounded-xl object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
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

                  {(message as any).messageType === 'poll' && (
                     <div className="mb-2 p-3 bg-black/40 rounded-xl border border-purple-500/30 flex flex-col shrink-0 min-w-[200px]">
                        <span className="text-sm font-bold text-white mb-2">📊 {(message as any).text}</span>
                        <div className="space-y-2">
                           <button className="w-full text-left bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-sm transition-colors border border-white/10">Option 1</button>
                           <button className="w-full text-left bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-sm transition-colors border border-white/10">Option 2</button>
                        </div>
                     </div>
                  )}
                  {(message as any).messageType === 'event' && (
                     <div className="mb-2 p-3 bg-black/40 rounded-xl border border-amber-500/30 flex flex-col shrink-0 min-w-[200px]">
                        <span className="text-sm font-bold text-white mb-1">🗓️ {(message as any).text}</span>
                        <span className="text-xs text-white/60 mb-2">Group Event</span>
                        <button className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold px-3 py-1.5 rounded-lg text-sm transition-colors">Going</button>
                     </div>
                  )}
                    {message.text && message.messageType !== 'gift' && (
      <div className="text-[15px] leading-relaxed break-words whitespace-pre-wrap font-medium">
         {typeof message.text === "string" && message.text.includes("/invite/")
            ? renderInviteLink(message.text)
            : renderMessageContent({...message, text: typeof message.text === "string" ? renderTextWithMentions(message.text) : message.text}, user?.id || "")}
      </div>
  )}
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
      {(isBlockedByMe || isBlockedByThem) ? (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#050505]/95 backdrop-blur-xl border-t border-red-900/50 p-4 flex justify-center pb-safe">
          {isBlockedByMe ? (
            <button
              onClick={async () => {
                if (!user || !currentOtherUserProfile) return;
                const { error } = await supabase.from('blocked_users').delete().eq('blocker_id', user.id).eq('blocked_id', currentOtherUserProfile.id);
                if (error) {
                   toast.error(`Unblock Failed: ${error.message}`);
                   return;
                }
                setIsBlockedByMe(false);
                toast.success("Contact restored.");
              }}
              className="px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 text-xs font-bold uppercase tracking-widest flex items-center gap-2"
            >
              <Lock size={16} className="text-emerald-500" />
              Tap to Unblock & Resume
            </button>
          ) : (
            <div className="flex flex-col items-center justify-center cursor-not-allowed">
              <Lock className="text-red-500 mb-1" size={20} />
              <p className="text-red-400 font-bold tracking-widest text-xs uppercase">User Blocked</p>
            </div>
          )}
        </div>
      ) : (
        <footer className="bg-white/5 backdrop-blur-xl border-t border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.37)] p-4 pb-safe shrink-0 w-full flex flex-col">
        <AnimatePresence>
          {mediaPreviewUrl && (
            <MediaPreview
              url={mediaPreviewUrl}
              onCancel={cancelMediaPreview}
              onSend={handleMediaSend}
              isUploading={isUploading}
              isViewOnce={isViewOnceMode}
              onToggleViewOnce={() => setIsViewOnceMode(!isViewOnceMode)}
              caption={mediaCaption}
              onCaptionChange={(e) => setMediaCaption(e.target.value)}
              isVideo={mediaFile ? (typeof mediaFile.type === 'string' && (mediaFile.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|m4v|avi)$/i.test(mediaFile.name))) : false}
            />
          )}
        </AnimatePresence>
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
                    Replying to {replyingTo.sender === 'user' ? 'yourself' : (replyingTo.senderName || 'Member')}
                 </span>
                 <span className="text-sm text-gray-300 truncate">{replyingTo.text}</span>
               </div>
               <button type="button" onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-white p-1 bg-gray-700/50 rounded-full">
                 <X size={16} />
               </button>
            </motion.div>
          )}
        </AnimatePresence>

      {isGroupChat && groupMembers.find(m => m.profiles?.id === user?.id)?.has_accepted_invite === false && (
        <div className="bg-[#1c1c1e]/90 backdrop-blur-xl border-t border-white/5 p-4 flex flex-col items-center justify-center space-y-3 shrink-0 relative z-20 w-full mb-2 rounded-2xl">
           <p className="text-white/70 text-sm">You were added to this group</p>
           <div className="flex w-full space-x-3 max-w-sm">
             <button className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/90 text-sm font-semibold transition-colors">Exit group</button>
             <button className="flex-1 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm font-semibold transition-colors border border-emerald-500/30">Stay</button>
           </div>
        </div>
      )}
{(groupDetails?.only_admins_message || groupDetails?.only_admins_can_send) && !groupMembers.some(m => m.user_id === user?.id && (m.role === 'admin' || m.role === 'owner')) ? (
        <div className="w-full py-4 bg-black/60 backdrop-blur-xl rounded-3xl border border-white/10 relative z-20 text-center text-white/50 text-sm">
          🔒 Only admins can send messages to this group.
        </div>
      ) : isGroupChat && groupPermissions.onlyAdminsCanSend && !isGroupAdmin ? (
        <div className="w-full py-3.5 px-4 bg-zinc-900/90 backdrop-blur-xl rounded-2xl border border-amber-500/30 text-center text-amber-300 text-xs font-bold tracking-wide flex items-center justify-center gap-2">
          <Lock className="text-amber-400 shrink-0" size={14} />
          <span>Only admins can send messages in this group</span>
        </div>
      ) : (
        <form
          onSubmit={handleSendMessage}
          className="flex items-end bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl pr-1.5 pl-4 py-1.5 focus-within:ring-1 focus-within:ring-white/20 transition-shadow shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative z-10"
        >


          <input
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime,video/*"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />

          {mentionQuery !== null && isGroupChat && (
              <div className="absolute bottom-full mb-2 left-0 w-64 max-h-48 overflow-y-auto bg-black/90 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl z-50 py-1">
                  {isAdmin && (
                      <div onClick={() => { setInputValue(prev => prev.slice(0, inputRef.current?.selectionStart || 0).replace(/@\w*$/, `@everyone `) + prev.slice(inputRef.current?.selectionStart || 0)); setMentionQuery(null); inputRef.current?.focus(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 cursor-pointer transition-colors">
                          <div className="w-8 h-8 rounded-full bg-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 font-black shrink-0">@</div>
                          <div className="flex flex-col min-w-0">
                              <span className="text-sm font-bold text-white truncate">Everyone</span>
                              <span className="text-xs text-white/50 truncate">Notify all members</span>
                          </div>
                      </div>
                  )}
                  {groupMembers.filter(m => m.profiles && (m.profiles.username?.toLowerCase().includes(mentionQuery.toLowerCase()) || m.profiles.full_name?.toLowerCase().includes(mentionQuery.toLowerCase()))).map(m => (
                      <div key={m.user_id} onClick={() => { setInputValue(prev => prev.slice(0, inputRef.current?.selectionStart).replace(/@\w*$/, `@${m.profiles.username} `) + prev.slice(inputRef.current?.selectionStart || 0)); setMentionQuery(null); inputRef.current?.focus(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 cursor-pointer transition-colors">
                          <img src={m.profiles.avatar_url || ""} className="w-8 h-8 rounded-full object-cover shrink-0 bg-white/10" />
                          <div className="flex flex-col min-w-0">
                              <span className="text-sm font-bold text-white truncate">{m.profiles.full_name || m.profiles.username}</span>
                              <span className="text-xs text-white/50 truncate">@{m.profiles.username}</span>
                          </div>
                      </div>
                  ))}
              </div>
          )}

          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
               const val = e.target.value;
               setInputValue(val);
               const cursorPosition = e.target.selectionStart;
               const textBeforeCursor = val.slice(0, cursorPosition);
               const match = textBeforeCursor.match(/@(\w*)$/);
               if (match) {
                   setMentionQuery(match[1]);
               } else {
                   setMentionQuery(null);
               }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder={isGroupChat ? "Type a group message..." : "Type a message..."}
            rows={1}
            className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-white/50 py-2.5 outline-none text-[15px] resize-none min-h-[44px] max-h-32 px-2"
          />

          <div className="flex items-center space-x-1.5 ml-1 mb-0.5 self-end">
            {!inputValue.trim() && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={handleCameraClick}
                  disabled={isUploading}
                  className="w-10 h-10 shrink-0 text-gray-400 hover:text-white bg-transparent rounded-full flex items-center justify-center transition-all disabled:opacity-50"
                  aria-label="Upload Image"
                >
                  {isUploading ? (
                    <div className="w-4 h-4 border-2 border-t-blue-500 border-gray-400 rounded-full animate-spin"></div>
                  ) : (
                    <Camera size={22} />
                  )}
                </motion.button>
            )}

            {!isGroupChat && !currentOtherUserProfile.is_bot && !inputValue.trim() && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => setIsGiftModalOpen(true)}
              className="w-10 h-10 shrink-0 text-gray-400 hover:text-yellow-500 bg-transparent rounded-full flex items-center justify-center transition-all"
              aria-label="Send Gift"
            >
              <Gift size={22} />
            </motion.button>
            )}

            {inputValue.trim() ? (
                <motion.button
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileTap={{ scale: 0.9 }}
                  type="submit"
                  className="w-10 h-10 shrink-0 bg-emerald-500 text-white rounded-full flex items-center justify-center focus:outline-none shadow-lg shadow-emerald-500/20"
                >
                  <Send size={18} className="ml-0.5" />
                </motion.button>
            ) : (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={toggleRecording}
                  disabled={isUploading && !isRecording}
                  className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all disabled:opacity-50 ${
                    isRecording
                      ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 animate-pulse'
                      : 'text-gray-400 hover:text-white bg-transparent'
                  }`}
                  aria-label="Record Voice Note"
                >
                  {isRecording ? (
                    <span className="w-3 h-3 bg-red-500 rounded-sm"></span>
                  ) : (
                    <Mic size={22} />
                  )}
                </motion.button>
            )}
          </div>
        </form>
          )}

        <p className="text-center text-[10px] text-gray-600 mt-2 font-medium tracking-wide">
          Double-tap a message to react
        </p>
      </footer>
      )}

      <AnimatePresence>
         {isGroupModalOpen && (
            <CreateGroupModal
               isOpen={isGroupModalOpen}
               onClose={() => setIsGroupModalOpen(false)}
               userId={user?.id || ''}
               onGroupCreated={(room, members) => {
                   setIsGroupModalOpen(false);
                   setRefreshChatsKey(prev => prev + 1);
                   if (room) {
                       const groupProfile = {
                           id: room.id,
                           name: room.name,
                           avatarInitials: (room.name || 'GR').substring(0, 2).toUpperCase(),
                           avatarUrl: room.avatar_url,
                           bio: room.description || 'Group Chat',
                           isGroup: true,
                           isOnline: true,
                       };
                       setOtherUserProfile(groupProfile as any);
                       setGroupDetails(room);
                       if (members) {
                           setGroupMembers(members);
                       }
                   }
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
                        This report will be sent to the HorPal Trust & Safety team. The user will not be notified.
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
                        onClick={async (e) => {
                           e.preventDefault();
                           if (reportReason === "" || (reportReason === 'Other' && reportOtherText.trim() === "")) {
                              toast.error('Please provide a reason');
                              return;
                           }

                           const reportedId = currentOtherUserProfile?.id;
                           const targetId = typeof reportedId === 'string' ? reportedId : (reportedId as any)?.id;

                           if (!targetId || !user?.id) {
                              toast.error("Invalid target user ID.");
                              return;
                           }

                           const { data: { session } } = await supabase.auth.getSession();

                           const formData = new FormData();
                           formData.append('reportedUserId', targetId);
                           formData.append('reason', reportReason === 'Other' ? reportOtherText : reportReason);
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

                           if (typeof navigator !== 'undefined' && navigator.vibrate) {
                              navigator.vibrate([50, 50, 50]);
                           }

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

                                      {!isBlockedByMe && (
                                        <button
                                          onClick={() => {
                                            toast.dismiss(t.id);
                                            toggleBlock();
                                          }}
                                          className="mt-3 px-4 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-lg transition-all"
                                        >
                                          Block User Now
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ), { duration: 5000 });

                           setIsReportModalOpen(false);
                           setReportReason('');
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
                        <span className="text-[11px] text-white/50 leading-tight block mt-1">The last 5 messages in this group will be sent to HorPal Trust & Safety. No one in this group will know about this report.</span>
                     </div>
                  </div>

                  <div className="flex flex-col gap-2">
                     <button
                        onClick={async (e) => {
                           e.preventDefault();
                           if (!user || !currentOtherUserProfile) return;
                           const targetId = currentOtherUserProfile.id;

                           if (reportOnExit) {
                               const { data: { session } } = await supabase.auth.getSession();

                               const formData = new FormData();
                               formData.append('reportedUserId', targetId);
                               formData.append('contentType', 'group');
                               formData.append('reason', 'Reported on exit');
                               if (session?.user?.id) formData.append('reporterId', session.user.id);
                               if (session?.access_token) formData.append('accessToken', session.access_token);

                               const result = await submitUserReport(formData);
                               if (result.success) {
                                   toast.success('Report submitted securely');
                               }
                           }

                           // Insert system message about user leaving FIRST so it doesn't fail foreign keys
                           await supabase.from('messages').insert({
                               id: uuidv4(),
                               sender_id: user.id,
                               room_id: targetId,
                               content: `~ ${user.user_metadata?.username || user.email} left`,
                               message_type: 'system'
                           });

                           // Use unified permanently delete utils for exits/deletes
                           await deleteConversationPermanently(user.id, targetId, true, false);

                           setIsExitGroupConfirmOpen(false);
                           setAppTab('chats');
                        }}
                        className="w-full py-3.5 bg-white/5 hover:bg-emerald-500/10 rounded-xl text-emerald-400 font-bold transition-all text-sm"
                     >
                        Exit group
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
                           const targetId = currentOtherUserProfile.id;

                           try {
                               const isAdmin = groupMembers.some(m => m.user_id === user.id && (m.role === 'admin' || m.role === 'owner'));
                               await clearChatPermanently(user.id, targetId, isGroupChat, isAdmin);

                               // 2. Clear UI state
                               setMessages([]);
                               setIsClearChatConfirmOpen(false);
                               setIsChatMenuOpen(false);
                               toast.success("Chat history permanently erased.");
                               if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([30, 50, 30]);
                           } catch (error: any) {
                               toast.error(`Database Error: ${error.message}`);
                               console.error(error);
                           }
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

      {/* Admin Delete Message Confirmation Modal */}
      <AnimatePresence>
         {adminDeleteMessageId && (
            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
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
                     <h3 className="text-xl font-bold text-white mb-2">Delete Message</h3>
                     <p className="text-sm text-white/60 mb-6">
                        Are you sure you want to delete this message?
                     </p>
                  </div>

                  <div className="flex flex-col gap-3">
                     <button
                        onClick={() => {
                           handleDeleteForEveryone(adminDeleteMessageId);
                           setAdminDeleteMessageId(null);
                        }}
                        className="w-full py-3 bg-rose-600 hover:bg-rose-500 rounded-xl text-white font-bold transition-all text-sm shadow-[0_0_15px_rgba(225,29,72,0.4)]"
                     >
                        Delete for Everyone
                     </button>
                     <button
                        onClick={() => {
                           handleDeleteForMe(adminDeleteMessageId);
                           setAdminDeleteMessageId(null);
                        }}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-bold transition-all text-sm"
                     >
                        Delete for Me
                     </button>
                     <button
                        onClick={() => setAdminDeleteMessageId(null)}
                        className="w-full py-3 bg-transparent border border-white/20 hover:bg-white/5 rounded-xl text-white font-bold transition-all text-sm mt-2"
                     >
                        Cancel
                     </button>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* Group Info Drawer mounted in the Active Chat View */}
      {isGroupChat && user?.id && currentOtherUserProfile && (
        <GroupInfoDrawer
          isOpen={isGroupInfoDrawerOpen}
          onClose={() => setIsGroupInfoDrawerOpen(false)}
          groupId={groupDetails?.id || currentOtherUserProfile.id}
          groupName={groupDetails?.name || currentOtherUserProfile.name}
          groupAvatar={groupDetails?.avatar_url || currentOtherUserProfile.avatarUrl}
          currentUserId={user.id}
          onGroupUpdated={() => {
            setRefreshChatsKey((prev) => prev + 1);
          }}
          onSelectUserDM={(targetUserId) => {
            setIsGroupInfoDrawerOpen(false);
            handleAvatarProfileClick(targetUserId);
          }}
          onStartGroupCall={(callType) => {
            setIsGroupInfoDrawerOpen(false);
            initiateCall?.(
              currentOtherUserProfile.id,
              currentOtherUserProfile.name,
              currentOtherUserProfile.avatarUrl,
              callType,
              true
            );
          }}
        />
      )}
</div>
  );
}
