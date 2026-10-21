'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';
import { CallOverlay } from '../components/chat/CallOverlay';
import { createPortal } from 'react-dom';
import { DevicePermissionsModal } from '../components/chat/DevicePermissionsModal';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';

interface CallContextType {
  initiateCall: (receiverId: string, receiverName: string, receiverAvatar: string | undefined, callType: 'audio' | 'video') => void;
  isCallActive: boolean;
  isInCall: boolean;
}

const CallContext = createContext<CallContextType>({
  initiateCall: () => {},
  isCallActive: false,
  isInCall: false,
});

export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  
  // Call States
  const [callState, setCallState] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'reconnecting' | 'ended'>('idle');
  const [isIncoming, setIsIncoming] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [callerInfo, setCallerInfo] = useState({ id: '', name: '', avatar: '' });
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  
  const [incomingOffer, setIncomingOffer] = useState<any>(null);
  const [permissionsError, setPermissionsError] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [pendingCallType, setPendingCallType] = useState<'audio' | 'video' | null>(null);
  const [mounted, setMounted] = useState(false);

  // References
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const channelRef = useRef<any>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const durationRef = useRef(0);
  const callRoleRef = useRef<'caller' | 'receiver'>('caller');
  const activePartnerIdRef = useRef<string>('');

  // 🎵 Native Web Audio Synthesizer (Generates tones with 0 dependencies)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  };

  const playChimeTone = (freq1: number, freq2: number, durationSec: number) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq1, ctx.currentTime);
      osc2.frequency.setValueAtTime(freq2, ctx.currentTime);

      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + durationSec);
      osc2.stop(ctx.currentTime + durationSec);
    } catch (e) {
      console.warn("Audio synthesis error:", e);
    }
  };

  const startRingtone = () => {
    stopSounds();
    // WhatsApp European standard dual chime (440Hz & 480Hz)
    playChimeTone(440, 480, 1.2);
    ringtoneIntervalRef.current = setInterval(() => {
      playChimeTone(440, 480, 1.2);
    }, 2800);

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([1000, 500, 1000, 500, 1000]);
    }
  };

  const startDialTone = () => {
    stopSounds();
    playChimeTone(425, 425, 1.0);
    ringtoneIntervalRef.current = setInterval(() => {
      playChimeTone(425, 425, 1.0);
    }, 3000);
  };

  const stopSounds = useCallback(() => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(0);
    }
  }, []);

  // Unlock AudioContext on the first tap anywhere
  useEffect(() => {
    setMounted(true);
    const unlockAudio = () => {
      getAudioContext();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    // Request Notification permission on launch for background call popups
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    }

    return () => {
      stopSounds();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, [stopSounds]);

  // Keep durationRef synchronized for call log persistence
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // Format seconds to WhatsApp duration string (e.g., 01:23)
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 💾 Record Call History Directly to 1-on-1 Chat Messages
  const recordCallToDatabase = async (type: 'completed_call' | 'missed_call', finalSeconds: number) => {
    if (!user || !activePartnerIdRef.current) return;

    const callerId = callRoleRef.current === 'caller' ? user.id : activePartnerIdRef.current;
    const receiverId = callRoleRef.current === 'caller' ? activePartnerIdRef.current : user.id;
    const formattedDuration = formatTime(finalSeconds);
    const messageId = uuidv4();

    const newRecord = {
      id: messageId,
      sender_id: callerId,
      receiver_id: receiverId,
      content: type === 'completed_call' ? `Call Ended (${formattedDuration})` : 'Missed Call',
      message_type: type,
      duration: type === 'completed_call' ? formattedDuration : null,
      status: 'sent',
      created_at: new Date().toISOString()
    };

    try {
      await supabase.from('messages').insert(newRecord);

      // Notify open chat windows to mount the card immediately
      channelRef.current?.send({
        type: 'broadcast',
        event: 'new_message',
        payload: {
          messageId,
          senderId: callerId,
          receiverId
        }
      });
    } catch (err) {
      console.error("Failed to log call entry:", err);
    }
  };

  // WebRTC & Call Signaling Channel
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('calling-system-channel')
      .on('broadcast', { event: 'incoming_call' }, async (payload: any) => {
        if (payload.payload.receiverId !== user.id) return;
        if (callState !== 'idle') return;

        iceCandidateQueue.current = [];
        callRoleRef.current = 'receiver';
        activePartnerIdRef.current = payload.payload.callerId;

        setIsIncoming(true);
        setCallType(payload.payload.callType);
        setCallerInfo({
          id: payload.payload.callerId,
          name: payload.payload.callerName,
          avatar: payload.payload.callerAvatar
        });
        setIncomingOffer(payload.payload.offer);
        setCallState('ringing');

        startRingtone();

        // 📲 Outside-App & Lock-Screen Notification Trigger
        if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((reg) => {
              reg.showNotification(`Incoming ${payload.payload.callType} call`, {
                body: `${payload.payload.callerName} is calling...`,
                icon: payload.payload.callerAvatar || '/icon.svg',
                tag: 'incoming-call',
                requireInteraction: true,
                vibrate: [1000, 500, 1000, 500, 1000],
                data: { callerId: payload.payload.callerId }
              });
            });
          }
        }

        channelRef.current?.send({
          type: 'broadcast',
          event: 'call_ringing',
          payload: { callerId: payload.payload.callerId, receiverId: user.id }
        });
      })
      .on('broadcast', { event: 'call_ringing' }, (payload: any) => {
        if (payload.payload.callerId === user.id && callState === 'calling') {
          setCallState('ringing');
          startDialTone();
        }
      })
      .on('broadcast', { event: 'call_answered' }, async (payload: any) => {
        if (payload.payload.callerId !== user.id) return;
        if (callState === 'calling' || callState === 'ringing') {
          stopSounds();
          setCallState('connected');

          if (peerConnectionRef.current) {
            try {
              await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.payload.answer));
              while (iceCandidateQueue.current.length > 0) {
                const candidate = iceCandidateQueue.current.shift();
                if (candidate) await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
              }
            } catch (err) {
              console.error("Failed to set remote description on answer:", err);
            }
          }
        }
      })
      .on('broadcast', { event: 'webrtc_ice_candidate' }, async (payload: any) => {
        if (payload.payload.targetId !== user.id) return;
        if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.payload.candidate));
          } catch (err) {
            console.error("Error adding ice candidate:", err);
          }
        } else {
          iceCandidateQueue.current.push(payload.payload.candidate);
        }
      })
      .on('broadcast', { event: 'call_ended' }, (payload: any) => {
        if (payload.payload.targetId === user.id) {
          endCallSession(false);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = channel;
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, callState]);

  // Initialize Camera / Microphone
  const initLocalStream = async (type: 'audio' | 'video') => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video' ? { width: { ideal: 1280 }, frameRate: { ideal: 30 }, facingMode: 'user' } : false,
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });

      localStreamRef.current = stream;
      if (localVideoRef.current && type === 'video') {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err: any) {
      console.error("Hardware access error:", err);
      if (err.name === 'NotAllowedError') {
        setPermissionsError(true);
      } else {
        toast.error("Could not access camera/microphone.");
      }
      throw err;
    }
  };

  const initPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc_ice_candidate',
          payload: { candidate: event.candidate, targetId: callerInfo.id || activePartnerIdRef.current }
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.track.kind === 'video' && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      if (event.track.kind === 'audio' && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  const initiateCall = (receiverId: string, receiverName: string, receiverAvatar: string | undefined, type: 'audio' | 'video') => {
    if (!user) return;
    callRoleRef.current = 'caller';
    activePartnerIdRef.current = receiverId;

    if (!localStorage.getItem('av_permissions_granted')) {
      setPendingCallType(type);
      setShowPermissionsModal(true);
      setCallerInfo({ id: receiverId, name: receiverName, avatar: receiverAvatar || '' });
      setIsIncoming(false);
      setCallState('idle');
      return;
    }

    executeInitiateCall(receiverId, receiverName, receiverAvatar, type);
  };

  const executeInitiateCall = async (receiverId: string, receiverName: string, receiverAvatar: string | undefined, type: 'audio' | 'video') => {
    try {
      iceCandidateQueue.current = [];
      await initLocalStream(type);
      setIsIncoming(false);
      setCallType(type);
      setCallerInfo({ id: receiverId, name: receiverName, avatar: receiverAvatar || '' });
      setCallState('calling');
      startDialTone();

      const pc = initPeerConnection();
      localStreamRef.current?.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      channelRef.current?.send({
        type: 'broadcast',
        event: 'incoming_call',
        payload: {
          callerId: user!.id,
          callerName: user!.email?.split('@')[0] || 'User',
          callerAvatar: '',
          receiverId,
          callType: type,
          offer
        }
      });
    } catch (e) {
      console.error("Call initiation failed:", e);
      endCallSession(true);
    }
  };

  const acceptCall = async () => {
    stopSounds();
    if (!user) return;

    if (!localStorage.getItem('av_permissions_granted')) {
      setPendingCallType(callType);
      setShowPermissionsModal(true);
      return;
    }

    executeAcceptCall();
  };

  const executeAcceptCall = async () => {
    try {
      await initLocalStream(callType);
      const pc = initPeerConnection();
      localStreamRef.current?.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));

      if (incomingOffer) {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
        while (iceCandidateQueue.current.length > 0) {
          const candidate = iceCandidateQueue.current.shift();
          if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      }

      setCallState('connected');

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      channelRef.current?.send({
        type: 'broadcast',
        event: 'call_answered',
        payload: { callerId: callerInfo.id, receiverId: user!.id, answer }
      });
    } catch (e) {
      console.error("Accept call error:", e);
      endCallSession(true);
    }
  };

  const declineCall = () => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'call_ended',
      payload: { targetId: callerInfo.id || activePartnerIdRef.current }
    });
    endCallSession(true);
  };

  const endCallSession = (isInitiatorOfEnd: boolean) => {
    stopSounds();
    const finalSecs = durationRef.current;
    const wasConnected = callState === 'connected' || finalSecs > 0;

    // Log to Supabase 1-on-1 Chat log
    if (isInitiatorOfEnd) {
      if (wasConnected) {
        recordCallToDatabase('completed_call', finalSecs);
      } else {
        recordCallToDatabase('missed_call', 0);
      }
    }

    // Clean up hardware
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

    setCallState('ended');
    setTimeout(() => {
      setCallState('idle');
      setDuration(0);
      durationRef.current = 0;
      setIsPiP(false);
    }, 800);
  };

  // ⏱️ Live Call Duration Tracker
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const toggleMute = () => {
    setIsMuted(prev => {
      const newState = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !newState; });
      }
      return newState;
    });
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    }
  };

  const toggleSpeaker = () => setIsSpeaker(!isSpeaker);
  const togglePiP = () => setIsPiP(!isPiP);

  return (
    <CallContext.Provider value={{ initiateCall, isCallActive: callState !== 'idle', isInCall: callState === 'connected' }}>
      {children}

      {mounted && createPortal(
        <CallOverlay
          callState={callState}
          isIncoming={isIncoming}
          callerName={callerInfo.name}
          avatarUrl={callerInfo.avatar}
          callType={callType}
          duration={duration}
          isMuted={isMuted}
          isSpeaker={isSpeaker}
          remoteVideoRef={remoteVideoRef}
          localVideoRef={localVideoRef}
          remoteAudioRef={remoteAudioRef}
          onAccept={acceptCall}
          onDecline={declineCall}
          onEnd={declineCall}
          onToggleMute={toggleMute}
          onToggleSpeaker={toggleSpeaker}
          onTogglePiP={togglePiP}
          onFlipCamera={toggleVideo}
          isPiP={isPiP}
        />,
        document.body
      )}

      <AnimatePresence>
        {showPermissionsModal && (
          <DevicePermissionsModal
            onGrant={() => {
              setShowPermissionsModal(false);
              localStorage.setItem('av_permissions_granted', 'true');
              if (isIncoming) {
                executeAcceptCall();
              } else if (pendingCallType) {
                executeInitiateCall(callerInfo.id, callerInfo.name, callerInfo.avatar, pendingCallType);
              }
            }}
            onDeny={() => {
              setShowPermissionsModal(false);
              setPendingCallType(null);
              if (isIncoming) declineCall();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {permissionsError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-neutral-900 border border-white/10 rounded-3xl p-8 max-w-sm text-center shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-4">Hardware Access Denied</h3>
              <p className="text-white/70 mb-6 text-sm">Please allow Camera and Microphone permissions in your browser to connect calls.</p>
              <button
                onClick={() => setPermissionsError(false)}
                className="w-full py-3 rounded-full bg-emerald-500 text-white font-medium hover:scale-105 transition-transform"
              >
                Understood
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </CallContext.Provider>
  );
};
