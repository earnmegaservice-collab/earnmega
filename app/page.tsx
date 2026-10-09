'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { countries } from 'countries-list';

type Step = 'login' | 'register';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // Auth Form State
  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

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
        router.push('/chat');
      } else if (step === 'register') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        if (data.session?.user) {
          // Insert into users table
          const { error: usersError } = await supabase
            .from('users')
            .insert({
              id: data.session.user.id,
              email: data.session.user.email,
              balance: 0,
              subscription_tier: 'FREE'
            });

          if (usersError) {
            console.error("Error creating user record", usersError);
          }

          // Insert into profiles table
          const { error: profilesError } = await supabase
            .from('profiles')
            .insert({
              id: data.session.user.id,
              username,
              phone_number: `${phoneCode}${phoneNumber}`,
              currency
            });

          if (profilesError) {
             console.error("Error creating profile record", profilesError);
          }
        }
        showToast('Account created successfully!', 'success');
        router.push('/chat');
      }
    } catch (error: any) {
      showToast(error.message || 'An error occurred during authentication.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

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

      {isLoading ? (
        <div className="animate-pulse w-full max-w-sm h-12 bg-zinc-800/50 rounded-2xl"></div>
      ) : user ? (
        <div className="w-full max-w-sm flex flex-col gap-4 bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
          <p className="text-sm text-zinc-300">Signed in as <span className="font-semibold text-white">{user.email}</span></p>
          <Link
            href="/chat"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 px-6 rounded-2xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            Launch App →
          </Link>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors mt-2"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div className="w-full max-w-sm bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
           <form onSubmit={handleAuth} className="w-full flex flex-col gap-4">
               <>
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
                  {isSubmitting ? (step === 'login' ? 'Signing In...' : 'Creating Account...') : step === 'login' ? 'Sign In' : 'Create Account'}
                </button>
               </>
           </form>

             <div className="mt-6 pt-6 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setStep(step === 'login' ? 'register' : 'login');
                    setToast(null);
                  }}
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  {step === 'login' ? "New to Earnmega? Create an account" : "Already have an account? Sign In"}
                </button>
             </div>
        </div>
      )}
    </div>
  );
}
