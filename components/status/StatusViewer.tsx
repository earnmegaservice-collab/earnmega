'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Send, Eye, Trash, BarChart, MoreVertical, Volume2, VolumeX, Sparkles } from 'lucide-react';
import ForwardModal from './ForwardModal';
import { submitUserReport } from '../../app/actions/submitUserReport';
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
  onHideUser?: (userId: string) => void;
}

function VideoProgressBar({ isActive, isCompleted, isPaused, videoRef }: { isActive: boolean, isCompleted: boolean, isPaused: boolean, videoRef?: React.RefObject<HTMLVideoElement> }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isCompleted) {
      setProgress(100);
      return;
    }
    if (!isActive || !videoRef || !videoRef.current) {
      setProgress(0);
      return;
    }

    const video = videoRef.current;
    let animationFrameId: number;

    const updateProgress = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
      if (!isPaused) {
        animationFrameId = requestAnimationFrame(updateProgress);
      }
    };

    if (!isPaused) {
      animationFrameId = requestAnimationFrame(updateProgress);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isActive, isCompleted, isPaused, videoRef]);

  return (
    <div
      className="absolute top-0 left-0 h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
      style={{
        width: `${progress}%`,
        transition: isPaused ? 'none' : 'width 0.1s linear'
      }}
    />
  );
}

