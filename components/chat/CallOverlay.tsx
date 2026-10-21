import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, SwitchCamera, Maximize2 } from 'lucide-react';

interface CallOverlayProps {
  callState: 'idle' | 'calling' | 'ringing' | 'connected' | 'reconnecting' | 'ended';
  isIncoming: boolean;
  callerName: string;
  avatarUrl?: string;
  callType: 'audio' | 'video';
  duration: number; // in seconds
  isMuted: boolean;
  isSpeaker: boolean;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteAudioRef: React.RefObject<HTMLAudioElement>;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onTogglePiP: () => void;
  onFlipCamera: () => void;
  isPiP: boolean;
}

export const CallOverlay: React.FC<CallOverlayProps> = ({
  callState,
  isIncoming,
  callerName,
  avatarUrl,
  callType,
  duration,
  isMuted,
  isSpeaker,
  remoteVideoRef,
  localVideoRef,
  remoteAudioRef,
  onAccept,
  onDecline,
  onEnd,
  onToggleMute,
  onToggleSpeaker,
  onTogglePiP,
  onFlipCamera,
  isPiP,
}) => {
  if (callState === 'idle' || callState === 'ended') return null;

  const displayAvatar = avatarUrl || 'https://ui-avatars.com/api/?name=V+I+P&background=000&color=fff';

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="fixed inset-0 z-[9999999] flex flex-col justify-between bg-black overflow-hidden pointer-events-auto font-sans"
      >
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

        {/* Cinematic Full-Screen Background Blur */}
        <div className="absolute inset-0 z-0">
           <div className="absolute inset-0 bg-black/40 z-10" />
           <img 
             src={displayAvatar} 
             alt="background blur" 
             className="w-full h-full object-cover blur-[80px] scale-125 opacity-70"
           />
           {/* Dynamic color mesh overlay */}
           <motion.div
             animate={{ opacity: callState === 'ringing' ? [0.3, 0.6, 0.3] : 0.4 }}
             transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
             className="absolute inset-0 bg-gradient-to-b from-black/20 via-indigo-900/30 to-black/90 z-20 mix-blend-overlay"
           />
        </div>

        {/* Video Feeds */}
        {callType === 'video' && callState === 'connected' && (
           <>
             <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover z-10" />
             {/* Local Mini-Player (Draggable style) */}
             <motion.div 
               drag
               dragConstraints={{ top: 20, right: 20, bottom: 200, left: 20 }}
               className="absolute top-16 right-6 w-32 h-48 rounded-2xl overflow-hidden border border-white/20 shadow-2xl z-30 bg-black/50 backdrop-blur-md"
             >
               <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
             </motion.div>
           </>
        )}

        {/* Header / Caller Identity */}
        <div className="relative z-30 flex flex-col items-center pt-20 drop-shadow-2xl">
          <motion.h1 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-4xl font-semibold text-white tracking-tight mb-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] text-center px-4"
          >
            {callerName || 'VIP Contact'}
          </motion.h1>
          
          <motion.span 
            animate={{ opacity: callState === 'connected' ? 1 : [0.5, 1, 0.5] }} 
            transition={{ duration: 1.5, repeat: callState === 'connected' ? 0 : Infinity }} 
            className={`text-sm font-medium tracking-wide ${callState === 'connected' ? 'text-white/80' : 'text-emerald-400'}`}
          >
            {callState === 'connected' 
              ? formatDuration(duration) 
              : callState === 'ringing' 
                ? (callType === 'video' ? 'Incoming Video Call...' : 'Incoming Audio Call...') 
                : 'Connecting...'}
          </motion.span>

          {/* Central Avatar (Hides when video is connected) */}
          {(!((callType === 'video' && callState === 'connected'))) && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mt-12 relative"
              >
                 <div className="relative w-40 h-40 rounded-full shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-white/10 p-2 backdrop-blur-xl">
                    <img src={displayAvatar} className="w-full h-full rounded-full object-cover bg-black" alt="Caller" />
                    {/* Ringing Pulse Effect */}
                    {callState === 'ringing' && (
                      <>
                        <div className="absolute inset-0 rounded-full border border-white/40 animate-ping" style={{ animationDuration: '2s' }} />
                        <div className="absolute inset-[-20px] rounded-full border border-white/20 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
                      </>
                    )}
                 </div>
              </motion.div>
          )}
        </div>

        {/* Action Footer Controls */}
        <div className="relative z-30 flex flex-col w-full px-8 pb-12 pointer-events-auto">
          {isIncoming && callState === 'ringing' ? (
            <div className="flex justify-between items-center w-full max-w-xs mx-auto">
              <button onClick={onDecline} className="flex flex-col items-center gap-2 group">
                <div className="w-[72px] h-[72px] rounded-full bg-[#FF3B30] flex items-center justify-center text-white shadow-lg transition-transform active:scale-90">
                  <PhoneOff size={32} strokeWidth={2}/>
                </div>
              </button>
              <button onClick={onAccept} className="flex flex-col items-center gap-2 group">
                <div className="w-[72px] h-[72px] rounded-full bg-[#34C759] flex items-center justify-center text-white shadow-lg transition-transform active:scale-90 animate-bounce">
                  <Phone size={32} strokeWidth={2}/>
                </div>
              </button>
            </div>
          ) : (
            <div className="flex flex-col w-full max-w-sm mx-auto space-y-6">
              {/* Top Row Controls */}
              <div className="flex justify-evenly items-center bg-black/30 backdrop-blur-3xl p-4 rounded-[2rem] border border-white/10">
                <button onClick={onToggleMute} className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all active:scale-90 ${isMuted ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>
                  {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                </button>
                <button onClick={onToggleSpeaker} className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all active:scale-90 ${isSpeaker ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>
                  {isSpeaker ? <Volume2 size={22} /> : <VolumeX size={22} />}
                </button>
                {callType === 'video' && (
                  <button onClick={onFlipCamera} className="flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all active:scale-90 bg-white/10 text-white">
                    <SwitchCamera size={22} />
                  </button>
                )}
                <button onClick={onTogglePiP} className="flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all active:scale-90 bg-white/10 text-white">
                  <Maximize2 size={20} />
                </button>
              </div>

              {/* End Call Button */}
              <button onClick={onEnd} className="w-[72px] h-[72px] mx-auto rounded-full bg-[#FF3B30] flex items-center justify-center text-white shadow-xl transition-transform active:scale-90">
                <PhoneOff size={32} strokeWidth={2}/>
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
