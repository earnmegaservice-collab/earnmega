'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { countries } from 'countries-list';
import ChatInterface from '../components/chat/ChatInterface';

type Step = 'login' | 'register' | 'verify-otp' | 'complete-profile';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // Auth Form State
  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);

  // Additional Profile Data State
  const [username, setUsername] = useState('');
  const [phoneCode, setPhoneCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [currency, setCurrency] = useState('USD');

  // Generate lists for dropdowns
  const { phoneCodes, currencies } = useMemo(() => {
    const codes = new Set<string>();
    const currs = new Set<string>();
    Object.values(countries).forEach((country) => {
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

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompletingRegistration, setIsCompletingRegistration] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Google OAuth Profile Intercept
  useEffect(() => {
    const checkProfile = async () => {
      if (user && !isCompletingRegistration) {
        setIsCheckingProfile(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (error || !data?.username) {
          setStep('complete-profile');
        } else {
          // No need to redirect, just render ChatInterface
        }
        setIsCheckingProfile(false);
      }
    };

    checkProfile();
  }, [user, router, isCompletingRegistration]);

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
        // Navigation handled by useEffect when user state updates
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

    // Prevent useEffect from intercepting and sending us to 'complete-profile' prematurely
    setIsCompletingRegistration(true);

    try {
      // type should be 'signup' when using signUp() method
      const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'signup' });
      if (error) throw error;

      if (data.user) {
        // We wait for these to ensure data is there before navigation
        await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email,
            balance: 0,
            subscription_tier: 'FREE'
          });

        await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username,
            phone_number: `${phoneCode}${phoneNumber}`,
            currency
          });
      }
      showToast('Account verified successfully!', 'success');

      // Clear flag and navigate manually
      setIsCompletingRegistration(false);
    } catch (error: any) {
      showToast(error.message || 'Invalid OTP.', 'error');
      setIsCompletingRegistration(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    setToast(null);

    try {
      await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          balance: 0,
          subscription_tier: 'FREE'
        }, { onConflict: 'id' });

      const { error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username,
          phone_number: `${phoneCode}${phoneNumber}`,
          currency
        });

      if (error) throw error;
      showToast('Profile completed successfully!', 'success');
    } catch (error: any) {
      showToast(error.message || 'An error occurred saving your profile.', 'error');
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

  if (user && !isLoading && !isCheckingProfile && step !== 'complete-profile' && step !== 'verify-otp') {
    return <ChatInterface />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-zinc-950 text-zinc-100 p-6 text-center font-sans relative">

      {/* Toast Notification */}
      {toast && (
        <div className={`absolute top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-sm font-medium shadow-2xl z-50 transition-all transform ${toast.type === 'error' ? 'bg-red-500/20 text-red-200 border border-red-500/50' : 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/50'}`}>
          {toast.message}
        </div>
      )}

      {/* Brand Logo */}
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-3xl shadow-2xl mb-6">
        EM
      </div>
      
      {/* Title & Tagline */}
      <h1 className="text-3xl font-bold tracking-tight mb-2">Earnmega</h1>
      <p className="text-sm text-zinc-400 mb-8 max-w-xs">
        Global social hub. Real-time chat, secure connections, and rewarding experiences.
      </p>

      {isLoading || isCheckingProfile ? (
        <div className="animate-pulse w-full max-w-sm h-12 bg-zinc-800/50 rounded-2xl"></div>
      ) : step === 'complete-profile' ? (
        <div className="w-full max-w-sm bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
          <h2 className="text-xl font-bold mb-4">Complete Your Profile</h2>
          <form onSubmit={handleCompleteProfile} className="w-full flex flex-col gap-4">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-3.5 rounded-2xl bg-black/40 border border-white/5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
            />
            <div className="flex gap-2">
              <select
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value)}
                className="w-1/3 px-4 py-3.5 rounded-2xl bg-black/40 border border-white/5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all appearance-none"
              >
                {phoneCodes.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
              <input
                type="tel"
                placeholder="Phone Number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                className="w-2/3 px-4 py-3.5 rounded-2xl bg-black/40 border border-white/5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
              />
            </div>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl bg-black/40 border border-white/5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all appearance-none"
            >
              {currencies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-semibold py-3.5 px-6 rounded-2xl transition-all shadow-lg shadow-indigo-500/20 mt-4"
            >
              {isSubmitting ? 'Saving...' : 'Complete Profile'}
            </button>
          </form>
        </div>
      ) : step === 'verify-otp' ? (
        <div className="w-full max-w-sm bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
          <h2 className="text-xl font-bold mb-4">Verify Your Email</h2>
          <p className="text-sm text-zinc-400 mb-6">Enter the 6-digit code sent to your email.</p>
          <form onSubmit={handleVerifyOtp} className="w-full flex flex-col gap-4">
            <input
              type="text"
              placeholder="000000"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              className="w-full px-4 py-3.5 rounded-2xl bg-black/40 border border-white/5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-center tracking-widest text-2xl font-mono"
            />
            <button
              type="submit"
              disabled={isSubmitting || otp.length !== 6}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-semibold py-3.5 px-6 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 mt-4"
            >
              {isSubmitting ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
          <button
            onClick={() => setStep('register')}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors mt-6 w-full text-center"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="w-full max-w-sm bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
          <form onSubmit={handleAuth} className="w-full flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3.5 rounded-2xl bg-black/40 border border-white/5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
            />
            {step === 'register' && (
              <>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 rounded-2xl bg-black/40 border border-white/5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                />
                <div className="flex gap-2">
                  <select
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    className="w-1/3 px-4 py-3.5 rounded-2xl bg-black/40 border border-white/5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all appearance-none"
                  >
                    {phoneCodes.map((code) => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    className="w-2/3 px-4 py-3.5 rounded-2xl bg-black/40 border border-white/5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                  />
                </div>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl bg-black/40 border border-white/5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all appearance-none"
                >
                  {currencies.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </>
            )}
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3.5 rounded-2xl bg-black/40 border border-white/5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-semibold py-3.5 px-6 rounded-2xl transition-all shadow-lg shadow-indigo-500/20 mt-4"
            >
              {isSubmitting ? (step === 'login' ? 'Signing In...' : 'Sending OTP...') : step === 'login' ? 'Sign In' : 'Continue with Email'}
            </button>
          </form>

          <div className="relative mt-6 pt-6 border-t border-white/5">
            <div className="absolute top-[-13px] left-1/2 -translate-x-1/2 bg-zinc-950 px-4 text-sm text-zinc-500">
              OR
            </div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 disabled:opacity-50 text-zinc-900 font-semibold py-3.5 px-6 rounded-2xl transition-all shadow-lg mt-2 mb-4"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <button
              type="button"
              onClick={() => {
                setStep(step === 'login' ? 'register' : 'login');
                setToast(null);
              }}
              className="w-full text-sm text-zinc-400 hover:text-white transition-colors"
            >
              {step === 'login' ? "New to Earnmega? Create an account" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
