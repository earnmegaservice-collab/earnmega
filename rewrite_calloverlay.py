import re

with open('components/chat/CallOverlay.tsx', 'r') as f:
    content = f.read()

new_content = """import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, SwitchCamera, Maximize2, Users, ChevronUp, ChevronDown } from 'lucide-react';

interface CallOverlayProps {
  callState: 'idle' | 'calling' | 'ringing' | 'connected' | 'reconnecting' | 'ended';
  isIncoming: boolean;
  callerName: string;
  avatarUrl?: string;
  callType: 'audio' | 'video';
  duration: number;
  isMuted: boolean;
  isSpeaker: boolean;
  activeMembers: any[];
  activeSpeakerId: string | null;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onTogglePiP: () => void;
  onFlipCamera: () => void;
  isPiP: boolean;
}

const VideoStream: React.FC<{ stream: MediaStream, isLocal?: boolean, isActiveSpeaker?: boolean }> = ({ stream, isLocal, isActiveSpeaker }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (videoRef.current && stream.getVideoTracks().length > 0) {
      videoRef.current.srcObject = stream;
    }
    if (audioRef.current && !isLocal && stream.getAudioTracks().length > 0) {
      audioRef.current.srcObject = stream;
    }
  }, [stream, isLocal]);

  return (
    <>
      {stream.getVideoTracks().length > 0 ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover transition-all duration-300 ${isActiveSpeaker ? 'border-4 border-fuchsia-500 rounded-3xl shadow-[0_0_30px_rgba(217,70,239,0.5)]' : 'rounded-3xl border border-white/10'}`}
        />
      ) : (
        <div className={`w-full h-full flex items-center justify-center bg-zinc-900 transition-all duration-300 ${isActiveSpeaker ? 'border-4 border-emerald-500 rounded-3xl shadow-[0_0_30px_rgba(16,185,129,0.5)]' : 'rounded-3xl border border-white/10'}`}>
           <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center shadow-lg">
             <Mic className={isActiveSpeaker ? 'text-emerald-400' : 'text-zinc-500'} size={40} />
           </div>
        </div>
      )}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline className="hidden" />}
    </>
  );
};

export const CallOverlay: React.FC<CallOverlayProps> = ({
  callState,
  isIncoming,
  callerName,
  avatarUrl,
  callType,
  duration,
  isMuted,
  isSpeaker,
  activeMembers,
  activeSpeakerId,
  localVideoRef,
  onAccept,
  onDecline,
  onEnd,
  onToggleMute,
  onToggleSpeaker,
  onTogglePiP,
  onFlipCamera,
  isPiP,
}) => {
  const [showMembers, setShowMembers] = useState(false);

  if (callState === 'idle' || callState === 'ended') return null;

  const displayAvatar = avatarUrl || 'https://ui-avatars.com/api/?name=V+I+P&background=000&color=fff';

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Determine who to show in main view
  const mainSpeaker = activeMembers.find(m => m.id === activeSpeakerId) || activeMembers[0];
  const gridMembers = activeMembers.filter(m => m !== mainSpeaker);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="fixed inset-0 z-[9999999] flex flex-col justify-between bg-black overflow-hidden pointer-events-auto font-sans"
      >
        {/* Cinematic Full-Screen Background Blur */}
        <div className="absolute inset-0 z-0">
           <div className="absolute inset-0 bg-black/70 z-10 backdrop-blur-3xl" />
           <img
             src={displayAvatar}
             alt="background blur"
             className="w-full h-full object-cover blur-[100px] scale-125 opacity-30"
           />
           {/* Dynamic color mesh overlay based on active speaker */}
           <motion.div
             animate={{ opacity: activeSpeakerId ? 0.6 : 0.2 }}
             transition={{ duration: 1 }}
             className={`absolute inset-0 bg-gradient-to-b ${activeSpeakerId ? 'from-fuchsia-900/20 via-black/80' : 'from-black/20 via-zinc-900/30'} to-black/90 z-20 mix-blend-overlay`}
           />
        </div>

        {/* Call UI Content */}
        {callState === 'connected' ? (
          <div className="relative z-30 flex-1 flex flex-col pt-12 pb-6 px-4">
             {/* Header */}
             <div className="flex justify-between items-center mb-4">
                 <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 shadow-lg">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-white/90 text-sm font-medium tracking-wider">{formatDuration(duration)}</span>
                 </div>

                 <button onClick={() => setShowMembers(true)} className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 shadow-lg active:scale-95 transition-transform">
                    <Users size={16} className="text-white/80" />
                    <span className="text-white/90 text-sm font-bold">{activeMembers.length + 1}</span>
                 </button>
             </div>

             {/* Main Speaker View */}
             <div className="flex-1 relative w-full rounded-[2.5rem] overflow-hidden shadow-2xl mb-4">
                 {mainSpeaker ? (
                    <VideoStream stream={mainSpeaker.stream} isActiveSpeaker={mainSpeaker.id === activeSpeakerId} />
                 ) : (
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                       <div className="text-center">
                         <img src={displayAvatar} className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-white/10" />
                         <h2 className="text-white/80 text-xl font-medium">{callerName}</h2>
                       </div>
                    </div>
                 )}

                 {/* Local Mini-Player */}
                 {callType === 'video' && (
                   <motion.div
                     drag
                     dragConstraints={{ top: 10, right: 10, bottom: 200, left: 10 }}
                     className="absolute top-4 right-4 w-28 h-40 rounded-2xl overflow-hidden border border-white/20 shadow-2xl z-40 bg-black"
                   >
                     <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                   </motion.div>
                 )}
             </div>

             {/* Small Grid for Others */}
             {gridMembers.length > 0 && (
                 <div className="h-24 w-full flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                    {gridMembers.map(m => (
                       <div key={m.id} className="h-full min-w-[80px] rounded-2xl overflow-hidden relative snap-center shadow-lg border border-white/10">
                          <VideoStream stream={m.stream} isActiveSpeaker={m.id === activeSpeakerId} />
                       </div>
                    ))}
                 </div>
             )}
          </div>
        ) : (
          <div className="relative z-30 flex flex-col items-center pt-32 drop-shadow-2xl flex-1">
             <motion.h1
               initial={{ y: -20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               className="text-4xl font-semibold text-white tracking-tight mb-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] text-center px-4"
             >
               {callerName || 'Group Call'}
             </motion.h1>

             <motion.span
               animate={{ opacity: [0.5, 1, 0.5] }}
               transition={{ duration: 1.5, repeat: Infinity }}
               className="text-emerald-400 text-sm font-medium tracking-wide"
             >
               {callState === 'ringing'
                   ? (callType === 'video' ? 'Incoming Video Call...' : 'Incoming Audio Call...')
                   : 'Connecting...'}
             </motion.span>

             <motion.div
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="mt-16 relative"
             >
                <div className="relative w-40 h-40 rounded-full shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-white/10 p-2 backdrop-blur-xl">
                   <img src={displayAvatar} className="w-full h-full rounded-full object-cover bg-black" alt="Caller" />
                   {callState === 'ringing' && (
                     <>
                       <div className="absolute inset-0 rounded-full border border-white/40 animate-ping" style={{ animationDuration: '2s' }} />
                       <div className="absolute inset-[-20px] rounded-full border border-white/20 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
                     </>
                   )}
                </div>
             </motion.div>
          </div>
        )}

        {/* Action Footer Controls */}
        <div className="relative z-40 flex flex-col w-full px-6 pb-10 pointer-events-auto bg-gradient-to-t from-black via-black/80 to-transparent pt-10">
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
              <div className="flex justify-evenly items-center bg-zinc-900/60 backdrop-blur-3xl p-4 rounded-[2rem] border border-white/10 shadow-2xl">
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
                <button onClick={onTogglePiP} className="flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all active:scale-90 bg-white/10 text-white hover:bg-white/20">
                  <Maximize2 size={20} />
                </button>
              </div>

              <button onClick={onEnd} className="w-[72px] h-[72px] mx-auto rounded-full bg-[#FF3B30] flex items-center justify-center text-white shadow-[0_0_20px_rgba(255,59,48,0.4)] transition-transform active:scale-90">
                <PhoneOff size={32} strokeWidth={2}/>
              </button>
            </div>
          )}
        </div>

        {/* Live Members Drawer Bottom Sheet */}
        <AnimatePresence>
          {showMembers && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 bg-zinc-950 border-t border-white/10 rounded-t-[2.5rem] z-50 p-6 flex flex-col"
              style={{ maxHeight: '60vh' }}
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6" onClick={() => setShowMembers(false)} />
              <h3 className="text-white font-semibold text-lg mb-4 flex items-center justify-between">
                <span>Live Members</span>
                <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold">{activeMembers.length + 1}</span>
              </h3>

              <div className="overflow-y-auto flex-1 space-y-3 scrollbar-hide pb-20">
                 {/* Me */}
                 <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                       <span className="text-white/60 font-medium">Me</span>
                    </div>
                    <div className="flex-1">
                       <p className="text-white font-medium text-sm">You</p>
                    </div>
                    <div className="text-emerald-400"><Mic size={18} /></div>
                 </div>

                 {/* Others */}
                 {activeMembers.map(m => (
                   <div key={m.id} className={`flex items-center gap-3 p-3 rounded-2xl border ${m.id === activeSpeakerId ? 'bg-fuchsia-900/20 border-fuchsia-500/30' : 'bg-white/5 border-white/5'}`}>
                      <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden relative">
                         {m.id === activeSpeakerId && (
                           <div className="absolute inset-0 bg-fuchsia-500/20 flex items-center justify-center backdrop-blur-sm z-10">
                              <Volume2 size={16} className="text-fuchsia-400" />
                           </div>
                         )}
                         <img src={`https://ui-avatars.com/api/?name=User&background=000&color=fff`} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                         <p className="text-white font-medium text-sm">{m.id.substring(0,8)}</p>
                      </div>
                      {m.id === activeSpeakerId && (
                         <div className="w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse shadow-[0_0_10px_rgba(217,70,239,0.8)]" />
                      )}
                   </div>
                 ))}
              </div>

              <button
                onClick={() => setShowMembers(false)}
                className="absolute bottom-6 left-6 right-6 py-4 bg-white/10 rounded-2xl text-white font-semibold active:scale-95 transition-transform"
              >
                Close
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};
"""

with open('components/chat/CallOverlay.tsx', 'w') as f:
    f.write(new_content)
