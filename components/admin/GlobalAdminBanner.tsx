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

    const fetchPersistedWarning = async () => {
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .eq('type', 'GOD_VOICE_WARNING')
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (data) {
            setWarning({ message: data.content || data.message || '', level: data.title || 'WARNING', timestamp: new Date(data.created_at).getTime() });
        }
    };
    fetchPersistedWarning();

    const handleGodVoicePayload = (payloadData: any) => {
      if (!payloadData) return;
      const { target, level, message, timestamp } = payloadData;

      const username = user.user_metadata?.username;
      const targetStr = String(target || '');
      const matchesTarget =
        targetStr === 'ALL' ||
        targetStr === 'PILLAR_1' ||
        targetStr === 'PILLAR_2' ||
        targetStr === user.id ||
        targetStr.toLowerCase() === user.email?.toLowerCase() ||
        targetStr.toLowerCase() === username?.toLowerCase() ||
        targetStr.toLowerCase() === `@${username?.toLowerCase()}`;

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
    };

    const onWindowWarning = (e: any) => {
      if (e?.detail) handleGodVoicePayload(e.detail);
    };
    window.addEventListener('earnmega:god-voice-warning', onWindowWarning);

    let channel: any = null;
    try {
      const channelName = 'horpal_godmode_banner_' + Math.random().toString(36).substring(2, 9);
      channel = supabase
        .channel(channelName)
        .on('broadcast', { event: 'GOD_VOICE_WARNING' }, (payload) => {
          handleGodVoicePayload(payload?.payload);
        })
        .subscribe();
    } catch (err) {
      console.warn('Realtime fallback to polling:', err);
    }

    return () => {
      window.removeEventListener('earnmega:god-voice-warning', onWindowWarning);
      if (channel) supabase.removeChannel(channel);
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
                onClick={async () => {
                   setWarning(null);
                   await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('type', 'GOD_VOICE_WARNING');
                }}
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
