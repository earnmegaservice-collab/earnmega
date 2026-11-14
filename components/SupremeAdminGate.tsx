'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { ShieldAlert, AlertTriangle, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { User } from '@supabase/supabase-js';

const MASTER_ADMINS = [
  'horpalservice@gmail.com',
  'geestablish@gmail.com',
  'earnmegaservice@gmail.com',
  'geemingss@gmail.com',
  'moses@horpal.com',
  'admin@horpal.com',
];

export default function SupremeAdminGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmailInput] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setUser(session?.user || null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Session check error', err);
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setUser(session?.user || null);
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
           setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname }
    });
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      toast.error(error.message);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center text-white">
        <ShieldAlert className="w-16 h-16 text-[#F59E0B] animate-pulse mb-4" />
        <h2 className="text-xl font-bold tracking-widest uppercase">Verifying Supreme Clearance...</h2>
      </div>
    );
  }

  if (user) {
    const userEmail = user.email?.toLowerCase().trim() || '';
    if (MASTER_ADMINS.includes(userEmail)) {
      return <>{children}</>;
    } else {
      return (
        <div className="h-screen w-full bg-black flex flex-col items-center justify-center text-white p-6">
          <div className="bg-red-900/20 border border-red-500/50 p-8 rounded-2xl max-w-md w-full text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-red-500 uppercase tracking-widest mb-2">Access Denied</h2>
            <p className="text-gray-400 mb-6 uppercase text-sm font-mono">Unauthorized Identity Detected</p>
            <div className="text-xs text-red-400 mb-8 font-mono">{userEmail} is not cleared for this terminal.</div>

            <div className="space-y-3">
              <button onClick={handleSignOut} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded uppercase tracking-wider">
                Sign Out & Switch Account
              </button>
              <button onClick={() => window.location.href = '/'} className="w-full bg-transparent border border-gray-600 hover:bg-gray-800 text-gray-300 font-bold py-3 rounded uppercase tracking-wider">
                Return to Surface
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="h-screen w-full bg-[#050811] flex flex-col items-center justify-center p-6 font-sans">
      <div className="bg-[#0B1120] border border-[#1e293b] p-8 rounded-2xl max-w-md w-full shadow-2xl shadow-black/50">
        <div className="flex justify-center mb-6">
          <ShieldAlert className="w-12 h-12 text-[#10B981]" />
        </div>
        <h2 className="text-center text-xl font-black text-white uppercase tracking-widest mb-1">Restricted Terminal</h2>
        <p className="text-center text-xs text-gray-500 uppercase tracking-wider mb-8">Master Authorization Required</p>

        <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
          <div>
             <input type="email" value={email} onChange={e => setEmailInput(e.target.value)} placeholder="Email" className="w-full bg-black/50 border border-[#334155] rounded p-3 text-white text-sm focus:border-[#10B981] focus:outline-none" required />
          </div>
          <div>
             <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full bg-black/50 border border-[#334155] rounded p-3 text-white text-sm focus:border-[#10B981] focus:outline-none" required />
          </div>
          <button type="submit" className="w-full bg-[#10B981] hover:bg-[#059669] text-black font-black uppercase tracking-widest py-3 rounded transition-colors flex items-center justify-center gap-2">
             <LogIn className="w-4 h-4" /> Initialize
          </button>
        </form>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-px bg-[#334155] flex-1"></div>
          <span className="text-xs text-gray-500 font-bold uppercase">OR</span>
          <div className="h-px bg-[#334155] flex-1"></div>
        </div>

        <button onClick={handleGoogleLogin} className="w-full bg-white text-black font-bold py-3 rounded flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}
