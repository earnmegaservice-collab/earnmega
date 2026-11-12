import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Compass } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { AI_FRIENDS_BOT_ID, SUPPORT_BOT_ID } from '../../utils/connectionsStore';

export interface DiscoveredUser {
  id: string;
  username: string;
  name?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  age?: number;
  country?: string;
  is_verified?: boolean;
  is_vip?: boolean;
  is_premium?: boolean;
  subscription_tier?: string;
  profile_images?: string[];
  publicImages?: string[];
  matchedKeyword?: string;
  [key: string]: any;
}

interface DiscoveryRadarProps {
  onMatchFound: (user: DiscoveredUser) => void;
}

export default function DiscoveryRadar({ onMatchFound }: DiscoveryRadarProps) {
  const { user } = useAuth();
  const [dataFetched, setDataFetched] = useState(false);
  const [discoveredUser, setDiscoveredUser] = useState<DiscoveredUser | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchDiscoveryData() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', user.id)
          .limit(30);

        if (error || !data || data.length === 0) {
          console.error('No users found to match with');
          if (isMounted) setDataFetched(true);
          return;
        }

        const humanUsers = data.filter(
          (u: any) =>
            u.id !== user.id &&
            u.id !== AI_FRIENDS_BOT_ID &&
            u.id !== SUPPORT_BOT_ID &&
            u.is_bot !== true &&
            u.ghost_mode !== true
        );

        if (humanUsers.length === 0) {
          if (isMounted) setDataFetched(true);
          return;
        }

        const matched = humanUsers[Math.floor(Math.random() * humanUsers.length)];
        const userFound: DiscoveredUser = {
          ...matched,
          username: matched.username || matched.full_name || matched.name || 'User',
          matchedKeyword: 'Music',
        };

        if (isMounted) {
          setDiscoveredUser(userFound);
          setDataFetched(true);
        }
      } catch (err) {
        console.error('Error matching', err);
        if (isMounted) setDataFetched(true);
      }
    }

    fetchDiscoveryData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    if (dataFetched) {
      const timer = setTimeout(() => {
        if (!isMounted) return;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([50, 100, 50]);
        }
        if (discoveredUser) {
          onMatchFound(discoveredUser);
        }
      }, 1500);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
    return () => {
      isMounted = false;
    };
  }, [dataFetched, discoveredUser, onMatchFound]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black overflow-hidden z-0">
      {/* Pulsing Sonar Rings */}
      <motion.div
        animate={{ scale: [1, 2.5], opacity: [0.8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeOut' }}
        className="absolute w-40 h-40 rounded-full border border-fuchsia-500/50"
      />
      <motion.div
        animate={{ scale: [1, 3.5], opacity: [0.5, 0] }}
        transition={{ duration: 3, delay: 1, repeat: Infinity, ease: 'easeOut' }}
        className="absolute w-40 h-40 rounded-full border border-purple-500/30"
      />

      {/* Rotating Scanner Sweep */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="absolute w-[200vw] h-[200vw] bg-[conic-gradient(from_0deg,_transparent_70%,_rgba(192,38,211,0.4)_100%)] rounded-full mix-blend-screen"
      />

      <div className="relative z-10 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-fuchsia-600 to-purple-900 flex items-center justify-center shadow-[0_0_50px_rgba(192,38,211,0.6)] border-[3px] border-white/20 animate-pulse">
          <Compass className="text-white" size={32} />
        </div>
        <span className="mt-6 text-fuchsia-300 text-xs font-black tracking-[0.4em] uppercase animate-pulse">
          Scanning Global Network...
        </span>
      </div>
    </div>
  );
}
