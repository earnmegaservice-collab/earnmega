"use client";

import React, { useEffect, useRef, useCallback } from 'react';
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    PhoneOff,
    Users,
    Volume2,
    VolumeX,
    SwitchCamera,
} from 'lucide-react';
import { RemoteParticipant, Track, LocalVideoTrack, RemoteVideoTrack } from 'livekit-client';
import { FacingMode } from '../../context/CallContext';

interface GroupCallScreenProps {
    groupName: string;
    callState: 'calling' | 'ringing' | 'connected';
    callDuration: number;
    isMuted: boolean;
    isCameraOff: boolean;
    isSpeakerOn: boolean;
    facingMode?: FacingMode;
    localUser: {
        id: string;
        name: string;
        avatar: string;
    };
    localVideoTrack?: LocalVideoTrack | null;
    remoteParticipants: RemoteParticipant[];
    activeSpeakerIds: string[];
    participantTrackVersion?: number;
    audioPlaybackBlocked?: boolean;
    onToggleMic: () => void;
    onToggleCamera: () => void;
    onFlipCamera: () => void;
    onToggleSpeaker: () => void;
    onUnlockAudio?: () => void;
    onEndCall: () => void;
}

const RemoteParticipantTile: React.FC<{
    participant: RemoteParticipant;
    isSpeaking: boolean;
    trackVersion: number;
}> = ({ participant, isSpeaking, trackVersion }) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    // Iterate through participant.videoTrackPublications and participant.audioTrackPublications
    let videoTrack: RemoteVideoTrack | null = null;
    const camPub = participant.getTrackPublication(Track.Source.Camera);
    if (camPub && !camPub.isMuted && camPub.track) {
        videoTrack = camPub.track as RemoteVideoTrack;
    } else {
        for (const pub of participant.videoTrackPublications.values()) {
            if (pub.track && !pub.isMuted) {
                videoTrack = pub.track as RemoteVideoTrack;
                break;
            }
        }
    }

    let isMicMuted = true;
    const micPub = participant.getTrackPublication(Track.Source.Microphone);
    if (micPub && !micPub.isMuted) {
        isMicMuted = false;
    } else {
        for (const pub of participant.audioTrackPublications.values()) {
            if (pub.track && !pub.isMuted) {
                isMicMuted = false;
                break;
            }
        }
    }

    // Parse avatar/name from participant metadata if available
    let displayName = participant.name || participant.identity || 'Member';
    let avatarUrl = '';
    try {
        if (participant.metadata) {
            const parsed = JSON.parse(participant.metadata);
            if (parsed.username) displayName = parsed.username;
            if (parsed.avatar) avatarUrl = parsed.avatar;
        }
    } catch {}

    const setRemoteTileVideoEl = useCallback(
        (el: HTMLVideoElement | null) => {
            videoRef.current = el;
            if (el && videoTrack) {
                videoTrack.attach(el);
                el.play().catch(() => {});
            }
        },
        [videoTrack]
    );

    useEffect(() => {
        const el = videoRef.current;
        if (!el) return;
        if (videoTrack) {
            videoTrack.attach(el);
            el.play().catch(() => {});
        } else {
            el.srcObject = null;
        }
        return () => {
            if (videoTrack && el) {
                videoTrack.detach(el);
            }
        };
    }, [videoTrack, trackVersion]);

    return (
        <div
            className={`relative rounded-3xl overflow-hidden bg-[#161822] border transition-all duration-300 flex items-center justify-center min-h-[180px] ${
                isSpeaking
                    ? 'border-emerald-400 ring-2 ring-emerald-400/50 shadow-[0_0_30px_rgba(52,211,153,0.3)]'
                    : 'border-white/10'
            }`}
        >
            {videoTrack ? (
                <video
                    ref={setRemoteTileVideoEl}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="flex flex-col items-center justify-center gap-2 p-4">
                    <div
                        className={`w-20 h-20 rounded-full overflow-hidden flex items-center justify-center border-2 transition-all ${
                            isSpeaking
                                ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)] scale-105'
                                : 'border-white/15'
                        }`}
                    >
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Name & Mute Badge */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <div className="bg-black/65 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5 max-w-[80%]">
                    {isSpeaking && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />}
                    <span className="text-xs font-semibold text-white truncate">{displayName}</span>
                </div>
                {isMicMuted && (
                    <div className="p-1.5 rounded-full bg-red-500/80 text-white backdrop-blur-md">
                        <MicOff className="w-3.5 h-3.5" />
                    </div>
                )}
            </div>
        </div>
    );
};

export const GroupCallScreen: React.FC<GroupCallScreenProps> = ({
    groupName,
    callState,
    callDuration,
    isMuted,
    isCameraOff,
    isSpeakerOn,
    facingMode = 'user',
    localUser,
    localVideoTrack,
    remoteParticipants,
    activeSpeakerIds,
    participantTrackVersion = 0,
    audioPlaybackBlocked = false,
    onToggleMic,
    onToggleCamera,
    onFlipCamera,
    onToggleSpeaker,
    onUnlockAudio,
    onEndCall,
}) => {
    const localVideoRef = useRef<HTMLVideoElement | null>(null);

    const setLocalVideoEl = useCallback(
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

    useEffect(() => {
        const el = localVideoRef.current;
        if (!el) return;
        el.muted = true;
        el.defaultMuted = true;
        el.volume = 0;
        if (localVideoTrack && !isCameraOff) {
            localVideoTrack.attach(el);
            el.play().catch(() => {});
        } else {
            localVideoTrack?.detach(el);
            el.srcObject = null;
        }
        return () => {
            if (localVideoTrack && el) {
                localVideoTrack.detach(el);
            }
        };
    }, [localVideoTrack, isCameraOff, participantTrackVersion]);

    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60);
        const remSecs = secs % 60;
        return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
    };

    const totalCount = remoteParticipants.length + 1;
    const isLocalSpeaking =
        activeSpeakerIds.includes(localUser.id) || activeSpeakerIds.includes(localUser.name);

    const getGridClass = () => {
        if (totalCount === 1) return 'grid-cols-1 max-w-xl mx-auto';
        if (totalCount === 2) return 'grid-cols-1 sm:grid-cols-2';
        if (totalCount <= 4) return 'grid-cols-2';
        if (totalCount <= 6) return 'grid-cols-2 sm:grid-cols-3';
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
    };

    return (
        <div className="fixed inset-0 z-[9998] bg-[#0B0C10] flex flex-col justify-between overflow-hidden select-none">
            {/* 1. TOP GROUP HEADER */}
            <div className="flex items-center justify-between px-5 pt-10 pb-3 border-b border-white/10 bg-[#0B0C10]/90 backdrop-blur-xl z-20">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        {groupName}
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold flex items-center gap-1">
                            <Users className="w-3 h-3" /> {totalCount}
                        </span>
                    </h2>
                    <p className="text-xs text-white/50 font-mono mt-0.5">
                        {remoteParticipants.length === 0 ? (
                            <span className="text-emerald-400 animate-pulse font-sans font-medium">
                                Calling group members... ({formatTime(callDuration)})
                            </span>
                        ) : callState === 'connected' ? (
                            formatTime(callDuration)
                        ) : (
                            'Starting group call...'
                        )}
                    </p>
                </div>

                {audioPlaybackBlocked && onUnlockAudio && (
                    <button
                        onClick={onUnlockAudio}
                        className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-3.5 py-2 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce"
                    >
                        <Volume2 className="w-4 h-4" />
                        Enable Audio
                    </button>
                )}
            </div>

            {/* 2. DYNAMIC PARTICIPANT STAGE GRID */}
            <div className={`flex-1 p-4 grid ${getGridClass()} gap-3.5 overflow-y-auto items-stretch`}>
                {/* Local User Tile */}
                <div
                    className={`relative rounded-3xl overflow-hidden bg-[#161822] border transition-all duration-300 flex items-center justify-center min-h-[180px] ${
                        isLocalSpeaking
                            ? 'border-emerald-400 ring-2 ring-emerald-400/50 shadow-[0_0_30px_rgba(52,211,153,0.3)]'
                            : 'border-white/15'
                    }`}
                >
                    {localVideoTrack && !isCameraOff ? (
                        <video
                            ref={setLocalVideoEl}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover ${
                                facingMode === 'user' ? 'scale-x-[-1]' : ''
                            }`}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 p-4">
                            <div
                                className={`w-20 h-20 rounded-full overflow-hidden flex items-center justify-center border-2 ${
                                    isLocalSpeaking ? 'border-emerald-400 scale-105' : 'border-white/20'
                                }`}
                            >
                                {localUser.avatar ? (
                                    <img
                                        src={localUser.avatar}
                                        alt={localUser.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-2xl font-bold text-white">
                                        {localUser.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                        <div className="bg-black/65 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                            {isLocalSpeaking && (
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            )}
                            <span className="text-xs font-semibold text-white">{localUser.name} (You)</span>
                        </div>
                        {isMuted && (
                            <div className="p-1.5 rounded-full bg-red-500/80 text-white backdrop-blur-md">
                                <MicOff className="w-3.5 h-3.5" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Remote Participant Tiles */}
                {remoteParticipants.map((participant) => (
                    <RemoteParticipantTile
                        key={participant.identity}
                        participant={participant}
                        isSpeaking={activeSpeakerIds.includes(participant.identity)}
                        trackVersion={participantTrackVersion}
                    />
                ))}
            </div>

            {/* 3. BOTTOM GROUP CONTROL DOCK */}
            <div className="w-full max-w-md mx-auto px-5 pb-9 pt-2 z-20">
                <div className="bg-white/10 backdrop-blur-2xl border border-white/15 rounded-3xl p-4 flex items-center justify-around shadow-2xl">
                    <button
                        onClick={onToggleSpeaker}
                        className={`p-4 rounded-2xl transition-all active:scale-90 ${
                            isSpeakerOn ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                        title={isSpeakerOn ? 'Speaker On' : 'Speaker Off'}
                    >
                        {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                    </button>

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

                    {!isCameraOff && (
                        <button
                            onClick={onFlipCamera}
                            className="p-4 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all active:scale-90"
                            title="Switch Front / Back Camera"
                        >
                            <SwitchCamera className="w-6 h-6" />
                        </button>
                    )}

                    <button
                        onClick={onEndCall}
                        className="p-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white shadow-[0_0_25px_rgba(239,68,68,0.5)] transition-all active:scale-90"
                        title="Leave Group Call"
                    >
                        <PhoneOff className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};
