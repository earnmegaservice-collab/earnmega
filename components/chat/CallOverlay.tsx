import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, PhoneOff } from 'lucide-react';

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[999999] flex flex-col justify-between bg-black overflow-hidden pointer-events-auto">
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* The Live Aura Background */}
      <motion.div animate={{ rotate: [0, 90, 180, 270, 360], scale: [1, 1.2, 1] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute -inset-[100%] opacity-60 mix-blend-screen blur-[120px] bg-[conic-gradient(at_center,_var(--tw-gradient-stops))] from-blue-600 via-indigo-900 to-purple-600 pointer-events-none" />

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

      {/* Caller Header & Avatar */}
      <div className="relative z-10 flex flex-col items-center pt-24 drop-shadow-2xl">
        <span className="text-white/70 text-sm font-bold tracking-[0.3em] uppercase mb-6">
          {callState === 'connected' ? 'Connected' : (callState === 'ringing' ? 'Incoming Video Call' : 'Ringing...')}
        </span>
        <h1 className="text-6xl font-black text-white tracking-tighter mb-10 text-center px-4">{callerName || 'VIP User'}</h1>

        {callState !== 'connected' && (
            <div className="relative w-56 h-56 rounded-full shadow-[0_0_100px_rgba(79,70,229,0.5)] border-[3px] border-white/30 p-1 bg-black/50 backdrop-blur-md">
               <img src={avatarUrl || 'https://ui-avatars.com/api/?name=V+I+P&background=000&color=fff'} className="w-full h-full rounded-full object-cover" onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=V+I+P&background=000&color=fff'; }} />
               {/* Reacting Audio Pulse Rings */}
               <div className="absolute inset-0 rounded-full border-2 border-indigo-400/60 animate-ping" style={{ animationDuration: '1.5s' }} />
            </div>
        )}
      </div>

      {/* Massive Red/Green Interaction Footer */}
      <div className="relative z-10 flex flex-col items-center pb-20 w-full px-10">
        {isIncoming && (callState === 'ringing' || callState === 'calling') ? (
          <div className="flex w-full max-w-md justify-between">
            <button onClick={onDecline} className="flex flex-col items-center gap-3 group">
              <div className="w-24 h-24 rounded-full bg-red-600 group-hover:bg-red-500 flex items-center justify-center text-white shadow-[0_0_60px_rgba(220,38,38,0.6)] transition-all active:scale-90">
                <PhoneOff size={40}/>
              </div>
              <span className="text-white/90 text-sm font-bold tracking-wide">Decline</span>
            </button>
            <button onClick={onAccept} className="flex flex-col items-center gap-3 group">
              <div className="w-24 h-24 rounded-full bg-emerald-500 group-hover:bg-emerald-400 flex items-center justify-center text-white shadow-[0_0_80px_rgba(16,185,129,0.8)] transition-all active:scale-90 animate-bounce">
                <Phone size={40}/>
              </div>
              <span className="text-white/90 text-sm font-bold tracking-wide">Answer</span>
            </button>
          </div>
        ) : (
          <div className="flex w-full justify-center">
            <button onClick={onEnd} className="w-28 h-28 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white shadow-[0_0_60px_rgba(220,38,38,0.7)] transition-all active:scale-90">
               <PhoneOff size={48}/>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
