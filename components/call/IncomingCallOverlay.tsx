import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Video, PhoneOff } from 'lucide-react';

interface Props {
  isGroup: boolean;
  callerName: string;
  avatarUrl?: string;
  groupName?: string;
  groupAvatar?: string;
  callType: 'audio' | 'video';
  activeMembers?: any[];
  onAccept: (type: 'audio' | 'video') => void;
  onDecline: () => void;
}

export const IncomingCallOverlay: React.FC<Props> = ({
  isGroup,
  callerName,
  avatarUrl,
  groupName,
  groupAvatar,
  callType,
  activeMembers = [],
  onAccept,
  onDecline,
}) => {
  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className="fixed top-0 left-0 right-0 z-[99999] p-4 pointer-events-none"
    >
      <div className="max-w-md mx-auto bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-2xl pointer-events-auto flex flex-col gap-4">
        {isGroup ? (
          <div className="flex items-center gap-4">
            <img src={groupAvatar || '/icon.svg'} alt={groupName} className="w-16 h-16 rounded-2xl object-cover" />
            <div className="flex-1">
              <h3 className="text-white font-semibold">{groupName}</h3>
              <p className="text-white/60 text-sm">@{callerName} started a Group {callType === 'video' ? 'Video' : 'Voice'} Call</p>
              <div className="flex items-center gap-1 mt-1">
                {activeMembers.slice(0, 3).map((m, i) => (
                  <div key={i} className="w-5 h-5 rounded-full bg-white/20 border border-black -ml-2 first:ml-0" />
                ))}
                {activeMembers.length > 3 && <span className="text-xs text-white/50 ml-1">+{activeMembers.length - 3} members</span>}
                {activeMembers.length > 0 && activeMembers.length <= 3 && <span className="text-xs text-white/50 ml-1">{activeMembers.length} members in call</span>}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
             <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
                <img src={avatarUrl || '/icon.svg'} alt={callerName} className="w-20 h-20 rounded-full object-cover border-2 border-emerald-500/50 relative z-10" />
             </div>
             <div className="text-center">
                <h3 className="text-white font-bold text-lg">@{callerName}</h3>
                <p className="text-emerald-400 text-sm">HorPal End-to-End Encrypted {callType === 'video' ? 'Video' : 'Voice'} Call</p>
             </div>
          </div>
        )}

        <div className="flex justify-center gap-4 mt-2">
          <button onClick={onDecline} className="w-14 h-14 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]">
            <PhoneOff className="w-6 h-6" />
          </button>

          <button onClick={() => onAccept('audio')} className="w-14 h-14 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            <Phone className="w-6 h-6" />
          </button>

          {callType === 'video' && (
            <button onClick={() => onAccept('video')} className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Video className="w-6 h-6" />
            </button>
          )}
        </div>

        {!isGroup && (
          <div className="flex gap-2 justify-center mt-2">
             <button onClick={onDecline} className="px-4 py-2 rounded-full bg-white/5 text-white/70 text-xs hover:bg-white/10 transition-colors">Can't talk right now</button>
             <button onClick={onDecline} className="px-4 py-2 rounded-full bg-white/5 text-white/70 text-xs hover:bg-white/10 transition-colors">I'll call you right back</button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
