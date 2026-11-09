'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

export function GlobalAdminEnforcer() {
  const { user } = useAuth();
  const [warning, setWarning] = useState<{ message: string, level: string, reason: string } | null>(null);
  const [suspended, setSuspended] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check localStorage fallback for suspension
    if (localStorage.getItem(`horpal_suspended_${user.id}`) === 'true') {
      setSuspended(true);
    }

    // Also check real-time state for active ban check (on mount via AuthContext usually, but here as a safety measure)
    if (user.user_metadata?.is_banned === true || user.user_metadata?.status === 'suspended') {
       setSuspended(true);
    }

    const channel = supabase.channel('horpal_godmode_command')
      .on('broadcast', { event: 'GOD_VOICE_WARNING' }, (payload) => {
        const { target, level, message } = payload.payload;
        if (target === 'ALL' || target === user.id || target === user.email || target === `@${user.user_metadata?.username}`) {
          setWarning({ message, level, reason: level });
        }
      })
      .on('broadcast', { event: 'ACCOUNT_SUSPENDED' }, (payload) => {
        const { target } = payload.payload;
        if (target === user.id || target === user.email) {
          localStorage.setItem(`horpal_suspended_${user.id}`, 'true');
          setSuspended(true);
        }
      })
      .on('broadcast', { event: 'ACCOUNT_RESTORED' }, (payload) => {
        const { target } = payload.payload;
        if (target === user.id || target === user.email) {
          localStorage.removeItem(`horpal_suspended_${user.id}`);
          setSuspended(false);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (suspended) {
    return (
      <div className="fixed inset-0 z-[999999] bg-[#050811] flex flex-col items-center justify-center p-6">
        <ShieldAlert className="w-24 h-24 text-red-600 mb-6" />
        <h1 className="text-3xl font-black text-white mb-4 uppercase tracking-widest text-center">YOUR ACCOUNT HAS BEEN BANNED</h1>
        <p className="text-gray-400 text-center max-w-md mb-8">
          Your access to this application has been restricted by the administration. You cannot access your account at this time.
        </p>
        <div className="bg-[#1e293b]/50 border border-red-500/30 p-4 rounded-xl w-full max-w-md text-center space-y-2">
          <a href={`mailto:horpalservice@gmail.com?subject=Account Ban Appeal&body=Hello Admin,%0D%0A%0D%0AMy account has been banned, and I would like to appeal this decision.%0D%0A%0D%0APlease review my account and let me know if my access can be restored.%0D%0A%0D%0AUser ID: ${user.id}%0D%0AEmail: ${user.email}%0D%0A%0D%0AThank you.`} className="block bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg w-full transition-all">Submit Appeal</a>
        </div>
      </div>
    );
  }

  if (warning) {
    return (
      <div className="fixed inset-0 z-[999999] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
        <div className="bg-[#0B1120] border-2 border-red-600 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(220,38,38,0.3)] overflow-hidden">
          <div className="bg-red-600 p-4 flex items-center justify-center gap-3">
            <AlertTriangle className="w-8 h-8 text-white animate-pulse" />
            <h2 className="text-white font-black text-xl uppercase tracking-widest">Official Warning</h2>
          </div>
          <div className="p-8 space-y-6">
            <div className="bg-[#1e293b]/50 border border-[#334155] p-4 rounded-xl">
              <p className="text-xs text-red-400 font-bold uppercase mb-2">Severity: {warning.level}</p>
              <p className="text-white text-lg font-medium">{warning.message}</p>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Failure to comply with HorPal Community Guidelines may result in immediate account suspension or financial freeze.
            </p>

            <button
              onClick={() => setWarning(null)}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all active:scale-95"
            >
              I Understand & Will Comply
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
