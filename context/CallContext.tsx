"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';
import {
    Room,
    RoomEvent,
    Track,
    VideoPresets,
    RemoteParticipant,
    RemoteTrack,
    RemoteTrackPublication,
    Participant,
    LocalVideoTrack,
    LocalAudioTrack,
    AudioPresets,
    ConnectionState,
} from 'livekit-client';
import toast from 'react-hot-toast';
import { DevicePermissionsModal } from '../components/chat/DevicePermissionsModal';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & STATE MACHINE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
export type CallType = 'audio' | 'video';
export type CallSessionStatus = 'ringing' | 'accepted' | 'declined' | 'ended' | 'missed';
export type CallState = 'idle' | 'calling' | 'ringing' | 'accepted' | 'connected' | 'ended';
export type FacingMode = 'user' | 'environment';

export interface ActiveCall {
    callId: string;
    roomId: string;
    callerId: string;
    callerName: string;
    callerAvatar: string;
    receiverId?: string;
    receiverName?: string;
    receiverAvatar?: string;
    isGroup: boolean;
    groupId?: string;
    groupName?: string;
    callType: CallType;
    status?: CallSessionStatus;
    participantIds?: string[];
    startedAt?: number;
}

interface CallContextType {
    callState: CallState;
    activeCall: ActiveCall | null;
    isMuted: boolean;
    isVideoOff: boolean;
    isSpeakerOn: boolean;
    facingMode: FacingMode;
    callDuration: number;
    remoteParticipants: RemoteParticipant[];
    activeSpeakerIds: string[];
    localVideoTrack: LocalVideoTrack | null;
    localAudioTrack: LocalAudioTrack | null;
    livekitRoom: Room | null;
    participantTrackVersion: number;
    audioPlaybackBlocked: boolean;
    initiateCall: (
        paramsOrReceiverId:
            | {
                  receiverId: string;
                  receiverName: string;
                  receiverAvatar?: string;
                  callType: CallType;
                  isGroup?: boolean;
                  groupName?: string;
                  participantIds?: string[];
              }
            | string,
        receiverName?: string,
        receiverAvatar?: string,
        callType?: CallType,
        isGroup?: boolean,
        groupName?: string,
        participantIds?: string[]
    ) => Promise<void>;
    joinCall: (roomId: string, callType?: CallType) => Promise<void>;
    acceptCall: () => Promise<void>;
    declineCall: () => Promise<void>;
    endCall: () => Promise<void>;
    toggleMute: () => Promise<void>;
    toggleVideo: () => Promise<void>;
    flipCamera: () => Promise<void>;
    toggleSpeaker: () => void;
    unlockAudio: () => Promise<void>;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC ROOM ID HELPERS
// ─────────────────────────────────────────────────────────────────────────────
export function getDeterministicRoomId(params: {
    callerId: string;
    receiverId: string;
    isGroup?: boolean;
    groupId?: string;
}): string {
    if (params.isGroup) {
        const gId = String(params.groupId || params.receiverId).replace(/^call_group_/, '');
        return `call_group_${gId}`;
    }
    const cleanCaller = String(params.callerId).trim();
    const cleanReceiver = String(params.receiverId).trim();
    const sorted = [cleanCaller, cleanReceiver].sort().join('_');
    return `call_dm_${sorted}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SYNTHESIZED WAV GENERATOR (Zero-Dependency Guaranteed HTML5 + WebAudio Ring)
// ─────────────────────────────────────────────────────────────────────────────
function generateToneWavDataUri(options: {
    freq1: number;
    freq2: number;
    toneDurationSec: number;
    silenceDurationSec: number;
    volume?: number;
    doubleBurst?: boolean;
}): string {
    if (typeof window === 'undefined') return '';
    const sampleRate = 44100;
    const {
        freq1,
        freq2,
        toneDurationSec,
        silenceDurationSec,
        volume = 0.75,
        doubleBurst = true,
    } = options;
    const totalSec = toneDurationSec + silenceDurationSec;
    const numSamples = Math.floor(sampleRate * totalSec);
    const toneSamples = Math.floor(sampleRate * toneDurationSec);

    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    // RIFF WAV Header (44.1kHz 16-bit Mono PCM)
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    const burst1End = doubleBurst ? Math.floor(toneSamples * 0.42) : toneSamples;
    const burst2Start = doubleBurst ? Math.floor(toneSamples * 0.56) : toneSamples + 1;

    for (let i = 0; i < numSamples; i++) {
        let sample = 0;
        const inBurst1 = i < burst1End;
        const inBurst2 = doubleBurst && i >= burst2Start && i < toneSamples;

        if (inBurst1 || inBurst2) {
            const t = i / sampleRate;
            const burstPos = inBurst1 ? i : i - burst2Start;
            const burstLen = inBurst1 ? burst1End : toneSamples - burst2Start;
            const fadeSamples = Math.min(800, Math.floor(burstLen * 0.08));
            let env = 1;
            if (burstPos < fadeSamples) env = burstPos / fadeSamples;
            else if (burstLen - burstPos < fadeSamples) env = (burstLen - burstPos) / fadeSamples;

            // Rich dual-tone + overtone harmonics so it cuts through clearly on all speakers
            const wave =
                0.42 * Math.sin(2 * Math.PI * freq1 * t) +
                0.42 * Math.sin(2 * Math.PI * freq2 * t) +
                0.16 * Math.sin(2 * Math.PI * (freq1 * 2) * t);
            sample = wave * volume * env;
        }

        const pcmValue = Math.max(-1, Math.min(1, sample));
        view.setInt16(44 + i * 2, pcmValue < 0 ? pcmValue * 0x8000 : pcmValue * 0x7fff, true);
    }

    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    return `data:audio/wav;base64,${btoa(binary)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CALL SOUND, VIBRATION & DESKTOP NOTIFICATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────
export class CallSoundEngine {
    private static ctx: AudioContext | null = null;
    private static loopTimer: ReturnType<typeof setInterval> | null = null;
    private static vibrateTimer: ReturnType<typeof setInterval> | null = null;
    private static htmlAudio: HTMLAudioElement | null = null;
    private static incomingWavUri: string | null = null;
    private static outgoingWavUri: string | null = null;
    private static silentWavUri: string | null = null;
    private static activeNotification: Notification | null = null;
    private static isPlaying = false;
    private static mode: 'idle' | 'outgoing' | 'incoming' = 'idle';
    private static audioUnlocked = false;

    private static getContext(): AudioContext | null {
        if (typeof window === 'undefined') return null;
        if (!this.ctx || this.ctx.state === 'closed') {
            const AudioCtx =
                window.AudioContext ||
                (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
                this.ctx.onstatechange = () => {
                    if (this.isPlaying && this.mode !== 'idle' && this.ctx && this.ctx.state === 'suspended') {
                        this.ctx.resume().catch(() => {});
                    }
                };
            }
        }
        return this.ctx;
    }

    private static getPersistentAudioElement(): HTMLAudioElement | null {
        if (typeof window === 'undefined' || typeof document === 'undefined') return null;
        if (!this.htmlAudio) {
            const el = document.createElement('audio');
            el.setAttribute('playsinline', 'true');
            el.setAttribute('webkit-playsinline', 'true');
            el.preload = 'auto';
            el.style.display = 'none';
            el.addEventListener('pause', () => {
                // If getUserMedia or WebRTC hardware init pauses the audio element while ringing/calling, auto-resume!
                if (this.isPlaying && this.mode !== 'idle') {
                    setTimeout(() => {
                        if (this.isPlaying && this.mode !== 'idle' && el.paused) {
                            el.play().catch(() => {});
                        }
                    }, 60);
                }
            });
            document.body.appendChild(el);
            this.htmlAudio = el;
        }
        return this.htmlAudio;
    }

    public static warmUp() {
        if (typeof window === 'undefined') return;
        try {
            if (!this.incomingWavUri) {
                // Incoming ringtone: classic loud dual-burst 440Hz + 480Hz phone ring
                this.incomingWavUri = generateToneWavDataUri({
                    freq1: 440,
                    freq2: 480,
                    toneDurationSec: 1.2,
                    silenceDurationSec: 1.2,
                    volume: 0.85,
                    doubleBurst: true,
                });
                // Outgoing calling ringback: classic 425Hz + 450Hz single-burst dialback tone
                this.outgoingWavUri = generateToneWavDataUri({
                    freq1: 425,
                    freq2: 450,
                    toneDurationSec: 1.1,
                    silenceDurationSec: 1.7,
                    volume: 0.75,
                    doubleBurst: false,
                });
                // Tiny silent WAV to pre-unlock the persistent <audio> element on user gesture
                this.silentWavUri = generateToneWavDataUri({
                    freq1: 440,
                    freq2: 440,
                    toneDurationSec: 0.05,
                    silenceDurationSec: 0.05,
                    volume: 0.0001,
                    doubleBurst: false,
                });
            }

            const ctx = this.getContext();
            if (ctx && ctx.state === 'suspended') {
                ctx.resume().catch(() => {});
            }

            // Pre-unlock persistent HTMLAudioElement on user interaction when idle
            const audioEl = this.getPersistentAudioElement();
            if (audioEl && !this.audioUnlocked && this.mode === 'idle' && this.silentWavUri) {
                audioEl.src = this.silentWavUri;
                audioEl.loop = false;
                audioEl.volume = 0.01;
                audioEl
                    .play()
                    .then(() => {
                        this.audioUnlocked = true;
                        if (this.mode === 'idle') {
                            audioEl.pause();
                            audioEl.currentTime = 0;
                        }
                    })
                    .catch(() => {});
            } else if (this.isPlaying && this.mode !== 'idle') {
                this.ensurePlaying();
            }
        } catch {}
    }

    // Ensures neither getUserMedia nor WebRTC hardware init silences an active ring/dial tone
    public static ensurePlaying() {
        if (!this.isPlaying || this.mode === 'idle') return;
        try {
            const ctx = this.getContext();
            if (ctx && ctx.state === 'suspended') {
                ctx.resume().catch(() => {});
            }
            const audioEl = this.getPersistentAudioElement();
            const targetSrc = this.mode === 'incoming' ? this.incomingWavUri : this.outgoingWavUri;
            if (audioEl && targetSrc) {
                if (audioEl.src !== targetSrc) {
                    audioEl.src = targetSrc;
                }
                audioEl.loop = true;
                audioEl.volume = this.mode === 'incoming' ? 0.95 : 0.8;
                if (audioEl.paused) {
                    audioEl.play().catch(() => {});
                }
            }
        } catch {}
    }

    private static async playOutgoingWebAudioPulse() {
        if (!this.isPlaying || this.mode !== 'outgoing') return;
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            if (ctx.state === 'suspended') {
                await ctx.resume().catch(() => {});
            }
            if (!this.isPlaying || this.mode !== 'outgoing' || ctx.state !== 'running') return;

            const start = ctx.currentTime + 0.02;
            const duration = 1.1;

            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = 'sine';
            osc2.type = 'sine';
            osc1.frequency.setValueAtTime(425, start);
            osc2.frequency.setValueAtTime(450, start);

            gain.gain.setValueAtTime(0.001, start);
            gain.gain.linearRampToValueAtTime(0.28, start + 0.04);
            gain.gain.setValueAtTime(0.28, start + duration - 0.05);
            gain.gain.linearRampToValueAtTime(0.0001, start + duration);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start(start);
            osc2.start(start);
            osc1.stop(start + duration + 0.02);
            osc2.stop(start + duration + 0.02);
        } catch {}
    }

    private static async playIncomingWebAudioBurst() {
        if (!this.isPlaying || this.mode !== 'incoming') return;
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            if (ctx.state === 'suspended') {
                await ctx.resume().catch(() => {});
            }
            if (!this.isPlaying || this.mode !== 'incoming' || ctx.state !== 'running') return;

            const baseTime = ctx.currentTime + 0.02;
            const triggerChord = (startOffset: number, duration: number) => {
                const start = baseTime + startOffset;
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const osc3 = ctx.createOscillator();
                const gain = ctx.createGain();

                osc1.type = 'sine';
                osc2.type = 'sine';
                osc3.type = 'triangle';
                osc1.frequency.setValueAtTime(440, start);
                osc2.frequency.setValueAtTime(480, start);
                osc3.frequency.setValueAtTime(880, start);

                gain.gain.setValueAtTime(0.001, start);
                gain.gain.linearRampToValueAtTime(0.35, start + 0.03);
                gain.gain.setValueAtTime(0.35, start + duration - 0.04);
                gain.gain.linearRampToValueAtTime(0.0001, start + duration);

                osc1.connect(gain);
                osc2.connect(gain);
                osc3.connect(gain);
                gain.connect(ctx.destination);

                osc1.start(start);
                osc2.start(start);
                osc3.start(start);
                osc1.stop(start + duration + 0.02);
                osc2.stop(start + duration + 0.02);
                osc3.stop(start + duration + 0.02);
            };

            // Classic double-ring phone cadence: 400ms ring, 200ms gap, 450ms ring
            triggerChord(0, 0.4);
            triggerChord(0.6, 0.45);
        } catch {}
    }

    public static startOutgoingRing() {
        if (this.isPlaying && this.mode === 'outgoing') {
            this.ensurePlaying();
            return;
        }
        this.stopAllCallSounds();
        this.warmUp();
        this.isPlaying = true;
        this.mode = 'outgoing';

        // 1. Start looping persistent HTML5 Audio Element
        const audioEl = this.getPersistentAudioElement();
        if (audioEl && this.outgoingWavUri) {
            try {
                if (audioEl.src !== this.outgoingWavUri) {
                    audioEl.src = this.outgoingWavUri;
                }
                audioEl.loop = true;
                audioEl.volume = 0.9;
                audioEl.currentTime = 0;
                audioEl.play().catch(() => {});
            } catch {}
        }

        // 2. Start Web Audio API Synthesizer Loop + Self-Healing Check
        this.playOutgoingWebAudioPulse();
        this.loopTimer = setInterval(() => {
            if (!this.isPlaying || this.mode !== 'outgoing') return;
            this.ensurePlaying();
            this.playOutgoingWebAudioPulse();
        }, 2800);
    }

    public static startIncomingRing(callInfo?: {
        callId: string;
        roomId?: string;
        callerId?: string;
        callerName: string;
        callerAvatar?: string;
        callType: CallType;
        isGroup?: boolean;
        groupId?: string;
        groupName?: string;
    }) {
        this.stopAllCallSounds();
        this.warmUp();
        this.isPlaying = true;
        this.mode = 'incoming';

        // 1. Start looping persistent HTML5 Audio Element
        const audioEl = this.getPersistentAudioElement();
        if (audioEl && this.incomingWavUri) {
            try {
                audioEl.src = this.incomingWavUri;
                audioEl.loop = true;
                audioEl.volume = 0.95;
                audioEl.currentTime = 0;
                audioEl.play().catch(() => {});
            } catch {}
        }

        // 2. Start Web Audio API Dual-Tone Ringtone Loop + Self-Healing Check
        this.playIncomingWebAudioBurst();
        let tickCount = 0;
        this.loopTimer = setInterval(() => {
            if (!this.isPlaying || this.mode !== 'incoming') return;
            tickCount++;
            this.ensurePlaying();
            this.playIncomingWebAudioBurst();

            // Re-fire ServiceWorker OS notification with renotify:true when app is minimized/backgrounded so OS sound continues ringing
            if (
                callInfo &&
                tickCount % 2 === 0 &&
                typeof document !== 'undefined' &&
                document.visibilityState !== 'visible' &&
                typeof navigator !== 'undefined' &&
                'serviceWorker' in navigator
            ) {
                navigator.serviceWorker.controller?.postMessage({
                    type: 'INCOMING_CALL',
                    payload: callInfo,
                });
            }
        }, 2400);

        // 3. Device Vibration Loop
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try {
                navigator.vibrate([500, 250, 500, 250, 500, 250, 500]);
                this.vibrateTimer = setInterval(() => {
                    if (this.isPlaying && this.mode === 'incoming') {
                        try {
                            navigator.vibrate([500, 250, 500, 250, 500, 250, 500]);
                        } catch {}
                    }
                }, 2400);
            } catch {}
        }

        // 4. Service Worker System Notification (Works even when browser is minimized / outside the app)
        if (typeof window !== 'undefined' && 'Notification' in window && callInfo) {
            const triggerOsCallNotification = async () => {
                try {
                    const callerTitle = callInfo.callerName || 'HorPal Call';
                    const targetUrl = callInfo.callId
                        ? `/?incomingCallId=${encodeURIComponent(callInfo.callId)}&roomId=${encodeURIComponent(
                              callInfo.roomId || ''
                          )}&callType=${encodeURIComponent(callInfo.callType)}`
                        : '/';

                    if ('serviceWorker' in navigator) {
                        if (navigator.serviceWorker.controller) {
                            navigator.serviceWorker.controller.postMessage({
                                type: 'INCOMING_CALL',
                                payload: callInfo,
                            });
                        }
                        const reg = await navigator.serviceWorker.ready.catch(() => null);
                        if (reg && 'showNotification' in reg) {
                            await reg.showNotification(callerTitle, {
                                body: 'Incoming HorPal Call - Tap to Answer',
                                icon: '/icon-192x192.png',
                                badge: '/icon-192x192.png',
                                tag: 'incoming-call',
                                renotify: true,
                                requireInteraction: true,
                                silent: false,
                                vibrate: [500, 250, 500, 250, 500, 250, 500],
                                actions: [
                                    { action: 'answer', title: 'Answer' },
                                    { action: 'decline', title: 'Decline' },
                                ],
                                data: {
                                    type: 'INCOMING_CALL',
                                    callId: callInfo.callId,
                                    roomId: callInfo.roomId || '',
                                    callerId: callInfo.callerId || '',
                                    callerName: callerTitle,
                                    callerAvatar: callInfo.callerAvatar || '',
                                    callType: callInfo.callType,
                                    isGroup: !!callInfo.isGroup,
                                    groupId: callInfo.groupId || '',
                                    groupName: callInfo.groupName || '',
                                    url: targetUrl,
                                },
                            } as NotificationOptions);
                            return;
                        }
                    }

                    if (this.activeNotification) {
                        this.activeNotification.close();
                    }
                    this.activeNotification = new Notification(callerTitle, {
                        body: 'Incoming HorPal Call - Tap to Answer',
                        icon: '/icon-192x192.png',
                        badge: '/icon-192x192.png',
                        tag: 'incoming-call',
                        requireInteraction: true,
                    });
                    this.activeNotification.onclick = () => {
                        window.focus();
                        this.activeNotification?.close();
                    };
                } catch {}
            };

            if (Notification.permission === 'granted') {
                triggerOsCallNotification();
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission()
                    .then((perm) => {
                        if (perm === 'granted' && this.isPlaying) {
                            triggerOsCallNotification();
                        }
                    })
                    .catch(() => {});
            }
        }
    }

