import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, CircleDot, Mic, MicOff, Bluetooth, Volume2, VolumeX, Grid, MoreHorizontal, Users, RefreshCw } from 'lucide-react';

interface CallOverlayProps {
  callState: 'idle' | 'calling' | 'ringing' | 'connected' | 'reconnecting' | 'ended';
  isIncoming: boolean;
  callerName: string;
  avatarUrl?: string;
  callType: 'audio' | 'video';
  duration: number; // in seconds
  isMuted: boolean;
  isSpeaker: boolean;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteAudioRef: React.RefObject<HTMLAudioElement>;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onTogglePiP: () => void;
  onFlipCamera: () => void;
  isPiP: boolean;
}

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const CallOverlay: React.FC<CallOverlayProps> = ({
  callState,
  isIncoming,
  callerName,
  avatarUrl,
  callType,
  duration,
  isMuted,
  isSpeaker,
  remoteVideoRef,
  localVideoRef,
  remoteAudioRef,
  onAccept,
  onDecline,
  onEnd,
  onToggleMute,
  onToggleSpeaker,
  onTogglePiP,
  onFlipCamera,
  isPiP,
}) => {
  if (callState === 'idle' || callState === 'ended') return null;

  if (isPiP) {
    return (
      <motion.div
        drag
        dragConstraints={{ top: 0, left: 0, right: window.innerWidth - 200, bottom: window.innerHeight - 200 }}
        className="fixed top-20 right-6 w-32 rounded-2xl bg-neutral-900/90 backdrop-blur-xl border border-white/20 shadow-2xl z-[9999] overflow-hidden flex flex-col items-center p-2 cursor-move"
      >
        {callType === 'video' ? (
           <div className="relative w-full h-32 bg-black rounded-lg overflow-hidden">
             <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
           </div>
        ) : (
           <div className="w-full h-24 flex flex-col items-center justify-center">
             <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-600 flex items-center justify-center animate-pulse mb-2">
                <Mic size={20} className="text-white" />
             </div>
             <span className="text-xs font-mono text-emerald-400">{formatDuration(duration)}</span>
           </div>
        )}
        <button onClick={onTogglePiP} className="mt-2 w-full py-1 bg-white/10 rounded-lg text-xs text-white">Expand</button>
      </motion.div>
    );
  }

  const isRinging = callState === 'ringing' || callState === 'calling';
  const isConnected = callState === 'connected';

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[9999] flex flex-col justify-between bg-neutral-950/90 backdrop-blur-3xl bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/60 via-neutral-950 to-black select-none text-white"
    >
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Video Backgrounds */}
      {callType === 'video' && (
        <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover z-0 opacity-50" />
      )}
      {callType === 'video' && (
        <div className="absolute bottom-40 right-6 w-28 h-40 rounded-2xl z-10 border border-white/20 shadow-2xl bg-black overflow-hidden group">
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          <button onClick={onFlipCamera} className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
             <RefreshCw size={24} className="text-white" />
          </button>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="w-full flex justify-center pt-12 z-10">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-medium">
          <div className={`w-2 h-2 rounded-full ${callState === 'reconnecting' ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
          {callState === 'reconnecting' ? 'Reconnecting...' : 'End-to-End Encrypted'}
        </div>
      </div>

      {/* Caller Identity */}
      <div className="flex flex-col items-center mt-8 z-10 flex-grow">
        <div className="w-36 h-36 rounded-full p-[3px] bg-gradient-to-tr from-amber-400 via-amber-200 to-yellow-600 shadow-[0_0_30px_rgba(245,158,11,0.3)] animate-pulse relative">
          <div className="w-full h-full bg-neutral-900 rounded-full flex items-center justify-center border-4 border-neutral-950 overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              <Users size={48} className="text-white/50" />
            )}
          </div>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight mt-6 text-white text-center px-4">{callerName}</h2>

        {isConnected ? (
          <p className="text-2xl font-mono text-emerald-400 tracking-widest mt-2">
            {formatDuration(duration)}
          </p>
        ) : (
          <p className="text-sm font-medium text-neutral-400 tracking-wide mt-2 animate-pulse">
            {isIncoming ? `Incoming ${callType} call...` : (callState === 'calling' ? 'Calling...' : 'Ringing...')}
          </p>
        )}
      </div>

      {/* Control Grid */}
      <div className="z-10 w-full mb-8">
        <div className="grid grid-cols-3 gap-y-8 gap-x-6 w-full max-w-sm mx-auto px-6 mb-8">
          <ControlButton icon={<CircleDot />} label="Record" active={false} onClick={() => {}} />
          <ControlButton
            icon={isMuted ? <MicOff /> : <Mic />}
            label={isMuted ? "Unmute" : "Mute"}
            active={isMuted}
            onClick={onToggleMute}
          />
          <ControlButton icon={<Bluetooth />} label="Audio" active={false} onClick={() => {}} />
          <ControlButton
            icon={isSpeaker ? <VolumeX /> : <Volume2 />}
            label="Speaker"
            active={isSpeaker}
            onClick={onToggleSpeaker}
          />
          <ControlButton icon={<Grid />} label="Keypad" active={false} onClick={() => {}} />
          <ControlButton icon={<MoreHorizontal />} label="Minimize" active={false} onClick={onTogglePiP} />
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-center space-x-8 mb-12">
          {isIncoming && isRinging ? (
            <>
              <button onClick={onDecline} className="w-18 h-18 w-[72px] h-[72px] rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center text-white shadow-[0_0_25px_rgba(225,29,72,0.5)] active:scale-90 transition-transform">
                <Phone size={32} className="rotate-[135deg]" />
              </button>
              <button onClick={onAccept} className="w-18 h-18 w-[72px] h-[72px] rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center text-white shadow-[0_0_25px_rgba(16,185,129,0.5)] active:scale-90 animate-bounce transition-transform">
                <Phone size={32} />
              </button>
            </>
          ) : (
            <button onClick={onEnd} className="w-18 h-18 w-[72px] h-[72px] rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center text-white shadow-[0_0_30px_rgba(225,29,72,0.6)] active:scale-90 mx-auto transition-transform">
              <Phone size={32} className="rotate-[135deg]" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const ControlButton = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => {
  const baseClasses = "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95";
  const inactiveClasses = "bg-white/10 backdrop-blur-xl border border-white/15 text-white hover:bg-white/15 shadow-lg";
  const activeClasses = "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)]";

  return (
    <div className="flex flex-col items-center gap-2">
      <button onClick={onClick} className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}>
        {icon}
      </button>
      <span className="text-xs font-medium text-neutral-300">{label}</span>
    </div>
  );
};
