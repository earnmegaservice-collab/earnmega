'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';
import { CallOverlay } from '../components/chat/CallOverlay';
import { createPortal } from 'react-dom';
import { DevicePermissionsModal } from '../components/chat/DevicePermissionsModal';
import { motion, AnimatePresence } from 'framer-motion';

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
  
  // Call State Management
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

  // Hardware & Network Refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const channelRef = useRef<any>(null);
  
  // The ICE Candidate Fix: Queue candidates that arrive before the call is answered
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);

  // Bulletproof Audio Engine Refs
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const dialToneRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio securely on mount
  useEffect(() => { 
    setMounted(true);
    ringtoneRef.current = new Audio('/ringtone.mp3');
    ringtoneRef.current.loop = true;
    dialToneRef.current = new Audio('/dialtone.mp3');
    dialToneRef.current.loop = true;
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(console.error);
    }

    return () => {
      stopSounds();
      ringtoneRef.current = null;
      dialToneRef.current = null;
    };
  }, []);

  const playRingtone = async () => {
    try {
      if (ringtoneRef.current) {
        ringtoneRef.current.currentTime = 0;
        await ringtoneRef.current.play();
      }
      if (navigator.vibrate) {
        navigator.vibrate([1000, 500, 1000, 500, 1000]);
      }
    } catch (e) {
      console.warn("Browser blocked autoplay. Waiting for user interaction.", e);
    }
  };

  const playDialTone = async () => {
    try {
      if (dialToneRef.current) {
        dialToneRef.current.currentTime = 0;
        await dialToneRef.current.play();
      }
    } catch (e) {
      console.warn("Dial tone playback blocked.", e);
    }
  };

  const stopSounds = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    if (dialToneRef.current) {
      dialToneRef.current.pause();
      dialToneRef.current.currentTime = 0;
    }
  }, []);

  // Global Call Listener Pipeline
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('chat-events')
      .on('broadcast', { event: 'incoming_call' }, async (payload: any) => {
        if (payload.payload.receiverId !== user.id) return;
        if (callState !== 'idle') return; // User is already in a call

        iceCandidateQueue.current = []; // Reset queue for new call
        setIsIncoming(true);
        setCallType(payload.payload.callType);
        setCallerInfo({ id: payload.payload.callerId, name: payload.payload.callerName, avatar: payload.payload.callerAvatar });
        setIncomingOffer(payload.payload.offer);
        setCallState('ringing');

        playRingtone();

        // Push Notification Trigger
        if (document.hidden && 'serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(`Incoming ${payload.payload.callType} call from ${payload.payload.callerName}`, {
                    body: 'Tap to answer',
                    icon: '/icon.svg',
                    requireInteraction: true,
                    data: { callerId: payload.payload.callerId }
                });
            });
        }

        channelRef.current?.send({ type: 'broadcast', event: 'call_ringing', payload: { callerId: payload.payload.callerId, receiverId: user.id } });
      })
      .on('broadcast', { event: 'call_ringing' }, (payload: any) => {
        if (payload.payload.callerId === user.id && callState === 'calling') {
           setCallState('ringing');
           playDialTone();
        }
      })
      .on('broadcast', { event: 'call_answered' }, async (payload: any) => {
        if (payload.payload.callerId !== user.id) return;
        if (callState === 'calling' || callState === 'ringing') {
            stopSounds();
            setCallState('connected');
            
            // Critical WebRTC Fix: Process Answer and Flush Queue
            if (peerConnectionRef.current) {
               try {
                 await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.payload.answer));
                 while (iceCandidateQueue.current.length > 0) {
                    const candidate = iceCandidateQueue.current.shift();
                    if (candidate) await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                 }
               } catch (err) {
                 console.error("Failed to set remote desc on answer", err);
               }
            }
        }
      })
      .on('broadcast', { event: 'webrtc_ice_candidate' }, async (payload: any) => {
        if (payload.payload.targetId !== user.id) return;
        
        // Critical WebRTC Fix: Queue candidates if remote description isn't ready yet
        if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
             try {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.payload.candidate));
             } catch (err) {
                console.error("Error adding ice candidate", err);
             }
        } else {
             iceCandidateQueue.current.push(payload.payload.candidate);
        }
      })
      .on('broadcast', { event: 'call_ended' }, (payload: any) => {
         if (payload.payload.targetId === user.id) {
             endCallLogic();
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

  const initLocalStream = async (type: 'audio' | 'video') => {
    if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video' ? { width: { ideal: 1920 }, frameRate: { ideal: 60 }, facingMode: "user" } : false,
        audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true, sampleRate: 48000, channelCount: 2 }
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current && type === 'video') {
         localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err: any) {
      console.error("Media error:", err);
      if (err.name === 'NotAllowedError') {
         setPermissionsError(true);
      } else {
         toast.error("Could not access hardware. Check permissions.");
      }
      throw err;
    }
  };

  const initPeerConnection = () => {
    const servers = {
      iceServers: [
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    };
    
    const pc = new RTCPeerConnection(servers);

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
            type: 'broadcast',
            event: 'webrtc_ice_candidate',
            payload: { candidate: event.candidate, targetId: callerInfo.id }
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

  const initiateCall = async (receiverId: string, receiverName: string, receiverAvatar: string | undefined, type: 'audio' | 'video') => {
     if (!user) return;

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

       const pc = initPeerConnection();
       localStreamRef.current?.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));

       const offer = await pc.createOffer();
       await pc.setLocalDescription(offer);

       channelRef.current?.send({
         type: 'broadcast',
         event: 'incoming_call',
         payload: {
           callerId: user.id,
           callerName: user.email?.split('@')[0] || 'User',
           callerAvatar: '',
           receiverId: receiverId,
           callType: type,
           offer: offer
         }
       });
     } catch (e) {
       console.error("Failed to initiate call", e);
       endCallLogic();
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

      // Critical WebRTC Fix: Process Offer and Flush Queue
      if (incomingOffer) {
         await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
         while (iceCandidateQueue.current.length > 0) {
            const candidate = iceCandidateQueue.current.shift();
            if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
         }
      }

      toast.success("Call connected", { icon: '🔒' });
      setCallState('connected');

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      channelRef.current?.send({
        type: 'broadcast',
        event: 'call_answered',
        payload: { callerId: callerInfo.id, receiverId: user.id, answer: answer }
      });

    } catch (e) {
      console.error(e);
      endCallLogic();
    }
  };

  const declineCall = () => {
     channelRef.current?.send({ type: 'broadcast', event: 'call_ended', payload: { targetId: callerInfo.id } });
     endCallLogic();
  };

  const endCallLogic = () => {
    stopSounds();
    if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Clear media sources to release hardware
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

    setCallState('ended');
    setTimeout(() => {
       setCallState('idle');
       setDuration(0);
       setIsPiP(false);
    }, 1000);
  };

  // Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === 'connected') {
      interval = setInterval(() => setDuration(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const toggleMute = () => {
    setIsMuted(prev => {
      const newState = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => {
          track.enabled = !newState;
        });
      }
      return newState;
    });
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
         track.enabled = !track.enabled;
      });
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
                    if (isIncoming) {
                        declineCall();
                    }
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
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
             <motion.div
               initial={{ scale: 0.9, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               className="bg-neutral-900 border border-white/10 rounded-3xl p-8 max-w-sm text-center shadow-2xl"
             >
                <h3 className="text-xl font-bold text-white mb-4">Hardware Access Denied</h3>
                <p className="text-white/70 mb-6">Please allow Camera and Microphone permissions in your browser settings to connect.</p>
                <button
                  onClick={() => setPermissionsError(false)}
                  className="w-full py-3 rounded-full bg-emerald-500 text-white font-medium shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 transition-transform"
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