    public static stopAllCallSounds() {
        this.isPlaying = false;
        this.mode = 'idle';

        if (this.loopTimer) {
            clearInterval(this.loopTimer);
            this.loopTimer = null;
        }
        if (this.vibrateTimer) {
            clearInterval(this.vibrateTimer);
            this.vibrateTimer = null;
        }
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try {
                navigator.vibrate(0);
            } catch {}
        }
        if (this.htmlAudio) {
            try {
                this.htmlAudio.pause();
                this.htmlAudio.currentTime = 0;
            } catch {}
        }
        if (this.activeNotification) {
            try {
                this.activeNotification.close();
            } catch {}
            this.activeNotification = null;
        }
        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
            try {
                navigator.serviceWorker.controller?.postMessage({ type: 'CLOSE_CALL_NOTIFICATION' });
                navigator.serviceWorker.ready
                    .then((reg) => reg.getNotifications({ tag: 'incoming-call' }))
                    .then((notifs) => notifs.forEach((n) => n.close()))
                    .catch(() => {});
            } catch {}
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CALL PROVIDER IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────────────────
export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user: authUser } = useAuth();
    const [profileMeta, setProfileMeta] = useState<{ name: string; username: string; avatar: string }>({
        name: '',
        username: '',
        avatar: '',
    });

    useEffect(() => {
        if (!authUser?.id) return;
        let mounted = true;
        supabase
            .from('profiles')
            .select('username, name, avatar_url')
            .eq('id', authUser.id)
            .maybeSingle()
            .then(({ data }) => {
                if (!mounted || !data) return;
                setProfileMeta({
                    name: data.name || data.username || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
                    username: data.username || data.name || authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'User',
                    avatar: data.avatar_url || authUser.user_metadata?.avatar_url || '',
                });
            });
        return () => {
            mounted = false;
        };
    }, [authUser?.id]);

    const user = React.useMemo(() => {
        if (!authUser) return null;
        return {
            id: authUser.id,
            name: profileMeta.name || authUser.user_metadata?.full_name || authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'User',
            username: profileMeta.username || authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'User',
            avatar: profileMeta.avatar || authUser.user_metadata?.avatar_url || '',
        };
    }, [authUser, profileMeta]);

    const [callState, setCallState] = useState<CallState>('idle');
    const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [facingMode, setFacingMode] = useState<FacingMode>('user');
    const [callDuration, setCallDuration] = useState(0);

    const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
    const [activeSpeakerIds, setActiveSpeakerIds] = useState<string[]>([]);
    const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null);
    const [localAudioTrack, setLocalAudioTrack] = useState<LocalAudioTrack | null>(null);
    const [livekitRoom, setLivekitRoom] = useState<Room | null>(null);
    const [participantTrackVersion, setParticipantTrackVersion] = useState(0);
    const [audioPlaybackBlocked, setAudioPlaybackBlocked] = useState(false);

    // Permission Modal States
    const [permModalOpen, setPermModalOpen] = useState(false);
    const [permDeniedState, setPermDeniedState] = useState(false);
    const [permType, setPermType] = useState<CallType>('audio');
    const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);

    const livekitRoomRef = useRef<Room | null>(null);
    const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const audioElementsRef = useRef<Map<string, HTMLMediaElement>>(new Map());
    const globalBusChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const userGroupIdsRef = useRef<Set<string>>(new Set());

    const activeCallRef = useRef<ActiveCall | null>(null);
    activeCallRef.current = activeCall;
    const callStateRef = useRef<CallState>('idle');
    callStateRef.current = callState;
    const isSpeakerOnRef = useRef<boolean>(true);
    isSpeakerOnRef.current = isSpeakerOn;
    const facingModeRef = useRef<FacingMode>('user');
    facingModeRef.current = facingMode;
    const callInitTimestampRef = useRef<number>(0);

    // Unlock WebAudio & persistent HTMLAudioElement on user interactions, and request Notification permission
    useEffect(() => {
        if (typeof window === 'undefined') return;
        let notifRequested = false;
        const handleInteraction = () => {
            CallSoundEngine.warmUp();
            CallSoundEngine.ensurePlaying();
            if (!notifRequested && 'Notification' in window && Notification.permission === 'default') {
                notifRequested = true;
                Notification.requestPermission().catch(() => {});
            }
        };
        window.addEventListener('click', handleInteraction, { passive: true });
        window.addEventListener('touchstart', handleInteraction, { passive: true });
        window.addEventListener('pointerdown', handleInteraction, { passive: true });
        window.addEventListener('keydown', handleInteraction, { passive: true });
        return () => {
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
            window.removeEventListener('pointerdown', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
        };
    }, []);

    // Keep user's group memberships cached so Group Calls always ring every member
    useEffect(() => {
        if (!user?.id) return;
        let isMounted = true;

        const syncUserGroups = async () => {
            try {
                const [gmRes, rpRes] = await Promise.allSettled([
                    supabase.from('group_members').select('group_id').eq('user_id', user.id),
                    supabase.from('room_participants').select('room_id').eq('user_id', user.id),
                ]);
                if (!isMounted) return;
                const nextSet = new Set<string>(userGroupIdsRef.current);
                if (gmRes.status === 'fulfilled' && gmRes.value.data) {
                    gmRes.value.data.forEach((r: { group_id?: string }) => {
                        if (r.group_id) nextSet.add(r.group_id);
                    });
                }
                if (rpRes.status === 'fulfilled' && rpRes.value.data) {
                    rpRes.value.data.forEach((r: { room_id?: string }) => {
                        if (r.room_id) nextSet.add(r.room_id);
                    });
                }
                userGroupIdsRef.current = nextSet;
            } catch {}
        };

        syncUserGroups();
        const interval = setInterval(syncUserGroups, 30000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [user?.id, supabase]);

    // ─────────────────────────────────────────────────────────────────────────
    // DATABASE CLEANUP & SIGNALING HELPERS
    // ─────────────────────────────────────────────────────────────────────────
    const cleanupStaleDatabaseCalls = useCallback(async () => {
        try {
            await supabase.rpc('cleanup_stale_calls');
        } catch {
            // Fallback direct queries if RPC fails
            const thirtyFiveSecAgo = new Date(Date.now() - 35000).toISOString();
            const sixtySecAgo = new Date(Date.now() - 60000).toISOString();
            await Promise.allSettled([
                supabase
                    .from('call_sessions')
                    .update({ status: 'missed', updated_at: new Date().toISOString(), ended_at: new Date().toISOString() })
                    .eq('status', 'ringing')
                    .lt('created_at', thirtyFiveSecAgo),
                supabase
                    .from('call_sessions')
                    .update({ status: 'ended', updated_at: new Date().toISOString(), ended_at: new Date().toISOString() })
                    .eq('status', 'accepted')
                    .lt('updated_at', sixtySecAgo),
            ]);
        }
    }, [supabase]);

    const broadcastSignal = useCallback(
        async (event: string, payload: Record<string, unknown>) => {
            try {
                if (globalBusChannelRef.current) {
                    await globalBusChannelRef.current.send({
                        type: 'broadcast',
                        event,
                        payload,
                    });
                }
            } catch (err) {
                console.warn('[CallEngine] Broadcast send warning:', err);
            }
        },
        []
    );

    const startCallTimer = useCallback(() => {
        if (durationTimerRef.current) clearInterval(durationTimerRef.current);
        setCallDuration(0);
        durationTimerRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
        }, 1000);
    }, []);

    const startHeartbeat = useCallback(
        (callId: string) => {
            if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
            const sendBeat = async () => {
                if (!callId) return;
                try {
                    await supabase
                        .from('call_sessions')
                        .update({ updated_at: new Date().toISOString() })
                        .eq('id', callId)
                        .eq('status', 'accepted');
                } catch {}
            };
            sendBeat();
            heartbeatTimerRef.current = setInterval(sendBeat, 15000);
        },
        [supabase]
    );

    // ─────────────────────────────────────────────────────────────────────────
    // CLEANUP CALL (Guaranteed Full Teardown)
    // ─────────────────────────────────────────────────────────────────────────
    const cleanupCall = useCallback(() => {
        CallSoundEngine.stopAllCallSounds();

        if (durationTimerRef.current) {
            clearInterval(durationTimerRef.current);
            durationTimerRef.current = null;
        }
        if (ringTimeoutRef.current) {
            clearTimeout(ringTimeoutRef.current);
            ringTimeoutRef.current = null;
        }
        if (heartbeatTimerRef.current) {
            clearInterval(heartbeatTimerRef.current);
            heartbeatTimerRef.current = null;
        }

        // Remove all attached remote audio elements
        audioElementsRef.current.forEach((el) => {
            try {
                el.pause();
                el.srcObject = null;
                el.remove();
            } catch {}
        });
        audioElementsRef.current.clear();

        if (livekitRoomRef.current) {
            try {
                livekitRoomRef.current.localParticipant.trackPublications.forEach((pub) => {
                    try {
                        pub.track?.stop();
                    } catch {}
                });
                livekitRoomRef.current.disconnect();
            } catch {}
            livekitRoomRef.current = null;
        }

        setLivekitRoom(null);
        setCallState('idle');
        callStateRef.current = 'idle';
        setActiveCall(null);
        activeCallRef.current = null;
        setRemoteParticipants([]);
        setActiveSpeakerIds([]);
        setLocalVideoTrack(null);
        setLocalAudioTrack(null);
        setCallDuration(0);
        setIsMuted(false);
        setIsVideoOff(false);
        setFacingMode('user');
        setAudioPlaybackBlocked(false);
    }, []);

    // Helper: check if local client is genuinely busy or in a stale state
    const isLocalClientGenuinelyBusy = useCallback((): boolean => {
        const currentState = callStateRef.current;
        if (currentState === 'idle' || currentState === 'ended') return false;

        const now = Date.now();
        const elapsed = now - callInitTimestampRef.current;

        if (currentState === 'calling' || currentState === 'ringing') {
            if (elapsed > 35000) {
                // Stale ringing state (>35s) -> auto-clean immediately!
                cleanupCall();
                return false;
            }
            return true;
        }

        if (currentState === 'accepted' || currentState === 'connected') {
            const room = livekitRoomRef.current;
            if (!room || room.state === ConnectionState.Disconnected) {
                if (elapsed > 15000) {
                    cleanupCall();
                    return false;
                }
            }
            return true;
        }

        return false;
    }, [cleanupCall]);

    // ─────────────────────────────────────────────────────────────────────────
    // LIVEKIT WEBRTC CONNECTION ENGINE (WhatsApp-Grade Audio & Adaptive Video)
    // ─────────────────────────────────────────────────────────────────────────
    const syncLocalTracksFromRoom = useCallback((room: Room) => {
        let videoPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
        if (!videoPub) {
            for (const pub of room.localParticipant.videoTrackPublications.values()) {
                if (pub.track) {
                    videoPub = pub;
                    break;
                }
            }
        }
        let audioPub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
        if (!audioPub) {
            for (const pub of room.localParticipant.audioTrackPublications.values()) {
                if (pub.track) {
                    audioPub = pub;
                    break;
                }
            }
        }

        const vTrack = (videoPub?.track as LocalVideoTrack) || null;
        const aTrack = (audioPub?.track as LocalAudioTrack) || null;

        setLocalVideoTrack(vTrack);
        setLocalAudioTrack(aTrack);
        setIsVideoOff(!videoPub || videoPub.isMuted || !vTrack);
        setIsMuted(!audioPub || audioPub.isMuted || !aTrack);
        setParticipantTrackVersion((v) => v + 1);
    }, []);

    const attachRemoteAudioTrack = useCallback((track: RemoteTrack, publication: RemoteTrackPublication) => {
        if (track.kind !== Track.Kind.Audio) return;
        const sid = publication.trackSid || track.sid || Math.random().toString(36);

        const existing = audioElementsRef.current.get(sid);
        if (existing) {
            try {
                track.attach(existing);
                existing.volume = isSpeakerOnRef.current ? 1.0 : 0.25;
                existing.play().catch(() => {
                    setAudioPlaybackBlocked(true);
                });
                return;
            } catch {}
        }

        const audioEl = track.attach();
        audioEl.autoplay = true;
        audioEl.setAttribute('playsinline', 'true');
        audioEl.setAttribute('webkit-playsinline', 'true');
        audioEl.style.display = 'none';
        audioEl.volume = isSpeakerOnRef.current ? 1.0 : 0.25;
        document.body.appendChild(audioEl);
        audioElementsRef.current.set(sid, audioEl);

        audioEl.play().catch(() => {
            setAudioPlaybackBlocked(true);
        });
    }, []);

    const syncRemoteParticipants = useCallback(
        (room: Room) => {
            const remotes = Array.from(room.remoteParticipants.values());
            remotes.forEach((participant) => {
                participant.videoTrackPublications.forEach((pub) => {
                    try {
                        if (!pub.isSubscribed) {
                            pub.setSubscribed(true);
                        }
                    } catch {}
                });
                participant.audioTrackPublications.forEach((pub) => {
                    try {
                        if (!pub.isSubscribed) {
                            pub.setSubscribed(true);
                        }
                        if (pub.track) {
                            attachRemoteAudioTrack(pub.track as RemoteTrack, pub);
                        }
                    } catch {}
                });
            });
            setRemoteParticipants([...remotes]);
            setParticipantTrackVersion((v) => v + 1);
        },
        [attachRemoteAudioTrack]
    );

    const connectToLiveKit = useCallback(
        async (roomId: string, callType: CallType) => {
            if (!user) return;
            try {
                // Disconnect any leftover room instance before connecting
                if (livekitRoomRef.current) {
                    try {
                        livekitRoomRef.current.disconnect();
                    } catch {}
                    livekitRoomRef.current = null;
                }

                const username = user.username || user.name || user.id;
                const res = await fetch(
                    `/api/livekit/token?room=${encodeURIComponent(roomId)}&username=${encodeURIComponent(
                        username
                    )}&userId=${encodeURIComponent(user.id)}&avatar=${encodeURIComponent(user.avatar || '')}`
                );
                const data = await res.json();
                if (!res.ok || !data.token) {
                    throw new Error(data.error || 'Failed to obtain LiveKit access token');
                }

                const wsUrl =
                    data.serverUrl ||
                    process.env.NEXT_PUBLIC_LIVEKIT_URL ||
                    'wss://earnmega-mbwh7c26.livekit.cloud';

                const room = new Room({
                    adaptiveStream: true,
                    dynacast: true,
                    audioCaptureDefaults: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                    publishDefaults: {
                        dtx: true,
                        red: true,
                        audioPreset: AudioPresets.musicHighQuality,
                        simulcast: true,
                        videoSimulcastLayers: [VideoPresets.h540, VideoPresets.h360, VideoPresets.h180],
                    },
                    videoCaptureDefaults: {
                        resolution: VideoPresets.h720.resolution,
                        facingMode: facingModeRef.current,
                    },
                });

                livekitRoomRef.current = room;
                setLivekitRoom(room);

                room
                    .on(RoomEvent.ParticipantConnected, () => {
                        syncRemoteParticipants(room);
                        // Stop outgoing calling sound for both 1-on-1 and Group Calls as soon as any remote peer joins!
                        CallSoundEngine.stopAllCallSounds();
                        if (callStateRef.current === 'calling') {
                            if (ringTimeoutRef.current) {
                                clearTimeout(ringTimeoutRef.current);
                                ringTimeoutRef.current = null;
                            }
                            setCallState('connected');
                            callStateRef.current = 'connected';
                            startCallTimer();
                            if (activeCallRef.current?.callId) {
                                startHeartbeat(activeCallRef.current.callId);
                            }
                        }
                    })
                    .on(RoomEvent.ParticipantDisconnected, () => {
                        syncRemoteParticipants(room);
                        if (
                            !activeCallRef.current?.isGroup &&
                            room.remoteParticipants.size === 0 &&
                            (callStateRef.current === 'connected' || callStateRef.current === 'accepted')
                        ) {
                            toast('Call ended', { icon: '📞' });
                            if (activeCallRef.current?.callId) {
                                supabase
                                    .from('call_sessions')
                                    .update({
                                        status: 'ended',
                                        updated_at: new Date().toISOString(),
                                        ended_at: new Date().toISOString(),
                                    })
                                    .eq('id', activeCallRef.current.callId)
                                    .then(() => {});
                            }
                            cleanupCall();
                        }
                    })
                    .on(RoomEvent.TrackPublished, (publication: RemoteTrackPublication) => {
                        try {
                            if (!publication.isSubscribed) {
                                publication.setSubscribed(true);
                            }
                        } catch {}
                        if (publication.kind === Track.Kind.Video && activeCallRef.current && activeCallRef.current.callType !== 'video') {
                            const upgradedCall: ActiveCall = { ...activeCallRef.current, callType: 'video' };
                            activeCallRef.current = upgradedCall;
                            setActiveCall(upgradedCall);
                        }
                        syncRemoteParticipants(room);
                    })
                    .on(RoomEvent.TrackUnpublished, () => {
                        syncRemoteParticipants(room);
                    })
                    .on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication) => {
                        if (track.kind === Track.Kind.Audio) {
                            attachRemoteAudioTrack(track, publication);
                            room.startAudio().catch(() => {
                                setAudioPlaybackBlocked(true);
                            });
                        } else if (track.kind === Track.Kind.Video && activeCallRef.current && activeCallRef.current.callType !== 'video') {
                            const upgradedCall: ActiveCall = { ...activeCallRef.current, callType: 'video' };
                            activeCallRef.current = upgradedCall;
                            setActiveCall(upgradedCall);
                        }
                        syncRemoteParticipants(room);
                    })
                    .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication: RemoteTrackPublication) => {
                        const sid = publication.trackSid || track.sid;
                        if (sid && audioElementsRef.current.has(sid)) {
                            const el = audioElementsRef.current.get(sid);
                            try {
                                track.detach(el!);
                                el?.remove();
                            } catch {}
                            audioElementsRef.current.delete(sid);
                        }
                        syncRemoteParticipants(room);
                    })
                    .on(RoomEvent.TrackMuted, () => {
                        syncRemoteParticipants(room);
                        syncLocalTracksFromRoom(room);
                    })
                    .on(RoomEvent.TrackUnmuted, () => {
                        syncRemoteParticipants(room);
                        syncLocalTracksFromRoom(room);
                    })
                    .on(RoomEvent.TrackStreamStateChanged, () => {
                        syncRemoteParticipants(room);
                    })
                    .on(RoomEvent.LocalTrackPublished, () => {
                        syncLocalTracksFromRoom(room);
                    })
                    .on(RoomEvent.LocalTrackUnpublished, () => {
                        syncLocalTracksFromRoom(room);
                    })
                    .on(RoomEvent.DataReceived, (payloadBytes: Uint8Array) => {
                        try {
                            const text = new TextDecoder().decode(payloadBytes);
                            const msg = JSON.parse(text);
                            if (msg?.type === 'VIDEO_TOGGLED') {
                                if (msg.videoEnabled && activeCallRef.current && activeCallRef.current.callType !== 'video') {
                                    const upgradedCall: ActiveCall = { ...activeCallRef.current, callType: 'video' };
                                    activeCallRef.current = upgradedCall;
                                    setActiveCall(upgradedCall);
                                }
                                syncRemoteParticipants(room);
                            }
                        } catch {}
                    })
                    .on(RoomEvent.Reconnected, () => {
                        room.startAudio().catch(() => {});
                        syncLocalTracksFromRoom(room);
                        syncRemoteParticipants(room);
                    })
                    .on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
                        setActiveSpeakerIds(speakers.map((s) => s.identity));
                    })
                    .on(RoomEvent.AudioPlaybackStatusChanged, () => {
                        setAudioPlaybackBlocked(!room.canPlaybackAudio);
                    })
                    .on(RoomEvent.Disconnected, () => {
                        if (callStateRef.current !== 'idle') {
                            cleanupCall();
                        }
                    });

                await room.connect(wsUrl, data.token, {
                    autoSubscribe: true,
                });

                // Unlock browser audio output immediately
                await room.startAudio().catch(() => {
                    setAudioPlaybackBlocked(!room.canPlaybackAudio);
                });

                // Publish microphone track immediately (isolated try/catch so hardware quirks never drop the room connection)
                try {
                    await room.localParticipant.setMicrophoneEnabled(true, {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    });
                    setIsMuted(false);
                } catch {
                    try {
                        await room.localParticipant.setMicrophoneEnabled(true);
                        setIsMuted(false);
                    } catch (micErr) {
                        console.warn('[CallEngine] Microphone enable warning:', micErr);
                        setIsMuted(true);
                    }
                }

                // Publish camera track immediately when isVideoCall is true
                const isVideoCall = callType === 'video';
                if (isVideoCall) {
                    try {
                        await room.localParticipant.setCameraEnabled(true, {
                            facingMode: facingModeRef.current,
                            resolution: VideoPresets.h720.resolution,
                        });
                        setIsVideoOff(false);
                    } catch {
                        try {
                            await room.localParticipant.setCameraEnabled(true);
                            setIsVideoOff(false);
                        } catch (camErr) {
                            console.warn('[CallEngine] Camera enable warning, continuing with audio:', camErr);
                            setIsVideoOff(true);
                        }
                    }
                } else {
                    await room.localParticipant.setCameraEnabled(false).catch(() => {});
                    setIsVideoOff(true);
                }

                syncLocalTracksFromRoom(room);
                syncRemoteParticipants(room);

                // If a remote participant is already in the room, stop any outgoing ringback tone;
                // otherwise, if we are still waiting for the remote participant(s) to join, re-assert
                // outgoing ringback playback so WebRTC microphone capture doesn't mute it!
                if (room.remoteParticipants.size > 0) {
                    CallSoundEngine.stopAllCallSounds();
                } else if (callStateRef.current === 'calling' || activeCallRef.current?.isGroup) {
                    CallSoundEngine.ensurePlaying();
                    setTimeout(() => {
                        if (
                            livekitRoomRef.current &&
                            livekitRoomRef.current.remoteParticipants.size === 0 &&
                            (callStateRef.current === 'calling' || activeCallRef.current?.isGroup)
                        ) {
                            CallSoundEngine.ensurePlaying();
                        }
                    }, 350);
                    setTimeout(() => {
                        if (
                            livekitRoomRef.current &&
                            livekitRoomRef.current.remoteParticipants.size === 0 &&
                            (callStateRef.current === 'calling' || activeCallRef.current?.isGroup)
                        ) {
                            CallSoundEngine.ensurePlaying();
                        }
                    }, 1000);
                }
            } catch (err: any) {
                console.error('[CallEngine] LiveKit connection failed:', err);
                toast.error(err?.message || 'Unable to establish media stream.');
                cleanupCall();
            }
        },
        [user, supabase, cleanupCall, syncLocalTracksFromRoom, syncRemoteParticipants, attachRemoteAudioTrack, startCallTimer, startHeartbeat]
    );

    // ─────────────────────────────────────────────────────────────────────────
    // GLOBAL INCOMING CALL & SESSION STATE LISTENER (Postgres Changes + Broadcast)
    // ─────────────────────────────────────────────────────────────────────────
    const handleIncomingRingSession = useCallback(
        async (session: {
            id: string;
            room_id: string;
            livekit_room_id?: string;
            caller_id: string;
            caller_name: string;
            caller_avatar?: string;
            receiver_id?: string | null;
            group_id?: string | null;
            group_name?: string | null;
            is_group: boolean;
            call_type: CallType;
            status: CallSessionStatus;
            participant_ids?: string[];
            created_at?: string;
        }) => {
            if (!user?.id) return;
            if (session.caller_id === user.id) return; // Ignore our own outgoing call
            if (session.status !== 'ringing') return;

            // Ignore stale ringing events older than 35 seconds
            if (session.created_at) {
                const ageMs = Date.now() - new Date(session.created_at).getTime();
                if (ageMs > 35000) return;
            }

            // Determine if this user is a target of the call
            const isTarget1on1 = !session.is_group && session.receiver_id === user.id;
            let isTargetGroup =
                session.is_group &&
                ((session.participant_ids && session.participant_ids.includes(user.id)) ||
                    (session.group_id && userGroupIdsRef.current.has(session.group_id)));

            // If this is a Group Call and membership wasn't cached in memory yet, verify membership on the fly
            if (session.is_group && !isTargetGroup && session.group_id) {
                try {
                    const [gmCheck, rpCheck] = await Promise.allSettled([
                        supabase
                            .from('group_members')
                            .select('group_id')
                            .eq('group_id', session.group_id)
                            .eq('user_id', user.id)
                            .maybeSingle(),
                        supabase
                            .from('room_participants')
                            .select('room_id')
                            .eq('room_id', session.group_id)
                            .eq('user_id', user.id)
                            .maybeSingle(),
                    ]);
                    const inGm = gmCheck.status === 'fulfilled' && !!gmCheck.value.data;
                    const inRp = rpCheck.status === 'fulfilled' && !!rpCheck.value.data;
                    if (inGm || inRp) {
                        userGroupIdsRef.current.add(session.group_id);
                        isTargetGroup = true;
                    }
                } catch {}
            }

            if (!isTarget1on1 && !isTargetGroup) return;

            // Prevent duplicate handling of the exact same callId
            if (activeCallRef.current?.callId === session.id && callStateRef.current !== 'idle') {
                return;
            }

            // Resolve 100% deterministic canonical LiveKit room ID
            const canonicalRoomId =
                session.livekit_room_id ||
                session.room_id ||
                getDeterministicRoomId({
                    callerId: session.caller_id,
                    receiverId: session.is_group
                        ? session.group_id || session.receiver_id || ''
                        : session.receiver_id || user.id,
                    isGroup: !!session.is_group,
                    groupId: session.group_id || undefined,
                });

            // Strict busy check:
            // Group calls NEVER trigger a busy block.
            // 1-on-1 calls only trigger busy if the receiver is genuinely in an active call (<60s heartbeat) or fresh ring (<35s).
            if (isLocalClientGenuinelyBusy()) {
                if (!session.is_group) {
                    // Only report busy if it's a different call session
                    if (activeCallRef.current?.callId !== session.id) {
                        await supabase
                            .from('call_sessions')
                            .update({
                                status: 'declined',
                                updated_at: new Date().toISOString(),
                                ended_at: new Date().toISOString(),
                            })
                            .eq('id', session.id);
                        await broadcastSignal('CALL_BUSY', {
                            callId: session.id,
                            roomId: canonicalRoomId,
                            livekit_room_id: canonicalRoomId,
                            callerId: session.caller_id,
                            userId: user.id,
                        });
                    }
                }
                return;
            }

            const incomingCallObj: ActiveCall = {
                callId: session.id,
                roomId: canonicalRoomId,
                callerId: session.caller_id,
                callerName: session.caller_name || 'HorPal User',
                callerAvatar: session.caller_avatar || '',
                receiverId: session.receiver_id || user.id,
                isGroup: !!session.is_group,
                groupId: session.group_id || undefined,
                groupName: session.group_name || undefined,
                callType: session.call_type === 'video' ? 'video' : 'audio',
                status: 'ringing',
                participantIds: session.participant_ids || [],
                startedAt: Date.now(),
            };

            callInitTimestampRef.current = Date.now();
            setActiveCall(incomingCallObj);
            activeCallRef.current = incomingCallObj;
            setCallState('ringing');
            callStateRef.current = 'ringing';

            CallSoundEngine.startIncomingRing({
                callId: incomingCallObj.callId,
                roomId: incomingCallObj.roomId,
                callerId: incomingCallObj.callerId,
                callerName: incomingCallObj.callerName,
                callerAvatar: incomingCallObj.callerAvatar,
                callType: incomingCallObj.callType,
                isGroup: incomingCallObj.isGroup,
                groupId: incomingCallObj.groupId,
                groupName: incomingCallObj.groupName,
            });

            // Auto-expire incoming ringing modal after 35 seconds if unanswered
            if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
            ringTimeoutRef.current = setTimeout(() => {
                if (callStateRef.current === 'ringing' && activeCallRef.current?.callId === incomingCallObj.callId) {
                    cleanupCall();
                }
            }, 35000);
        },
        [user?.id, supabase, isLocalClientGenuinelyBusy, broadcastSignal, cleanupCall]
    );

    const handleSessionStateTransition = useCallback(
        (payload: {
            callId?: string;
            roomId?: string;
            status: CallSessionStatus;
            isGroup?: boolean;
            responderId?: string;
        }) => {
            const current = activeCallRef.current;
            if (!current) return;

            const matchesCall =
                (payload.callId && payload.callId === current.callId) ||
                (payload.roomId && payload.roomId === current.roomId);

            if (!matchesCall) return;

            if (payload.status === 'accepted') {
                // Stop outgoing calling sound for both 1-on-1 and Group Calls as soon as any receiver accepts!
                CallSoundEngine.stopAllCallSounds();
                // When receiver accepts, transition caller from 'calling' -> 'connected' immediately!
                if (callStateRef.current === 'calling') {
                    if (ringTimeoutRef.current) {
                        clearTimeout(ringTimeoutRef.current);
                        ringTimeoutRef.current = null;
                    }
                    setCallState('connected');
                    callStateRef.current = 'connected';
                    startCallTimer();
                    startHeartbeat(current.callId);

                    // Ensure caller is connected to the exact deterministic LiveKit room and tracks are published
                    const existingRoom = livekitRoomRef.current;
                    if (!existingRoom || existingRoom.state === ConnectionState.Disconnected) {
                        connectToLiveKit(current.roomId, current.callType);
                    } else if (existingRoom.state === ConnectionState.Connected) {
                        existingRoom.startAudio().catch(() => {});
                        existingRoom.localParticipant
                            .setMicrophoneEnabled(true, {
                                echoCancellation: true,
                                noiseSuppression: true,
                                autoGainControl: true,
                            })
                            .catch(() => {});
                        if (current.callType === 'video') {
                            existingRoom.localParticipant
                                .setCameraEnabled(true, {
                                    facingMode: facingModeRef.current,
                                    resolution: VideoPresets.h720.resolution,
                                })
                                .catch(() => {});
                        }
                        syncLocalTracksFromRoom(existingRoom);
                        syncRemoteParticipants(existingRoom);
                    }
                }
            } else if (payload.status === 'declined') {
                if (!current.isGroup) {
                    CallSoundEngine.stopAllCallSounds();
                    if (callStateRef.current === 'calling') {
                        toast.error(`${current.receiverName || 'User'} declined the call`);
                    }
                    cleanupCall();
                }
            } else if (payload.status === 'ended' || payload.status === 'missed') {
                // If caller hangs up, cancels, or hits 35s timeout, close receiver's modal immediately
                if (!current.isGroup || callStateRef.current === 'ringing' || callStateRef.current === 'calling') {
                    CallSoundEngine.stopAllCallSounds();
                    if (callStateRef.current === 'ringing') {
                        toast('Missed call', { icon: '📲' });
                    }
                    cleanupCall();
                }
            }
        },
        [cleanupCall, connectToLiveKit, startCallTimer, startHeartbeat, syncLocalTracksFromRoom, syncRemoteParticipants]
    );

    useEffect(() => {
        if (!user?.id) return;

        // 1. Subscribe to global_call_bus (Broadcast + Postgres Changes on public.call_sessions)
        const channel = supabase
            .channel('global_call_bus', {
                config: { broadcast: { self: false } },
            })
            .on('broadcast', { event: 'CALL_INVITE' }, ({ payload }) => {
                if (!payload) return;
                handleIncomingRingSession({
                    id: payload.callId,
                    room_id: payload.livekit_room_id || payload.roomId,
                    livekit_room_id: payload.livekit_room_id || payload.roomId,
                    caller_id: payload.callerId,
                    caller_name: payload.callerName,
                    caller_avatar: payload.callerAvatar,
                    receiver_id: payload.receiverId,
                    group_id: payload.groupId,
                    group_name: payload.groupName,
                    is_group: !!payload.isGroup,
                    call_type: payload.callType || 'audio',
                    status: 'ringing',
                    participant_ids: payload.participantIds || [],
                    created_at: new Date().toISOString(),
                });
            })
            .on('broadcast', { event: 'CALL_ACCEPTED' }, ({ payload }) => {
                if (!payload) return;
                handleSessionStateTransition({
                    callId: payload.callId,
                    roomId: payload.livekit_room_id || payload.roomId,
                    status: 'accepted',
                    responderId: payload.responderId,
                });
            })
            .on('broadcast', { event: 'CALL_VIDEO_TOGGLED' }, ({ payload }) => {
                if (!payload) return;
                const current = activeCallRef.current;
                if (
                    current &&
                    (payload.callId === current.callId || payload.roomId === current.roomId)
                ) {
                    if (payload.videoEnabled && current.callType !== 'video') {
                        const upgradedCall: ActiveCall = { ...current, callType: 'video' };
                        activeCallRef.current = upgradedCall;
                        setActiveCall(upgradedCall);
                    }
                    if (livekitRoomRef.current) {
                        syncRemoteParticipants(livekitRoomRef.current);
                    }
                }
            })
            .on('broadcast', { event: 'CALL_DECLINED' }, ({ payload }) => {
                if (!payload) return;
                handleSessionStateTransition({
                    callId: payload.callId,
                    roomId: payload.livekit_room_id || payload.roomId,
                    status: 'declined',
                    isGroup: payload.isGroup,
                });
            })
            .on('broadcast', { event: 'CALL_BUSY' }, ({ payload }) => {
                if (!payload) return;
                const current = activeCallRef.current;
                if (
                    current &&
                    !current.isGroup &&
                    (payload.callId === current.callId || payload.roomId === current.roomId) &&
                    callStateRef.current === 'calling'
                ) {
                    CallSoundEngine.stopAllCallSounds();
                    toast(`${current.receiverName || 'User'} is currently on another call`, { icon: '📞' });
                    cleanupCall();
                }
            })
            .on('broadcast', { event: 'CALL_ENDED' }, ({ payload }) => {
                if (!payload) return;
                handleSessionStateTransition({
                    callId: payload.callId,
                    roomId: payload.livekit_room_id || payload.roomId,
                    status: 'ended',
                    isGroup: payload.isGroup,
                });
            })
            .on('broadcast', { event: 'CALL_MISSED' }, ({ payload }) => {
                if (!payload) return;
                handleSessionStateTransition({
                    callId: payload.callId,
                    roomId: payload.livekit_room_id || payload.roomId,
                    status: 'missed',
                    isGroup: payload.isGroup,
                });
            })
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'call_sessions' },
                (change) => {
                    const row = change.new as any;
                    if (row && row.status === 'ringing') {
                        handleIncomingRingSession(row);
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'call_sessions' },
                (change) => {
                    const row = change.new as any;
                    if (!row) return;
                    if (row.status === 'ringing') {
                        handleIncomingRingSession(row);
                    } else {
                        handleSessionStateTransition({
                            callId: row.id,
                            roomId: row.room_id,
                            status: row.status as CallSessionStatus,
                            isGroup: row.is_group,
                        });
                    }
                }
            )
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // Check if there is an active ringing call for this user that arrived right as the page loaded
                    await cleanupStaleDatabaseCalls();

                    // Also check URL query parameter ?incomingCallId=... from OS notification tap
                    if (typeof window !== 'undefined') {
                        const sp = new URLSearchParams(window.location.search);
                        const incomingCallIdParam = sp.get('incomingCallId');
                        if (incomingCallIdParam) {
                            const { data: notifCallRow } = await supabase
                                .from('call_sessions')
                                .select('*')
                                .eq('id', incomingCallIdParam)
                                .maybeSingle();
                            if (notifCallRow && (notifCallRow.status === 'ringing' || notifCallRow.status === 'accepted')) {
                                await handleIncomingRingSession({ ...notifCallRow, status: 'ringing' } as any);
                            }
                            try {
                                const cleanUrl = new URL(window.location.href);
                                cleanUrl.searchParams.delete('incomingCallId');
                                cleanUrl.searchParams.delete('roomId');
                                cleanUrl.searchParams.delete('callType');
                                window.history.replaceState({}, '', cleanUrl.toString());
                            } catch {}
                        }
                    }

                    const thirtyFiveSecAgo = new Date(Date.now() - 35000).toISOString();
                    const { data: activeRings } = await supabase
                        .from('call_sessions')
                        .select('*')
                        .eq('status', 'ringing')
                        .gt('created_at', thirtyFiveSecAgo)
                        .order('created_at', { ascending: false })
                        .limit(5);

                    if (activeRings && activeRings.length > 0) {
                        for (const r of activeRings) {
                            await handleIncomingRingSession(r as any);
                        }
                    }
                }
            });

        globalBusChannelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
            globalBusChannelRef.current = null;
        };
    }, [
        user?.id,
        supabase,
        handleIncomingRingSession,
        handleSessionStateTransition,
        cleanupCall,
        cleanupStaleDatabaseCalls,
        syncRemoteParticipants,
    ]);

    // ─────────────────────────────────────────────────────────────────────────
    // DEVICE PERMISSIONS PRE-FLIGHT
    // ─────────────────────────────────────────────────────────────────────────
    const verifyDevicePermissions = useCallback(async (type: CallType, onGranted: () => Promise<void>) => {
        setPermType(type);
        setPermDeniedState(false);

        if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
            await onGranted();
            return;
        }

        try {
            const micPerm = await navigator.permissions?.query({ name: 'microphone' as PermissionName }).catch(() => null);
            const camPerm =
                type === 'video'
                    ? await navigator.permissions?.query({ name: 'camera' as PermissionName }).catch(() => null)
                    : null;

            if (micPerm?.state === 'denied' || (type === 'video' && camPerm?.state === 'denied')) {
                CallSoundEngine.stopAllCallSounds();
                setPendingAction(() => onGranted);
                setPermDeniedState(true);
                setPermModalOpen(true);
                return;
            }
        } catch {}

        // Execute onGranted directly so LiveKit's setMicrophoneEnabled / setCameraEnabled
        // acquires media tracks once without opening-and-closing camera/mic hardware twice!
        await onGranted();
    }, []);

    const handleRequestPermissionFromModal = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: permType === 'video',
            });
            stream.getTracks().forEach((t) => t.stop());
            setPermModalOpen(false);
            if (pendingAction) {
                await pendingAction();
                setPendingAction(null);
            }
        } catch (err: any) {
            if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
                setPermDeniedState(true);
            } else {
                toast.error('Hardware error: ' + (err?.message || 'Unable to access media devices'));
                setPermModalOpen(false);
            }
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // INITIATE CALL (1-ON-1 DM & GROUP CALLS)
    // ─────────────────────────────────────────────────────────────────────────
    const executeInitiateCall = useCallback(
        async ({
            receiverId,
            receiverName,
            receiverAvatar,
            callType,
            isGroup = false,
            groupName,
            participantIds = [],
        }: {
            receiverId: string;
            receiverName: string;
            receiverAvatar: string;
            callType: CallType;
            isGroup?: boolean;
            groupName?: string;
            participantIds?: string[];
        }) => {
            if (!user) {
                CallSoundEngine.stopAllCallSounds();
                toast.error('Please sign in to place a call.');
                return;
            }

            // 1. Clean up any stale calls in DB and local state first!
            await cleanupStaleDatabaseCalls();
            if (isLocalClientGenuinelyBusy()) {
                // If the user is already in this exact group call, just keep it open
                const targetRoom = getDeterministicRoomId({
                    callerId: user.id,
                    receiverId,
                    isGroup,
                    groupId: isGroup ? receiverId : undefined,
                });
                if (activeCallRef.current?.roomId === targetRoom) {
                    return;
                }
                cleanupCall();
            }

            const roomId = getDeterministicRoomId({
                callerId: user.id,
                receiverId,
                isGroup,
                groupId: isGroup ? receiverId : undefined,
            });

            // 2. For 1-on-1 DM Calls: strictly check if target user is genuinely busy
            if (!isGroup) {
                try {
                    const { data: busyCheck } = await supabase.rpc('check_user_call_busy', {
                        target_user_id: receiverId,
                        current_caller_id: user.id,
                    });

                    if (busyCheck && busyCheck.is_busy === true) {
                        CallSoundEngine.stopAllCallSounds();
                        toast(`${receiverName} is currently on another call`, { icon: '📞' });
                        return;
                    }
                } catch {}

                // Expire any old leftover call sessions between these exact two users before creating a fresh one
                await supabase
                    .from('call_sessions')
                    .update({
                        status: 'ended',
                        updated_at: new Date().toISOString(),
                        ended_at: new Date().toISOString(),
                    })
                    .eq('room_id', roomId)
                    .in('status', ['ringing', 'accepted']);
            } else {
                // 3. For Group Calls: never block with "User is busy"!
                // Check if there is already an active group call session for this group roomId; if so, join it!
                const sixtySecAgo = new Date(Date.now() - 60000).toISOString();
                const { data: existingGroupSession } = await supabase
                    .from('call_sessions')
                    .select('*')
                    .eq('room_id', roomId)
                    .in('status', ['ringing', 'accepted'])
                    .gt('updated_at', sixtySecAgo)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (existingGroupSession && existingGroupSession.caller_id !== user.id) {
                    CallSoundEngine.stopAllCallSounds();
                    const joinCallObj: ActiveCall = {
                        callId: existingGroupSession.id,
                        roomId: existingGroupSession.room_id || roomId,
                        callerId: existingGroupSession.caller_id,
                        callerName: existingGroupSession.caller_name || user.name || 'Group Host',
                        callerAvatar: existingGroupSession.caller_avatar || '',
                        receiverId,
                        receiverName: groupName || receiverName,
                        receiverAvatar,
                        isGroup: true,
                        groupId: receiverId,
                        groupName: existingGroupSession.group_name || groupName || receiverName,
                        callType,
                        status: 'accepted',
                        participantIds: existingGroupSession.participant_ids || participantIds,
                        startedAt: Date.now(),
                    };

                    callInitTimestampRef.current = Date.now();
                    setActiveCall(joinCallObj);
                    activeCallRef.current = joinCallObj;
                    setCallState('connected');
                    callStateRef.current = 'connected';

                    await supabase
                        .from('call_sessions')
                        .update({
                            status: 'accepted',
                            updated_at: new Date().toISOString(),
                            answered_at: existingGroupSession.answered_at || new Date().toISOString(),
                        })
                        .eq('id', existingGroupSession.id);

                    await broadcastSignal('CALL_ACCEPTED', {
                        callId: existingGroupSession.id,
                        roomId: existingGroupSession.room_id || roomId,
                        livekit_room_id: existingGroupSession.room_id || roomId,
                        responderId: user.id,
                        responderName: user.name || user.username,
                    });

                    startCallTimer();
                    startHeartbeat(existingGroupSession.id);
                    await connectToLiveKit(existingGroupSession.room_id || roomId, callType);
                    return;
                }
            }

            // 4. Resolve group member IDs if this is a Group Call (always merge DB members + passed participantIds)
            const memberSet = new Set<string>(participantIds.filter((id) => id && id !== user.id));
            if (isGroup) {
                try {
                    const [gmRes, rpRes] = await Promise.allSettled([
                        supabase.from('group_members').select('user_id').eq('group_id', receiverId),
                        supabase.from('room_participants').select('user_id').eq('room_id', receiverId),
                    ]);
                    if (gmRes.status === 'fulfilled' && gmRes.value.data) {
                        gmRes.value.data.forEach((m: { user_id?: string }) => {
                            if (m.user_id && m.user_id !== user.id) memberSet.add(m.user_id);
                        });
                    }
                    if (rpRes.status === 'fulfilled' && rpRes.value.data) {
                        rpRes.value.data.forEach((m: { user_id?: string }) => {
                            if (m.user_id && m.user_id !== user.id) memberSet.add(m.user_id);
                        });
                    }
                } catch {}
            }
            let targetParticipantIds = Array.from(memberSet);
            if (!isGroup && receiverId) {
                targetParticipantIds = [receiverId];
            }

            // 5. Create authoritative call session row in public.call_sessions
            const callId = crypto.randomUUID();
            const callerDisplayName = user.name || user.username || 'HorPal User';

            const { error: insertError } = await supabase.from('call_sessions').insert({
                id: callId,
                room_id: roomId,
                caller_id: user.id,
                caller_name: callerDisplayName,
                caller_avatar: user.avatar || '',
                receiver_id: isGroup ? null : receiverId,
                group_id: isGroup ? receiverId : null,
                group_name: isGroup ? groupName || receiverName : null,
                is_group: isGroup,
                call_type: callType,
                status: 'ringing',
                participant_ids: targetParticipantIds,
                active_participant_ids: [user.id],
            });

            if (insertError) {
                console.warn('[CallEngine] Failed to insert call_sessions row:', insertError.message);
            }

            const newCall: ActiveCall = {
                callId,
                roomId,
                callerId: user.id,
                callerName: callerDisplayName,
                callerAvatar: user.avatar || '',
                receiverId,
                receiverName,
                receiverAvatar,
                isGroup,
                groupId: isGroup ? receiverId : undefined,
                groupName: isGroup ? groupName || receiverName : undefined,
                callType,
                status: 'ringing',
                participantIds: targetParticipantIds,
                startedAt: Date.now(),
            };

            callInitTimestampRef.current = Date.now();
            setActiveCall(newCall);
            activeCallRef.current = newCall;
            setCallState(isGroup ? 'connected' : 'calling');
            callStateRef.current = isGroup ? 'connected' : 'calling';

            // Play outgoing calling ringback tone for BOTH 1-on-1 AND Group Calls until the first remote peer answers/joins!
            CallSoundEngine.startOutgoingRing();

            if (isGroup) {
                startCallTimer();
                startHeartbeat(callId);
                // Insert call_started card in group chat so members can tap "Join Call"
                supabase
                    .from('messages')
                    .insert({
                        id: crypto.randomUUID(),
                        sender_id: user.id,
                        room_id: receiverId,
                        content: `${callerDisplayName} started a Group ${callType === 'video' ? 'Video' : 'Voice'} Call`,
                        message_type: 'call_started',
                        status: 'sent',
                    })
                    .then(() => {});
            }

            // 6. Broadcast instant invite on global_call_bus & trigger Web Push for background/minimized receivers
            await broadcastSignal('CALL_INVITE', {
                callId,
                roomId,
                livekit_room_id: roomId,
                callerId: user.id,
                callerName: callerDisplayName,
                callerAvatar: user.avatar || '',
                receiverId: isGroup ? undefined : receiverId,
                groupId: isGroup ? receiverId : undefined,
                groupName: isGroup ? groupName || receiverName : undefined,
                isGroup,
                callType,
                participantIds: targetParticipantIds,
            });

            fetch('/api/push/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    callId,
                    roomId,
                    callerId: user.id,
                    callerName: callerDisplayName,
                    callerAvatar: user.avatar || '',
                    callType,
                    isGroup,
                    groupId: isGroup ? receiverId : undefined,
                    groupName: isGroup ? groupName || receiverName : undefined,
                    participantIds: targetParticipantIds,
                }),
            }).catch(() => {});

            // 7. Connect caller to the deterministic LiveKit room immediately so media is warm & ready when receiver taps Accept
            await connectToLiveKit(roomId, callType);

            // 8. Enforce strict 35-second ring timeout for unanswered calls
            if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
            ringTimeoutRef.current = setTimeout(async () => {
                if (activeCallRef.current?.callId !== callId) return;

                if (!isGroup && callStateRef.current === 'calling') {
                    CallSoundEngine.stopAllCallSounds();
                    toast(`${receiverName} didn't answer`, { icon: '📲' });
                    await supabase
                        .from('call_sessions')
                        .update({
                            status: 'missed',
                            updated_at: new Date().toISOString(),
                            ended_at: new Date().toISOString(),
                        })
                        .eq('id', callId);
                    if (receiverId) {
                        supabase
                            .from('messages')
                            .insert({
                                id: crypto.randomUUID(),
                                sender_id: user.id,
                                receiver_id: receiverId,
                                content: 'Missed call',
                                message_type: 'missed_call',
                                status: 'sent',
                            })
                            .then(() => {});
                    }
                    await broadcastSignal('CALL_MISSED', {
                        callId,
                        roomId,
                        livekit_room_id: roomId,
                        isGroup,
                    });
                    cleanupCall();
                } else if (isGroup && (livekitRoomRef.current?.remoteParticipants.size || 0) === 0) {
                    // Stop the group calling ringback sound after 35s if no one has joined yet
                    CallSoundEngine.stopAllCallSounds();
                }
            }, 35000);
        },
        [
            user,
            supabase,
            cleanupStaleDatabaseCalls,
            isLocalClientGenuinelyBusy,
            cleanupCall,
            broadcastSignal,
            connectToLiveKit,
            startCallTimer,
            startHeartbeat,
        ]
    );

    const initiateCall = useCallback(
        async (
            paramsOrReceiverId:
                | {
                      receiverId: string;
                      receiverName: string;
                      receiverAvatar?: string;
                      callType: CallType;
                      isGroup?: boolean;
                      groupName?: string;
                      participantIds?: string[];
                  }
                | string,
            receiverNameArg?: string,
            receiverAvatarArg?: string,
            callTypeArg?: CallType,
            isGroupArg?: boolean,
            groupNameArg?: string,
            participantIdsArg?: string[]
        ) => {
            const normalized =
                typeof paramsOrReceiverId === 'string'
                    ? {
                          receiverId: paramsOrReceiverId,
                          receiverName: receiverNameArg || 'User',
                          receiverAvatar: receiverAvatarArg || '',
                          callType: callTypeArg || 'audio',
                          isGroup: !!isGroupArg,
                          groupName: groupNameArg,
                          participantIds: participantIdsArg || [],
                      }
                    : {
                          receiverId: paramsOrReceiverId.receiverId,
                          receiverName: paramsOrReceiverId.receiverName || 'User',
                          receiverAvatar: paramsOrReceiverId.receiverAvatar || '',
                          callType: paramsOrReceiverId.callType || 'audio',
                          isGroup: !!paramsOrReceiverId.isGroup,
                          groupName: paramsOrReceiverId.groupName,
                          participantIds: paramsOrReceiverId.participantIds || [],
                      };

            // Start outgoing calling tone synchronously inside the user click gesture!
            // This guarantees iOS Safari, Android Chrome, and Desktop browsers grant full audio playback privilege.
            CallSoundEngine.startOutgoingRing();
            await verifyDevicePermissions(normalized.callType, async () => {
                await executeInitiateCall(normalized);
            });
        },
        [verifyDevicePermissions, executeInitiateCall]
    );

    const joinCall = useCallback(
        async (roomId: string, callType: CallType = 'video') => {
            if (!user) return;
            CallSoundEngine.warmUp();
            await verifyDevicePermissions(callType, async () => {
                const isGroup = roomId.startsWith('call_group_') || !roomId.startsWith('call_dm_');
                const normalizedRoomId =
                    roomId.startsWith('call_dm_') || roomId.startsWith('call_group_')
                        ? roomId
                        : `call_group_${roomId}`;

                const joinCallObj: ActiveCall = {
                    callId: crypto.randomUUID(),
                    roomId: normalizedRoomId,
                    callerId: user.id,
                    callerName: user.name || user.username || 'You',
                    callerAvatar: user.avatar || '',
                    isGroup,
                    groupName: isGroup ? 'Group Call' : undefined,
                    callType,
                    status: 'accepted',
                    startedAt: Date.now(),
                };

                callInitTimestampRef.current = Date.now();
                setActiveCall(joinCallObj);
                activeCallRef.current = joinCallObj;
                setCallState('connected');
                callStateRef.current = 'connected';
                startCallTimer();
                await connectToLiveKit(normalizedRoomId, callType);
            });
        },
        [user, verifyDevicePermissions, startCallTimer, connectToLiveKit]
    );

    // ─────────────────────────────────────────────────────────────────────────
    // ACCEPT CALL
    // ─────────────────────────────────────────────────────────────────────────
    const executeAcceptCall = useCallback(async () => {
        const current = activeCallRef.current;
        if (!current || !user) return;

        // 1. Stop ringtone immediately
        CallSoundEngine.stopAllCallSounds();
        if (ringTimeoutRef.current) {
            clearTimeout(ringTimeoutRef.current);
            ringTimeoutRef.current = null;
        }

        // 2. Transition state to connected
        setCallState('connected');
        callStateRef.current = 'connected';
        startCallTimer();
        startHeartbeat(current.callId);

        // 3. Update authoritative call_sessions row to 'accepted'
        await supabase
            .from('call_sessions')
            .update({
                status: 'accepted',
                updated_at: new Date().toISOString(),
                answered_at: new Date().toISOString(),
            })
            .eq('id', current.callId);

        // 4. Broadcast CALL_ACCEPTED so caller transitions instantaneously
        await broadcastSignal('CALL_ACCEPTED', {
            callId: current.callId,
            roomId: current.roomId,
            livekit_room_id: current.roomId,
            responderId: user.id,
            responderName: user.name || user.username,
        });

        // 5. Connect receiver to the exact same deterministic LiveKit room_id
        await connectToLiveKit(current.roomId, current.callType);
    }, [user, supabase, broadcastSignal, connectToLiveKit, startCallTimer, startHeartbeat]);

    const acceptCall = useCallback(async () => {
        const current = activeCallRef.current;
        if (!current) return;
        // Stop ringtone and unlock WebAudio / LiveKit audio playback synchronously on button click!
        CallSoundEngine.stopAllCallSounds();
        CallSoundEngine.warmUp();
        if (livekitRoomRef.current) {
            await livekitRoomRef.current.startAudio().catch(() => {});
        }
        await verifyDevicePermissions(current.callType, async () => {
            await executeAcceptCall();
        });
    }, [verifyDevicePermissions, executeAcceptCall]);

    // ─────────────────────────────────────────────────────────────────────────
    // DECLINE CALL
    // ─────────────────────────────────────────────────────────────────────────
    const declineCall = useCallback(async () => {
        const current = activeCallRef.current;
        CallSoundEngine.stopAllCallSounds();
        if (!current || !user) {
            cleanupCall();
            return;
        }

        if (!current.isGroup) {
            await supabase
                .from('call_sessions')
                .update({
                    status: 'declined',
                    updated_at: new Date().toISOString(),
                    ended_at: new Date().toISOString(),
                })
                .eq('id', current.callId);

            await broadcastSignal('CALL_DECLINED', {
                callId: current.callId,
                roomId: current.roomId,
                livekit_room_id: current.roomId,
                responderId: user.id,
                isGroup: false,
            });
        }

        cleanupCall();
    }, [user, supabase, broadcastSignal, cleanupCall]);

    // Handle ServiceWorker notification click actions (ACCEPT_CALL_FROM_OS / DECLINE_CALL_FROM_OS)
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

        const handleSwMessage = async (event: MessageEvent) => {
            const msg = event.data;
            if (!msg) return;

            if (msg.type === 'DECLINE_CALL_FROM_OS') {
                await declineCall();
            } else if (msg.type === 'ACCEPT_CALL_FROM_OS') {
                const callData = msg.data || {};
                if (activeCallRef.current && callStateRef.current === 'ringing') {
                    await acceptCall();
                } else if (callData.callId && user?.id) {
                    const { data: sessionRow } = await supabase
                        .from('call_sessions')
                        .select('*')
                        .eq('id', callData.callId)
                        .maybeSingle();
                    if (sessionRow) {
                        await handleIncomingRingSession({ ...sessionRow, status: 'ringing' } as any);
                        await executeAcceptCall();
                    } else if (callData.roomId) {
                        await joinCall(callData.roomId, callData.callType === 'video' ? 'video' : 'audio');
                    }
                } else if (callData.roomId) {
                    await joinCall(callData.roomId, callData.callType === 'video' ? 'video' : 'audio');
                }
            }
        };

        navigator.serviceWorker.addEventListener('message', handleSwMessage);
        return () => {
            navigator.serviceWorker.removeEventListener('message', handleSwMessage);
        };
    }, [user?.id, supabase, acceptCall, declineCall, executeAcceptCall, handleIncomingRingSession, joinCall]);

    // ─────────────────────────────────────────────────────────────────────────
    // END CALL
    // ─────────────────────────────────────────────────────────────────────────
    const endCall = useCallback(async () => {
        const current = activeCallRef.current;
        const wasCalling = callStateRef.current === 'calling';
        const remainingRemotes = livekitRoomRef.current?.remoteParticipants.size || 0;

        CallSoundEngine.stopAllCallSounds();

        if (current && user) {
            // For 1-on-1 calls OR group calls where no other remote participants are connected, mark session ended/missed
            if (!current.isGroup || remainingRemotes === 0) {
                const finalStatus: CallSessionStatus = wasCalling && !current.isGroup ? 'missed' : 'ended';
                await supabase
                    .from('call_sessions')
                    .update({
                        status: finalStatus,
                        updated_at: new Date().toISOString(),
                        ended_at: new Date().toISOString(),
                    })
                    .eq('id', current.callId);

                await broadcastSignal(finalStatus === 'missed' ? 'CALL_MISSED' : 'CALL_ENDED', {
                    callId: current.callId,
                    roomId: current.roomId,
                    livekit_room_id: current.roomId,
                    enderId: user.id,
                    isGroup: current.isGroup,
                });

                if (!current.isGroup && current.receiverId && current.callerId === user.id) {
                    supabase
                        .from('messages')
                        .insert({
                            id: crypto.randomUUID(),
                            sender_id: user.id,
                            receiver_id: current.receiverId,
                            content: finalStatus === 'missed' ? 'Missed call' : 'Call ended',
                            message_type: finalStatus === 'missed' ? 'missed_call' : 'completed_call',
                            status: 'sent',
                        })
                        .then(() => {});
                }
            }
        }

        cleanupCall();
    }, [user, supabase, broadcastSignal, cleanupCall]);

    // ─────────────────────────────────────────────────────────────────────────
    // MEDIA CONTROLS: MUTE, VIDEO ON/OFF, FRONT/BACK CAMERA FLIP, SPEAKER, AUDIO UNLOCK
    // ─────────────────────────────────────────────────────────────────────────
    const toggleMute = useCallback(async () => {
        const room = livekitRoomRef.current;
        if (!room) {
            setIsMuted((prev) => !prev);
            return;
        }
        try {
            const nextMuted = !isMuted;
            await room.localParticipant.setMicrophoneEnabled(!nextMuted);
            setIsMuted(nextMuted);
            syncLocalTracksFromRoom(room);
        } catch (err) {
            console.error('[CallEngine] Failed to toggle microphone:', err);
        }
    }, [isMuted, syncLocalTracksFromRoom]);

    const toggleVideo = useCallback(async () => {
        const room = livekitRoomRef.current;
        if (!room) {
            setIsVideoOff((prev) => !prev);
            return;
        }
        try {
            const nextVideoOff = !isVideoOff;
            const enableCamera = !nextVideoOff;
            try {
                await room.localParticipant.setCameraEnabled(enableCamera, {
                    facingMode: facingModeRef.current,
                    resolution: VideoPresets.h720.resolution,
                });
            } catch {
                await room.localParticipant.setCameraEnabled(enableCamera);
            }
            setIsVideoOff(nextVideoOff);

            if (enableCamera && activeCallRef.current && activeCallRef.current.callType !== 'video') {
                const upgradedCall: ActiveCall = { ...activeCallRef.current, callType: 'video' };
                activeCallRef.current = upgradedCall;
                setActiveCall(upgradedCall);
            }

            syncLocalTracksFromRoom(room);
            setTimeout(() => {
                if (livekitRoomRef.current === room) {
                    syncLocalTracksFromRoom(room);
                }
            }, 150);

            // Notify remote participants via both LiveKit DataChannel and Supabase Broadcast
            try {
                const payloadBytes = new TextEncoder().encode(
                    JSON.stringify({
                        type: 'VIDEO_TOGGLED',
                        userId: user?.id,
                        videoEnabled: enableCamera,
                    })
                );
                await room.localParticipant.publishData(payloadBytes, { reliable: true });
            } catch {}

            if (activeCallRef.current) {
                broadcastSignal('CALL_VIDEO_TOGGLED', {
                    callId: activeCallRef.current.callId,
                    roomId: activeCallRef.current.roomId,
                    userId: user?.id,
                    videoEnabled: enableCamera,
                });
            }
        } catch (err) {
            console.error('[CallEngine] Failed to toggle camera:', err);
            toast.error('Unable to toggle camera');
        }
    }, [isVideoOff, user?.id, syncLocalTracksFromRoom, broadcastSignal]);

    const flipCamera = useCallback(async () => {
        const nextMode: FacingMode = facingModeRef.current === 'user' ? 'environment' : 'user';
        setFacingMode(nextMode);
        facingModeRef.current = nextMode;

        const room = livekitRoomRef.current;
        if (!room) return;

        try {
            const videoPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
            const currentTrack = videoPub?.track as LocalVideoTrack | undefined;

            if (currentTrack && !isVideoOff) {
                await currentTrack.restartTrack({
                    facingMode: nextMode,
                    resolution: VideoPresets.h720.resolution,
                });
            } else {
                await room.localParticipant.setCameraEnabled(true, {
                    facingMode: nextMode,
                    resolution: VideoPresets.h720.resolution,
                });
                setIsVideoOff(false);
            }
            syncLocalTracksFromRoom(room);
        } catch (err) {
            console.error('[CallEngine] Failed to switch camera facingMode:', err);
            toast.error('Could not switch camera');
        }
    }, [isVideoOff, syncLocalTracksFromRoom]);

    const toggleSpeaker = useCallback(() => {
        const nextSpeaker = !isSpeakerOnRef.current;
        setIsSpeakerOn(nextSpeaker);
        isSpeakerOnRef.current = nextSpeaker;

        audioElementsRef.current.forEach((el) => {
            try {
                el.volume = nextSpeaker ? 1.0 : 0.25;
            } catch {}
        });
    }, []);

    const unlockAudio = useCallback(async () => {
        CallSoundEngine.warmUp();
        CallSoundEngine.ensurePlaying();
        const room = livekitRoomRef.current;
        if (room) {
            try {
                await room.startAudio();
                setAudioPlaybackBlocked(!room.canPlaybackAudio);
            } catch {}
        }
        audioElementsRef.current.forEach((el) => {
            el.play().catch(() => {});
        });
        setAudioPlaybackBlocked(false);
    }, []);

    return (
        <CallContext.Provider
            value={{
                callState,
                activeCall,
                isMuted,
                isVideoOff,
                isSpeakerOn,
                facingMode,
                callDuration,
                remoteParticipants,
                activeSpeakerIds,
                localVideoTrack,
                localAudioTrack,
                livekitRoom,
                participantTrackVersion,
                audioPlaybackBlocked,
                initiateCall,
                joinCall,
                acceptCall,
                declineCall,
                endCall,
                toggleMute,
                toggleVideo,
                flipCamera,
                toggleSpeaker,
                unlockAudio,
            }}
        >
            {children}
            {permModalOpen && (
                <DevicePermissionsModal
                    onGrant={handleRequestPermissionFromModal}
                    onDeny={() => {
                        setPermModalOpen(false);
                        setPendingAction(null);
                    }}
                />
            )}
        </CallContext.Provider>
    );
};

export const useCall = () => {
    const context = useContext(CallContext);
    if (!context) {
        throw new Error('useCall must be used within a CallProvider');
    }
    return context;
};
