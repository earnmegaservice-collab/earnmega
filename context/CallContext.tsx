'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';
import { CallOverlay } from '../components/chat/CallOverlay';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Global Call Context
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
  const [callState, setCallState] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'reconnecting' | 'ended'>('idle');
  const [isIncoming, setIsIncoming] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [callerInfo, setCallerInfo] = useState({ id: '', name: '', avatar: '' });
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [incomingOffer, setIncomingOffer] = useState<any>(null);


  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const dialToneRef = useRef<HTMLAudioElement | null>(null);

  const channelRef = useRef<any>(null);

  useEffect(() => {
    ringtoneRef.current = new Audio('/ringtone.mp3');
    ringtoneRef.current.loop = true;
    dialToneRef.current = new Audio('/dialtone.mp3');
    dialToneRef.current.loop = true;
    return () => {
      ringtoneRef.current?.pause();
      dialToneRef.current?.pause();
      ringtoneRef.current = null;
      dialToneRef.current = null;
    };
  }, []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`signaling-${user.id}`)
      .on('broadcast', { event: 'call_offer' }, async (payload: any) => {
        if (callState !== 'idle') return;
        console.log("Global Call offer received:", payload);

        setIsIncoming(true);
        setCallType(payload.payload.callType);
        setCallerInfo({ id: payload.payload.callerId, name: payload.payload.callerName, avatar: payload.payload.callerAvatar });
        setIncomingOffer(payload.payload.offer);
        setCallState('ringing');

        if (ringtoneRef.current) {
           ringtoneRef.current.play().catch(console.error);
        }

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

        const tempChannel = supabase.channel(`signaling-${payload.payload.callerId}`);
        tempChannel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await tempChannel.send({ type: 'broadcast', event: 'call_ringing', payload: { receiverId: user.id, callerId: payload.payload.callerId } });
          }
        });
      })
      .on('broadcast', { event: 'call_ringing' }, (payload: any) => {
        if (callState === 'calling' && payload.payload.callerId === user.id) {
           setCallState('ringing');
           dialToneRef.current?.play().catch(console.error);
        }
      })
      .on('broadcast', { event: 'call_answer' }, async (payload: any) => {
        if (callState === 'calling' || callState === 'ringing') {
            stopSounds();
            setCallState('connected');
            if (peerConnectionRef.current) {
               try {
                 await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.payload.answer));
               } catch (err) {
                 console.error("Failed to set remote desc on answer", err);
               }
            }
        }
      })
      .on('broadcast', { event: 'ice_candidate' }, async (payload: any) => {
        if (peerConnectionRef.current && payload.payload.candidate) {
             try {
                if (peerConnectionRef.current.remoteDescription) {
                    await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.payload.candidate));
                } else {
                    console.log("ICE buffered (not implemented in stub)");
                }
             } catch (err) {
                console.error("Error adding ice candidate", err);
             }
        }
      })
      .on('broadcast', { event: 'call_ended' }, () => {
         endCallLogic();
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const [permissionsError, setPermissionsError] = useState(false);

  const initLocalStream = async (type: 'audio' | 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000 },
        video: type === 'video' ? { facingMode: "user", width: { ideal: 1920 } } : false
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
         toast.error("Could not access camera/microphone");
      }
      throw err;
    }
  };

  const initPeerConnection = () => {
    const servers = {
      iceServers: [
        { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
      ]
    };
    const pc = new RTCPeerConnection(servers);

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        let targetId = callerInfo.id;
        const tempChannel = supabase.channel(`signaling-${targetId}`);
        tempChannel.subscribe(async (status) => {
           if (status === 'SUBSCRIBED') {
              await tempChannel.send({
                type: 'broadcast',
                event: 'ice_candidate',
                payload: { candidate: event.candidate, targetId: targetId }
              });
           }
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("Track received!", event.track.kind);
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
     try {
       await initLocalStream(type);
       setIsIncoming(false);
       setCallType(type);
       setCallerInfo({ id: receiverId, name: receiverName, avatar: receiverAvatar || '' });
       setCallState('calling');

       const pc = initPeerConnection();
       localStreamRef.current?.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));

       const offer = await pc.createOffer();
       await pc.setLocalDescription(offer);

       // Broadcast to receiver's channel
       const tempChannel = supabase.channel(`signaling-${receiverId}`);
       tempChannel.subscribe(async (status) => {
         if (status === 'SUBSCRIBED') {
           await tempChannel.send({
             type: 'broadcast',
             event: 'call_offer',
             payload: {
               callerId: user.id,
               callerName: user.email?.split('@')[0] || 'User',
               callerAvatar: '',
               receiverId: receiverId,
               callType: type,
               offer: offer
             }
           });
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
    try {
      await initLocalStream(callType);
      const pc = initPeerConnection();
      localStreamRef.current?.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));

      // Apply the offer before creating an answer
      if (incomingOffer) {
         await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
      }

      toast.success("Call connected");
      setCallState('connected');

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const tempChannel = supabase.channel(`signaling-${callerInfo.id}`);
      tempChannel.subscribe(async (status) => {
         if (status === 'SUBSCRIBED') {
            await tempChannel.send({
              type: 'broadcast',
              event: 'call_answer',
              payload: { callerId: callerInfo.id, receiverId: user.id, answer: answer }
            });
         }
      });

    } catch (e) {
      console.error(e);
      endCallLogic();
    }
  };

  const declineCall = () => {
     stopSounds();
     const tempChannel = supabase.channel(`signaling-${callerInfo.id}`);
     tempChannel.subscribe(async (status) => {
       if (status === 'SUBSCRIBED') {
         await tempChannel.send({ type: 'broadcast', event: 'call_ended', payload: { targetId: callerInfo.id } });
       }
     });
     endCallLogic();
  };

  const endCallLogic = () => {
    stopSounds();
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setCallState('ended');
    setTimeout(() => {
       setCallState('idle');
       setDuration(0);
       setIsPiP(false);
    }, 1000);
  };

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
