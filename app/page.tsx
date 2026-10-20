"use client";
import OnboardingFlow from '../components/profile/OnboardingFlow';
import { useState, useEffect, useMemo, Suspense, startTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { countries } from 'countries-list';
import ChatInterface from '../components/chat/ChatInterface';
import { AppShell } from '../components/layout/AppShell';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { RadarActivationModal } from '../components/location/RadarActivationModal';
import { useWallet } from '../context/WalletContext';

type Step = 'login' | 'register' | 'verify-otp';

function HomeContent() {
  const { user, isLoading } = useAuth();
  const { balance } = useWallet();
  const [appTab, setAppTab] = useState<'explore' | 'find' | 'chats' | 'status' | 'profile'>('chats');

  // Auth Form State
  const [session, setSession] = useState<any>(null);
  const [profileState, setProfileState] = useState<any>(null);
  const [isGateLoading, setIsGateLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Generate lists for dropdowns
  const { phoneCodes, currencies } = useMemo(() => {
    const codes = new Set<string>();
    const currs = new Set<string>();
    Object.values(countries).forEach((country: any) => {
      if (country.phone && country.phone.length > 0) {
        country.phone.forEach((p: number) => codes.add(`+${p}`));
      }
      if (country.currency && country.currency.length > 0) {
        country.currency.forEach((c: string) => currs.add(c));
      }
    });
    return {
      phoneCodes: Array.from(codes).sort((a, b) => parseInt(a.replace('+', '')) - parseInt(b.replace('+', ''))),
      currencies: Array.from(currs).sort()
    };
  }, []);

  // Auth Form State
  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  // Additional Profile Data State
  const [username, setUsername] = useState('');
  const [phoneCode, setPhoneCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [currency, setCurrency] = useState('USD');

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompletingRegistration, setIsCompletingRegistration] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  // Fetch Session and Profile
  useEffect(() => {
    let isMounted = true;
    const initializeApp = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 0));
        if (!isMounted) return;

        const { data: { session: activeSession } } = await supabase.auth.getSession();

        if (!activeSession?.user || !activeSession?.user?.id) {
           if (isMounted) {
             // Wrap in startTransition to prevent React Error 310
             startTransition(() => {
               setSession(activeSession as any);
               setIsGateLoading(false);
             });
           }
           return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', activeSession.user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
           console.error("Profile fetch error:", error);
        }
        
        if (isMounted) {
          // Wrap in startTransition to prevent React Error 310
          startTransition(() => {
            setSession(activeSession as any);
            setProfileState(data);
            setIsGateLoading(false);
          });
        }
      } catch (error) {
        console.error("Initialization Error:", error);
        if (isMounted) {
          startTransition(() => {
            setIsGateLoading(false);
          });
        }
      }
    };

    initializeApp();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'error' | 'success') => {
    setToast({ message, type });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setToast(null);

    try {
      if (step === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (step === 'register') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        if (data?.user?.identities && data.user.identities.length === 0) {
          throw new Error('User already registered. Please sign in instead.');
        }

        setStep('verify-otp');
        showToast('OTP sent to your email.', 'success');
      }
    } catch (error: any) {
      let message = error.message || 'An error occurred during authentication.';
      if (message.includes('Invalid login credentials')) {
          message = 'Invalid credentials. Please check your email and password.';
      }
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setToast(null);
    setIsCompletingRegistration(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'signup' });
      if (error) throw error;

      if (data.user) {
        await supabase.from('users').upsert({ id: data.user.id, email: data.user.email, balance: 0, subscription_tier: 'FREE' }, { onConflict: 'id' });
        await supabase.from('profiles').upsert({ id: data.user.id, username, phone: `${phoneCode}${phoneNumber}`, currency }, { onConflict: 'id' });
      }
      showToast('Account verified successfully!', 'success');
      setIsCompletingRegistration(false);
    } catch (error: any) {
      showToast(error.message || 'Invalid OTP.', 'error');
      setIsCompletingRegistration(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setToast(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
      if (error) throw error;
    } catch (error: any) {
      showToast(error.message || 'Google sign in failed.', 'error');
      setIsSubmitting(false);
    }
  };

  if (!hasMounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-emerald-400/50 tracking-widest text-xs font-mono uppercase">
        SYNCHRONIZING ENVIRONMENT...
      </div>
    );
  }

  // 1. BOOT SEQUENCE
  if (isGateLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-neutral-950">
        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin shadow-[0_0_30px_rgba(99,102,241,0.5)]"></div>
        <p className="mt-6 text-indigo-400 font-mono text-xs uppercase tracking-widest animate-pulse">Initializing System...</p>
      </div>
    );
  }

  // 2. UNAUTHENTICATED
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] text-zinc-100 p-6 text-center font-sans relative">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0a0a0a] to-[#0a0a0a] mix-blend-screen"></div>
          <div className="absolute bottom-0 left-0 right-0 h-[50vh] bg-gradient-to-t from-purple-900/10 to-transparent"></div>
        </div>

        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-3xl shadow-2xl mb-6 z-10">
          EM
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-2 z-10">Earnmega</h1>
        <p className="text-sm text-zinc-400 mb-8 max-w-xs z-10">
          Global social hub. Real-time chat, secure connections, and rewarding experiences.
        </p>

        {step === 'verify-otp' ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, type: 'spring' }} className="w-full max-w-sm bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl z-10">
            <h2 className="text-xl font-bold mb-4">Verify Your Email</h2>
            <p className="text-sm text-zinc-400 mb-6">Enter the 6-digit code sent to your email.</p>
            <form onSubmit={handleVerifyOtp} className="w-full flex flex-col gap-4">
              <input type="text" placeholder="000000" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} required className="w-full px-4 py-3.5 rounded-2xl bg-black/40 border border-white/5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-center tracking-widest text-2xl font-mono" />
              <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={isSubmitting || otp.length !== 6} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-semibold py-3.5 px-6 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 mt-4">
                {isSubmitting ? 'Verifying...' : 'Verify OTP'}
              </motion.button>
            </form>
            <button onClick={() => setStep('register')} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors mt-6 w-full text-center">Cancel</button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, type: 'spring' }} className="w-full max-w-sm bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl z-10">
            <form onSubmit={handleAuth} className="w-full flex flex-col gap-4">
              <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3.5 rounded-2xl bg-black/40 border border-white/5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all" />
              {step === 'register' && (
                <>
                  <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full px-4 py-3.5 rounded-2xl bg-black/40 border border-white/5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all" />
                  <div className="flex gap-2">
                    <select value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)} className="w-1/3 px-4 py-3.5 rounded-2xl bg-black/40 border border-white/5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all appearance-none">
                      {(phoneCodes || []).map((code) => (<option key={code} value={code}>{code}</option>))}
                    </select>
                    <input type="tel" placeholder="Phone Number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required className="w-2/3 px-4 py-3.5 rounded-2xl bg-black/40 border border-white/5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all" />
                  </div>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl bg-black/40 border border-white/5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all appearance-none">
                    {(currencies || []).map((c) => (<option key={c} value={c}>{c}</option>))}
                  </select>
                </>
              )}
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3.5 rounded-2xl bg-black/40 border border-white/5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all" />

              <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-semibold py-3.5 px-6 rounded-2xl transition-all shadow-lg shadow-indigo-500/20 mt-4">
                {isSubmitting ? (step === 'login' ? 'Signing In...' : 'Sending OTP...') : step === 'login' ? 'Sign In' : 'Continue with Email'}
              </motion.button>
            </form>

            <div className="relative mt-6 pt-6 border-t border-white/5">
              <div className="absolute top-[-13px] left-1/2 -translate-x-1/2 bg-zinc-950 px-4 text-sm text-zinc-500">OR</div>
              <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={handleGoogleSignIn} disabled={isSubmitting} className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 disabled:opacity-50 text-zinc-900 font-semibold py-3.5 px-6 rounded-2xl transition-all shadow-lg mt-2 mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </motion.button>

              <button type="button" onClick={() => { setStep(step === 'login' ? 'register' : 'login'); setToast(null); }} className="w-full text-sm text-zinc-400 hover:text-white transition-colors">
                {step === 'login' ? "New to Earnmega? Create an account" : "Already have an account? Sign In"}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  // 3. UNIFIED ROUTER CASCADE
  const hasName = Boolean(profileState?.fullName || profileState?.full_name);
  const rawImages = Array.isArray(profileState?.publicImages) ? (profileState?.publicImages || []) : (Array.isArray(profileState?.profile_images) ? (profileState?.profile_images || []) : []);
  const validImages = (rawImages || []).filter((img: string) => img && img.trim() !== '');
  const hasImages = validImages.length >= 6;
  const hasCoreInfo = Boolean(profileState?.bio && profileState?.gender && profileState?.location);

  if (!hasName || !hasImages || !hasCoreInfo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] text-zinc-100 p-6 text-center font-sans relative bg-[#050505]">
        <div className="fixed inset-0 z-0 pointer-events-none cinematic-bg opacity-100"></div>
        {/* NEW LOCAL SUSPENSE BOUNDARY FOR THE NEW USER FLOW */}
        <Suspense fallback={<div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin shadow-[0_0_30px_rgba(99,102,241,0.5)]"></div>}>
          <OnboardingFlow onComplete={() => window.location.reload()} />
        </Suspense>
      </div>
    );
  }

  // DEFAULT (AppShell)
  return (
    <ErrorBoundary>
      <AppShell activeTab={appTab} setActiveTab={setAppTab} coinBalance={balance}>
        <ChatInterface activeTab={appTab} setAppTab={setAppTab} />
        <RadarActivationModal />
      </AppShell>
    </ErrorBoundary>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-neutral-950">
        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin shadow-[0_0_30px_rgba(99,102,241,0.5)]"></div>
        <p className="mt-6 text-indigo-400 font-mono text-xs uppercase tracking-widest animate-pulse">Initializing System...</p>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
