'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface CallOverlayProps {
  isRinging: boolean;
  incomingCall: { callerId: string, callerName: string, callId: string, callType: 'audio'|'video' } | null;
  currentOtherUserProfileName?: string;
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  onAccept: () => void;
  onEnd: () => void;
}

export default function CallOverlay({
  isRinging,
  incomingCall,
  currentOtherUserProfileName,
  remoteStream,
  localStream,
  onAccept,
  onEnd
}: CallOverlayProps) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const dialToneRef = useRef<HTMLAudioElement | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);

  useEffect(() => {
    // Initialize audio engines
    ringtoneRef.current = new Audio('/ringtone.mp3');
    ringtoneRef.current.loop = true;

    dialToneRef.current = new Audio('/dialtone.mp3');
    dialToneRef.current.loop = true;

    if (incomingCall) {
       ringtoneRef.current.play().catch(e => console.error('Audio play error:', e));
    } else if (isRinging) {
       dialToneRef.current.play().catch(e => console.error('Audio play error:', e));
    }

    return () => {
       ringtoneRef.current?.pause();
       if (ringtoneRef.current) ringtoneRef.current.currentTime = 0;
       ringtoneRef.current = null;

       dialToneRef.current?.pause();
       if (dialToneRef.current) dialToneRef.current.currentTime = 0;
       dialToneRef.current = null;
    };
  }, [incomingCall, isRinging]);

  useEffect(() => {
    // Teardown ringtone immediately if streams start connecting or answer occurs
    // Actually the parent handles this by unmounting the component or changing states,
    // but when `remoteStream` is active, we should definitely stop ringing.
    if (remoteStream) {
       ringtoneRef.current?.pause();
       dialToneRef.current?.pause();
    }
  }, [remoteStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
       remoteVideoRef.current.srcObject = remoteStream;
       remoteVideoRef.current.muted = false;
       remoteVideoRef.current.volume = 1.0;
    }
    if (remoteAudioRef.current && remoteStream) {
       remoteAudioRef.current.srcObject = remoteStream;
       remoteAudioRef.current.muted = false;
       remoteAudioRef.current.volume = 1.0;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
       localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

     const toggleSpeaker = async () => {
      const newSpeakerState = !isSpeakerOn;
      setIsSpeakerOn(newSpeakerState);
      if (remoteAudioRef.current && 'setSinkId' in remoteAudioRef.current) {
         try {
             // In a real app we'd request device enumeration, but this is a visual toggle or best effort
             // For mobile browsers, this toggles OS speakerphone routing.
             await (remoteAudioRef.current as any).setSinkId(newSpeakerState ? 'speaker' : 'default');
         } catch (e) {
             console.log('setSinkId not supported or failed', e);
         }
      }
   };

  const toggleMute = () => {
     if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
           audioTrack.enabled = isMuted;
           setIsMuted(!isMuted);
        }
     }
  };

  return (
    <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-[120] bg-neutral-950/90 backdrop-blur-3xl bg-gradient-to-b from-transparent to-black/50 flex flex-col items-center justify-between py-16"
    >
        <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover z-0 opacity-50" />
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
        <video ref={localVideoRef} autoPlay muted playsInline className="absolute top-4 right-4 w-24 h-36 bg-black rounded-xl object-cover z-10 border border-white/20 shadow-2xl" />

        <div className="flex flex-col items-center z-10 mt-10">
            <h2 className="text-4xl font-extrabold text-white tracking-wide drop-shadow-md mb-2">
                {incomingCall ? incomingCall.callerName : currentOtherUserProfileName}
            </h2>
            <p className={`text-white/70 text-xl font-medium tracking-widest ${(!incomingCall && !isRinging && !remoteStream) ? 'animate-pulse text-amber-400' : ''}`}>
                {remoteStream ? '00:00' : incomingCall ? `Incoming ${incomingCall.callType} call...` : isRinging ? 'Ringing...' : 'Calling...'}
            </p>
        </div>

        <div className="grid grid-cols-3 gap-6 z-10 mb-8 px-8 w-full max-w-sm">
            <button className="flex flex-col items-center justify-center space-y-2 group">
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/80 group-hover:bg-white/20 transition-all">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                </div>
                <span className="text-[10px] text-white/60 font-medium tracking-wide uppercase">Record</span>
            </button>
            <button onClick={toggleMute} className="flex flex-col items-center justify-center space-y-2 group">
                <div className={`w-16 h-16 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${isMuted ? 'bg-white text-black' : 'bg-white/10 text-white/80 group-hover:bg-white/20'}`}>
                {isMuted ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                )}
                </div>
                <span className="text-[10px] text-white/60 font-medium tracking-wide uppercase">Mute</span>
            </button>
            <button onClick={toggleSpeaker} className="flex flex-col items-center justify-center space-y-2 group">
                <div className={`w-16 h-16 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${isSpeakerOn ? 'bg-white text-black' : 'bg-white/10 text-white/80 group-hover:bg-white/20'}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                </div>
                <span className="text-[10px] text-white/60 font-medium tracking-wide uppercase">Speaker</span>
            </button>
            <button className={`flex flex-col items-center justify-center space-y-2 group ${incomingCall?.callType === 'audio' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div className="w-16 h-16 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center text-white/40 transition-all">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
                </div>
                <span className="text-[10px] text-white/40 font-medium tracking-wide uppercase">Video</span>
            </button>
            <button className="flex flex-col items-center justify-center space-y-2 group">
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/80 group-hover:bg-white/20 transition-all">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h.01"/><path d="M12 7h.01"/><path d="M17 7h.01"/><path d="M7 12h.01"/><path d="M12 12h.01"/><path d="M17 12h.01"/><path d="M7 17h.01"/><path d="M12 17h.01"/><path d="M17 17h.01"/></svg>
                </div>
                <span className="text-[10px] text-white/60 font-medium tracking-wide uppercase">Keypad</span>
            </button>
            <button className="flex flex-col items-center justify-center space-y-2 group">
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/80 group-hover:bg-white/20 transition-all">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                </div>
                <span className="text-[10px] text-white/60 font-medium tracking-wide uppercase">More</span>
            </button>
        </div>

        <div className="flex items-center space-x-8 pb-8 z-10 w-full justify-center">
            {incomingCall && !remoteStream ? (
                <>
                    <button onClick={onEnd} className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.8)] transition-all transform hover:scale-105 active:scale-95">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rotate-[135deg]"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </button>
                    <button onClick={onAccept} className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.6)] transition-all transform hover:scale-105 active:scale-95 animate-bounce">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </button>
                </>
            ) : (
                <button onClick={onEnd} className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.8)] transition-all transform hover:scale-105 active:scale-95">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rotate-[135deg]"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </button>
            )}
        </div>
    </motion.div>
  );
}
