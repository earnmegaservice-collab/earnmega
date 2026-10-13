import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';

export interface DiscoveredUser {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  age?: number;
  matchedKeyword?: string;
}

interface DiscoveryRadarProps {
  onMatchFound: (user: DiscoveredUser) => void;
}

export default function DiscoveryRadar({ onMatchFound }: DiscoveryRadarProps) {
  const { user } = useAuth();
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

  useEffect(() => {
    async function fetchMe() {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single();
      setCurrentUserProfile(data);
    }
    fetchMe();
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    async function performScan() {
      if (!user) return;
      try {
        // Fetch random user, excluding self and ghost mode
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, bio, age')
          .neq('id', user.id)
          .neq('ghost_mode', true)
          .limit(10);

        if (error || !data || data.length === 0) {
           console.error("No users found to match with");
           return;
        }

        // Pick random user
        const matched = data[Math.floor(Math.random() * data.length)];
        const discoveredUser: DiscoveredUser = {
          ...matched,
          matchedKeyword: 'Music' // Mocking shared interest logic for now
        };

        // Artificial delay for suspense
        setTimeout(() => {
          if (!isMounted) return;
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([50, 100, 50]);
          }
          onMatchFound(discoveredUser);
        }, 2500);

      } catch (err) {
        console.error("Error matching", err);
      }
    }

    performScan();

    return () => { isMounted = false; };
  }, [user, onMatchFound]);

  return (
    <div className="absolute inset-0 bg-[#000000] z-50 flex flex-col items-center justify-center overflow-hidden">

      {/* Central Radar Pulse */}
      <div className="relative w-32 h-32 flex items-center justify-center">

        {/* Pulsing Circles */}
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 border-2 border-indigo-500 rounded-full"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.6,
              ease: "easeOut"
            }}
          />
        ))}

        {/* User Avatar */}
        <div className="relative z-10 w-24 h-24 rounded-full overflow-hidden border-4 border-indigo-500 bg-zinc-900 flex items-center justify-center">
          {currentUserProfile?.avatar_url ? (
            <img src={currentUserProfile.avatar_url} alt="You" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-white">EM</span>
          )}
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
        className="mt-16 text-indigo-400 font-mono text-sm tracking-widest text-center"
      >
        SCANNING FOR FRIENDS<br />WITH SHARED INTERESTS...
      </motion.p>
    </div>
  );
}
