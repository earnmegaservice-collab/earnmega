'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, startTransition } from 'react';
import { supabase } from '../utils/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Prevent React Error #310 by avoiding synchronous token parsing on mount
    const initAuth = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 0));
        if (!mounted) return;

        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
          const mockUser = { id: 'mock-1', email: 'test@example.com' };
          setSession({ user: mockUser } as any);
          setUser(mockUser as any);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Auth context init error:", error);
        if (mounted) setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      startTransition(() => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
