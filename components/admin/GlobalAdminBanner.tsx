'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

export function GlobalAdminBanner() {
  const { user } = useAuth();
  const [warning, setWarning] = useState<{ message: string, level: string, timestamp: number } | null>(null);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('horpal_godmode_command')
      .on('broadcast', { event: 'GOD_VOICE_WARNING' }, (payload) => {
        const { target, level, message, timestamp } = payload.payload;

        const username = user.user_metadata?.username;
        const matchesTarget =
             target === 'ALL'
          || target === 'PILLAR_1'
          || target === 'PILLAR_2'
          || target === user.id
          || target.toLowerCase() === user.email?.toLowerCase()
          || target.toLowerCase() === username?.toLowerCase()
          || target.toLowerCase() === `@${username?.toLowerCase()}`;

        if (matchesTarget) {
          setWarning({ message, level, timestamp: timestamp || Date.now() });

          // Play a chime if audio context allows it
          try {
             const audio = new AudioContext();
             const osc = audio.createOscillator();
             const gain = audio.createGain();
             osc.connect(gain);
             gain.connect(audio.destination);
             osc.type = 'sine';
             osc.frequency.setValueAtTime(523.25, audio.currentTime); // C5
             osc.frequency.exponentialRampToValueAtTime(880, audio.currentTime + 0.1);
             gain.gain.setValueAtTime(0.5, audio.currentTime);
             gain.gain.exponentialRampToValueAtTime(0.01, audio.currentTime + 0.5);
             osc.start(audio.currentTime);
             osc.stop(audio.currentTime + 0.5);
          } catch (e) {}
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!warning) return null;

  let borderColor = 'border-red-600';
  let glowColor = 'shadow-[0_0_50px_rgba(220,38,38,0.3)]';
  let bgColor = 'bg-red-600';
  let title = 'OFFICIAL WARNING STRIKE';

  if (warning.level === 'FINANCIAL') {
     borderColor = 'border-[#F59E0B]';
     glowColor = 'shadow-[0_0_50px_rgba(245,158,11,0.3)]';
     bgColor = 'bg-[#F59E0B]';
     title = 'FINANCIAL NOTIFICATION';
  } else if (warning.level === 'EXECUTIVE') {
     borderColor = 'border-purple-600';
     glowColor = 'shadow-[0_0_50px_rgba(147,51,234,0.3)]';
     bgColor = 'bg-purple-600';
     title = 'HORPAL EXECUTIVE COMMAND';
  } else if (warning.level === 'LICENSE') {
     borderColor = 'border-emerald-500';
     glowColor = 'shadow-[0_0_50px_rgba(16,185,129,0.3)]';
     bgColor = 'bg-emerald-500';
     title = 'LICENSE ACTION REQUIRED';
  }

  return (
    <div className="fixed top-3 inset-x-3 max-w-xl mx-auto z-[99999] pointer-events-auto transition-transform translate-y-0 duration-500 ease-out">
      <div className={`bg-[#0B1120]/95 backdrop-blur-xl border-2 ${borderColor} rounded-2xl w-full ${glowColor} overflow-hidden`}>
        <div className={`${bgColor} p-3 flex items-center justify-center gap-2 text-white`}>
          {warning.level === 'WARNING' ? <AlertTriangle className="w-5 h-5 animate-pulse" /> : <ShieldAlert className="w-5 h-5" />}
          <h2 className="font-black text-sm uppercase tracking-widest">{title}</h2>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-white text-base font-medium">{warning.message}</p>
          <div className="flex justify-between items-center text-[10px] text-gray-500">
             <span>{new Date(warning.timestamp).toLocaleString()}</span>
             <button
                onClick={() => setWarning(null)}
                className={`bg-white/10 hover:bg-white/20 text-white font-bold uppercase px-4 py-2 rounded-lg transition-all active:scale-95 border border-white/20`}
              >
                Acknowledge & Dismiss
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
