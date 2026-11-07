'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';
import { CallOverlay } from '../components/chat/CallOverlay';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import { DevicePermissionsModal } from '../components/chat/DevicePermissionsModal';
import { v4 as uuidv4 } from 'uuid';

interface CallContextType {
  initiateCall: (
    receiverId: string,
    receiverName: string,
    receiverAvatar: string | undefined,
    type: 'audio' | 'video',
    isGroup?: boolean
  ) => void;
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
  const [callerInfo, setCallerInfo] = useState<{ id: string; name: string; avatar: string }>({
    id: '',
    name: '',
    avatar: '',
  });
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [permissionsError, setPermissionsError] = useState(false);
  const [pendingCallType, setPendingCallType] = useState<'audio' | 'video' | null>(null);
  const [pendingIsGroup, setPendingIsGroup] = useState<boolean>(false);

  // Group & Peer Call State
  const [activeMembers, setActiveMembers] = useState<any[]>([]);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);

  // Always-fresh refs to avoid stale closures inside Supabase listeners
  const callStateRef = useRef(callState);
  callStateRef.current = callState;

  const callTypeRef = useRef(callType);
  callTypeRef.current = callType;

  const callerInfoRef = useRef(callerInfo);
  callerInfoRef.current = callerInfo;

  const isGroupCallRef = useRef<boolean>(false);
  const localStreamRef = useRef<MediaStream | null>(null);

  // WebRTC Mesh Network & Audio Output Refs
  const peerConnectionsRef = useRef>(new Map());
  const remoteStreamsRef = useRef>(new Map());
  const pendingCandidatesRef = useRef>(new Map());
  const remoteAudioElementsRef = useRef>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analysersRef = useRef>(new Map());

  // DOM Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Signaling Refs
  const callChannelRef = useRef<any>(null);
  const presenceChannelRef = useRef<any>(null);
  const currentRoomIdRef = useRef<string | null>(null);
  const ringTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const durationRef = useRef(0);
  durationRef.current = duration;

  // Sound Refs (MP3 + Web Audio Synthesizer Fallback so sounds ALWAYS work)
  const ringbackToneRef = useRef<HTMLAudioElement | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const toneSynthCtxRef = useRef<AudioContext | null>(null);
  const toneIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ],
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // ============================================================================
  // GUARANTEED SOUND ENGINE (WEB AUDIO SYNTH + MP3 SUPPORT)
  // ============================================================================
  const stopSounds = useCallback(() => {
    if (toneIntervalRef.current) {
      clearInterval(toneIntervalRef.current);
      toneIntervalRef.current = null;
    }
    if (toneSynthCtxRef.current) {
      toneSynthCtxRef.current.close().catch(() => {});
      toneSynthCtxRef.current = null;
    }
    if (ringbackToneRef.current) {
      ringbackToneRef.current.pause();
      ringbackToneRef.current.currentTime = 0;
    }
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  }, []);

  const playSynthPattern = useCallback((mode: 'ringback' | 'ringtone') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (toneSynthCtxRef.current) {
        toneSynthCtxRef.current.close().catch(() => {});
      }
      const ctx = new AudioCtx();
      toneSynthCtxRef.current = ctx;

      const triggerBeep = () => {
        if (!toneSynthCtxRef.current || toneSynthCtxRef.current.state === 'closed') return;
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});

        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        if (mode === 'ringback') {
          // Standard WhatsApp/Telecom outbound calling tone (440Hz + 480Hz)
          osc1.frequency.setValueAtTime(440, now);
          osc2.frequency.setValueAtTime(480, now);
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.exponentialRampToValueAtTime(0.15, now + 0.05);
          gain.gain.setValueAtTime(0.15, now + 1.15);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 1.3);
          osc2.stop(now + 1.3);
        } else {
          // Classic dual-pulse incoming phone ringtone (523.25Hz C5 + 659.25Hz E5)
          osc1.type = 'sine';
          osc2.type = 'triangle';
          osc1.frequency.setValueAtTime(523.25, now);
          osc2.frequency.setValueAtTime(659.25, now);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.exponentialRampToValueAtTime(0.25, now + 0.04);
          gain.gain.setValueAtTime(0.25, now + 0.35);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

          // Second pulse
          gain.gain.exponentialRampToValueAtTime(0.25, now + 0.5);
          gain.gain.setValueAtTime(0.25, now + 0.85);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 1.0);
          osc2.stop(now + 1.0);
        }
      };

      triggerBeep();
      toneIntervalRef.current = setInterval(triggerBeep, mode === 'ringback' ? 3000 : 2200);
    } catch (e) {
      console.warn('WebAudio synth tone fallback error:', e);
    }
  }, []);

  const startDialTone = useCallback(() => {
    stopSounds();
    // Play WebAudio ringback immediately so caller ALWAYS hears calling sound
    playSynthPattern('ringback');
    // Also try playing /sounds/ringback.mp3 if present
    try {
      if (!ringbackToneRef.current) {
        ringbackToneRef.current = new Audio('/sounds/ringback.mp3');
        ringbackToneRef.current.loop = true;
      }
      ringbackToneRef.current.play().catch(() => {});
    } catch {}
  }, [playSynthPattern, stopSounds]);

  const startRingtone = useCallback(() => {
    stopSounds();
    // Play WebAudio ringtone immediately so receiver ALWAYS hears incoming call ring
    playSynthPattern('ringtone');
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([400, 200, 400, 200, 400]);
    }
    try {
      if (!ringtoneRef.current) {
        ringtoneRef.current = new Audio('/sounds/ringtone.mp3');
        ringtoneRef.current.loop = true;
      }
      ringtoneRef.current.play().catch(() => {});
    } catch {}
  }, [playSynthPattern, stopSounds]);

  // ============================================================================
  // REMOTE AUDIO ATTACHMENT (GUARANTEES VOICE AUDIO PLAYBACK)
  // ============================================================================
  const attachRemoteAudioStream = useCallback((peerId: string, stream: MediaStream) => {
    if (typeof document === 'undefined') return;
    let audioEl = remoteAudioElementsRef.current.get(peerId);
    if (!audioEl) {
      audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      (audioEl as any).playsInline = true;
      audioEl.style.display = 'none';
      document.body.appendChild(audioEl);
      remoteAudioElementsRef.current.set(peerId, audioEl);
    }
    if (audioEl.srcObject !== stream) {
      audioEl.srcObject = stream;
      audioEl.play().catch(() => {});
    }
  }, []);

  const removeRemoteAudioStream = useCallback((peerId: string) => {
    const audioEl = remoteAudioElementsRef.current.get(peerId);
    if (audioEl) {
      audioEl.pause();
      audioEl.srcObject = null;
      audioEl.remove();
      remoteAudioElementsRef.current.delete(peerId);
    }
  }, []);

  // Keep localVideoRef synced whenever callState or activeMembers changes
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current && callType === 'video') {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }
  }, [callState, callType, activeMembers, isPiP]);

  // ============================================================================
  // CLEANUP / END CALL SESSION
  // ============================================================================
  const endCallSession = useCallback(
    (notifyRemote: boolean = false) => {
      stopSounds();

      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }

      if (notifyRemote && user) {
        const targetId = callerInfoRef.current.id;
        const roomId = currentRoomIdRef.current;
        callChannelRef.current?.send({
          type: 'broadcast',
          event: 'call_ended',
          payload: {
            targetId,
            roomId,
            senderId: user.id,
          },
        });
        presenceChannelRef.current?.send({
          type: 'broadcast',
          event: 'call_ended',
          payload: {
            targetId,
            roomId,
            senderId: user.id,
          },
        });
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }

      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      pendingCandidatesRef.current.clear();
      remoteStreamsRef.current.clear();
      analysersRef.current.clear();

      remoteAudioElementsRef.current.forEach((el) => {
        el.pause();
        el.srcObject = null;
        el.remove();
      });
      remoteAudioElementsRef.current.clear();

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }

      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }

      setActiveMembers([]);
      setActiveSpeakerId(null);
      setIsMuted(false);
      setCallState('ended');

      setTimeout(() => {
        setCallState('idle');
        setDuration(0);
        durationRef.current = 0;
        setIsPiP(false);
        currentRoomIdRef.current = null;
        isGroupCallRef.current = false;
      }, 600);
    },
    [stopSounds, user]
  );

  // ============================================================================
  // GLOBAL SIGNALING CHANNEL (PERSISTENT — DOES NOT RE-SUBSCRIBE ON STATE CHANGE)
  // ============================================================================
  useEffect(() => {
    if (!user) return;

    const handleIncomingSignal = (data: {
      callerId: string;
      callerName: string;
      callerAvatar?: string;
      receiverId?: string;
      roomId?: string;
      callType?: 'audio' | 'video';
      isGroup?: boolean;
    }) => {
      if (data.callerId === user.id) return;
      if (data.receiverId && data.receiverId !== user.id) return;
      if (callStateRef.current !== 'idle') return;

      const roomToJoin = data.roomId || data.callerId;
      isGroupCallRef.current = Boolean(data.isGroup);
      currentRoomIdRef.current = roomToJoin;

      setIsIncoming(true);
      setCallType(data.callType || 'audio');
      setCallerInfo({
        id: data.callerId,
        name: data.callerName || 'Incoming Call',
        avatar: data.callerAvatar || '',
      });
      setCallState('ringing');
      startRingtone();

      // Auto-stop ringing after 45s if unanswered
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = setTimeout(() => {
        if (callStateRef.current === 'ringing') {
          endCallSession(false);
        }
      }, 45000);
    };

    const callChannel = supabase
      .channel('webrtc-global-calls', {
        config: { broadcast: { self: true } },
      })
      .on('broadcast', { event: 'incoming_call' }, (payload: any) => {
        const data = payload?.payload;
        if (!data) return;
        handleIncomingSignal(data);
      })
      .on('broadcast', { event: 'call_accepted' }, (payload: any) => {
        const data = payload?.payload;
        if (!data || data.senderId === user.id) return;
        if (
          data.roomId === currentRoomIdRef.current ||
          data.targetId === user.id
        ) {
          stopSounds();
          if (ringTimeoutRef.current) {
            clearTimeout(ringTimeoutRef.current);
            ringTimeoutRef.current = null;
          }
          setCallState('connected');
        }
      })
      .on('broadcast', { event: 'call_ended' }, (payload: any) => {
        const data = payload?.payload;
        if (!data || data.senderId === user.id) return;
        if (
          data.targetId === user.id ||
          (data.roomId && data.roomId === currentRoomIdRef.current && !isGroupCallRef.current)
        ) {
          endCallSession(false);
        }
      })
      // Database Postgres Fallback: If a 1-on-1 `call_started` message is inserted for this user, ring!
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload: any) => {
          const msg = payload.new;
          if (!msg || msg.sender_id === user.id) return;
          if (msg.message_type === 'call_started' || msg.content?.startsWith('call_started')) {
            if (callStateRef.current !== 'idle') return;
            const parsedType: 'audio' | 'video' =
              msg.content?.includes('video') ? 'video' : 'audio';
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('name, username, avatar_url')
              .eq('id', msg.sender_id)
              .maybeSingle();

            handleIncomingSignal({
              callerId: msg.sender_id,
              callerName:
                senderProfile?.name ||
                senderProfile?.username ||
                'Incoming Caller',
              callerAvatar: senderProfile?.avatar_url || '',
              receiverId: user.id,
              roomId: msg.room_id || msg.sender_id,
              callType: parsedType,
              isGroup: Boolean(msg.room_id),
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          callChannelRef.current = callChannel;
        }
      });

    callChannelRef.current = callChannel;

    return () => {
      supabase.removeChannel(callChannel);
    };
  }, [user, startRingtone, stopSounds, endCallSession]);

  // ============================================================================
  // MEDIA STREAM & WEBRTC PEER CONNECTION ENGINE
  // ============================================================================
  const initLocalStream = async (type: 'audio' | 'video') => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video:
          type === 'video'
            ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }, facingMode: 'user' }
            : false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStreamRef.current = stream;
      if (localVideoRef.current && type === 'video') {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setPermissionsError(true);
        toast.error('Microphone/Camera permission denied. Please allow access in browser settings.');
      } else {
        toast.error('Could not access microphone or camera.');
      }
      throw err;
    }
  };

  const setupActiveSpeakerDetection = (userId: string, stream: MediaStream) => {
    if (stream.getAudioTracks().length === 0) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioCtx();
      }
      const audioCtx = audioContextRef.current;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analysersRef.current.set(userId, analyser);
    } catch (e) {
      console.warn('Audio speaker detection error:', e);
    }
  };

  const flushPendingCandidates = async (peerId: string, pc: RTCPeerConnection) => {
    const queue = pendingCandidatesRef.current.get(peerId) || [];
    if (queue.length === 0) return;
    pendingCandidatesRef.current.set(peerId, []);
    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('Failed to add queued ICE candidate:', e);
      }
    }
  };

  const createPeerConnection = (targetUserId: string) => {
    const existing = peerConnectionsRef.current.get(targetUserId);
    if (existing) {
      existing.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && presenceChannelRef.current && user) {
        presenceChannelRef.current.send({
          type: 'broadcast',
          event: 'ice_candidate',
          payload: {
            candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate,
            targetId: targetUserId,
            sourceId: user.id,
          },
        });
      }
    };

    pc.ontrack = (event) => {
      const remoteStream = event.streams?.[0] || new MediaStream([event.track]);
      remoteStreamsRef.current.set(targetUserId, remoteStream);

      // Stop dial/ring tone and mark call connected as soon as remote media arrives
      stopSounds();
      setCallState('connected');

      // Guarantee remote voice audio is audible even in audio-only or avatar mode
      attachRemoteAudioStream(targetUserId, remoteStream);
      setupActiveSpeakerDetection(targetUserId, remoteStream);

      setActiveMembers((prev) => [
        ...prev.filter((p) => p.id !== targetUserId),
        { id: targetUserId, stream: remoteStream },
      ]);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        stopSounds();
        setCallState('connected');
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        if (!isGroupCallRef.current && peerConnectionsRef.current.size <= 1) {
          // Allow brief recovery window before ending
        }
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    peerConnectionsRef.current.set(targetUserId, pc);
    return pc;
  };

  // Active speaker loop
  useEffect(() => {
    if (callState !== 'connected') return;

    let animationFrameId: number;
    const checkAudioLevels = () => {
      let maxVolume = -Infinity;
      let loudestSpeaker: string | null = null;

      analysersRef.current.forEach((analyser, userId) => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;

        if (average > maxVolume && average > 10) {
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

  // ============================================================================
  // ROOM SIGNALING & MESH NEGOTIATION
  // ============================================================================
  const joinCallRoom = async (roomId: string) => {
    if (!user) return;

    if (presenceChannelRef.current) {
      await supabase.removeChannel(presenceChannelRef.current);
      presenceChannelRef.current = null;
    }

    const roomChannel = supabase.channel(`call_room_${roomId}`, {
      config: {
        presence: { key: user.id },
        broadcast: { self: false },
      },
    });

    presenceChannelRef.current = roomChannel;

    const sendOfferToPeer = async (peerId: string) => {
      if (!user || peerId === user.id) return;
      try {
        const pc = createPeerConnection(peerId);
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: callTypeRef.current === 'video',
        });
        await pc.setLocalDescription(offer);

        roomChannel.send({
          type: 'broadcast',
          event: 'offer',
          payload: { offer, targetId: peerId, sourceId: user.id },
        });
      } catch (e) {
        console.error('Error creating offer:', e);
      }
    };

    roomChannel
      .on('presence', { event: 'sync' }, () => {
        const state = roomChannel.presenceState();
        const membersInRoom = Object.keys(state);
        setActiveMembers((prev) =>
          prev.filter((m) => membersInRoom.includes(m.id) || m.id === user.id)
        );
      })
      .on('presence', { event: 'join' }, async ({ key }) => {
        if (key === user.id) return;
        // Another user joined the call room! Stop ringing and connect
        stopSounds();
        setCallState('connected');
        await sendOfferToPeer(key);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        const pc = peerConnectionsRef.current.get(key);
        if (pc) {
          pc.close();
          peerConnectionsRef.current.delete(key);
        }
        remoteStreamsRef.current.delete(key);
        analysersRef.current.delete(key);
        removeRemoteAudioStream(key);
        setActiveMembers((prev) => prev.filter((m) => m.id !== key));
        if (activeSpeakerId === key) setActiveSpeakerId(null);

        if (!isGroupCallRef.current && peerConnectionsRef.current.size === 0 && callStateRef.current === 'connected') {
          endCallSession(false);
        }
      })
      .on('broadcast', { event: 'peer_ready' }, async (payload: any) => {
        const peerId = payload?.payload?.sourceId;
        if (!peerId || peerId === user.id) return;
        stopSounds();
        setCallState('connected');
        if (!peerConnectionsRef.current.has(peerId)) {
          await sendOfferToPeer(peerId);
        }
      })
      .on('broadcast', { event: 'offer' }, async (payload: any) => {
        const data = payload?.payload;
        if (!data || data.targetId !== user.id) return;

        const sourceId = data.sourceId;
        stopSounds();
        setCallState('connected');

        try {
          const pc = createPeerConnection(sourceId);
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          await flushPendingCandidates(sourceId, pc);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          roomChannel.send({
            type: 'broadcast',
            event: 'answer',
            payload: { answer, targetId: sourceId, sourceId: user.id },
          });
        } catch (e) {
          console.error('Error handling WebRTC offer:', e);
        }
      })
      .on('broadcast', { event: 'answer' }, async (payload: any) => {
        const data = payload?.payload;
        if (!data || data.targetId !== user.id) return;

        stopSounds();
        setCallState('connected');

        const pc = peerConnectionsRef.current.get(data.sourceId);
        if (pc && pc.signalingState !== 'stable') {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            await flushPendingCandidates(data.sourceId, pc);
          } catch (e) {
            console.error('Error setting remote answer:', e);
          }
        }
      })
      .on('broadcast', { event: 'ice_candidate' }, async (payload: any) => {
        const data = payload?.payload;
        if (!data || data.targetId !== user.id || !data.candidate) return;

        const pc = peerConnectionsRef.current.get(data.sourceId);
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (e) {
            console.warn('ICE candidate error:', e);
          }
        } else {
          // Queue candidate until remoteDescription is set
          const existingQueue = pendingCandidatesRef.current.get(data.sourceId) || [];
          existingQueue.push(data.candidate);
          pendingCandidatesRef.current.set(data.sourceId, existingQueue);
        }
      })
      .on('broadcast', { event: 'call_ended' }, (payload: any) => {
        const data = payload?.payload;
        if (!data || data.senderId === user.id) return;
        if (!isGroupCallRef.current) {
          endCallSession(false);
        }
      });

    await new Promise<void>((resolve) => {
      roomChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await roomChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
          roomChannel.send({
            type: 'broadcast',
            event: 'peer_ready',
            payload: { sourceId: user.id },
          });
          resolve();
        }
      });
    });
  };

  // ============================================================================
  // INITIATE, ACCEPT & DECLINE CALLS (1-ON-1 DM & GROUP CHATS)
  // ============================================================================
  const fetchGroupMemberIds = async (groupId: string): Promise<string[]> => {
    const memberSet = new Set<string>();
    try {
      const { data: gm } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);
      gm?.forEach((r: any) => r.user_id && memberSet.add(r.user_id));
    } catch {}

    try {
      const { data: rp } = await supabase
        .from('room_participants')
        .select('user_id')
        .eq('room_id', groupId);
      rp?.forEach((r: any) => r.user_id && memberSet.add(r.user_id));
    } catch {}

    try {
      const { data: cp } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('conversation_id', groupId);
      cp?.forEach((r: any) => r.user_id && memberSet.add(r.user_id));
    } catch {}

    if (user?.id) memberSet.delete(user.id);
    return Array.from(memberSet);
  };

  const executeInitiateCall = async (
    receiverId: string,
    receiverName: string,
    receiverAvatar: string | undefined,
    type: 'audio' | 'video',
    isGroup?: boolean
  ) => {
    if (!user) return;
    try {
      isGroupCallRef.current = Boolean(isGroup);
      setIsIncoming(false);
      setCallType(type);
      setCallerInfo({ id: receiverId, name: receiverName, avatar: receiverAvatar || '' });

      const roomId = isGroup ? receiverId : `dm_${[user.id, receiverId].sort().join('_')}`;
      currentRoomIdRef.current = roomId;

      // 1. Start calling state & play outbound calling ringback tone IMMEDIATELY
      setCallState('calling');
      startDialTone();

      // 2. Initialize microphone/camera stream
      await initLocalStream(type);

      // 3. Join the WebRTC room channel and wait for receiver(s)
      await joinCallRoom(roomId);

      // 4. Fetch caller display info so receiver sees real name & avatar
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('name, username, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      const callerDisplayName =
        myProfile?.name || myProfile?.username || user.email?.split('@')[0] || 'HorPal User';
      const callerDisplayAvatar = myProfile?.avatar_url || '';

      // 5. Insert call_started system message (also triggers DB fallback ring for receiver)
      try {
        await supabase.from('messages').insert({
          id: uuidv4(),
          sender_id: user.id,
          receiver_id: isGroup ? null : receiverId,
          room_id: isGroup ? receiverId : null,
          content: `call_started:${type}`,
          message_type: 'call_started',
          is_system_message: true,
          status: 'sent',
        });
      } catch {}

      // 6. Broadcast incoming_call to receiver(s)
      if (isGroup) {
        const memberIds = await fetchGroupMemberIds(receiverId);
        memberIds.forEach((memberId) => {
          callChannelRef.current?.send({
            type: 'broadcast',
            event: 'incoming_call',
            payload: {
              callerId: user.id,
              callerName: `${receiverName} (${callerDisplayName})`,
              callerAvatar: receiverAvatar || callerDisplayAvatar,
              receiverId: memberId,
              roomId,
              callType: type,
              isGroup: true,
            },
          });
        });
      } else {
        callChannelRef.current?.send({
          type: 'broadcast',
          event: 'incoming_call',
          payload: {
            callerId: user.id,
            callerName: callerDisplayName,
            callerAvatar: callerDisplayAvatar,
            receiverId,
            roomId,
            callType: type,
            isGroup: false,
          },
        });
      }

      // IMPORTANT: Do NOT call stopSounds() or setCallState('connected') here!
      // Keep playing the calling ringback tone until the receiver accepts & joins the room,
      // or end after 45 seconds if unanswered.
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = setTimeout(() => {
        if (callStateRef.current === 'calling') {
          toast('No answer', { icon: '📞' });
          endCallSession(true);
        }
      }, 45000);
    } catch (e) {
      console.error('Failed to initiate call:', e);
      endCallSession(true);
    }
  };

  const initiateCall = async (
    receiverId: string,
    receiverName: string,
    receiverAvatar: string | undefined,
    type: 'audio' | 'video',
    isGroup?: boolean
  ) => {
    if (!user) return;

    if (!localStorage.getItem('av_permissions_granted')) {
      setPendingCallType(type);
      setPendingIsGroup(Boolean(isGroup));
      setShowPermissionsModal(true);
      setCallerInfo({ id: receiverId, name: receiverName, avatar: receiverAvatar || '' });
      setIsIncoming(false);
      setCallState('idle');
      return;
    }
    executeInitiateCall(receiverId, receiverName, receiverAvatar, type, isGroup);
  };

  const executeAcceptCall = async (overrideType?: 'audio' | 'video') => {
    if (!user) return;
    try {
      stopSounds();
      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }

      const activeType = overrideType || callTypeRef.current;
      await initLocalStream(activeType);
      setCallState('connected');

      // Notify caller immediately that call was accepted so their ringback tone stops
      callChannelRef.current?.send({
        type: 'broadcast',
        event: 'call_accepted',
        payload: {
          roomId: currentRoomIdRef.current,
          targetId: callerInfoRef.current.id,
          senderId: user.id,
        },
      });

      if (currentRoomIdRef.current) {
        await joinCallRoom(currentRoomIdRef.current);
      }
    } catch (e) {
      console.error('Error accepting call:', e);
      endCallSession(true);
    }
  };

  const joinCall = (roomId: string, type: 'audio' | 'video') => {
    setCallType(type);
    callTypeRef.current = type;
    currentRoomIdRef.current = roomId;
    executeAcceptCall(type);
  };

  const acceptCall = async () => {
    stopSounds();
    if (!user) return;
    if (!localStorage.getItem('av_permissions_granted')) {
      setPendingCallType(callType);
      setShowPermissionsModal(true);
      return;
    }
    executeAcceptCall(callType);
  };

  const declineCall = () => {
    stopSounds();
    if (user) {
      callChannelRef.current?.send({
        type: 'broadcast',
        event: 'call_ended',
        payload: {
          targetId: callerInfoRef.current.id,
          roomId: currentRoomIdRef.current,
          senderId: user.id,
        },
      });
    }
    endCallSession(false);
  };

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const toggleMute = () => {
    setIsMuted((prev) => {
      const newState = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = !newState;
        });
      }
      return newState;
    });
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
    }
  };

  const toggleSpeaker = () => setIsSpeaker((prev) => !prev);
  const togglePiP = () => setIsPiP((prev) => !prev);

  return (
    <CallContext.Provider
      value={{
        initiateCall,
        joinCall,
        isCallActive: callState !== 'idle',
        isInCall: callState === 'connected',
      }}
    >
      {children}

      {mounted &&
        createPortal(
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
              if (isIncoming) {
                executeAcceptCall(callType);
              } else if (pendingCallType) {
                executeInitiateCall(
                  callerInfo.id,
                  callerInfo.name,
                  callerInfo.avatar,
                  pendingCallType,
                  pendingIsGroup
                );
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
    </CallContext.Provider>
  );
};
