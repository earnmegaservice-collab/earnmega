'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';
import { CallOverlay } from '../components/chat/CallOverlay';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import { DevicePermissionsModal } from '../components/chat/DevicePermissionsModal';
import { v4 as uuidv4 } from 'uuid';

type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'reconnecting' | 'ended';
type MediaCallType = 'audio' | 'video';

interface CallContextType {
  initiateCall: (
    receiverId: string,
    receiverName: string,
    receiverAvatar: string | undefined,
    type: MediaCallType,
    isGroup?: boolean
  ) => void;
  joinCall: (roomId: string, callType: MediaCallType) => void;
  isCallActive: boolean;
  isInCall: boolean;
}

const DEFAULT_LIVEKIT_URL =
  process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://earnmega-mbwh7c26.livekit.cloud';

const CallContext = createContext({
  initiateCall: () => {},
  joinCall: () => {},
  isCallActive: false,
  isInCall: false,
} as CallContextType);

export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  const [callState, setCallState] = useState('idle' as CallStatus);
  const [isIncoming, setIsIncoming] = useState(false);
  const [callerInfo, setCallerInfo] = useState({
    id: '',
    name: '',
    avatar: '',
  });
  const [callType, setCallType] = useState('audio' as MediaCallType);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [pendingCallType, setPendingCallType] = useState(null as MediaCallType | null);
  const [pendingIsGroup, setPendingIsGroup] = useState(false);

  // Active participants & speaker state for CallOverlay
  const [activeMembers, setActiveMembers] = useState([] as any[]);
  const [activeSpeakerId, setActiveSpeakerId] = useState(null as string | null);

  // Refs without nested angle brackets so mobile copy-paste never corrupts TypeScript
  const callStateRef = useRef(callState);
  callStateRef.current = callState;

  const callTypeRef = useRef(callType);
  callTypeRef.current = callType;

  const callerInfoRef = useRef(callerInfo);
  callerInfoRef.current = callerInfo;

  const isGroupCallRef = useRef(false);
  const localStreamRef = useRef(null as MediaStream | null);
  const livekitRoomRef = useRef(null as Room | null);
  const remoteStreamsRef = useRef(new Map());
  const remoteAudioElementsRef = useRef(new Map());

  const localVideoRef = useRef(null as HTMLVideoElement | null);
  const callChannelRef = useRef(null as any);
  const currentRoomIdRef = useRef(null as string | null);
  const ringTimeoutRef = useRef(null as any);

  const durationRef = useRef(0);
  durationRef.current = duration;

  // Audio tone refs
  const ringbackToneRef = useRef(null as HTMLAudioElement | null);
  const ringtoneRef = useRef(null as HTMLAudioElement | null);
  const toneSynthCtxRef = useRef(null as AudioContext | null);
  const toneIntervalRef = useRef(null as any);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ==========================================================================
  // CALLING & RINGING SOUND ENGINE (WEB AUDIO SYNTH + MP3 FALLBACK)
  // ==========================================================================
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
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        if (mode === 'ringback') {
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
          osc1.type = 'sine';
          osc2.type = 'triangle';
          osc1.frequency.setValueAtTime(523.25, now);
          osc2.frequency.setValueAtTime(659.25, now);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.exponentialRampToValueAtTime(0.25, now + 0.04);
          gain.gain.setValueAtTime(0.25, now + 0.35);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

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
      console.warn('WebAudio synth tone error:', e);
    }
  }, []);

  const startDialTone = useCallback(() => {
    stopSounds();
    playSynthPattern('ringback');
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

  // Keep local camera preview attached whenever overlay state updates
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current && callType === 'video') {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }
  }, [callState, callType, activeMembers, isPiP]);

  // ==========================================================================
  // CLEANUP & END CALL SESSION
  // ==========================================================================
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
      }

      if (livekitRoomRef.current) {
        try {
          livekitRoomRef.current.disconnect();
        } catch {}
        livekitRoomRef.current = null;
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        localStreamRef.current = null;
      }

      remoteAudioElementsRef.current.forEach((el: any) => {
        try {
          el.pause();
          el.srcObject = null;
          el.remove();
        } catch {}
      });
      remoteAudioElementsRef.current.clear();
      remoteStreamsRef.current.clear();

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

  // ==========================================================================
  // LIVEKIT SFU ROOM ENGINE (1-ON-1 & GROUP AUDIO/VIDEO CALLS)
  // ==========================================================================
  const syncRemoteParticipantsToOverlay = useCallback((room: Room) => {
    const membersList: any[] = [];
    room.remoteParticipants.forEach((participant) => {
      const identity = participant.identity;
      const tracks: MediaStreamTrack[] = [];

      participant.trackPublications.forEach((pub) => {
        if (pub.track && pub.track.mediaStreamTrack) {
          tracks.push(pub.track.mediaStreamTrack);
        }
      });

      const stream =
        tracks.length > 0
          ? new MediaStream(tracks)
          : remoteStreamsRef.current.get(identity) || new MediaStream();

      remoteStreamsRef.current.set(identity, stream);
      membersList.push({
        id: identity,
        name: participant.name || identity,
        stream,
      });
    });

    setActiveMembers(membersList);
  }, []);

  const connectToLiveKitCallRoom = useCallback(
    async (roomId: string, mode: MediaCallType) => {
      if (!user) return;

      if (livekitRoomRef.current) {
        try {
          await livekitRoomRef.current.disconnect();
        } catch {}
        livekitRoomRef.current = null;
      }

      const cleanRoomName = `call_${roomId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      const res = await fetch(
        `/api/livekit?room=${encodeURIComponent(cleanRoomName)}&username=${encodeURIComponent(
          user.id
        )}&role=host`
      );
      const data = await res.json();

      if (!res.ok || !data?.token) {
        throw new Error(data?.error || 'Could not fetch LiveKit call token');
      }

      const wsUrl = data.wsUrl || data.url || DEFAULT_LIVEKIT_URL;
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      livekitRoomRef.current = room;

      room
        .on(RoomEvent.ParticipantConnected, () => {
          stopSounds();
          if (ringTimeoutRef.current) {
            clearTimeout(ringTimeoutRef.current);
            ringTimeoutRef.current = null;
          }
          setCallState('connected');
          syncRemoteParticipantsToOverlay(room);
        })
        .on(RoomEvent.ParticipantDisconnected, (participant) => {
          const audioEl = remoteAudioElementsRef.current.get(participant.identity);
          if (audioEl) {
            audioEl.pause();
            audioEl.srcObject = null;
            audioEl.remove();
            remoteAudioElementsRef.current.delete(participant.identity);
          }
          remoteStreamsRef.current.delete(participant.identity);
          syncRemoteParticipantsToOverlay(room);

          if (!isGroupCallRef.current && room.remoteParticipants.size === 0 && callStateRef.current === 'connected') {
            endCallSession(false);
          }
        })
        .on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
          stopSounds();
          if (ringTimeoutRef.current) {
            clearTimeout(ringTimeoutRef.current);
            ringTimeoutRef.current = null;
          }
          setCallState('connected');

          if (track.kind === Track.Kind.Audio) {
            const existingEl = remoteAudioElementsRef.current.get(participant.identity);
            if (existingEl) {
              existingEl.remove();
            }
            const audioEl = track.attach();
            audioEl.autoplay = true;
            (audioEl as any).playsInline = true;
            audioEl.style.display = 'none';
            document.body.appendChild(audioEl);
            audioEl.play().catch(() => {});
            remoteAudioElementsRef.current.set(participant.identity, audioEl);
          }

          syncRemoteParticipantsToOverlay(room);
        })
        .on(RoomEvent.TrackUnsubscribed, (track, _publication, participant) => {
          track.detach();
          if (track.kind === Track.Kind.Audio) {
            const audioEl = remoteAudioElementsRef.current.get(participant.identity);
            if (audioEl) {
              audioEl.remove();
              remoteAudioElementsRef.current.delete(participant.identity);
            }
          }
          syncRemoteParticipantsToOverlay(room);
        })
        .on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          if (speakers && speakers.length > 0) {
            setActiveSpeakerId(speakers[0].identity);
          } else {
            setActiveSpeakerId(null);
          }
        });

      await room.connect(wsUrl, data.token);

      await room.localParticipant.setMicrophoneEnabled(true);
      if (mode === 'video') {
        await room.localParticipant.setCameraEnabled(true);
      }

      if (room.remoteParticipants.size > 0) {
        stopSounds();
        setCallState('connected');
        syncRemoteParticipantsToOverlay(room);
      }
    },
    [user, stopSounds, syncRemoteParticipantsToOverlay, endCallSession]
  );

  // ==========================================================================
  // GLOBAL SIGNALING CHANNEL (INCOMING CALLS, ACCEPT, HANGUP)
  // ==========================================================================
  useEffect(() => {
    if (!user) return;

    const handleIncomingSignal = (data: {
      callerId: string;
      callerName: string;
      callerAvatar?: string;
      receiverId?: string;
      roomId?: string;
      callType?: MediaCallType;
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
        if (data) handleIncomingSignal(data);
      })
      .on('broadcast', { event: 'call_accepted' }, (payload: any) => {
        const data = payload?.payload;
        if (!data || data.senderId === user.id) return;
        if (data.roomId === currentRoomIdRef.current || data.targetId === user.id) {
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
            const parsedType: MediaCallType = msg.content?.includes('video') ? 'video' : 'audio';
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('name, username, avatar_url')
              .eq('id', msg.sender_id)
              .maybeSingle();

            handleIncomingSignal({
              callerId: msg.sender_id,
              callerName: senderProfile?.name || senderProfile?.username || 'Incoming Caller',
              callerAvatar: senderProfile?.avatar_url || '',
              receiverId: user.id,
              roomId: msg.room_id || `dm_${[user.id, msg.sender_id].sort().join('_')}`,
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

  // ==========================================================================
  // LOCAL CAMERA PREVIEW & CALL WORKFLOWS
  // ==========================================================================
  const initLocalPreviewStream = async (type: MediaCallType) => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video:
          type === 'video'
            ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }, facingMode: 'user' }
            : false,
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      localStreamRef.current = stream;
      if (localVideoRef.current && type === 'video') {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err: any) {
      toast.error('Please allow microphone/camera access to place calls.');
      throw err;
    }
  };

  const fetchGroupMemberIds = async (groupId: string): Promise<string[]> => {
    const memberSet = new Set<string>();
    try {
      const { data: gm } = await supabase.from('group_members').select('user_id').eq('group_id', groupId);
      gm?.forEach((r: any) => r.user_id && memberSet.add(r.user_id));
    } catch {}

    try {
      const { data: rp } = await supabase.from('room_participants').select('user_id').eq('room_id', groupId);
      rp?.forEach((r: any) => r.user_id && memberSet.add(r.user_id));
    } catch {}

    if (user?.id) memberSet.delete(user.id);
    return Array.from(memberSet);
  };

  const executeInitiateCall = async (
    receiverId: string,
    receiverName: string,
    receiverAvatar: string | undefined,
    type: MediaCallType,
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

      // 1. Enter calling state and play calling ringback sound immediately
      setCallState('calling');
      startDialTone();

      // 2. Start local camera/mic preview
      await initLocalPreviewStream(type);

      // 3. Connect caller to LiveKit Room
      await connectToLiveKitCallRoom(roomId, type);

      // 4. Fetch caller profile name & avatar
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('name, username, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      const callerDisplayName =
        myProfile?.name || myProfile?.username || user.email?.split('@')[0] || 'HorPal User';
      const callerDisplayAvatar = myProfile?.avatar_url || '';

      // 5. Insert call_started system message
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

      // 6. Ring receiver(s)
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
    type: MediaCallType,
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

  const executeAcceptCall = async (overrideType?: MediaCallType) => {
    if (!user) return;
    try {
      stopSounds();
      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }

      const activeType = overrideType || callTypeRef.current;
      await initLocalPreviewStream(activeType);
      setCallState('connected');

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
        await connectToLiveKitCallRoom(currentRoomIdRef.current, activeType);
      }
    } catch (e) {
      console.error('Error accepting call:', e);
      endCallSession(true);
    }
  };

  const joinCall = (roomId: string, type: MediaCallType) => {
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

  // Call timer
  useEffect(() => {
    let interval: any;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const toggleMute = () => {
    setIsMuted((prev) => {
      const nextMuted = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t: MediaStreamTrack) => {
          t.enabled = !nextMuted;
        });
      }
      if (livekitRoomRef.current) {
        livekitRoomRef.current.localParticipant.setMicrophoneEnabled(!nextMuted).catch(() => {});
      }
      return nextMuted;
    });
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t: MediaStreamTrack) => {
        t.enabled = !t.enabled;
      });
    }
    if (livekitRoomRef.current) {
      const isCamEnabled = livekitRoomRef.current.localParticipant.isCameraEnabled;
      livekitRoomRef.current.localParticipant.setCameraEnabled(!isCamEnabled).catch(() => {});
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
