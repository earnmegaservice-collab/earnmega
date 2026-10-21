'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Send, Eye, Lock, Coins, Forward, Trash, BarChart } from 'lucide-react';
import ForwardModal from './ForwardModal';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';

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
  isOwner: boolean;
}

interface StatusViewerProps {
  statuses: StatusItem[];
  onClose: () => void;
  onSendReply: (statusId: string, text: string, mediaPreview?: string) => Promise<void>;
  onSendLike: (statusId: string) => Promise<void>;
  onForward: (statusId: string, receiverId: string) => Promise<void>;
}

export default function StatusViewer({
  statuses,
  onClose,
  onSendReply,
  onSendLike,
  onForward,
}: StatusViewerProps) {


  const [currentIndex, setCurrentIndex] = useState(0);
  const status = statuses[currentIndex];

  const [replyText, setReplyText] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number }[]>([]);

  const [isCinematic, setIsCinematic] = useState(false);
  const [isForwardOpen, setIsForwardOpen] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);

  const handlePrev = () => { if (currentIndex > 0) setCurrentIndex(currentIndex - 1); };
  const handleNext = () => { if (currentIndex < statuses.length - 1) setCurrentIndex(currentIndex + 1); else onClose(); };

  const handleTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x > rect.width * 0.3 && x < rect.width * 0.7) {
      setIsCinematic(!isCinematic);
      return;
    }
    if (x <= rect.width * 0.3) handlePrev();
    else handleNext();
  };

  const handleHeartTap = () => {

    const newHeart = { id: Date.now(), x: window.innerWidth / 2, y: window.innerHeight - 100 };
    setFloatingHearts((prev) => [...prev, newHeart]);
    setIsLiked(true);
    if (status?.id) onSendLike(status.id);

    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 1000);
  };


  const submitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    const textToSend = replyText;
    setReplyText('');
    await onSendReply(status?.id, textToSend, status?.mediaUrl || status?.textContent);
  };

  const isVideoUrl = status?.mediaUrl?.match(/\.(mp4|mov|webm)$/i) || status?.mediaType === 'video';

  return (
    <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.8}
        onDragEnd={(e, info) => { if (info.offset.y > 100 || info.velocity.y > 500) onClose(); }}
        transition={{ type: "spring", stiffness: 250, damping: 25 }}
        className="fixed inset-0 w-screen h-screen z-[100] bg-black flex flex-col justify-between overflow-hidden select-none"
    >
      <AnimatePresence>
        {!isCinematic && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 z-40 pointer-events-none"
          >
            {/* PROGRESS BARS */}
            <div className="px-4 pt-4 flex space-x-1">
              {statuses.map((s, i) => (
                <div key={s.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: i < currentIndex ? '100%' : '0%' }}
                    animate={{ width: i < currentIndex ? '100%' : (i === currentIndex ? '100%' : '0%') }}
                    transition={{ duration: 5, ease: "linear" }}
                    className="h-full bg-white"
                  />
                </div>
              ))}
            </div>

            {/* TOP OVERLAY BAR */}
            <div className="p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between pointer-events-auto">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 to-purple-500">
                  <img
                    src={status?.avatarUrl || ''}
                    alt={status?.username}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-sm tracking-wide text-white">{status?.username}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] text-white/60">
                    <Eye className="w-3 h-3" />
                    <span>{status?.viewsCount || 0} views</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {status?.isOwner && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsInsightsOpen(true); }}
                      className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-2xl border border-white/10 flex items-center justify-center active:scale-90 transition pointer-events-auto shadow-lg"
                    >
                      <BarChart className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={async (e) => {
                         e.stopPropagation();
                         const toastId = toast.loading('Deleting status...');
                         try {
                           const { error } = await supabase.from('statuses').delete().eq('id', status.id);
                           if (error) throw error;
                           toast.success('Status deleted', { id: toastId });
                           onClose();
                         } catch (err: any) {
                           toast.error('Failed to delete', { id: toastId });
                         }
                      }}
                      className="w-9 h-9 rounded-full bg-rose-500/20 backdrop-blur-2xl border border-rose-500/50 flex items-center justify-center active:scale-90 transition pointer-events-auto shadow-lg"
                    >
                      <Trash className="w-4 h-4 text-rose-500" />
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onClose(); }}
                  className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-2xl border border-white/10 flex items-center justify-center active:scale-90 transition pointer-events-auto"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MEDIA DISPLAY VIEWPORT */}
      <div
        onDoubleClick={(e) => { e.stopPropagation(); handleHeartTap(); }}
        onClick={handleTap}
        className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden cursor-pointer"
      >
        {!isVideoUrl && status?.mediaType === 'image' && status?.mediaUrl && (
          <img
            src={status.mediaUrl}
            alt="Status media"
            className={`w-full h-full object-cover transition-all duration-700 ${
              'filter-none scale-100'
            }`}
          />
        )}

        {isVideoUrl && status?.mediaUrl && (
          <video
            src={status.mediaUrl}
            className={`w-full h-full object-cover transition-all duration-700 ${
              'filter-none scale-100'
            }`}
            autoPlay
            playsInline
            muted
            loop={true}
          />
        )}

        {status?.mediaType === 'text' && (
          <div
            className={`w-full h-full flex items-center justify-center p-8 transition-all duration-700 ${
              status.backgroundGradient || 'bg-gradient-to-br from-purple-900 via-indigo-950 to-black'
            } ${''}`}
          >
            <p className="text-2xl md:text-3xl font-extrabold text-center text-white tracking-wide leading-relaxed drop-shadow-2xl">
              {status.textContent}
            </p>
          </div>
        )}



        {/* Floating Heart Animations */}
        {floatingHearts.map((h) => (
          <motion.div
            key={h.id}
            initial={{ scale: 1, opacity: 1, x: h.x - 24, y: h.y - 24 }}
            animate={{ scale: 1.5, opacity: 0, y: h.y - 170 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="pointer-events-none absolute z-40 text-rose-500"
          >
            <Heart className="w-12 h-12 fill-rose-500 stroke-none drop-shadow-[0_0_15px_rgba(244,63,94,0.8)]" />
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
      {!isCinematic && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-0 left-0 right-0 z-30 p-4 pb-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col"
        >
          <div className="flex space-x-4 mb-4 justify-center">
            {['🔥', '😍', '😂', '😮', '😢', '👏'].map((emoji) => (
              <motion.button
                key={emoji}
                whileTap={{ scale: 0.8 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setReplyText(prev => prev + emoji);
                }}
                className="text-2xl hover:scale-110 transition-transform"
              >
                {emoji}
              </motion.button>
            ))}
          </div>

          <form onSubmit={submitReply} className="flex items-center space-x-2 max-w-md mx-auto w-full">
            <div className="relative flex-1">
              <input
                type="text"
                value={replyText}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Reply to status..."
                className="w-full bg-black/40 border border-white/10 rounded-full px-5 py-3 text-xs text-white placeholder-white/40 focus:outline-none focus:border-purple-400/80 backdrop-blur-2xl pr-10 shadow-lg"
              />
              <button
                type="submit"
                onClick={(e) => e.stopPropagation()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-purple-500/20 text-purple-300 hover:text-white"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={(e) => { e.stopPropagation(); handleHeartTap(); }}
              className={`p-3 rounded-full border transition-colors shadow-lg backdrop-blur-2xl ${
                isLiked
                  ? 'bg-black/60 border-rose-500 text-rose-500 drop-shadow-[0_0_15px_rgba(225,29,72,1)]'
                  : 'bg-black/40 border-white/10 text-white/70'
              }`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-rose-500 drop-shadow-[0_0_10px_rgba(225,29,72,1)]' : ''}`} />
            </motion.button>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setIsForwardOpen(true); }}
              className="p-3 rounded-full bg-black/40 border border-white/10 text-white/70 transition active:scale-75 backdrop-blur-2xl shadow-lg hover:bg-white/10"
            >
              <Forward className="w-5 h-5" />
            </button>
          </form>
        </motion.div>
      )}
      </AnimatePresence>

      <InsightsModal isOpen={isInsightsOpen} onClose={() => setIsInsightsOpen(false)} statusId={status?.id} />

      <ForwardModal
        isOpen={isForwardOpen}
        onClose={() => setIsForwardOpen(false)}
        onForward={async (receiverId) => {
          if (status?.id) {
            await onForward(status.id, receiverId);
          }
        }}
      />
    </motion.div>
  );
}

function InsightsModal({ isOpen, onClose, statusId }: { isOpen: boolean, onClose: () => void, statusId?: string }) {
  const [views, setViews] = useState<any[]>([]);

  React.useEffect(() => {
    if (isOpen && statusId) {
      const fetchInsights = async () => {
        const { data, error } = await supabase
          .from('status_views')
          .select('created_at, profiles:user_id (username, avatar_url)')
          .eq('status_id', statusId);
        if (!error && data) setViews(data);
      };
      fetchInsights();
    }
  }, [isOpen, statusId]);

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-[60vh] bg-zinc-950 rounded-t-3xl border-t border-white/10 z-[110] flex flex-col p-4 shadow-[0_-8px_32px_rgba(0,0,0,0.5)]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-white flex items-center space-x-2">
           <Eye size={18} />
           <span>{views.length} Views</span>
        </h3>
        <button onClick={onClose} className="p-2 rounded-full bg-white/10"><X size={16} /></button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3">
        {views.map((v, i) => (
          <div key={i} className="flex items-center space-x-3">
             <img src={v.profiles?.avatar_url || ''} className="w-10 h-10 rounded-full bg-zinc-800 object-cover" />
             <div className="flex-1">
               <p className="font-bold text-white text-sm">{v.profiles?.username}</p>
               <p className="text-[10px] text-white/50">{new Date(v.created_at).toLocaleTimeString()}</p>
             </div>
          </div>
        ))}
        {views.length === 0 && <p className="text-center text-white/50 text-sm mt-10">No views yet</p>}
      </div>
    </div>
  );
}
