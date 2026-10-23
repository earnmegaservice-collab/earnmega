import re

with open('context/CallContext.tsx', 'r') as f:
    content = f.read()

# We need to completely rewrite CallContext.tsx for group calling mesh support.
# I will output the new content directly.

new_content = """'use client';

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';
import { CallOverlay } from '../components/chat/CallOverlay';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import DevicePermissionsModal from '../components/chat/DevicePermissionsModal';
import { v4 as uuidv4 } from "uuid";

interface CallContextType {
  initiateCall: (receiverId: string, receiverName: string, receiverAvatar: string | undefined, type: 'audio' | 'video', isGroup?: boolean) => void;
  joinCall: (roomId: string, callType: 'audio' | 'video') => void;
  isCallActive: boolean;
  isInCall: boolean;
}

const CallContext = createContext<CallContextType>({
  initiateCall: () => {},
  joinCall: () => {},
  isCallActive: false,
  isInCall: false,
});

export const useCall = () => useContext(CallContext);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [callState, setCallState] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'reconnecting' | 'ended'>('idle');
  const [isIncoming, setIsIncoming] = useState(false);
  const [callerInfo, setCallerInfo] = useState<{ id: string; name: string; avatar: string }>({ id: '', name: '', avatar: '' });
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [permissionsError, setPermissionsError] = useState(false);
  const [pendingCallType, setPendingCallType] = useState<'audio' | 'video' | null>(null);

  // Group Call State
  const [activeMembers, setActiveMembers] = useState<any[]>([]);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);

  // Mesh Network Refs
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analysersRef = useRef<Map<string, AnalyserNode>>(new Map());

  // DOM Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Signaling Refs
  const callChannelRef = useRef<any>(null);
  const presenceChannelRef = useRef<any>(null);
  const currentRoomIdRef = useRef<string | null>(null);

  const durationRef = useRef(0);
  durationRef.current = duration;

  const ringbackToneRef = useRef<HTMLAudioElement | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  useEffect(() => { setMounted(true); }, []);

  // Format time util
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startDialTone = () => {
    if (!ringbackToneRef.current) {
      ringbackToneRef.current = new Audio('/sounds/ringback.mp3');
      ringbackToneRef.current.loop = true;
    }
    ringbackToneRef.current.play().catch(() => {});
  };

  const startRingtone = () => {
    if (!ringtoneRef.current) {
      ringtoneRef.current = new Audio('/sounds/ringtone.mp3');
      ringtoneRef.current.loop = true;
    }
    ringtoneRef.current.play().catch(() => {});
  };

  const stopSounds = () => {
    if (ringbackToneRef.current) {
      ringbackToneRef.current.pause();
      ringbackToneRef.current.currentTime = 0;
    }
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  };

  // ==========================================
  // WEBRTC & PRESENCE SIGNALING
  // ==========================================
  useEffect(() => {
    if (!user) return;

    // Global listener for incoming calls (mostly 1-on-1 or group call start invites)
    const callChannel = supabase.channel('webrtc-global-calls')
      .on('broadcast', { event: 'incoming_call' }, async (payload: any) => {
        if (payload.payload.receiverId !== user.id) return;
        if (callState !== 'idle') return;

        setIsIncoming(true);
        setCallType(payload.payload.callType);
        setCallerInfo({
          id: payload.payload.roomId || payload.payload.callerId,
          name: payload.payload.callerName,
          avatar: payload.payload.callerAvatar
        });
        currentRoomIdRef.current = payload.payload.roomId || payload.payload.callerId;
        setCallState('ringing');

        startRingtone();
      })
      .on('broadcast', { event: 'call_ended' }, (payload: any) => {
         if (payload.payload.targetId === user.id) {
            endCallSession(false);
         }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          callChannelRef.current = callChannel;
        }
      });

    return () => {
      supabase.removeChannel(callChannel);
    };
  }, [user, callState]);

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
      if (localVideoRef.current && type === 'video') localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err: any) {
      if (err.name === 'NotAllowedError') setPermissionsError(true);
      else toast.error("Could not access camera/microphone.");
      throw err;
    }
  };

  const createPeerConnection = (targetUserId: string, isInitiator: boolean) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && presenceChannelRef.current) {
        presenceChannelRef.current.send({
          type: 'broadcast',
          event: 'ice_candidate',
          payload: { candidate: event.candidate, targetId: targetUserId, sourceId: user!.id }
        });
      }
    };

    pc.ontrack = (event) => {
      remoteStreamsRef.current.set(targetUserId, event.streams[0]);
      setupActiveSpeakerDetection(targetUserId, event.streams[0]);
      // Trigger a re-render to attach the stream to a video element
      setActiveMembers(prev => [...prev.filter(p => p.id !== targetUserId), { id: targetUserId, stream: event.streams[0] }]);
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    peerConnectionsRef.current.set(targetUserId, pc);
    return pc;
  };

  const setupActiveSpeakerDetection = (userId: string, stream: MediaStream) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const audioCtx = audioContextRef.current;

    // Only process if there are audio tracks
    if (stream.getAudioTracks().length === 0) return;

    try {
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analysersRef.current.set(userId, analyser);
    } catch (e) {
      console.error("Audio routing error for speaker detection", e);
    }
  };

  // Active speaker loop
  useEffect(() => {
    if (callState !== 'connected') return;

    let animationFrameId: number;
    const checkAudioLevels = () => {
      let maxVolume = -Infinity;
      let loudestSpeaker: string | null = null;

      // Add local user volume check if needed, but usually we don't highlight ourselves

      analysersRef.current.forEach((analyser, userId) => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;

        if (average > maxVolume && average > 10) { // threshold
          maxVolume = average;
          loudestSpeaker = userId;
        }
      });

      if (loudestSpeaker) {
        setActiveSpeakerId(loudestSpeaker);
      }

      animationFrameId = requestAnimationFrame(checkAudioLevels);
    };

    animationFrameId = requestAnimationFrame(checkAudioLevels);
    return () => cancelAnimationFrame(animationFrameId);
  }, [callState]);

  const joinCallRoom = async (roomId: string) => {
    if (!user) return;

    const roomChannel = supabase.channel(`call_room_${roomId}`, {
      config: { presence: { key: user.id } }
    });

    presenceChannelRef.current = roomChannel;

    roomChannel
      .on('presence', { event: 'sync' }, () => {
        const state = roomChannel.presenceState();
        // we can track users in the room here
        const membersInRoom = Object.keys(state);
        // Only keep members who are actually present
        setActiveMembers(prev => prev.filter(m => membersInRoom.includes(m.id) || m.id === user.id));
      })
      .on('presence', { event: 'join' }, async ({ key, newPresences }) => {
        if (key === user.id) return; // Ignore own join

        // When a new user joins, we act as initiator to them
        const pc = createPeerConnection(key, true);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        roomChannel.send({
          type: 'broadcast',
          event: 'offer',
          payload: { offer, targetId: key, sourceId: user.id }
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        const pc = peerConnectionsRef.current.get(key);
        if (pc) {
          pc.close();
          peerConnectionsRef.current.delete(key);
        }
        remoteStreamsRef.current.delete(key);
        analysersRef.current.delete(key);
        setActiveMembers(prev => prev.filter(m => m.id !== key));
        if (activeSpeakerId === key) setActiveSpeakerId(null);

        // If we are the last one in the room (or it's just us left)
        if (peerConnectionsRef.current.size === 0) {
           // Optionally end call or stay in empty room
        }
      })
      .on('broadcast', { event: 'offer' }, async (payload: any) => {
        if (payload.payload.targetId !== user.id) return;

        const sourceId = payload.payload.sourceId;
        const pc = createPeerConnection(sourceId, false);
        await pc.setRemoteDescription(new RTCSessionDescription(payload.payload.offer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        roomChannel.send({
          type: 'broadcast',
          event: 'answer',
          payload: { answer, targetId: sourceId, sourceId: user.id }
        });
      })
      .on('broadcast', { event: 'answer' }, async (payload: any) => {
        if (payload.payload.targetId !== user.id) return;

        const pc = peerConnectionsRef.current.get(payload.payload.sourceId);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.payload.answer));
        }
      })
      .on('broadcast', { event: 'ice_candidate' }, async (payload: any) => {
        if (payload.payload.targetId !== user.id) return;

        const pc = peerConnectionsRef.current.get(payload.payload.sourceId);
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.payload.candidate));
          } catch (e) {}
        }
      });

    await roomChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await roomChannel.track({ online_at: new Date().toISOString() });
      }
    });
  };

  const initiateCall = async (receiverId: string, receiverName: string, receiverAvatar: string | undefined, type: 'audio' | 'video', isGroup?: boolean) => {
    if (!user) return;

    if (!localStorage.getItem('av_permissions_granted')) {
      setPendingCallType(type);
      setShowPermissionsModal(true);
      setCallerInfo({ id: receiverId, name: receiverName, avatar: receiverAvatar || '' });
      setIsIncoming(false);
      setCallState('idle');
      return;
    }
    executeInitiateCall(receiverId, receiverName, receiverAvatar, type, isGroup);
  };

  const executeInitiateCall = async (receiverId: string, receiverName: string, receiverAvatar: string | undefined, type: 'audio' | 'video', isGroup?: boolean) => {
    try {
      await initLocalStream(type);
      setIsIncoming(false);
      setCallType(type);
      setCallerInfo({ id: receiverId, name: receiverName, avatar: receiverAvatar || '' });
      currentRoomIdRef.current = receiverId;
      setCallState('calling');

      startDialTone();

      // Join the WebRTC Mesh room
      await joinCallRoom(receiverId);

      // Broadcast call_started to the chat for the UI bubble
      const messageId = uuidv4();
      const newRecord = {
        id: messageId,
        sender_id: user!.id,
        receiver_id: isGroup ? null : receiverId,
        room_id: isGroup ? receiverId : null,
        content: `call_started`,
        message_type: 'call_started',
        is_system_message: true,
        status: 'sent'
      };

      await supabase.from('messages').insert(newRecord);

      // Notify receiver(s) to ring
      if (isGroup) {
        const { data: members } = await supabase.from('room_participants').select('user_id').eq('room_id', receiverId);
        if (members) {
          members.forEach((m: any) => {
            if (m.user_id !== user!.id) {
               callChannelRef.current?.send({
                 type: 'broadcast',
                 event: 'incoming_call',
                 payload: { callerId: user!.id, callerName: user!.email?.split('@')[0] || 'User', callerAvatar: '', receiverId: m.user_id, roomId: receiverId, callType: type }
               });
            }
          });
        }
      } else {
        callChannelRef.current?.send({
          type: 'broadcast',
          event: 'incoming_call',
          payload: { callerId: user!.id, callerName: user!.email?.split('@')[0] || 'User', callerAvatar: '', receiverId, callType: type }
        });
      }

      // Auto transition to connected for caller since they are in the room
      stopSounds();
      setCallState('connected');

    } catch (e) {
      endCallSession(true);
    }
  };

  const joinCall = (roomId: string, type: 'audio' | 'video') => {
      setCallType(type);
      currentRoomIdRef.current = roomId;
      executeAcceptCall();
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
      setCallState('connected');

      if (currentRoomIdRef.current) {
         await joinCallRoom(currentRoomIdRef.current);
      }

    } catch (e) {
      endCallSession(true);
    }
  };

  const declineCall = () => {
    callChannelRef.current?.send({
      type: 'broadcast',
      event: 'call_ended',
      payload: { targetId: callerInfo.id }
    });
    endCallSession(true);
  };

  const endCallSession = (isInitiatorOfEnd: boolean) => {
    stopSounds();
    const finalSecs = durationRef.current;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();

    remoteStreamsRef.current.clear();
    analysersRef.current.clear();

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(()=>{});
      audioContextRef.current = null;
    }

    if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;

    setActiveMembers([]);
    setActiveSpeakerId(null);
    setCallState('ended');

    setTimeout(() => {
      setCallState('idle');
      setDuration(0);
      durationRef.current = 0;
      setIsPiP(false);
      currentRoomIdRef.current = null;
    }, 800);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === 'connected') {
      interval = setInterval(() => { setDuration(prev => prev + 1); }, 1000);
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
    <CallContext.Provider value={{ initiateCall, joinCall, isCallActive: callState !== 'idle', isInCall: callState === 'connected' }}>
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
          activeMembers={activeMembers}
          activeSpeakerId={activeSpeakerId}
          localVideoRef={localVideoRef}
          onAccept={acceptCall}
          onDecline={declineCall}
          onEnd={() => endCallSession(true)}
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
              if (isIncoming) executeAcceptCall();
              else if (pendingCallType) executeInitiateCall(callerInfo.id, callerInfo.name, callerInfo.avatar, pendingCallType, false);
            }}
            onDeny={() => {
              setShowPermissionsModal(false);
              setPendingCallType(null);
              if (isIncoming) declineCall();
            }}
          />
        )}
      </AnimatePresence>
    </CallContext.Provider>
  );
};
"""

with open('context/CallContext.tsx', 'w') as f:
    f.write(new_content)
