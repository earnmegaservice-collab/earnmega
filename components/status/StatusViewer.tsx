'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Send, Eye, Lock, Coins, Sparkles } from 'lucide-react';

interface StatusItem {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  mediaUrl?: string;
  mediaType: 'image' | 'video' | 'text';
  textContent?: string;
  backgroundGradient?: string;
  viewsCount: number;
  isUnlocked: boolean;
  isOwner: boolean;
}

interface StatusViewerProps {
  status: StatusItem;
  onClose: () => void;
  onUnlock: (statusId: string) => Promise<boolean>;
  onSendReply: (statusId: string, text: string, mediaPreview?: string) => Promise<void>;
  onSendLike: (statusId: string) => Promise<void>;
  userCoins: number;
}

export default function StatusViewer({
  status,
  onClose,
  onUnlock,
  onSendReply,
  onSendLike,
  userCoins,
}: StatusViewerProps) {
  const [isUnlocked, setIsUnlocked] = useState(status.isUnlocked || status.isOwner);
  const [replyText, setReplyText] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Double-tap heart trigger
  const handleDoubleTap = (e: React.MouseEvent) => {
    if (!isUnlocked) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newHeart = { id: Date.now(), x, y };
    setFloatingHearts((prev) => [...prev, newHeart]);
    setIsLiked(true);
    onSendLike(status.id);

    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 1000);
  };

  const handleUnlockClick = async () => {
    if (userCoins < 10) {
      alert("Insufficient Balance. Top up your coins to view VIP statuses.");
      return;
    }
    setIsUnlocking(true);
    const success = await onUnlock(status.id);
    if (success) {
      setIsUnlocked(true);
    }
    setIsUnlocking(false);
  };

  const submitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !isUnlocked) return;
    const textToSend = replyText;
    setReplyText('');
    await onSendReply(status.id, textToSend, status.mediaUrl || status.textContent);
  };

  const isVideoUrl = status.mediaUrl?.match(/\.(mp4|mov|webm)$/i) || status.mediaType === 'video';

  return (
    <div className="fixed inset-0 w-screen h-screen z-[100] bg-black flex flex-col justify-between overflow-hidden select-none">
      {/* 1. TOP OVERLAY BAR */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 pt-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 to-purple-500">
            <img
              src={status.avatarUrl || ''}
              alt={status.username}
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-sm tracking-wide text-white">{status.username}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="flex items-center space-x-2 text-[10px] text-white/60">
              <Eye className="w-3 h-3" />
              <span>{status.viewsCount} views</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center active:scale-90 transition"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* 2. MEDIA DISPLAY VIEWPORT */}
      <div
        onDoubleClick={handleDoubleTap}
        className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden cursor-pointer"
      >
        {!isVideoUrl && status.mediaType === 'image' && status.mediaUrl && (
          <img
            src={status.mediaUrl}
            alt="Status media"
            className={`w-full h-full object-cover transition-all duration-700 ${
              !isUnlocked ? 'filter blur-3xl scale-110 brightness-50' : 'filter-none scale-100'
            }`}
          />
        )}

        {isVideoUrl && status.mediaUrl && (
          <video
            src={status.mediaUrl}
            className={`w-full h-full object-cover transition-all duration-700 ${
              !isUnlocked ? 'filter blur-3xl scale-110 brightness-50' : 'filter-none scale-100'
            }`}
            autoPlay
            playsInline
            muted
            loop={isUnlocked}
          />
        )}

        {status.mediaType === 'text' && (
          <div
            className={`w-full h-full flex items-center justify-center p-8 transition-all duration-700 ${
              status.backgroundGradient || 'bg-gradient-to-br from-purple-900 via-indigo-950 to-black'
            } ${!isUnlocked ? 'filter blur-2xl brightness-50' : ''}`}
          >
            <p className="text-2xl md:text-3xl font-extrabold text-center text-white tracking-wide leading-relaxed drop-shadow-2xl">
              {status.textContent}
            </p>
          </div>
        )}

        {/* 3. 10-COIN PAYWALL FROSTED MODAL */}
        {!isUnlocked && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-black/40 backdrop-blur-2xl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-xs p-6 rounded-3xl bg-white/[0.05] border border-white/20 backdrop-blur-3xl shadow-[0_0_50px_rgba(168,85,247,0.3)] text-center flex flex-col items-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-purple-600 p-[1px] mb-4 flex items-center justify-center shadow-lg">
                <div className="w-full h-full bg-black/80 rounded-2xl flex items-center justify-center">
                  <Lock className="w-6 h-6 text-amber-300" />
                </div>
              </div>

              <h4 className="text-lg font-black text-white">VIP Locked Status</h4>
              <p className="text-xs text-white/60 mt-1 mb-5 leading-relaxed">
                Unlock this exclusive content and support the creator.
              </p>

              <button
                onClick={handleUnlockClick}
                disabled={isUnlocking}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 font-black text-xs uppercase tracking-wider text-white shadow-[0_0_20px_rgba(236,72,153,0.5)] active:scale-95 transition flex items-center justify-center space-x-2"
              >
                <Coins className="w-4 h-4 fill-white" />
                <span>{isUnlocking ? 'Unlocking...' : 'Unlock for 10 Coins'}</span>
              </button>
            </motion.div>
          </div>
        )}

        {/* Floating Heart Animations */}
        {floatingHearts.map((h) => (
          <motion.div
            key={h.id}
            initial={{ scale: 0, opacity: 1, x: h.x - 24, y: h.y - 24 }}
            animate={{ scale: [1, 1.8], opacity: [1, 0], y: h.y - 120 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="pointer-events-none absolute z-40 text-rose-500"
          >
            <Heart className="w-12 h-12 fill-rose-500 stroke-none drop-shadow-[0_0_15px_rgba(244,63,94,0.8)]" />
          </motion.div>
        ))}
      </div>

      {/* 4. BOTTOM INTERACTION BAR */}
      {isUnlocked && (
        <div className="absolute bottom-0 left-0 right-0 z-30 p-4 pb-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
          <form onSubmit={submitReply} className="flex items-center space-x-2 max-w-md mx-auto">
            <div className="relative flex-1">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Reply to status..."
                className="w-full bg-white/[0.08] border border-white/20 rounded-full px-5 py-3 text-xs text-white placeholder-white/40 focus:outline-none focus:border-purple-400/80 backdrop-blur-2xl pr-10"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-purple-500/20 text-purple-300 hover:text-white"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsLiked(!isLiked);
                onSendLike(status.id);
              }}
              className={`p-3 rounded-full border transition active:scale-75 ${
                isLiked
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-500'
                  : 'bg-white/[0.08] border-white/20 text-white/70'
              }`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-rose-500' : ''}`} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
