'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { Room, RoomEvent, Track, VideoPresets } from 'livekit-client';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import { DevicePermissionsModal } from '../components/chat/DevicePermissionsModal';
import { GlobalCallManager } from '../components/call/GlobalCallManager';
import { v4 as uuidv4 } from 'uuid';

// ==========================================================================
// 1. TYPES & INTERFACES
// ==========================================================================
export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'reconnecting' | 'ended';
export type MediaCallType = 'audio' | 'video';

export interface CallContextType {
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

  // Expose state for UIs
  callState: CallStatus;
  isIncoming: boolean;
  isGroupCall: boolean;
  callerInfo: any;
  callType: MediaCallType;
  duration: number;
  isMuted: boolean;
  isSpeaker: boolean;
  activeMembers: any[];
  activeSpeakerId: string | null;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  isInPiPMode: boolean;
  setIsInPiPMode: (val: boolean) => void;

  // Actions
  acceptCall: (typeOverride?: MediaCallType) => void;
  declineCall: () => void;
  endCallSession: (notifyRemote?: boolean, reason?: string) => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;
  setCallType: (type: MediaCallType) => void;
}

const CallContext = createContext({} as CallContextType);

export const useCall = () => useContext(CallContext);

// ==========================================================================
// 2. STUDIO-GRADE WEB AUDIO API SYNTHESIZER
// ==========================================================================
class CallSoundEngine {
  private ctx: AudioContext | null = null;
  private currentInterval: number | null = null;
  private ringtoneInterval: number | null = null;
  private fallbackAudio: HTMLAudioElement | null = null;

  public initCtx() {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public startDialTone() {
    this.stopAllCallSounds();
    this.initCtx();
    if (!this.ctx) return;

    const playPulse = () => {
      if (!this.ctx || this.ctx.state === 'closed') return;

      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(425, now);
      osc2.frequency.setValueAtTime(440, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.1);
      gain.gain.setValueAtTime(0.35, now + 1.1);
      gain.gain.linearRampToValueAtTime(0.001, now + 1.2);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.25);
      osc2.stop(now + 1.25);
    };

    playPulse();
    this.currentInterval = window.setInterval(playPulse, 3000);
  }

