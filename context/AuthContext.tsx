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

        setSession(session);
        setUser(session?.user ?? null);
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
      // Wrap state updates in setTimeout to escape synchronous execution paths that trigger Suspense errors
      setTimeout(() => {
        if (!mounted) return;
        startTransition(() => {
          setSession(session);
          setUser(session?.user ?? null);
          setIsLoading(false);
        });
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let profileChannel: any;
    if (user) {
        profileChannel = supabase.channel(`auth_updates_${user.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, (payload) => {
                const newProfile = payload.new as any;
                if (newProfile.is_banned || newProfile.status === 'suspended') {
                    supabase.auth.signOut();
                }
            })
            .subscribe();
    }
    return () => {
      if (profileChannel) supabase.removeChannel(profileChannel);
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ session, user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
