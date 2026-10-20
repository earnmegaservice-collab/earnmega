"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../utils/supabase';
import { UserProfileDetails } from '../../../components/profile/UserProfileModal';
import { ArrowLeft, MoreVertical, Send, Phone, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import VerifiedTick from '../../../components/ui/VerifiedTick';

export default function ChatPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const resolvedParams = params instanceof Promise ? React.use(params) : params;
  const recipientId = resolvedParams.id;
  const [recipient, setRecipient] = useState<UserProfileDetails | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!user || !recipientId) return;

    const fetchRecipient = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', recipientId)
        .single();

      if (data) {
        setRecipient({
          id: data.id,
          name: data.username || data.name || 'User',
          avatarUrl: data.avatar_url,
          avatarInitials: (data.username || data.name || 'U').substring(0, 2).toUpperCase(),
          tier: data.tier,
          isVerified: data.is_verified,
          isOnline: true,
        } as UserProfileDetails);
      }
    };

    fetchRecipient();
  }, [user, recipientId]);

  useEffect(() => {
    if (!user || !recipientId) return;

    const fetchMessages = async () => {
       const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: true });

       if (data) {
           setMessages(data);
       }
       setIsInitialLoading(false);
    };

    fetchMessages();

    const channel = supabase.channel(`chat_updates_${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const msg = payload.new;
          if ((msg.sender_id === user.id && msg.receiver_id === recipientId) ||
              (msg.sender_id === recipientId && msg.receiver_id === user.id)) {
              setIsSyncing(true);
              setMessages((prev) => {
                 // prevent duplicates
                 if (prev.find(p => p.id === msg.id)) return prev;
                 return [...prev, msg];
              });
              setIsSyncing(false);
          }
      })
      .subscribe();

    return () => {
       supabase.removeChannel(channel);
    };
  }, [user, recipientId]);

  const handleSend = async () => {
      if (!newMessage.trim() || !user) return;
      const text = newMessage.trim();
      setNewMessage('');

      const { error } = await supabase.from('messages').insert({
          sender_id: user.id,
          receiver_id: recipientId,
          text_content: text,
          message_type: 'text'
      });

      if (error) {
          console.error("Failed to send message", error);
      }
  };

  if (isInitialLoading) {
      return (
        <div className="h-screen bg-[#050505] flex items-center justify-center text-white">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
        </div>
      );
  }

  if (!recipient && !isInitialLoading) {
      return <div className="h-screen bg-[#050505] flex items-center justify-center text-white">User not found.</div>;
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#050505] text-white">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 px-4 py-3 bg-black/60 backdrop-blur-xl border-b border-white/10 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition">
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-3">
            <div className={`relative w-10 h-10 rounded-full flex items-center justify-center shadow-lg shrink-0 ${
              recipient.tier === 'PREMIUM' ? 'p-[2px]' :
              recipient.tier === 'PRO' ? 'bg-gradient-to-tr from-amber-400 to-yellow-600 p-[2px]' :
              'border border-white/10 p-1 bg-white/5'
            }`}>
              {recipient.tier === 'PREMIUM' && (
                <div className="absolute inset-[-2px] rounded-full bg-gradient-to-r from-amber-400 via-purple-500 to-amber-400 animate-spin-slow" />
              )}
              <div className="relative w-full h-full rounded-full bg-neutral-900 flex items-center justify-center overflow-hidden z-10">
                {recipient.avatarUrl ? (
                  <img src={recipient.avatarUrl} alt={recipient.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span className="text-white font-bold text-sm tracking-tighter drop-shadow-md">{recipient.avatarInitials}</span>
                )}
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className={`font-bold text-base leading-tight truncate drop-shadow-sm ${
                  recipient.tier === 'PREMIUM' ? 'bg-gradient-to-r from-purple-400 via-pink-500 to-amber-400 bg-[length:200%_auto] animate-pulse bg-clip-text text-transparent font-extrabold' :
                  recipient.tier === 'PRO' ? 'text-amber-400 font-bold' :
                  'text-neutral-200 font-bold'
                }`}>{recipient.name}</span>
                {recipient.isVerified && <VerifiedTick />}
              </div>
              <span className="text-xs text-emerald-400 font-medium">Online</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button className="p-2 rounded-full hover:bg-white/10 transition text-white/80 active:scale-95"><Phone size={18} /></button>
          <button className="p-2 rounded-full hover:bg-white/10 transition text-white/80 active:scale-95"><Video size={18} /></button>
          <button className="p-2 rounded-full hover:bg-white/10 transition text-white/80 active:scale-95"><MoreVertical size={18} /></button>
        </div>
      </div>

      {/* Message Thread Area */}
      <div className="flex-1 overflow-y-auto pt-20 pb-20 px-4 flex flex-col gap-3 scroll-smooth">
         {!isInitialLoading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center mt-20 p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
                <div className="text-4xl mb-4">💬</div>
                <h3 className="text-xl font-bold text-white mb-2">No messages yet.</h3>
                <p className="text-white/60 text-center">Start the conversation with {recipient?.name}.</p>
            </div>
         )}
         <AnimatePresence>
         {messages.map((msg, idx) => {
             const isMe = msg.sender_id === user?.id;
             return (
                 <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    key={msg.id || idx}
                    className={`flex flex-col max-w-[75%] ${isMe ? 'self-end' : 'self-start'}`}
                 >
                    <div className={`px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed break-words whitespace-pre-wrap font-medium shadow-lg ${
                        isMe
                          ? 'bg-gradient-to-br from-emerald-600 to-emerald-500 text-white rounded-tr-sm border border-emerald-400/30'
                          : 'bg-white/10 text-white rounded-tl-sm border border-white/5 backdrop-blur-md'
                    }`}>
                        {msg.text_content}
                    </div>
                 </motion.div>
             );
         })}
         </AnimatePresence>
      </div>

      {/* Fixed Bottom Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-black/80 backdrop-blur-xl border-t border-white/10 z-50 shadow-[0_-8px_32px_rgba(0,0,0,0.37)]">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 shadow-inner focus-within:border-emerald-500/50 focus-within:bg-white/10 transition-all">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Message..."
            className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder:text-white/40"
            onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
            }}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="p-2 rounded-full bg-emerald-500 text-black disabled:opacity-50 disabled:bg-white/10 disabled:text-white/50 transition-all hover:bg-emerald-400 active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:shadow-none"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
