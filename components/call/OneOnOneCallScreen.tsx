"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    Volume2,
    VolumeX,
    SwitchCamera,
    PhoneOff,
    ShieldCheck,
    Minimize2,
    Maximize2,
} from 'lucide-react';
import { LocalVideoTrack, RemoteVideoTrack } from 'livekit-client';
import { FacingMode } from '../../context/CallContext';

interface OneOnOneCallScreenProps {
    peerName: string;
    peerAvatar: string;
    callType: 'voice' | 'video';
    callState: 'calling' | 'ringing' | 'connected';
    callDuration: number;
    isMuted: boolean;
    isSpeakerOn: boolean;
    isCameraOff: boolean;
    facingMode?: FacingMode;
    isRemoteSpeaking?: boolean;
    localVideoTrack?: LocalVideoTrack | null;
    remoteVideoTrack?: RemoteVideoTrack | null;
    participantTrackVersion?: number;
    audioPlaybackBlocked?: boolean;
    onToggleMic: () => void;
    onToggleSpeaker: () => void;
    onToggleCamera: () => void;
    onFlipCamera: () => void;
    onUnlockAudio?: () => void;
    onEndCall: () => void;
}

export const OneOnOneCallScreen: React.FC<OneOnOneCallScreenProps> = ({
    peerName,
    peerAvatar,
    callType,
    callState,
    callDuration,
    isMuted,
    isSpeakerOn,
    isCameraOff,
    facingMode = 'user',
    isRemoteSpeaking = false,
    localVideoTrack,
    remoteVideoTrack,
    participantTrackVersion = 0,
    audioPlaybackBlocked = false,
    onToggleMic,
    onToggleSpeaker,
    onToggleCamera,
    onFlipCamera,
    onUnlockAudio,
    onEndCall,
}) => {
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);

    // Draggable PiP state
    const [pipPos, setPipPos] = useState<{ x: number; y: number } | null>(null);
    const dragOffsetRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

    const showRemoteVideo = !!remoteVideoTrack;
    const showLocalVideo = !!localVideoTrack && !isCameraOff;

    // Callback ref for local video element (strictly muted + immediate track attach)
    const setLocalVideoElement = useCallback(
        (el: HTMLVideoElement | null) => {
            localVideoRef.current = el;
            if (!el) return;
            el.muted = true;
            el.defaultMuted = true;
            el.volume = 0;
            if (localVideoTrack && !isCameraOff) {
                localVideoTrack.attach(el);
                el.play().catch(() => {});
            }
        },
        [localVideoTrack, isCameraOff]
    );

    // Callback ref for remote video element (immediate track attach on DOM mount)
    const setRemoteVideoElement = useCallback(
        (el: HTMLVideoElement | null) => {
            remoteVideoRef.current = el;
            if (!el) return;
            if (remoteVideoTrack) {
                remoteVideoTrack.attach(el);
                el.play().catch(() => {});
            }
        },
        [remoteVideoTrack]
    );

    // Attach local video track on state/version updates
    useEffect(() => {
        const videoEl = localVideoRef.current;
        if (!videoEl) return;

        videoEl.muted = true;
        videoEl.defaultMuted = true;
        videoEl.volume = 0;

        if (localVideoTrack && !isCameraOff) {
            localVideoTrack.attach(videoEl);
            videoEl.play().catch(() => {});
        } else {
            localVideoTrack?.detach(videoEl);
            videoEl.srcObject = null;
        }
        return () => {
            if (localVideoTrack && videoEl) {
                localVideoTrack.detach(videoEl);
            }
        };
    }, [localVideoTrack, isCameraOff, callState, showLocalVideo, participantTrackVersion, isMinimized]);

    // Attach remote video track on state/version updates
    useEffect(() => {
        const videoEl = remoteVideoRef.current;
        if (!videoEl) return;

        if (remoteVideoTrack) {
            remoteVideoTrack.attach(videoEl);
            videoEl.play().catch(() => {});
        } else {
            videoEl.srcObject = null;
        }
        return () => {
            if (remoteVideoTrack && videoEl) {
                remoteVideoTrack.detach(videoEl);
            }
        };
    }, [remoteVideoTrack, callState, showRemoteVideo, participantTrackVersion, isMinimized]);

    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60);
        const remSecs = secs % 60;
        return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
    };

    const handlePipPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const currentX = pipPos ? pipPos.x : rect.left;
        const currentY = pipPos ? pipPos.y : rect.top;
        dragOffsetRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            origX: currentX,
            origY: currentY,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePipPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragOffsetRef.current) return;
        const dx = e.clientX - dragOffsetRef.current.startX;
        const dy = e.clientY - dragOffsetRef.current.startY;
        const maxW = typeof window !== 'undefined' ? window.innerWidth - 130 : 300;
        const maxH = typeof window !== 'undefined' ? window.innerHeight - 180 : 600;
        const nextX = Math.max(12, Math.min(maxW, dragOffsetRef.current.origX + dx));
        const nextY = Math.max(16, Math.min(maxH, dragOffsetRef.current.origY + dy));
        setPipPos({ x: nextX, y: nextY });
    };

    const handlePipPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragOffsetRef.current) return;
        dragOffsetRef.current = null;
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {}
    };

    // Floating Minimized Pill
    if (isMinimized) {
        return (
            <div className="fixed top-4 right-4 z-[9999] bg-[#12131A]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-3 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="relative w-11 h-11 rounded-full overflow-hidden border border-emerald-500/40 shrink-0">
                    {peerAvatar ? (
                        <img src={peerAvatar} alt={peerName} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                            {peerName?.charAt(0)?.toUpperCase()}
                        </div>
                    )}
                    <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="min-w-[90px]">
                    <p className="text-white text-xs font-bold truncate max-w-[120px]">{peerName}</p>
                    <p className="text-emerald-400 text-[11px] font-mono">
                        {callState === 'connected' ? formatTime(callDuration) : 'Calling...'}
                    </p>
                </div>
                <button
                    onClick={() => setIsMinimized(false)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                    title="Expand Call"
                >
                    <Maximize2 className="w-4 h-4" />
                </button>
                <button
                    onClick={onEndCall}
                    className="p-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition"
                    title="End Call"
                >
                    <PhoneOff className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[9998] bg-[#0B0C10] flex flex-col justify-between overflow-hidden select-none">
            {/* 1. BACKGROUND / REMOTE VIDEO LAYER */}
            {showRemoteVideo ? (
                <video
                    ref={setRemoteVideoElement}
                    autoPlay
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover z-0 bg-black"
                />
            ) : (
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    {peerAvatar && (
                        <img
                            src={peerAvatar}
                            alt=""
                            className="w-full h-full object-cover blur-[90px] opacity-25 scale-125"
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-[#0B0C10]/85 to-[#0B0C10]" />
                </div>
            )}

            {/* 2. TOP HEADER BAR */}
            <div className="relative z-20 flex items-center justify-between px-5 pt-10 pb-4 bg-gradient-to-b from-black/70 to-transparent">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] text-white/80 font-medium tracking-wider uppercase">
                        End-to-End Encrypted
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {showRemoteVideo && (
                        <div className="bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs font-semibold text-white">{peerName}</span>
                            <span className="text-xs font-mono text-emerald-400">{formatTime(callDuration)}</span>
                        </div>
                    )}
                    <button
                        onClick={() => setIsMinimized(true)}
                        className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition"
                        title="Minimize Call"
                    >
                        <Minimize2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* 3. INTERACTIVE AUDIO UNLOCK BANNER (Mobile Safari / Chrome Autoplay Guard) */}
            {audioPlaybackBlocked && onUnlockAudio && (
                <div className="relative z-30 mx-auto px-4">
                    <button
                        onClick={onUnlockAudio}
                        className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce"
                    >
                        <Volume2 className="w-4 h-4" />
                        Tap to Unmute Browser Audio
                    </button>
                </div>
            )}

            {/* 4. CENTER AVATAR & STATUS (Shown when Remote Video is Off or Still Ringing) */}
            {!showRemoteVideo && (
                <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 text-center">
                    <div className="relative flex items-center justify-center mb-7">
                        {callState !== 'connected' && (
                            <>
                                <div className="absolute w-44 h-44 rounded-full border border-emerald-500/30 animate-ping" />
                                <div className="absolute w-56 h-56 rounded-full border border-indigo-500/15 animate-pulse" />
                            </>
                        )}
                        <div
                            className={`relative w-36 h-36 rounded-full overflow-hidden border-2 bg-gray-900 transition-all duration-300 ${
                                isRemoteSpeaking
                                    ? 'border-emerald-400 ring-4 ring-emerald-400/30 shadow-[0_0_50px_rgba(52,211,153,0.45)] scale-105'
                                    : 'border-white/20 shadow-[0_0_40px_rgba(0,0,0,0.65)]'
                            }`}
                        >
                            {peerAvatar ? (
                                <img src={peerAvatar} alt={peerName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 text-white text-5xl font-bold">
                                    {peerName?.charAt(0)?.toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">{peerName}</h2>

                    {callState === 'connected' ? (
                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-emerald-400 font-mono text-base font-semibold tracking-wider">
                                {formatTime(callDuration)}
                            </span>
                        </div>
                    ) : (
                        <p className="text-sm font-medium text-emerald-400 tracking-wide animate-pulse">
                            {callState === 'calling'
                                ? `Calling ${peerName} (${callType === 'video' ? 'Video' : 'Audio'})...`
                                : 'Ringing...'}
                        </p>
                    )}
                </div>
            )}

            {/* 5. DRAGGABLE PICTURE-IN-PICTURE (PiP) LOCAL CAMERA PREVIEW */}
            {(showLocalVideo || callType === 'video' || !isCameraOff) && (
                <div
                    onPointerDown={handlePipPointerDown}
                    onPointerMove={handlePipPointerMove}
                    onPointerUp={handlePipPointerUp}
                    style={
                        pipPos
                            ? { left: `${pipPos.x}px`, top: `${pipPos.y}px` }
                            : { right: '20px', top: '84px' }
                    }
                    className="fixed z-30 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl overflow-hidden border-2 border-white/25 shadow-[0_15px_35px_rgba(0,0,0,0.8)] bg-gray-950 cursor-grab active:cursor-grabbing touch-none"
                >
                    {showLocalVideo ? (
                        <video
                            ref={setLocalVideoElement}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover ${
                                facingMode === 'user' ? 'scale-x-[-1]' : ''
                            }`}
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900/95 text-white/50 gap-1.5 p-2 text-center">
                            <VideoOff className="w-6 h-6 text-white/40" />
                            <span className="text-[10px] font-medium">Camera Off</span>
                        </div>
                    )}

                    {/* Mini Flip Camera Button inside PiP */}
                    {showLocalVideo && (
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                onFlipCamera();
                            }}
                            className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md transition"
                            title="Switch Front/Back Camera"
                        >
                            <SwitchCamera className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-semibold text-white/90">
                        You
                    </div>
                </div>
            )}

            {/* 6. FLOATING BOTTOM GLASS CONTROL DOCK */}
            <div className="relative z-20 w-full max-w-md mx-auto px-5 pb-9 pt-4">
                <div className="bg-white/10 backdrop-blur-2xl border border-white/15 rounded-3xl p-4 flex items-center justify-around shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
                    {/* Speaker Toggle */}
                    <button
                        onClick={onToggleSpeaker}
                        className={`p-4 rounded-2xl transition-all active:scale-90 ${
                            isSpeakerOn
                                ? 'bg-white text-black shadow-lg'
                                : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                        title={isSpeakerOn ? 'Speaker On' : 'Speaker Off'}
                    >
                        {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                    </button>

                    {/* Camera On/Off Toggle (Available in both Audio & Video calls) */}
                    <button
                        onClick={onToggleCamera}
                        className={`p-4 rounded-2xl transition-all active:scale-90 ${
                            isCameraOff
                                ? 'bg-white/10 text-white hover:bg-white/20'
                                : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                        }`}
                        title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
                    >
                        {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                    </button>

                    {/* Microphone Mute/Unmute Toggle */}
                    <button
                        onClick={onToggleMic}
                        className={`p-4 rounded-2xl transition-all active:scale-90 ${
                            isMuted
                                ? 'bg-red-500/25 text-red-400 border border-red-500/40'
                                : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                        title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                    >
                        {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </button>

                    {/* Front / Back Camera Switcher */}
                    {!isCameraOff && (
                        <button
                            onClick={onFlipCamera}
                            className="p-4 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all active:scale-90"
                            title="Flip Camera (Front / Back)"
                        >
                            <SwitchCamera className="w-6 h-6" />
                        </button>
                    )}

                    {/* End Call Button */}
                    <button
                        onClick={onEndCall}
                        className="p-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white shadow-[0_0_25px_rgba(239,68,68,0.5)] transition-all active:scale-90"
                        title="End Call"
                    >
                        <PhoneOff className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};
