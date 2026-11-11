import React from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Minimize2, Users, Hand } from 'lucide-react';

interface Props {
  groupName: string;
  groupAvatar?: string;
  duration: number;
  isMuted: boolean;
  activeMembers: any[];
  activeSpeakerId: string | null;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onMinimize: () => void;
  onLeave: () => void;
}

export const GroupCallScreen: React.FC<Props> = ({
  groupName,
  groupAvatar,
  duration,
  isMuted,
  activeMembers,
  activeSpeakerId,
  onToggleMute,
  onToggleVideo,
  onMinimize,
  onLeave,
}) => {
  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getGridClass = () => {
     const count = activeMembers.length + 1;
     if (count <= 2) return 'grid-cols-1 sm:grid-cols-2';
     if (count <= 4) return 'grid-cols-2';
     if (count <= 6) return 'grid-cols-2 sm:grid-cols-3';
     return 'grid-cols-3';
  };

  return (
    <div className="fixed inset-0 z-[99990] bg-[#0E0F14] flex flex-col">

      <div className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={onMinimize} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">
            <Minimize2 className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <img src={groupAvatar || '/icon.svg'} className="w-10 h-10 rounded-xl object-cover" />
            <div>
              <h2 className="text-white font-semibold text-sm">{groupName}</h2>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-400 font-medium tracking-widest">{formatDuration(duration)}</span>
                <span className="text-white/40">•</span>
                <span className="text-white/60 flex items-center gap-1"><Users className="w-3 h-3" /> {activeMembers.length + 1}</span>
              </div>
            </div>
          </div>
        </div>
        <button className="px-4 py-2 bg-white/10 rounded-full text-white text-sm font-medium hover:bg-white/20">
          + Invite
        </button>
      </div>

      <div className="flex-1 p-2 overflow-y-auto">
        <div className={`grid ${getGridClass()} gap-2 h-full`}>
          <div className="relative rounded-2xl bg-neutral-800 overflow-hidden border border-white/5">
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-neutral-800 to-neutral-900">
               <div className="w-16 h-16 rounded-full bg-neutral-700 mb-2" />
               <span className="text-white/80 text-sm">You</span>
            </div>
            {isMuted && <div className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"><MicOff className="w-3 h-3 text-white" /></div>}
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-md rounded-md text-xs text-white">@you (Host)</div>
          </div>

          {activeMembers.map(m => {
            const isSpeaking = activeSpeakerId === m.id;
            return (
              <div key={m.id} className={`relative rounded-2xl bg-neutral-800 overflow-hidden transition-all ${isSpeaking ? 'ring-2 ring-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'border border-white/5'}`}>
                {m.hasVideo && m.videoTrack ? (
                  <video
                    className="absolute inset-0 w-full h-full object-cover"
                    autoPlay
                    playsInline
                    ref={(el) => {
                      if (el && m.videoTrack) {
                        const currentStream = el.srcObject as MediaStream;
                        if (!currentStream || currentStream.getVideoTracks()[0]?.id !== m.videoTrack.id) {
                          el.srcObject = new MediaStream([m.videoTrack]);
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-neutral-800 to-neutral-900">
                     <div className="w-16 h-16 rounded-full bg-neutral-700 mb-2" />
                  </div>
                )}
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-md rounded-md text-xs text-white">@{m.username}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-4 pb-8 bg-black/40 backdrop-blur-md border-t border-white/5 flex justify-center gap-3">
        <button onClick={onToggleMute} className={`w-12 h-12 rounded-full flex items-center justify-center ${isMuted ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <button onClick={onToggleVideo} className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center">
          <VideoOff className="w-5 h-5" />
        </button>
        <button className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center">
          <Hand className="w-5 h-5" />
        </button>
        <button onClick={onLeave} className="w-16 h-12 rounded-[24px] bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-lg">
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>

    </div>
  );
};
