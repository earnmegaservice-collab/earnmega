'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        if (data.user) {
          // Initialize user record in public.users table
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email,
              balance: 0,
              subscription_tier: 'FREE'
            });

          if (insertError) {
             console.error("Error creating user profile", insertError);
          }
        }
      }
    } catch (error: any) {
      setAuthError(error.message || 'An error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-zinc-950 text-zinc-100 p-6 text-center font-sans">
      {/* Brand Logo */}
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-3xl shadow-2xl mb-6">
        EM
      </div>
      
      {/* Title & Tagline */}
      <h1 className="text-2xl font-bold tracking-tight mb-2">Earnmega</h1>
      <p className="text-sm text-zinc-400 mb-8 max-w-xs">
        Global social hub. Real-time chat, secure connections, and rewarding experiences.
      </p>

      {isLoading ? (
        <div className="animate-pulse w-full max-w-xs h-12 bg-zinc-800 rounded-xl"></div>
      ) : user ? (
        <div className="w-full max-w-xs flex flex-col gap-4">
          <p className="text-sm text-zinc-300">Signed in as {user.email}</p>
          <Link
            href="/chat"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            Launch App →
          </Link>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <form onSubmit={handleAuth} className="w-full max-w-xs flex flex-col gap-3">
          {authError && <p className="text-red-500 text-sm">{authError}</p>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:opacity-50 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? 'Please wait...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setAuthError('');
            }}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors mt-2"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </form>
      )}
    </div>
  );
}
