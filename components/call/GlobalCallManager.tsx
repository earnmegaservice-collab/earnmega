import React from 'react';
import { useCall } from '../../context/CallContext';
import { IncomingCallOverlay } from './IncomingCallOverlay';
import { OneOnOneCallScreen } from './OneOnOneCallScreen';
import { GroupCallScreen } from './GroupCallScreen';

export const GlobalCallManager: React.FC = () => {
  const callCtx = useCall();
  const ctx: any = callCtx;

  if (ctx.callState === 'idle') return null;

  if (ctx.isIncoming && ctx.callState === 'ringing') {
    return (
      <IncomingCallOverlay
        isGroup={ctx.isGroupCall}
        callerName={ctx.callerInfo.name}
        avatarUrl={ctx.callerInfo.avatar}
        groupName={ctx.callerInfo.name}
        callType={ctx.callType}
        activeMembers={ctx.activeMembers}
        onAccept={(type) => {
          ctx.setCallType(type);
          ctx.acceptCall(type);
        }}
        onDecline={ctx.declineCall}
      />
    );
  }

  if (ctx.callState === 'connected' || ctx.callState === 'calling') {
     if (ctx.isInPiPMode) {
       const partner = ctx.activeMembers[0];
       return (
         <div className="fixed top-20 right-4 z-[9990] w-28 h-40 bg-black rounded-xl border-2 border-white/20 shadow-2xl flex flex-col overflow-hidden cursor-pointer" onClick={() => ctx.setIsInPiPMode(false)}>
            {ctx.callType === 'video' && partner?.videoTrack ? (
              <video
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                playsInline
                ref={(el) => {
                   if (el && partner?.videoTrack) {
                      const currentStream = el.srcObject as MediaStream;
                      if (!currentStream || currentStream.getVideoTracks()[0]?.id !== partner.videoTrack.id) {
                         el.srcObject = new MediaStream([partner.videoTrack]);
                      }
                   }
                }}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-neutral-800 to-neutral-900">
                <img src={ctx.callerInfo.avatar || '/icon.svg'} className="w-12 h-12 rounded-full object-cover" />
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

            <div className="absolute top-2 left-0 right-0 flex justify-center z-10 pointer-events-none">
              <span className="text-emerald-400 font-bold text-xs bg-black/50 px-2 rounded-full backdrop-blur-md">
                {Math.floor(ctx.duration / 60)}:{ctx.duration % 60 < 10 ? '0' : ''}{ctx.duration % 60}
              </span>
            </div>

            <div className="absolute bottom-2 left-0 right-0 flex justify-around items-center z-10">
              <button
                onClick={(e) => { e.stopPropagation(); ctx.toggleMute(); }}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${ctx.isMuted ? 'bg-white text-black' : 'bg-black/50 text-white backdrop-blur-md'}`}
              >
                <span className="text-[10px] font-bold">{ctx.isMuted ? 'Muted' : 'Mic'}</span>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); ctx.endCallSession(true, 'ended'); }}
                className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white"
              >
                <span className="text-[10px] font-bold">End</span>
              </button>
            </div>
         </div>
       );
     }

     if (ctx.isGroupCall) {
       return (
         <GroupCallScreen
            groupName={ctx.callerInfo.name}
            duration={ctx.duration}
            isMuted={ctx.isMuted}
            activeMembers={ctx.activeMembers}
            activeSpeakerId={ctx.activeSpeakerId}
            onToggleMute={ctx.toggleMute}
            onToggleVideo={ctx.toggleVideo}
            onMinimize={() => ctx.setIsInPiPMode(true)}
            onLeave={() => ctx.endCallSession(true, 'ended')}
         />
       );
     } else {
       return (
         <OneOnOneCallScreen
            callState={ctx.callState}
            callerName={ctx.callerInfo.name}
            avatarUrl={ctx.callerInfo.avatar}
            callType={ctx.callType}
            duration={ctx.duration}
            isMuted={ctx.isMuted}
            isSpeaker={ctx.isSpeaker}
            localVideoRef={ctx.localVideoRef}
            activeMembers={ctx.activeMembers}
            onToggleMute={ctx.toggleMute}
            onToggleSpeaker={ctx.toggleSpeaker}
            onToggleVideo={ctx.toggleVideo}
            onFlipCamera={ctx.toggleVideo}
            onMinimize={() => ctx.setIsInPiPMode(true)}
            onEnd={() => ctx.endCallSession(true, 'ended')}
         />
       );
     }
  }

  return null;
};