  public startIncomingRingtone(callerName: string) {
    this.stopAllCallSounds();
    this.initCtx();
    if (!this.ctx) return;

    try {
      if (!this.fallbackAudio) {
        this.fallbackAudio = new Audio();
        this.fallbackAudio.loop = true;
        this.fallbackAudio.src = 'data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
      }
      this.fallbackAudio.play().catch(() => {});
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: `Incoming Call from ${callerName}`,
          artist: 'HorPal',
        });
      }
    } catch {}

    const playChordSequence = () => {
      if (!this.ctx || this.ctx.state === 'closed') return;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([500, 250, 500, 250, 800]);
      }

      const now = this.ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 987.77, 1046.50];

      freqs.forEach((freq, index) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.15);

        gain.gain.setValueAtTime(0.001, now + index * 0.15);
        gain.gain.linearRampToValueAtTime(0.4, now + index * 0.15 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.15 + 0.8);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + index * 0.15);
        osc.stop(now + index * 0.15 + 0.9);
      });
    };

    playChordSequence();
    this.ringtoneInterval = window.setInterval(playChordSequence, 2400);
  }

  public playConnectChime() {
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0.001, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.3, now + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.6);
    });
  }

  public playEndChime() {
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [440, 349.23, 261.63].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.15);
      gain.gain.setValueAtTime(0.001, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.3, now + i * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.5);
    });
  }

  public stopAllCallSounds() {
    if (this.currentInterval) {
      clearInterval(this.currentInterval);
      this.currentInterval = null;
    }
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
    if (this.fallbackAudio) {
      this.fallbackAudio.pause();
      this.fallbackAudio.currentTime = 0;
      this.fallbackAudio = null;
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(0);
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

const callSoundEngine = new CallSoundEngine();

// ==========================================================================
// 3. MAIN PROVIDER COMPONENT
// ==========================================================================
export const CallProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  const [callState, setCallState] = useState<CallStatus>('idle');
  const [isIncoming, setIsIncoming] = useState(false);
  const [callerInfo, setCallerInfo] = useState({ id: '', name: '', avatar: '' });
  const [callType, setCallType] = useState<MediaCallType>('audio');
  const [duration, setDuration] = useState(0);

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isInPiPMode, setIsInPiPMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [pendingCallType, setPendingCallType] = useState<MediaCallType | null>(null);
  const [pendingIsGroup, setPendingIsGroup] = useState(false);

  const [activeMembers, setActiveMembers] = useState<any[]>([]);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);

  // Refs
  const callStateRef = useRef(callState);
  callStateRef.current = callState;
  const callTypeRef = useRef(callType);
  callTypeRef.current = callType;
  const callerInfoRef = useRef(callerInfo);
  callerInfoRef.current = callerInfo;

  const currentRoomIdRef = useRef<string | null>(null);
  const currentCallIdRef = useRef<string | null>(null);
  const isGroupCallRef = useRef(false);
  const ringTimeoutRef = useRef<any>(null);
  const titleFlashIntervalRef = useRef<any>(null);
  const originalTitleRef = useRef<string>('HorPal');
  const durationRef = useRef(duration);
  durationRef.current = duration;

  const localStreamRef = useRef<MediaStream | null>(null);
  const livekitRoomRef = useRef<Room | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const personalChannelRef = useRef<any>(null);
  const globalChannelRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
    originalTitleRef.current = document.title;
    return () => {
      callSoundEngine.stopAllCallSounds();
    };
  }, []);

  // Flash Title & Notifications
  const startTitleFlash = useCallback((callerName: string) => {
    if (titleFlashIntervalRef.current) clearInterval(titleFlashIntervalRef.current);
    let showIncoming = true;
    titleFlashIntervalRef.current = setInterval(() => {
      document.title = showIncoming ? `📞 INCOMING CALL from @${callerName}` : originalTitleRef.current;
      showIncoming = !showIncoming;
    }, 1000);
  }, []);

  const stopTitleFlash = useCallback(() => {
    if (titleFlashIntervalRef.current) {
      clearInterval(titleFlashIntervalRef.current);
      titleFlashIntervalRef.current = null;
    }
    document.title = originalTitleRef.current;
  }, []);

  const showOSNotification = useCallback((payload: any) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      if (typeof Notification !== 'undefined' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
      return;
    }

    const { callerName, callMode, mediaType, callerAvatar, callId } = payload;
    const title = `📞 Incoming ${callMode === 'group' ? 'Group ' : ''}${mediaType === 'video' ? 'Video' : 'Voice'} Call`;
    const body = `${callerName} is calling you on HorPal — Tap to answer`;

    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        const opts: any = {
          body,
          icon: callerAvatar || '/icon-192.png',
          tag: 'horpal-call-' + callId,
          renotify: true,
          requireInteraction: true,
          vibrate: [500, 200, 500, 200, 800],
          data: { type: 'INCOMING_CALL' },
        };
        reg.showNotification(title, opts);
      });
    } else {
      const opts: any = {
        body,
        icon: callerAvatar || '/icon-192.png',
        tag: 'horpal-call-' + callId,
        renotify: true,
        requireInteraction: true,
      };
      const notification = new Notification(title, opts);
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }, []);

  // Media Stream Acquisition
  const initLocalPreviewStream = async (type: MediaCallType) => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video'
            ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }, facingMode: 'user' }
            : false,
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      localStreamRef.current = stream;
      if (localVideoRef.current && type === 'video') {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
      }
      return stream;
    } catch (err: any) {
      console.error('Mic/Cam error:', err);
      toast.error('Please allow microphone/camera access to place calls.');
      throw err;
    }
  };

  // LiveKit Connection
  const connectToLiveKitRoom = async (roomId: string, type: MediaCallType) => {
    if (!user) return;
    if (livekitRoomRef.current) {
      await livekitRoomRef.current.disconnect();
    }

    try {
      const res = await fetch(`/api/livekit?room=${encodeURIComponent(roomId)}&username=${encodeURIComponent(user.id + '__' + (user as any).username)}&role=host`);
      const data = await res.json();
      if (!data.token) throw new Error('Failed to get token');

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
      });
      livekitRoomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track: Track) => {
        if (track.kind === Track.Kind.Audio || track.kind === Track.Kind.Video) {
          const el = track.attach();
          if (track.kind === Track.Kind.Audio) {
            el.autoplay = true;
            (el as any).playsInline = true;
            document.body.appendChild(el);
            (el as HTMLMediaElement).play().catch(() => {});
          }
        }
        syncRemoteParticipants(room);
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: Track) => {
        track.detach().forEach(el => el.remove());
        syncRemoteParticipants(room);
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Array<any>) => {
        if (speakers && speakers.length > 0) {
          const speakerId = speakers[0].identity.split('__')[0];
          setActiveSpeakerId(speakerId);
        } else {
          setActiveSpeakerId(null);
        }
      });

      room.on(RoomEvent.ParticipantConnected, () => syncRemoteParticipants(room));
      room.on(RoomEvent.ParticipantDisconnected, () => syncRemoteParticipants(room));
      room.on(RoomEvent.Disconnected, () => {
        setActiveMembers([]);
      });

      await room.connect(data.wsUrl, data.token);
      await room.startAudio().catch(() => {});

      await room.localParticipant.setMicrophoneEnabled(true);
      if (type === 'video') {
        await room.localParticipant.setCameraEnabled(true);
      }

      syncRemoteParticipants(room);
    } catch (err) {
      console.error('LiveKit Connect Error:', err);
    }
  };

  const syncRemoteParticipants = (room: Room) => {
    const pList = Array.from(room.remoteParticipants.values()).map(p => {
      const parts = p.identity.split('__');

      let videoTrack: MediaStreamTrack | null = null;
      p.videoTrackPublications.forEach((pub) => {
        if (pub.track && pub.track.mediaStreamTrack) {
          videoTrack = pub.track.mediaStreamTrack;
        }
      });

      return {
        id: parts[0],
        username: parts[1] || 'User',
        hasVideo: p.isCameraEnabled,
        videoTrack
      };
    });
    setActiveMembers(pList);
  };

  // Signaling & State Machine
  const emitSignal = (targetUserId: string | null, event: string, payload: any) => {
    const p = { ...payload, timestamp: Date.now() };
    if (targetUserId) {
      supabase.channel(`user_call_signal_${targetUserId}`).send({ type: 'broadcast', event, payload: p });
    }
    if (globalChannelRef.current) {
      globalChannelRef.current.send({ type: 'broadcast', event, payload: { ...p, targetUserId } });
    }
  };

  useEffect(() => {
    if (!user) return;

    const pChannel = supabase.channel(`user_call_signal_${user.id}`);
    const gChannel = supabase.channel('global_call_bus');

    const handleSignal = (payload: any, event: string) => {
      if (payload.callerId === user.id) return;
      if (payload.targetUserId && payload.targetUserId !== user.id && !payload.participantIds?.includes(user.id)) return;

      switch (event) {
        case 'CALL_INVITE': {
          if (callStateRef.current !== 'idle') {
            emitSignal(payload.callerId, 'CALL_BUSY', { callId: payload.callId, responderId: user.id });
            return;
          }

          const cId = payload.callId;
          currentCallIdRef.current = cId;
          currentRoomIdRef.current = payload.roomName;
          isGroupCallRef.current = payload.callMode === 'group';
          setCallType(payload.mediaType);
          setIsIncoming(true);
          setCallerInfo({
            id: payload.callerId,
            name: payload.callerName || (payload.callMode === 'group' ? payload.groupName : 'User'),
            avatar: payload.callerAvatar || payload.groupAvatar || '',
          });

          setCallState('ringing');
          callSoundEngine.startIncomingRingtone(payload.callerName);
          startTitleFlash(payload.callerName);
          showOSNotification(payload);

          emitSignal(payload.callerId, 'CALL_RINGING_ACK', { callId: cId, responderId: user.id });
          break;
        }

        case 'CALL_RINGING_ACK': {
          if (callStateRef.current === 'calling' && payload.callId === currentCallIdRef.current) {
            setCallState('ringing');
          }
          break;
        }

        case 'CALL_ACCEPTED': {
          if (payload.callId === currentCallIdRef.current) {
             callSoundEngine.stopAllCallSounds();
             callSoundEngine.playConnectChime();
             setCallState('connected');
             if (currentRoomIdRef.current) {
               connectToLiveKitRoom(currentRoomIdRef.current, callTypeRef.current);
             }
          }
          break;
        }

        case 'CALL_DECLINED': {
           if (payload.callId === currentCallIdRef.current) {
             if (!isGroupCallRef.current) {
               toast(`${callerInfoRef.current.name || 'User'} declined the call`);
               endCallSession(false, 'declined');
             } else {
               toast(`A user declined the group call`);
             }
           }
           break;
        }

        case 'CALL_BUSY': {
           if (payload.callId === currentCallIdRef.current) {
             if (!isGroupCallRef.current) {
               toast('User is busy on another call');
               endCallSession(false, 'busy');
             }
           }
           break;
        }

        case 'CALL_CANCELED':
        case 'CALL_ENDED': {
           if (payload.callId === currentCallIdRef.current) {
              endCallSession(false, event === 'CALL_CANCELED' ? 'missed' : 'ended');
           }
           break;
        }
      }
    };

    pChannel.on('broadcast', { event: 'CALL_INVITE' }, ({ payload }) => handleSignal(payload, 'CALL_INVITE'))
            .on('broadcast', { event: 'CALL_RINGING_ACK' }, ({ payload }) => handleSignal(payload, 'CALL_RINGING_ACK'))
            .on('broadcast', { event: 'CALL_ACCEPTED' }, ({ payload }) => handleSignal(payload, 'CALL_ACCEPTED'))
            .on('broadcast', { event: 'CALL_DECLINED' }, ({ payload }) => handleSignal(payload, 'CALL_DECLINED'))
            .on('broadcast', { event: 'CALL_BUSY' }, ({ payload }) => handleSignal(payload, 'CALL_BUSY'))
            .on('broadcast', { event: 'CALL_CANCELED' }, ({ payload }) => handleSignal(payload, 'CALL_CANCELED'))
            .on('broadcast', { event: 'CALL_ENDED' }, ({ payload }) => handleSignal(payload, 'CALL_ENDED'))
            .subscribe();

    gChannel.on('broadcast', { event: 'CALL_INVITE' }, ({ payload }) => handleSignal(payload, 'CALL_INVITE'))
            .on('broadcast', { event: 'CALL_RINGING_ACK' }, ({ payload }) => handleSignal(payload, 'CALL_RINGING_ACK'))
            .on('broadcast', { event: 'CALL_ACCEPTED' }, ({ payload }) => handleSignal(payload, 'CALL_ACCEPTED'))
            .on('broadcast', { event: 'CALL_DECLINED' }, ({ payload }) => handleSignal(payload, 'CALL_DECLINED'))
            .on('broadcast', { event: 'CALL_BUSY' }, ({ payload }) => handleSignal(payload, 'CALL_BUSY'))
            .on('broadcast', { event: 'CALL_CANCELED' }, ({ payload }) => handleSignal(payload, 'CALL_CANCELED'))
            .on('broadcast', { event: 'CALL_ENDED' }, ({ payload }) => handleSignal(payload, 'CALL_ENDED'))
            .subscribe();

    personalChannelRef.current = pChannel;
    globalChannelRef.current = gChannel;

    return () => {
      pChannel.unsubscribe();
      gChannel.unsubscribe();
    };
  }, [user, startTitleFlash, stopTitleFlash, showOSNotification]);

  // Actions
  const executeInitiateCall = async (
    receiverId: string,
    receiverName: string,
    receiverAvatar: string | undefined,
    type: MediaCallType,
    isGroup?: boolean
  ) => {
    if (!user) return;
    try {
      const callId = uuidv4();
      const roomName = isGroup ? `call_group_${receiverId}` : `call_1on1_${callId}`;

      currentCallIdRef.current = callId;
      currentRoomIdRef.current = roomName;
      isGroupCallRef.current = Boolean(isGroup);
      setIsIncoming(false);
      setCallType(type);
      setCallerInfo({ id: receiverId, name: receiverName, avatar: receiverAvatar || '' });

      setCallState('calling');
      callSoundEngine.startDialTone();

      await initLocalPreviewStream(type);

      const { data: myProfile } = await supabase.from('profiles').select('name, username, avatar_url').eq('id', user.id).maybeSingle();
      const callerDisplayName = myProfile?.name || myProfile?.username || user.email?.split('@')[0] || 'User';

      const payload = {
        callId,
        roomName,
        callMode: isGroup ? 'group' : '1on1',
        mediaType: type,
        callerId: user.id,
        callerName: callerDisplayName,
        callerAvatar: myProfile?.avatar_url || '',
        receiverId,
      };

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
      } catch (err) {
        console.warn('Failed to log call start:', err);
      }

      if (isGroup) {
         emitSignal(null, 'CALL_INVITE', { ...payload, groupId: receiverId, participantIds: [receiverId] });
      } else {
         emitSignal(receiverId, 'CALL_INVITE', payload);
      }

      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = setTimeout(() => {
        if (callStateRef.current === 'calling' || callStateRef.current === 'ringing') {
          toast('No answer', { icon: '📞' });
          emitSignal(isGroup ? null : receiverId, 'CALL_CANCELED', { callId });
          endCallSession(false, 'missed');
        }
      }, 45000);

    } catch (e) {
      console.error('Initiate error:', e);
      endCallSession(true, 'error');
    }
  };

  const initiateCall = (receiverId: string, receiverName: string, receiverAvatar: string | undefined, type: MediaCallType, isGroup?: boolean) => {
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

  const joinCall = (roomId: string, callType: MediaCallType) => {
      setCallType(callType);
      currentRoomIdRef.current = roomId;
      executeAcceptCall(callType);
  };

  const executeAcceptCall = async (overrideType?: MediaCallType) => {
    if (!user) return;
    try {
      // Force resume AudioContext inline with user click
      callSoundEngine.initCtx();

      const activeType = overrideType || callTypeRef.current;

      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }

      callSoundEngine.stopAllCallSounds();
      stopTitleFlash();
      callSoundEngine.playConnectChime();

      setCallState('connected');
      await initLocalPreviewStream(activeType);

      if (currentCallIdRef.current) {
        emitSignal(callerInfoRef.current.id, 'CALL_ACCEPTED', { callId: currentCallIdRef.current, responderId: user.id });
      }

      if (currentRoomIdRef.current) {
        await connectToLiveKitRoom(currentRoomIdRef.current, activeType);
      }

    } catch (e) {
       console.error('Accept error:', e);
       endCallSession(true, 'error');
    }
  };

  const acceptCall = (typeOverride?: MediaCallType) => {
    if (!user) return;
    const activeType = typeOverride || callType;
    if (!localStorage.getItem('av_permissions_granted')) {
      setPendingCallType(activeType);
      setShowPermissionsModal(true);
      return;
    }
    executeAcceptCall(activeType);
  };

  const declineCall = () => {
    if (user && currentCallIdRef.current) {
       emitSignal(callerInfoRef.current.id, 'CALL_DECLINED', { callId: currentCallIdRef.current, responderId: user.id });
    }
    endCallSession(false, 'declined');
  };

  const endCallSession = useCallback((notifyRemote: boolean = false, reason: string = 'ended') => {
    callSoundEngine.stopAllCallSounds();
    stopTitleFlash();

    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }

    if (notifyRemote && user && currentCallIdRef.current) {
      emitSignal(callerInfoRef.current.id, 'CALL_ENDED', { callId: currentCallIdRef.current, senderId: user.id });
    }

    if (reason === 'declined' || reason === 'ended') {
       callSoundEngine.playEndChime();
    }

    try {
       if (currentCallIdRef.current && user && !isGroupCallRef.current && callerInfoRef.current.id) {
           const durStr = Math.floor(durationRef.current / 60) + ':' + (durationRef.current % 60 < 10 ? '0' : '') + (durationRef.current % 60);
           const contentMsg = (reason === 'missed' || reason === 'declined') ? 'missed_call' : `completed_call:${durStr}`;

           supabase.from('messages').insert({
              id: uuidv4(),
              sender_id: user.id,
              receiver_id: callerInfoRef.current.id,
              room_id: null,
              content: contentMsg,
              message_type: 'call_started',
              is_system_message: true,
              status: 'sent',
           }).then();
       }
    } catch {}

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (livekitRoomRef.current) {
      livekitRoomRef.current.disconnect();
      livekitRoomRef.current = null;
    }

    setCallState('idle');
    setDuration(0);
    setIsInPiPMode(false);
    currentCallIdRef.current = null;
    currentRoomIdRef.current = null;
    setActiveMembers([]);
    setActiveSpeakerId(null);
  }, [user, stopTitleFlash]);

  // Duration Timer
  useEffect(() => {
    let interval: any;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
      setIsInPiPMode(false);
    }
    return () => clearInterval(interval);
  }, [callState]);

  // Controls
  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(t => t.enabled = !next);
      }
      if (livekitRoomRef.current) {
        livekitRoomRef.current.localParticipant.setMicrophoneEnabled(!next).catch(() => {});
      }
      return next;
    });
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => t.enabled = !t.enabled);
    }
    if (livekitRoomRef.current) {
      const isEnabled = livekitRoomRef.current.localParticipant.isCameraEnabled;
      livekitRoomRef.current.localParticipant.setCameraEnabled(!isEnabled).catch(() => {});
      setCallType(!isEnabled ? 'video' : 'audio');
    }
  };

  const toggleSpeaker = () => setIsSpeaker((prev) => !prev);

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current && callType === 'video') {
       if (localVideoRef.current.srcObject !== localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
       }
    }
  }, [callState, callType, activeMembers, isInPiPMode]);

  const providerValue: CallContextType = {
    initiateCall,
    joinCall,
    isCallActive: callState !== 'idle',
    isInCall: callState === 'connected',
    callState,
    isIncoming,
    isGroupCall: isGroupCallRef.current,
    callerInfo,
    callType,
    duration,
    isMuted,
    isSpeaker,
    activeMembers,
    activeSpeakerId,
    localVideoRef,
    isInPiPMode,
    setIsInPiPMode,
    acceptCall,
    declineCall,
    endCallSession,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    setCallType
  };

  return (
    <CallContext.Provider value={providerValue}>
      {children}

      {mounted && createPortal(<GlobalCallManager />, document.body)}

      <AnimatePresence>
        {showPermissionsModal && (
          <DevicePermissionsModal
            onGrant={() => {
              setShowPermissionsModal(false);
              localStorage.setItem('av_permissions_granted', 'true');
              if (isIncoming) {
                executeAcceptCall(callType);
              } else if (pendingCallType) {
                executeInitiateCall(callerInfo.id, callerInfo.name, callerInfo.avatar, pendingCallType, pendingIsGroup);
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
