import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, Volume2, PhoneOff, Minimize2, Lock } from 'lucide-react';

interface Props {
  callState: string;
  callerName: string;
  avatarUrl?: string;
  callType: 'audio' | 'video';
  duration: number;
  isMuted: boolean;
  isSpeaker: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  activeMembers: any[];
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onToggleVideo: () => void;
  onFlipCamera: () => void;
  onMinimize: () => void;
  onEnd: () => void;
}

export const OneOnOneCallScreen: React.FC<Props> = ({
  callState,
  callerName,
  avatarUrl,
  callType,
  duration,
  isMuted,
  isSpeaker,
  localVideoRef,
  activeMembers,
  onToggleMute,
  onToggleSpeaker,
  onToggleVideo,
  onFlipCamera,
  onMinimize,
  onEnd,
}) => {
  const [emojiFloaters, setEmojiFloaters] = useState<{ id: number, emoji: string, x: number }[]>([]);

  const partner = activeMembers.find((m) => true);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const sendEmoji = (emoji: string) => {
    const newFloater = { id: Date.now(), emoji, x: Math.random() * 80 + 10 };
    setEmojiFloaters(prev => [...prev, newFloater]);
    setTimeout(() => {
      setEmojiFloaters(prev => prev.filter(f => f.id !== newFloater.id));
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[99990] bg-[#050811] flex flex-col overflow-hidden">

      {callType === 'audio' && (
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-3xl z-10" />
          <img src={avatarUrl || '/icon.svg'} className="w-full h-full object-cover opacity-50 blur-2xl animate-pulse" />
        </div>
      )}

      {callType === 'video' && partner && (
         <div className="absolute inset-0 z-0 bg-black">
            <video
              className="w-full h-full object-cover bg-neutral-900"
              autoPlay
              playsInline
              ref={(el) => {
                 if (el && partner?.videoTrack) {
                    const currentStream = el.srcObject as MediaStream;
                    if (!currentStream || currentStream.getVideoTracks()[0]?.id !== partner.videoTrack.id) {
                       el.srcObject = new MediaStream([partner.videoTrack]);
                    }
                 }
              }}
            />
         </div>
      )}

      <div className="relative z-20 flex justify-between items-start p-6">
        <button onClick={onMinimize} className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition">
          <Minimize2 className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium bg-emerald-500/10 px-3 py-1 rounded-full mb-2">
            <Lock className="w-3 h-3" /> End-to-End Encrypted
          </div>
          <span className="text-white text-lg font-semibold">{callState === 'connected' ? formatDuration(duration) : callState}</span>
        </div>
        <div className="w-12 h-12" />
      </div>

      {callType === 'audio' && (
        <div className="relative z-20 flex-1 flex flex-col items-center justify-center">
           <div className="relative">
             <div className="absolute inset-[-20px] rounded-full border border-emerald-500/30 animate-[spin_4s_linear_infinite]" />
             <div className="absolute inset-[-40px] rounded-full border border-emerald-500/10 animate-[spin_6s_linear_infinite_reverse]" />
             <img src={avatarUrl || '/icon.svg'} className="w-40 h-40 rounded-full object-cover border-4 border-[#050811] shadow-2xl relative z-10" />
           </div>
           <h2 className="text-white text-3xl font-bold mt-8">@{callerName}</h2>
           <p className="text-white/50 text-sm mt-2">HorPal Voice Call</p>
        </div>
      )}

      {callType === 'video' && (
        <motion.div drag dragConstraints={{ top: 20, right: 20, bottom: 500, left: -300 }} className="absolute top-24 right-6 w-32 h-48 rounded-2xl overflow-hidden bg-black border-2 border-white/20 shadow-2xl z-30 cursor-move">
           <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover pointer-events-none" />
        </motion.div>
      )}

      <AnimatePresence>
        {emojiFloaters.map(f => (
          <motion.div key={f.id} initial={{ y: 0, opacity: 1, scale: 0.5 }} animate={{ y: -300, opacity: 0, scale: 2 }} exit={{ opacity: 0 }} transition={{ duration: 2 }} className="absolute bottom-32 z-40 text-4xl pointer-events-none" style={{ left: `${f.x}%` }}>
            {f.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="relative z-20 p-6 pb-10 bg-gradient-to-t from-black/80 to-transparent">
        <div className="max-w-sm mx-auto flex items-center justify-between bg-white/10 backdrop-blur-2xl rounded-[2.5rem] p-2 border border-white/10 shadow-2xl">

          <button onClick={onToggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          <button onClick={onToggleVideo} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${callType === 'audio' ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-emerald-500/20 text-emerald-400'}`}>
            {callType === 'audio' ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>

          <button onClick={onToggleSpeaker} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isSpeaker ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>
            <Volume2 className="w-6 h-6" />
          </button>

          <button onClick={onEnd} className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)]">
            <PhoneOff className="w-7 h-7" />
          </button>
        </div>

        <div className="flex justify-center gap-4 mt-6">
           {['❤️', '🔥', '😂', '👏'].map(emoji => (
             <button key={emoji} onClick={() => sendEmoji(emoji)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl hover:bg-white/20 transition-transform active:scale-90">
               {emoji}
             </button>
           ))}
        </div>
      </div>

    </div>
  );
};
