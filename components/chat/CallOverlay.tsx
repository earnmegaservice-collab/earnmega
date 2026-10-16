import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999999] flex flex-col justify-between bg-black overflow-hidden pointer-events-auto"
    >
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* The Spatial Fluid Mesh Background */}
      <div className="absolute inset-0 opacity-80 mix-blend-screen pointer-events-none">
        <motion.div
          animate={{
            scale: callState === 'ringing' ? [1, 1.1, 1] : [1, 1.3, 1],
            rotate: [0, 180, 360],
            borderRadius: ["40%", "60%", "40%"]
          }}
          transition={{ duration: callState === 'ringing' ? 2 : 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-600/40 via-purple-900/40 to-black blur-[100px]"
        />
      </div>

      {/* Video feeds if connected */}
      {callType === 'video' && callState === 'connected' && (
         <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover -z-10" />
      )}

      {/* Mini self view */}
      {callType === 'video' && callState === 'connected' && (
         <div className="absolute top-10 right-4 w-28 h-40 rounded-xl overflow-hidden border border-white/20 shadow-2xl z-20">
           <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
         </div>
      )}

      {/* High-End Caller Identity */}
      <div className="relative z-10 flex flex-col items-center pt-24 drop-shadow-2xl">
        <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-emerald-400 text-xs font-black tracking-[0.4em] uppercase mb-4 text-center px-4">
          {callState === 'connected' ? 'Connected' : (callState === 'ringing' ? 'Incoming Secure Call' : 'Encrypted Connection')}
        </motion.span>
        <h1 className="text-5xl font-black text-white tracking-tighter mb-12 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] text-center px-4">{callerName || 'VIP Contact'}</h1>

        {callState !== 'connected' && (
            <div className="relative w-48 h-48 rounded-full shadow-[0_0_80px_rgba(99,102,241,0.6)] p-[2px] bg-gradient-to-br from-indigo-500 to-purple-800">
               <img src={avatarUrl || 'https://ui-avatars.com/api/?name=V+I+P&background=000&color=fff'} className="w-full h-full rounded-full object-cover bg-black" onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=V+I+P&background=000&color=fff'; }} />
               {/* Reacting Audio Pulse Rings */}
               <div className="absolute inset-0 rounded-full border-2 border-indigo-400/60 animate-ping" style={{ animationDuration: '1.5s' }} />
            </div>
        )}
      </div>

      {/* The Glassmorphic Action Footer */}
      <div className="relative z-10 flex flex-col w-full px-8 pb-16 pointer-events-auto">
        {isIncoming && callState === 'ringing' ? (
          <div className="flex justify-between items-center w-full max-w-sm mx-auto">
            <button onClick={onDecline} className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-rose-600/90 backdrop-blur-xl flex items-center justify-center text-white shadow-[0_0_40px_rgba(225,29,72,0.6)] border border-rose-400/50 transition-all active:scale-90">
                <PhoneOff size={32} strokeWidth={2.5}/>
              </div>
              <span className="text-white/80 text-[11px] font-black tracking-widest uppercase">Decline</span>
            </button>
            <button onClick={onAccept} className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-emerald-500/90 backdrop-blur-xl flex items-center justify-center text-white shadow-[0_0_60px_rgba(16,185,129,0.8)] border border-emerald-400/50 transition-all active:scale-90 animate-pulse">
                <Phone size={32} strokeWidth={2.5}/>
              </div>
              <span className="text-white/80 text-[11px] font-black tracking-widest uppercase">Answer</span>
            </button>
          </div>
        ) : callState === 'connected' ? (
          <div className="grid grid-cols-3 gap-6 w-full max-w-sm mx-auto p-6 bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <button onClick={onToggleMute} className={`flex flex-col items-center justify-center w-16 h-16 rounded-full transition-all active:scale-90 mx-auto ${isMuted ? 'bg-white/20' : 'bg-white/10'}`}>
              {isMuted ? <MicOff size={24} className="text-white" /> : <Mic size={24} className="text-white" />}
            </button>
            <button onClick={onToggleSpeaker} className={`flex flex-col items-center justify-center w-16 h-16 rounded-full transition-all active:scale-90 mx-auto ${isSpeaker ? 'bg-white/20' : 'bg-white/10'}`}>
              {isSpeaker ? <Volume2 size={24} className="text-white" /> : <VolumeX size={24} className="text-white" />}
            </button>
            <button onClick={onFlipCamera} className="flex flex-col items-center justify-center w-16 h-16 rounded-full transition-all active:scale-90 mx-auto bg-white/10">
              <SwitchCamera size={24} className="text-white" />
            </button>
            <button onClick={onTogglePiP} className="flex flex-col items-center justify-center w-16 h-16 rounded-full transition-all active:scale-90 mx-auto bg-white/10 col-start-2">
              <Maximize2 size={24} className="text-white" />
            </button>
            <button onClick={onEnd} className="flex flex-col items-center justify-center w-16 h-16 rounded-full transition-all active:scale-90 mx-auto bg-rose-600/90 shadow-[0_0_20px_rgba(225,29,72,0.6)] col-start-3">
              <PhoneOff size={24} className="text-white" />
            </button>
          </div>
        ) : (
          <button onClick={onEnd} className="w-24 h-24 mx-auto rounded-full bg-rose-600/90 backdrop-blur-xl flex items-center justify-center text-white shadow-[0_0_40px_rgba(225,29,72,0.6)] border border-rose-400/50 transition-all active:scale-90">
            <PhoneOff size={40} strokeWidth={2.5}/>
          </button>
        )}
      </div>
    </motion.div>
  );
};
