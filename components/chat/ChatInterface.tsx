'use client';

import EarnmegaWalletHeader from "../../components/chat/EarnmegaWalletHeader";
import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useWallet } from "../../context/WalletContext";
import { useAuth } from "../../context/AuthContext";
import { UserProfileDetails } from "../../components/profile/UserProfileModal";
import { supabase } from "../../utils/supabase";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Mic, Gift, Send, Check, CheckCheck, Menu } from 'lucide-react';

const UserProfileModal = dynamic(() => import("../../components/profile/UserProfileModal"), { ssr: false });
const CoinStoreModal = dynamic(() => import("../../components/wallet/CoinStoreModal"), { ssr: false });
const GiftModal = dynamic(() => import("../../components/chat/GiftModal"), { ssr: false });
const NavigationDrawer = dynamic(() => import("../../components/chat/NavigationDrawer"), { ssr: false });

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'other';
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
  reactions: string[];
  imageUrl?: string;
  audioUrl?: string;
};

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

export default function ChatInterface() {
  const { subscriptionTier, balance } = useWallet();
  const { user, isLoading } = useAuth();
  const [selectedProfile, setSelectedProfile] = useState<UserProfileDetails | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isTierLockModalOpen, setIsTierLockModalOpen] = useState(false);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeGift, setActiveGift] = useState<{ id: string, icon: React.ReactNode } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const channelRef = useRef<any>(null);

  const currentUserProfile: UserProfileDetails | null = user ? {
    id: user.id,
    name: user.email?.split('@')[0] || 'User',
    avatarInitials: (user.email?.[0] || 'U').toUpperCase() + (user.email?.[1] || 'S').toUpperCase(),
    bio: 'Avid Earnmega user',
    joinDate: 'Oct 2023',
    tier: subscriptionTier,
    isOnline: true,
    coinsGifted: 1500,
    isSelf: true,
  } : null;


  const [otherUserProfile, setOtherUserProfile] = useState<UserProfileDetails>({
    id: 'other-1',
    name: 'Earnmega Support',
    avatarInitials: 'EM',
    bio: 'Here to help you with anything.',
    joinDate: 'Jan 2023',
    tier: 'PREMIUM',
    isOnline: true,
    coinsGifted: 50000,
    isSelf: false,
  });

  const openProfile = (userProfile: UserProfileDetails) => {
    setSelectedProfile(userProfile);
    setIsProfileOpen(true);
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! Welcome to **Earnmega**. How can I help you today?',
      sender: 'other',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      reactions: ['👋'],
    },
    {
      id: '2',
      text: 'Hi! I wanted to check out the new features. *Looks great!*',
      sender: 'user',
      timestamp: new Date(Date.now() - 1000 * 60 * 4),
      status: 'read',
      reactions: ['❤️'],
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [activeReactionId, setActiveReactionId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const channel = supabase.channel('chat-events')
      .on('broadcast', { event: 'gift_sent' }, (payload) => {
        if (payload.payload.senderId !== currentUserProfile?.id) {
          setActiveGift({ id: payload.payload.giftData.id, icon: payload.payload.giftData.icon });
          setTimeout(() => setActiveGift(null), 3000);

          const newMessage: Message = {
            id: Date.now().toString(),
            text: `🎁 Received a **${payload.payload.giftData.name}** gift!`,
            sender: 'other',
            timestamp: new Date(),
            reactions: [],
          };
          setMessages((prev) => [...prev, newMessage]);
        }
      });

    channel.subscribe((status) => {
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

  // Handle outside clicks to close reaction tray
  useEffect(() => {
    const handleClickOutside = () => setActiveReactionId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
      status: 'sent',
      reactions: [],
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');

    // Simulate delivery statuses
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessage.id ? { ...msg, status: 'delivered' } : msg
        )
      );
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === newMessage.id ? { ...msg, status: 'read' } : msg
          )
        );
      }, 1500);
    }, 1000);

    // Simulate automated response only for Earnmega Support
    if (otherUserProfile.name === 'Earnmega Support') {
      setTimeout(() => {
        const responseMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Thanks for exploring! Let me know if you need ~help~ anything else.',
          sender: 'other',
          timestamp: new Date(),
          reactions: [],
        };
        setMessages((prev) => [...prev, responseMessage]);
      }, 2000);
    }
  };

  const handleMediaClick = () => {
    if (subscriptionTier === 'FREE') {
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
    // Show Full Screen Animation
    setActiveGift({ id: giftData.id, icon: giftData.icon });
    setTimeout(() => setActiveGift(null), 3000);

    const newMessage: Message = {
      id: Date.now().toString(),
      text: `🎁 Sent a **${giftData.name}** gift!`,
      sender: 'user',
      timestamp: new Date(),
      status: 'sent',
      reactions: [],
    };
    setMessages((prev) => [...prev, newMessage]);

    // Broadcast gift event via Supabase Realtime
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'gift_sent',
        payload: { giftData, senderId: currentUserProfile?.id }
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
      };

      setMessages((prev) => [...prev, newMessage]);
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
      };
      setMessages((prev) => [...prev, newMessage]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await uploadMediaFile(file, 'image', file.name);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const renderStatus = (status?: 'sent' | 'delivered' | 'read') => {
    if (!status) return null;
    return (
      <span className="ml-1 flex items-center shrink-0">
        {status === 'sent' && <Check size={14} className="text-gray-400" />}
        {status === 'delivered' && <CheckCheck size={14} className="text-gray-400" />}
        {status === 'read' && <CheckCheck size={14} className="text-blue-400" />}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-950 font-sans sm:max-w-md sm:mx-auto sm:border-x sm:border-gray-800 text-gray-100 selection:bg-purple-500/30">
      {/* Tier Lock Modal */}
      {isTierLockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center transform scale-100 transition-all">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔒</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Media Sharing is a Pro Feature</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Upgrade to Pro or Premium to send images and voice notes to your network.
            </p>
            <div className="flex flex-col space-y-3">
              <button
                onClick={() => {
                  setIsTierLockModalOpen(false);
                  setIsStoreOpen(true);
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all transform active:scale-95"
              >
                Upgrade Now
              </button>
              <button
                onClick={() => setIsTierLockModalOpen(false)}
                className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-medium transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={selectedProfile}
        onUpgradeClick={() => {
          setIsProfileOpen(false);
          setIsStoreOpen(true);
        }}
      />
      <CoinStoreModal
        isOpen={isStoreOpen}
        onClose={() => setIsStoreOpen(false)}
      />
      <GiftModal
        isOpen={isGiftModalOpen}
        onClose={() => setIsGiftModalOpen(false)}
        recipientId={otherUserProfile.id}
        onGiftSent={handleGiftSent}
        onOpenStore={() => {
          setIsGiftModalOpen(false);
          setIsStoreOpen(true);
        }}
      />
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelectUser={setOtherUserProfile}
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

      {/* Header */}
      <EarnmegaWalletHeader />
      <header className="bg-gray-900/80 backdrop-blur-md px-4 py-3.5 border-b border-gray-800 shadow-sm flex items-center shrink-0 sticky top-0 z-20">
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="mr-3 p-1.5 rounded-full hover:bg-gray-800 text-gray-400 transition-colors"
        >
          <Menu size={20} />
        </button>

        <div
          onClick={() => openProfile(otherUserProfile)}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 mr-3 shrink-0 cursor-pointer"
        >
           <span className="text-white font-bold text-sm tracking-tighter">{otherUserProfile.avatarInitials}</span>
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openProfile(otherUserProfile)}>
          <h1 className="text-base font-bold text-gray-100 leading-tight truncate">{otherUserProfile.name}</h1>
          {otherUserProfile.isOnline ? (
            <div className="flex items-center space-x-1.5">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-[11px] text-gray-400 font-medium">Active now</p>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5">
               <span className="w-2 h-2 rounded-full bg-gray-500" />
               <p className="text-[11px] text-gray-400 font-medium">Last seen {otherUserProfile.last_seen ? new Date(otherUserProfile.last_seen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'recently'}</p>
            </div>
          )}
        </div>
      </header>

      {/* Messages Area */}
      <main
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-6"
      >
        {messages.map((message) => {
          const isUser = message.sender === 'user';
          const isTrayOpen = activeReactionId === message.id;

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
                {isUser && subscriptionTier === 'PREMIUM' && <span className="text-[10px] font-bold text-yellow-500 uppercase">Premium</span>}
                {isUser && subscriptionTier === 'PRO' && <span className="text-[10px] font-bold text-blue-400 uppercase">Pro</span>}

                <span className="text-xs font-medium text-gray-400">
                  {isUser && currentUserProfile ? currentUserProfile.name : otherUserProfile.name}
                </span>

                {!isUser && otherUserProfile.tier === 'PREMIUM' && <span className="text-[10px] font-bold text-yellow-500 uppercase">Premium</span>}
                {!isUser && otherUserProfile.tier === 'PRO' && <span className="text-[10px] font-bold text-blue-400 uppercase">Pro</span>}
              </div>

              {/* Message Bubble Row */}
              <div className={`flex items-end space-x-2 max-w-[85%] relative`}>

                {/* Avatar for other */}
                {!isUser && (
                  <div
                    onClick={() => openProfile(otherUserProfile)}
                    className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center shrink-0 mb-1 border border-gray-700 cursor-pointer hover:border-gray-500 transition-colors"
                  >
                    <span className="text-[10px] text-gray-400">{otherUserProfile.avatarInitials}</span>
                  </div>
                )}

                {isUser && currentUserProfile && (
                  <div
                    onClick={() => openProfile(currentUserProfile)}
                    className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center shrink-0 mb-1 border border-gray-700 cursor-pointer hover:border-gray-500 transition-colors order-last ml-2"
                  >
                    <span className="text-[10px] text-gray-400">{currentUserProfile.avatarInitials}</span>
                  </div>
                )}

                {/* Bubble Container */}
                <div className="relative flex flex-col">
                  {/* Reaction Tray (Popover) */}
                  {isTrayOpen && (
                    <div
                      className={`absolute bottom-full mb-2 ${isUser ? 'right-0' : 'left-0'} z-30 flex items-center space-x-1 p-1.5 bg-gray-800 border border-gray-700 rounded-full shadow-xl`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {DEFAULT_EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={(e) => handleReaction(message.id, emoji, e)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-gray-700 rounded-full hover:scale-110 transition-transform focus:outline-none"
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
                    className={`px-4 py-2.5 relative transition-all duration-200 cursor-pointer ${
                      isUser
                        ? 'bg-blue-600 hover:bg-blue-700 text-white rounded-2xl rounded-tr-sm shadow-sm'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-100 border border-gray-700 shadow-sm rounded-2xl rounded-tl-sm'
                    } ${(message.imageUrl || message.audioUrl) && !message.text ? '!p-1.5' : ''}`}
                  >
                    {message.imageUrl && (
                      <div className="mb-1.5">
                        <img
                          src={message.imageUrl}
                          alt="Uploaded media"
                          className="max-w-[200px] w-full rounded-xl object-cover"
                        />
                      </div>
                    )}
                    {message.audioUrl && (
                      <div className="mb-1.5">
                        <audio controls className="max-w-[250px] w-full h-10 outline-none">
                          <source src={message.audioUrl} type="audio/webm" />
                          <source src={message.audioUrl} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    )}
                    {message.text && (
                      <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap font-medium">
                        {formatText(message.text)}
                      </p>
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
                     <div className={`absolute -bottom-3.5 ${isUser ? 'right-2' : 'left-2'} z-10 flex items-center bg-gray-800 border border-gray-700 rounded-full px-1.5 py-0.5 shadow-sm`}>
                       {message.reactions.map((r, i) => (
                         <span key={i} className="text-[11px] leading-none">{r}</span>
                       ))}
                     </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} className="h-2" />
      </main>

      {/* Input Area */}
      <footer className="bg-gray-900 border-t border-gray-800 p-3 pb-safe shrink-0">
        <form
          onSubmit={handleSendMessage}
          className="flex items-end bg-gray-800 rounded-3xl pr-1.5 pl-4 py-1.5 focus-within:ring-1 focus-within:ring-gray-700 transition-shadow shadow-inner"
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
            className="flex-1 bg-transparent border-none focus:ring-0 text-gray-100 placeholder-gray-500 py-2.5 outline-none text-[15px] resize-none min-h-[44px] max-h-32"
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
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => setIsGiftModalOpen(true)}
              className="w-10 h-10 shrink-0 text-gray-400 hover:text-yellow-500 bg-gray-900/50 hover:bg-gray-700/80 rounded-full flex items-center justify-center transition-all backdrop-blur-sm shadow-sm"
              aria-label="Send Gift"
            >
              <Gift size={20} />
            </motion.button>
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
      </footer>
    </div>
  );
}