export default function StatusViewer({
  statuses,
  onClose,
  onSendReply,
  onSendLike,
  onForward,
  onHideUser,
}: StatusViewerProps): any {

  const [localStatuses, setLocalStatuses] = useState(statuses);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // FULL AUDIO ENABLED BY DEFAULT
  
  const status = localStatuses[currentIndex];
  const videoRef = useRef<HTMLVideoElement>(null);

  const [replyText, setReplyText] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number }[]>([]);

  const [isCinematic, setIsCinematic] = useState(false);
  const [isForwardOpen, setIsForwardOpen] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);

  // --- BULLETPROOF AUDIO & VIDEO SYNC EFFECT ---
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = isMuted;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.log('Autoplay with sound blocked by browser policy, forcing muted recovery:', err);
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().catch(() => {});
          }
        });
      }
    }
  }, [currentIndex, status?.mediaUrl]); // Removed `isMuted` from dependencies so it doesn't reset currentTime on mute toggle

  // --- VIEW TRACKER ENGINE ---
  useEffect(() => {
    if (!status || status.isOwner) return;
    const trackView = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { error } = await supabase.from('status_views').insert({
          status_id: status.id,
          user_id: user.id
        });

        // 23505 is unique violation, meaning already viewed, which is expected
        if (error) {
           if (error.code !== '23505') {
             throw error;
           }
        } else {
           // Insert silent background notification for the status owner
           await supabase.from('notifications').insert({
             user_id: status.userId,
             sender_id: user.id,
             type: 'status_view',
             content: `${user.user_metadata?.username || user.email || 'Someone'} viewed your status`
           });
        }
      } catch (error) {
        console.error('Silent view track failed', error);
      }
    };
    trackView();
  }, [status?.id]);

  const handlePrev = () => { 
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1); 
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
  };
  
  const handleNext = () => { 
    if (currentIndex < localStatuses.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  // --- HIDE & REPORT ENGINE ---
  const handleHideStatus = async () => {
    setIsReportMenuOpen(false);
    const toastId = toast.loading('Hiding updates from this user...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('status_mutes').insert({ muter_id: user.id, muted_id: status.userId });
      if (error && error.code !== '23505') throw error; // Ignore unique constraint violation if already muted
      
      toast.success('User hidden successfully', { id: toastId });
      if (onHideUser) onHideUser(status.userId);
      onClose(); 
    } catch (err: any) {
      toast.error('Failed to hide status', { id: toastId });
    }
  };

  const handleReportStatus = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    setIsReportMenuOpen(false);
    const toastId = toast.loading('Securing report...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append('reportedUserId', status.userId);
      formData.append('contentType', 'status');
      formData.append('reason', 'Inappropriate Content');
      formData.append('details', `Reported status ${status.id}`);

      const result = await submitUserReport(formData);
      if (!result.success) throw new Error(result.error);
      toast.success('Report submitted securely');

      toast.success('Report secured. Team notified.', { id: toastId });
      if (onHideUser) onHideUser(status.userId);
      onClose(); 
    } catch (err: any) {
      console.error('REPORT_DB_ERROR:', err.message);
      toast.error('Failed to report', { id: toastId });
    }
  };

  // --- ZERO PHANTOM UI DELETE ENGINE ---
  const handleDelete = async () => {
    const toastId = toast.loading('Deleting 4K Media...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (status.userId !== user.id) throw new Error('Not owner');

      const { error } = await supabase.from('statuses').delete().match({ id: status.id, user_id: user.id });
      if (error) throw error;

      // Also clean up from storage if possible
      if (status.mediaUrl) {
         try {
           const urlObj = new URL(status.mediaUrl);
           const parts = urlObj.pathname.split('/statuses/');
           if (parts.length > 1) {
             const path = parts[1];
             await supabase.storage.from('statuses').remove([path]);
           }
         } catch(e) {
           console.error('Failed to cleanup media from storage', e);
         }
      }

      toast.success('Status deleted', { id: toastId });

      setLocalStatuses(prev => {
        const updated = prev.filter(s => s.id !== status.id);
        if (updated.length === 0) {
          setTimeout(() => onClose(), 0);
          return [];
        }
        if (currentIndex >= updated.length) {
          setCurrentIndex(updated.length - 1);
        }
        return updated;
      });
    } catch (err: any) {
      toast.error('Failed to delete', { id: toastId });
    }
  };

  const handleTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x <= rect.width * 0.3) handlePrev();
    else handleNext();
  };

  const handlePointerDown = () => {
    setIsPaused(true);
    setIsCinematic(true);
    if (videoRef.current) videoRef.current.pause();
  };

  const handlePointerUp = () => {
    setIsPaused(false);
    setIsCinematic(false);
    if (videoRef.current) videoRef.current.play().catch(() => {});
  };

  const handleHeartTap = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([15, 30, 15]);
    const newHeart = { id: Date.now(), x: window.innerWidth / 2, y: window.innerHeight - 150 };
    setFloatingHearts((prev) => [...prev, newHeart]);
    setIsLiked(true);
    if (status?.id) onSendLike(status.id);

    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 1200);
  };

  const submitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    const textToSend = replyText;
    setReplyText('');
    await onSendReply(status?.id, textToSend, status?.mediaUrl || status?.textContent);
  };

  if (!status) return null;

  const isVideoUrl = Boolean(
    status?.mediaUrl?.match(/\.(mp4|mov|webm|ogg|m4v)$/i) || status?.mediaType === 'video'
  );

  const content = (
    <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.8}
        onDragEnd={(e, info) => { if (info.offset.y > 150 || info.velocity.y > 500) onClose(); }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed inset-0 z-[100000] w-full h-[100dvh] bg-[#050505] flex flex-col justify-between overflow-hidden select-none"
    >
      <style>{`
        @keyframes fillProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
      
      {/* HEADER & PROGRESS UI */}
      <AnimatePresence>
        {!isCinematic && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 z-40 pointer-events-none"
          >
            {/* LUXURY PROGRESS BARS */}
            <div className="px-2 pt-14 md:pt-4 pb-2 flex space-x-1 bg-gradient-to-b from-black/90 via-black/40 to-transparent">
              {localStatuses.map((s, i) => {
                const sIsVideo = Boolean(s.mediaUrl?.match(/\.(mp4|mov|webm|ogg|m4v)$/i) || s.mediaType === 'video');
                return (
                  <div key={s.id} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden relative backdrop-blur-md">
                    {/* For images, we can still use CSS animations. For videos, we sync with time update if possible, or wait for ended event and hide CSS progress bar.
                        Actually, it's better to animate it over the video duration. Since we don't have it upfront easily without state, we can just rely on the video's onEnded event
                        and let the progress bar fill using an interval or CSS if we fetch duration.
                        Let's use state for video progress if it's the current video, or just remove animation for videos and let a custom progress bar fill via JS.
                    */}
                    {!sIsVideo ? (
                      <div
                        className="absolute top-0 left-0 h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                        style={{
                          width: i < currentIndex ? '100%' : (i > currentIndex ? '0%' : '0%'),
                          animation: i === currentIndex ? `fillProgress 5s linear forwards` : 'none',
                          animationPlayState: isPaused ? 'paused' : 'running'
                        }}
                        onAnimationEnd={() => {
                           if (i === currentIndex && !isPaused) handleNext();
                        }}
                      />
                    ) : (
                      <VideoProgressBar
                        isActive={i === currentIndex}
                        isCompleted={i < currentIndex}
                        isPaused={isPaused}
                        videoRef={i === currentIndex ? videoRef : undefined}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* TOP ACTION BAR */}
            <div className="px-4 py-2 flex items-center justify-between pointer-events-auto">
              <div className="flex items-center space-x-3 drop-shadow-xl">
                <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-fuchsia-500 via-rose-500 to-amber-500 shadow-[0_0_15px_rgba(217,70,239,0.5)]">
                  <img
                    src={status.avatarUrl || 'https://via.placeholder.com/150'}
                    alt={status.username}
                    className="w-full h-full object-cover rounded-full border-2 border-black"
                  />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm tracking-wide text-white drop-shadow-md">{status.username}</span>
                    {isVideoUrl && !isMuted && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 text-[8px] font-black text-fuchsia-300 animate-pulse">
                        <Sparkles size={8} /> AUDIO LIVE
                      </span>
                    )}
                  </div>
                  {/* OWNER ONLY VIEWS */}
                  {status.isOwner && (
                    <div className="flex items-center space-x-1.5 text-[10px] font-bold text-white/80">
                      <Eye className="w-3 h-3 text-fuchsia-400" />
                      <span>{status.viewsCount || 0} Views</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* VIDEO AUDIO TOGGLE BUTTON */}
                {isVideoUrl && (
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      const newMutedState = !isMuted;
                      setIsMuted(newMutedState);
                      if (videoRef.current) videoRef.current.muted = newMutedState;
                      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                    }}
                    title={isMuted ? "Unmute Video Audio" : "Mute Video Audio"}
                    className={`w-9 h-9 rounded-full backdrop-blur-3xl border flex items-center justify-center active:scale-90 transition pointer-events-auto shadow-2xl ${
                      isMuted 
                        ? 'bg-white/10 border-white/20 text-white/60' 
                        : 'bg-fuchsia-600 border-fuchsia-400 text-white shadow-[0_0_15px_rgba(217,70,239,0.7)]'
                    }`}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                )}

                {/* OWNER CONTROLS vs VIEWER CONTROLS */}
                {status.isOwner ? (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsInsightsOpen(true); }}
                      className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-3xl border border-white/20 flex items-center justify-center active:scale-90 transition pointer-events-auto shadow-2xl"
                    >
                      <BarChart className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                      className="w-9 h-9 rounded-full bg-rose-500/20 backdrop-blur-3xl border border-rose-500/50 flex items-center justify-center active:scale-90 transition pointer-events-auto shadow-2xl"
                    >
                      <Trash className="w-4 h-4 text-rose-500" />
                    </button>
                  </>
                ) : (
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsReportMenuOpen(!isReportMenuOpen); }}
                      className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-3xl border border-white/20 flex items-center justify-center active:scale-90 transition pointer-events-auto shadow-2xl"
                    >
                      <MoreVertical className="w-4 h-4 text-white" />
                    </button>
                    {/* PREMIUM REPORT DROPDOWN */}
                    <AnimatePresence>
                      {isReportMenuOpen && (
                         <motion.div 
                           initial={{ opacity: 0, scale: 0.9 }}
                           animate={{ opacity: 1, scale: 1 }}
                           exit={{ opacity: 0, scale: 0.9 }}
                           className="absolute top-12 right-0 w-48 bg-[#111418]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] py-2 z-50 flex flex-col pointer-events-auto overflow-hidden"
                         >
                            <div onClick={(ev) => { ev.stopPropagation(); handleHideStatus(); }} className="px-5 py-3 text-sm font-bold text-white hover:bg-white/10 text-left border-b border-white/5 cursor-pointer transition-colors">Hide User's Updates</div>
                            <div onClick={(ev) => { ev.stopPropagation(); handleReportStatus(ev); }} className="px-5 py-3 text-sm font-bold text-rose-500 hover:bg-white/10 text-left cursor-pointer transition-colors">Report Content</div>
                         </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                
                {/* CLOSE BUTTON */}
                <button
                  onClick={(e) => { e.stopPropagation(); onClose(); }}
                  className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-3xl border border-white/30 flex items-center justify-center active:scale-90 transition pointer-events-auto shadow-2xl hover:bg-white/30"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MEDIA VIEWPORT */}
      <div
        onDoubleClick={(e) => { e.stopPropagation(); handleHeartTap(); }}
        onClick={handleTap}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden cursor-pointer bg-black"
      >
        {!isVideoUrl && status.mediaType === 'image' && status.mediaUrl && (
          <img
            src={status.mediaUrl}
            alt="Status"
            className="w-full h-full object-contain md:object-cover scale-105"
          />
        )}

        {isVideoUrl && status.mediaUrl && (
          <video
            ref={videoRef}
            src={status.mediaUrl}
            className="w-full h-full object-contain md:object-cover scale-105"
            autoPlay
            playsInline
            muted={isMuted}
            loop={false}
            onEnded={handleNext}
          />
        )}

        {status.mediaType === 'text' && (
          <div
            className={`w-full h-full flex items-center justify-center p-8 transition-all duration-700 ${
              status.backgroundGradient || 'bg-gradient-to-br from-purple-900 via-[#050505] to-fuchsia-950'
            }`}
          >
            <p className="text-3xl md:text-5xl font-black text-center text-white tracking-tight leading-tight drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
              {status.textContent}
            </p>
          </div>
        )}

        {/* Cinematic Hold Vignette */}
        <AnimatePresence>
          {!isCinematic && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />
          )}
        </AnimatePresence>

        {/* Floating Heart Particles */}
        {floatingHearts.map((h) => (
          <motion.div
            key={h.id}
            initial={{ scale: 0, opacity: 1, x: h.x - 48, y: h.y - 48 }}
            animate={{ scale: 2, opacity: 0, y: h.y - 250 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="pointer-events-none absolute z-[100] text-rose-500"
          >
            <Heart className="w-24 h-24 fill-rose-500 stroke-none drop-shadow-[0_0_30px_rgba(244,63,94,1)]" />
          </motion.div>
        ))}
      </div>

      {/* FOOTER REPLY BAR */}
      <AnimatePresence>
      {!isCinematic && !status.isOwner && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-0 left-0 right-0 z-50 p-6 pb-10 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col pointer-events-auto"
        >
          <div className="flex space-x-5 mb-6 justify-center">
            {['🔥', '😍', '😂', '😮', '😢', '👏'].map((emoji) => (
              <motion.button
                key={emoji}
                whileTap={{ scale: 0.7 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setReplyText(prev => prev + emoji);
                  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                }}
                className="text-3xl hover:scale-125 transition-transform drop-shadow-2xl"
              >
                {emoji}
              </motion.button>
            ))}
          </div>

          <form onSubmit={submitReply} className="flex items-center space-x-3 max-w-md mx-auto w-full">
            <div className="relative flex-1">
              <input
                type="text"
                value={replyText}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Reply to status..."
                className="w-full bg-white/10 border border-white/20 rounded-full px-6 py-4 text-sm text-white placeholder-white/50 focus:outline-none focus:border-fuchsia-400 focus:bg-white/20 backdrop-blur-3xl pr-12 shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all"
              />
              <button
                type="submit"
                onClick={(e) => e.stopPropagation()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-fuchsia-500/20 text-fuchsia-300 hover:text-white hover:bg-fuchsia-500 transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.8 }}
              onClick={(e) => { e.stopPropagation(); handleHeartTap(); }}
              className={`p-4 rounded-full border transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-3xl ${
                isLiked
                  ? 'bg-rose-500/20 border-rose-500 text-rose-500'
                  : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
              }`}
            >
              <Heart className={`w-6 h-6 ${isLiked ? 'fill-rose-500 drop-shadow-[0_0_15px_rgba(225,29,72,1)]' : ''}`} />
            </motion.button>
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

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
}

function InsightsModal({ isOpen, onClose, statusId }: { isOpen: boolean, onClose: () => void, statusId?: string }) {
  const [views, setViews] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && statusId) {
      const fetchInsights = async () => {
        const { data, error } = await supabase
          .from('status_views')
          .select('created_at, profiles:user_id (username, avatar_url)')
          .eq('status_id', statusId);
        if (!error && data) {
          const uniqueViews = data.filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => {
            const tProf = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
            const vProf = Array.isArray(v.profiles) ? v.profiles[0] : v.profiles;
            return tProf?.username === vProf?.username;
          }) === i);
          setViews(uniqueViews);
        }
      };
      fetchInsights();
    }
  }, [isOpen, statusId]);

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-[65vh] bg-[#111418]/95 backdrop-blur-3xl rounded-t-[40px] border-t border-white/10 z-[110] flex flex-col p-6 shadow-[0_-20px_60px_rgba(0,0,0,0.8)]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-black text-white text-xl flex items-center space-x-2">
           <Eye size={24} className="text-fuchsia-400" />
           <span>{views.length} Total Views</span>
        </h3>
        <button onClick={onClose} className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"><X size={18} className="text-white" /></button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {views.map((v: any, i: number) => {
          const profile = Array.isArray(v.profiles) ? v.profiles[0] : v.profiles;
          return (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} key={i} className="flex items-center space-x-4 bg-white/5 p-3 rounded-2xl border border-white/5">
               <div className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-fuchsia-500 to-amber-500">
                 <img src={profile?.avatar_url || 'https://via.placeholder.com/150'} className="w-full h-full rounded-full border-2 border-black object-cover" alt="" />
               </div>
               <div className="flex-1">
                 <p className="font-black text-white text-base tracking-wide">{profile?.username || 'User'}</p>
                 <p className="text-xs font-bold text-white/40">{new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
               </div>
            </motion.div>
          );
        })}
        {views.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 opacity-50">
            <Eye size={40} className="text-white/20 mb-3" />
            <p className="text-center text-white font-bold">No views yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
