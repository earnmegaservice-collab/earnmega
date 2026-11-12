"use client";

import React from 'react';
import { Phone, PhoneOff, Video, ShieldCheck, Users } from 'lucide-react';

interface IncomingCallOverlayProps {
    callerName: string;
    callerAvatar?: string;
    avatarUrl?: string;
    callType: 'voice' | 'audio' | 'video';
    isGroup?: boolean;
    groupName?: string;
    groupAvatar?: string;
    activeMembers?: any[];
    onAccept: (type?: 'audio' | 'video') => void;
    onDecline: () => void;
}

export const IncomingCallOverlay: React.FC<IncomingCallOverlayProps> = ({
    callerName,
    callerAvatar,
    avatarUrl,
    callType,
    isGroup = false,
    groupName,
    groupAvatar,
    onAccept,
    onDecline,
}) => {
    const resolvedAvatar = callerAvatar || avatarUrl || groupAvatar || '';
    const isVideo = callType === 'video';

    return (
        <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-2xl flex flex-col items-center justify-between py-14 px-6 animate-in fade-in duration-300 select-none">
            {/* Top Encryption Badge */}
            <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full border border-white/10">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-medium text-white/80 tracking-wide">
                        HorPal End-to-End Encrypted {isGroup ? 'Group ' : ''}
                        {isVideo ? 'Video' : 'Voice'} Call
                    </span>
                </div>
            </div>

            {/* Center Caller Identity & Pulsing Rings */}
            <div className="flex flex-col items-center gap-5 text-center">
                <div className="relative flex items-center justify-center">
                    <div className="absolute w-40 h-40 rounded-full bg-emerald-500/20 animate-ping" />
                    <div className="absolute w-48 h-48 rounded-full border border-emerald-500/30 animate-pulse" />
                    <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.45)] bg-gray-900">
                        {resolvedAvatar ? (
                            <img
                                src={resolvedAvatar}
                                alt={callerName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-700 text-white text-4xl font-bold">
                                {(groupName || callerName)?.charAt(0)?.toUpperCase() || 'H'}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-1.5 mt-2">
                    {isGroup && groupName && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-1">
                            <Users className="w-3.5 h-3.5" />
                            {groupName}
                        </div>
                    )}
                    <h2 className="text-3xl font-bold text-white tracking-tight">{callerName}</h2>
                    <p className="text-sm font-medium text-emerald-400 tracking-widest uppercase animate-pulse">
                        Incoming {isGroup ? 'Group ' : ''}
                        {isVideo ? 'Video' : 'Voice'} Call...
                    </p>
                </div>
            </div>

            {/* Bottom Accept / Decline Controls */}
            <div className="flex items-center justify-center gap-16 w-full max-w-xs">
                {/* Decline Button */}
                <div className="flex flex-col items-center gap-3">
                    <button
                        onClick={onDecline}
                        className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.5)] text-white"
                    >
                        <PhoneOff className="w-8 h-8" />
                    </button>
                    <span className="text-xs font-semibold text-white/70 tracking-wider uppercase">
                        Decline
                    </span>
                </div>

                {/* Accept Button */}
                <div className="flex flex-col items-center gap-3">
                    <button
                        onClick={() => onAccept(isVideo ? 'video' : 'audio')}
                        className="w-20 h-20 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.55)] text-white animate-bounce"
                    >
                        {isVideo ? <Video className="w-8 h-8" /> : <Phone className="w-8 h-8" />}
                    </button>
                    <span className="text-xs font-semibold text-white/70 tracking-wider uppercase">
                        {isGroup ? 'Join' : 'Accept'}
                    </span>
                </div>
            </div>
        </div>
    );
};
