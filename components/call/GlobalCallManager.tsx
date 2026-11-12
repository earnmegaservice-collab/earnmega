"use client";

import React, { useEffect, useRef } from 'react';
import { useCall } from '../../context/CallContext';
import { useAuth } from '../../context/AuthContext';
import { IncomingCallOverlay } from './IncomingCallOverlay';
import { OneOnOneCallScreen } from './OneOnOneCallScreen';
import { GroupCallScreen } from './GroupCallScreen';
import { Track, RemoteVideoTrack, RemoteAudioTrack, RemoteParticipant } from 'livekit-client';

const RemoteAudioTrackAttachment: React.FC<{
    track: RemoteAudioTrack;
    isSpeakerOn: boolean;
}> = ({ track, isSpeakerOn }) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const el = audioRef.current;
        if (!el || !track) return;
        track.attach(el);
        el.volume = isSpeakerOn ? 1.0 : 0.25;
        el.play().catch(() => {});
        return () => {
            try {
                track.detach(el);
            } catch {}
        };
    }, [track, isSpeakerOn]);

    return (
        <audio
            ref={(el) => {
                audioRef.current = el;
                if (el && track) {
                    track.attach(el);
                    el.volume = isSpeakerOn ? 1.0 : 0.25;
                    el.play().catch(() => {});
                }
            }}
            autoPlay
            playsInline
            className="hidden"
        />
    );
};

const RemoteParticipantsAudioRenderer: React.FC<{
    remoteParticipants: RemoteParticipant[];
    isSpeakerOn: boolean;
    trackVersion: number;
}> = ({ remoteParticipants, isSpeakerOn }) => {
    const audioTracks: { key: string; track: RemoteAudioTrack }[] = [];

    remoteParticipants.forEach((participant) => {
        participant.audioTrackPublications.forEach((pub) => {
            if (pub.track && !pub.isMuted) {
                audioTracks.push({
                    key: `${participant.identity}_${pub.trackSid || pub.track.sid || 'audio'}`,
                    track: pub.track as RemoteAudioTrack,
                });
            }
        });
    });

    return (
        <>
            {audioTracks.map((item) => (
                <RemoteAudioTrackAttachment
                    key={item.key}
                    track={item.track}
                    isSpeakerOn={isSpeakerOn}
                />
            ))}
        </>
    );
};

export const GlobalCallManager: React.FC = () => {
    const ctx = useCall();
    const { user } = useAuth();

    if (!ctx || ctx.callState === 'idle' || !ctx.activeCall) return null;

    const { activeCall, callState } = ctx;

    // 1. INCOMING CALL RINGING STATE
    if (callState === 'ringing') {
        return (
            <IncomingCallOverlay
                callerName={
                    activeCall.isGroup
                        ? `${activeCall.callerName} in ${activeCall.groupName || 'Group'}`
                        : activeCall.callerName
                }
                callerAvatar={activeCall.callerAvatar}
                callType={activeCall.callType === 'video' ? 'video' : 'voice'}
                isGroup={activeCall.isGroup}
                groupName={activeCall.groupName}
                onAccept={() => ctx.acceptCall()}
                onDecline={ctx.declineCall}
            />
        );
    }

    // 2. ACTIVE / OUTGOING CALL STATES ('calling' | 'accepted' | 'connected')
    const mappedState: 'calling' | 'ringing' | 'connected' =
        callState === 'connected' || callState === 'accepted' ? 'connected' : 'calling';

    const localDisplayName =
        user?.user_metadata?.username ||
        user?.user_metadata?.full_name ||
        user?.email?.split('@')[0] ||
        'You';
    const localAvatar = user?.user_metadata?.avatar_url || '';

    if (activeCall.isGroup) {
        return (
            <>
                <RemoteParticipantsAudioRenderer
                    remoteParticipants={ctx.remoteParticipants}
                    isSpeakerOn={ctx.isSpeakerOn}
                    trackVersion={ctx.participantTrackVersion}
                />
                <GroupCallScreen
                    groupName={activeCall.groupName || activeCall.receiverName || 'Group Call'}
                    callState={mappedState}
                    callDuration={ctx.callDuration}
                    isMuted={ctx.isMuted}
                    isCameraOff={ctx.isVideoOff}
                    isSpeakerOn={ctx.isSpeakerOn}
                    facingMode={ctx.facingMode}
                    localUser={{
                        id: user?.id || 'local',
                        name: localDisplayName,
                        avatar: localAvatar,
                    }}
                    localVideoTrack={ctx.localVideoTrack}
                    remoteParticipants={ctx.remoteParticipants}
                    activeSpeakerIds={ctx.activeSpeakerIds}
                    participantTrackVersion={ctx.participantTrackVersion}
                    audioPlaybackBlocked={ctx.audioPlaybackBlocked}
                    onToggleMic={ctx.toggleMute}
                    onToggleCamera={ctx.toggleVideo}
                    onFlipCamera={ctx.flipCamera}
                    onToggleSpeaker={ctx.toggleSpeaker}
                    onUnlockAudio={ctx.unlockAudio}
                    onEndCall={ctx.endCall}
                />
            </>
        );
    }

    // Extract remote participant video track for 1-on-1 call by iterating all remote participants & videoTrackPublications
    let remotePeer: RemoteParticipant | null = ctx.remoteParticipants[0] || null;
    let remoteVideoTrack: RemoteVideoTrack | null = null;

    for (const participant of ctx.remoteParticipants) {
        remotePeer = participant;
        const camPub = participant.getTrackPublication(Track.Source.Camera);
        if (camPub && !camPub.isMuted && camPub.track) {
            remoteVideoTrack = camPub.track as RemoteVideoTrack;
            break;
        }
        for (const pub of participant.videoTrackPublications.values()) {
            if (pub.track && !pub.isMuted) {
                remoteVideoTrack = pub.track as RemoteVideoTrack;
                break;
            }
        }
        if (remoteVideoTrack) break;
    }

    const isRemoteSpeaking = remotePeer ? ctx.activeSpeakerIds.includes(remotePeer.identity) : false;

    const peerName =
        activeCall.callerId === user?.id
            ? activeCall.receiverName || 'User'
            : activeCall.callerName || 'User';
    const peerAvatar =
        activeCall.callerId === user?.id
            ? activeCall.receiverAvatar || ''
            : activeCall.callerAvatar || '';

    return (
        <>
            <RemoteParticipantsAudioRenderer
                remoteParticipants={ctx.remoteParticipants}
                isSpeakerOn={ctx.isSpeakerOn}
                trackVersion={ctx.participantTrackVersion}
            />
            <OneOnOneCallScreen
                peerName={peerName}
                peerAvatar={peerAvatar}
                callType={activeCall.callType === 'video' ? 'video' : 'voice'}
                callState={mappedState}
                callDuration={ctx.callDuration}
                isMuted={ctx.isMuted}
                isSpeakerOn={ctx.isSpeakerOn}
                isCameraOff={ctx.isVideoOff}
                facingMode={ctx.facingMode}
                isRemoteSpeaking={isRemoteSpeaking}
                localVideoTrack={ctx.localVideoTrack}
                remoteVideoTrack={remoteVideoTrack}
                participantTrackVersion={ctx.participantTrackVersion}
                audioPlaybackBlocked={ctx.audioPlaybackBlocked}
                onToggleMic={ctx.toggleMute}
                onToggleSpeaker={ctx.toggleSpeaker}
                onToggleCamera={ctx.toggleVideo}
                onFlipCamera={ctx.flipCamera}
                onUnlockAudio={ctx.unlockAudio}
                onEndCall={ctx.endCall}
            />
        </>
    );
};
