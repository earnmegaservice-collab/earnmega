import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, CircleDot, Mic, MicOff, Bluetooth, Volume2, VolumeX, Grid, MoreHorizontal, Users, RefreshCw, PhoneOff } from 'lucide-react';

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

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    if (callState !== 'connected') return;
    if (!remoteAudioRef.current) return;

    // Web Audio API to detect frequency and drive rings
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();

    try {
        const stream = (remoteAudioRef.current as any).srcObject;
        if (stream) {
           const source = audioContext.createMediaStreamSource(stream);
           source.connect(analyser);
        }
    } catch (e) {
        console.error("Web audio API setup failed", e);
    }

    analyser.fftSize = 256;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    let reqFrame: number;
    const updateLevel = () => {
       analyser.getByteFrequencyData(dataArray);
       // Calculate average volume
       let sum = 0;
       for (let i = 0; i < dataArray.length; i++) {
         sum += dataArray[i];
       }
       const avg = sum / dataArray.length;
       setAudioLevel(avg);
       reqFrame = requestAnimationFrame(updateLevel);
    };
    updateLevel();

    return () => {
       cancelAnimationFrame(reqFrame);
       if (audioContext.state !== 'closed') audioContext.close();
    };
  }, [callState, remoteAudioRef]);

  if (callState === 'idle' || callState === 'ended') return null;

  if (isPiP) {
    return (
      <motion.div
        drag
        dragConstraints={{ top: 0, left: 0, right: window.innerWidth - 200, bottom: window.innerHeight - 200 }}
        className="fixed top-20 right-6 w-32 rounded-2xl bg-neutral-900/90 backdrop-blur-xl border border-white/20 shadow-2xl z-[9999] overflow-hidden flex flex-col items-center p-2 cursor-move"
      >
        {callType === 'video' ? (
           <div className="relative w-full h-32 bg-black rounded-lg overflow-hidden">
             <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
           </div>
        ) : (
           <div className="w-full h-24 flex flex-col items-center justify-center">
             <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-600 flex items-center justify-center animate-pulse mb-2">
                <Mic size={20} className="text-white" />
             </div>
             <span className="text-xs font-mono text-emerald-400">{formatDuration(duration)}</span>
           </div>
        )}
        <button onClick={onTogglePiP} className="mt-2 w-full py-1 bg-white/10 rounded-lg text-xs text-white">Expand</button>
      </motion.div>
    );
  }

  const isRinging = callState === 'ringing' || callState === 'calling';
  const isConnected = callState === 'connected';

  // Dynamic scaling based on Web Audio API (or default pulsing if ringing)
  const audioFrequencyScale1 = isConnected ? 1 + (audioLevel / 255) * 0.5 : [1, 1.1, 1];
  const audioFrequencyScale2 = isConnected ? 1 + (audioLevel / 255) * 0.8 : [1, 1.2, 1];

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[9999] flex flex-col justify-between select-none text-white overflow-hidden"
    >
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Cinematic Liquid Wave Background */}
      <motion.div
        animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 -z-10 bg-[url('/noise.png')] bg-blend-overlay bg-gradient-to-br from-black via-blue-950 to-slate-900 bg-[length:300%_300%]"
      />

      {/* Video Backgrounds */}
      {callType === 'video' && (
        <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover -z-5 opacity-80" />
      )}
      {callType === 'video' && (
        <div className="absolute bottom-40 right-6 w-28 h-40 rounded-2xl z-10 border border-white/20 shadow-2xl bg-black overflow-hidden group">
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          <button onClick={onFlipCamera} className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
             <RefreshCw size={24} className="text-white" />
          </button>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="w-full flex justify-center pt-12 z-10">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-medium shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
          <div className={`w-2 h-2 rounded-full ${callState === 'reconnecting' ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
          {callState === 'reconnecting' ? 'Reconnecting...' : 'End-to-End Encrypted'}
        </div>
      </div>

      {/* Caller Identity & Visualizer Rings */}
      <div className="flex flex-col items-center mt-8 z-10 flex-grow relative">
        <div className="relative flex items-center justify-center mt-12 w-64 h-64">
           {/* Web Audio API wired dynamic rings */}
           <motion.div
             animate={{ scale: audioFrequencyScale1, opacity: isConnected ? 0.3 + (audioLevel/255)*0.5 : [0.5, 0.1, 0.5] }}
             transition={!isConnected ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : { type: 'spring', bounce: 0, duration: 0.1 }}
             className="absolute w-64 h-64 rounded-full border border-cyan-400/50 shadow-[0_0_40px_rgba(34,211,238,0.2)]"
           />
           <motion.div
             animate={{ scale: audioFrequencyScale2, opacity: isConnected ? 0.1 + (audioLevel/255)*0.3 : [0.3, 0, 0.3] }}
             transition={!isConnected ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" } : { type: 'spring', bounce: 0, duration: 0.1 }}
             className="absolute w-80 h-80 rounded-full border border-blue-500/30"
           />
           <img
             src={avatarUrl || 'https://via.placeholder.com/150'}
             className="w-40 h-40 rounded-full object-cover z-10 shadow-[0_0_80px_rgba(59,130,246,0.8)] border-4 border-white/10"
           />
        </div>

        <h2 className="text-4xl font-extrabold tracking-tight mt-10 text-white text-center px-4 drop-shadow-xl">{callerName}</h2>

        {isConnected ? (
          <p className="text-2xl font-mono text-emerald-400 tracking-widest mt-3 drop-shadow-md">
            {formatDuration(duration)}
          </p>
        ) : (
          <p className="text-lg font-medium text-blue-200 tracking-wide mt-3 animate-pulse drop-shadow-md">
            {isIncoming ? `Incoming ${callType} call...` : (callState === 'calling' ? 'Calling...' : 'Ringing...')}
          </p>
        )}
      </div>

      {/* Control Grid */}
      <div className="z-10 w-full mb-8 backdrop-blur-md bg-white/5 pt-6 pb-2 rounded-t-[3rem] border-t border-white/10">
        <div className="grid grid-cols-3 gap-8 px-12 pb-10 w-full max-w-md mx-auto">
          <button onClick={() => {}} className={`w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center backdrop-blur-2xl border transition-all active:scale-90 bg-white/10 text-white border-white/20 hover:bg-white/20`}>
            <CircleDot size={28} />
          </button>
          <button onClick={onToggleMute} className={`w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center backdrop-blur-2xl border transition-all active:scale-90 ${isMuted ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}>
            {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
          </button>
          <button onClick={() => {}} className={`w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center backdrop-blur-2xl border transition-all active:scale-90 bg-white/10 text-white border-white/20 hover:bg-white/20`}>
             <Bluetooth size={28} />
          </button>
          <button onClick={onToggleSpeaker} className={`w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center backdrop-blur-2xl border transition-all active:scale-90 ${isSpeaker ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}>
            {isSpeaker ? <VolumeX size={28} /> : <Volume2 size={28} />}
          </button>
          <button onClick={() => {}} className={`w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center backdrop-blur-2xl border transition-all active:scale-90 bg-white/10 text-white border-white/20 hover:bg-white/20`}>
            <Grid size={28} />
          </button>
          <button onClick={onTogglePiP} className={`w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center backdrop-blur-2xl border transition-all active:scale-90 bg-white/10 text-white border-white/20 hover:bg-white/20`}>
            <MoreHorizontal size={28} />
          </button>
        </div>

        {/* The Action Footer */}
        {isIncoming && isRinging ? (
          <div className="flex justify-center gap-16 pb-16">
            <button onClick={onDecline} className="w-24 h-24 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center text-white shadow-[0_0_50px_rgba(225,29,72,0.6)] active:scale-90 transition-all z-50">
              <PhoneOff size={36} />
            </button>
            <button onClick={onAccept} className="w-24 h-24 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center text-white shadow-[0_0_60px_rgba(16,185,129,0.8)] active:scale-90 transition-all animate-pulse ring-4 ring-emerald-500/40 z-50">
              <Phone size={36} />
            </button>
          </div>
        ) : (
          <div className="flex justify-center pb-16">
            <button onClick={onEnd} className="w-24 h-24 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center text-white shadow-[0_0_50px_rgba(225,29,72,0.6)] active:scale-90 transition-all z-50">
              <PhoneOff size={36} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
