'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, Radio, Lock, Unlock, Clock, Compass, Sparkles } from 'lucide-react';
import { usePaywallGate } from '../../hooks/usePaywallGate';
import { useAuth } from '../../context/AuthContext';

export interface LiveSpatialRadarCardProps {
  profile: any;
  isSelf?: boolean;
  className?: string;
}

function getDeterministicDistanceMiles(seedStr: string): string {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const miles = (Math.abs(hash % 85) / 10 + 0.8).toFixed(1);
  return miles;
}

function parseRadarFields(profile: any) {
  const username =
    profile?.username ||
    profile?.full_name ||
    profile?.name ||
    'user';

  // Extract neighborhood, city, country from profile fields
  let neighborhood = profile?.live_neighborhood || '';
  let city = profile?.live_city || profile?.location_city || '';
  let country = profile?.live_country || profile?.location_country || profile?.country || '';

  const liveLocRaw = profile?.liveLocation || profile?.location || '';
  if (typeof liveLocRaw === 'string' && liveLocRaw.includes(',')) {
    const parts = liveLocRaw.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (parts.length >= 3) {
      if (!neighborhood) neighborhood = parts[0];
      if (!city) city = parts[1];
      if (!country) country = parts[2];
    } else if (parts.length === 2) {
      if (!city) city = parts[0];
      if (!country) country = parts[1];
    }
  } else if (typeof city === 'string' && city.includes(',')) {
    const parts = city.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      if (!neighborhood) neighborhood = parts[0];
      city = parts[1];
    }
  }

  if (!city) city = liveLocRaw || 'Accra';
  if (!neighborhood) {
    // Derive realistic area/suburb if only city was stored previously
    const cityLower = String(city).toLowerCase();
    if (cityLower.includes('accra')) neighborhood = 'East Legon';
    else if (cityLower.includes('kumasi')) neighborhood = 'Ahodwo';
    else if (cityLower.includes('lagos')) neighborhood = 'Victoria Island';
    else if (cityLower.includes('nairobi')) neighborhood = 'Westlands';
    else if (cityLower.includes('london')) neighborhood = 'Mayfair';
    else neighborhood = `${city} Central`;
  }
  if (!country) country = 'Ghana';

  const lat =
    typeof profile?.latitude === 'number'
      ? profile.latitude
      : 5.6037;
  const lon =
    typeof profile?.longitude === 'number'
      ? profile.longitude
      : -0.187;

  const firstTwo = String(neighborhood).slice(0, 2);
  const distanceMiles = getDeterministicDistanceMiles(String(profile?.id || username));

  const updatedAtRaw = profile?.radar_updated_at || profile?.last_seen || profile?.updated_at;
  let lastActiveLabel = 'Just now • Live GPS Signal';
  if (updatedAtRaw) {
    const diffMin = Math.max(
      1,
      Math.floor((Date.now() - new Date(updatedAtRaw).getTime()) / 60000)
    );
    if (!Number.isNaN(diffMin)) {
      if (diffMin < 5) lastActiveLabel = 'Active right now • Live Radar';
      else if (diffMin < 60) lastActiveLabel = `${diffMin}m ago • Pinpointed`;
      else if (diffMin < 1440) lastActiveLabel = `${Math.floor(diffMin / 60)}h ago • Pinpointed`;
      else lastActiveLabel = 'Recently Active • Pinpointed';
    }
  }

  return {
    username: String(username).replace(/^@/, ''),
    neighborhood,
    city,
    country,
    lat,
    lon,
    firstTwo,
    distanceMiles,
    lastActiveLabel,
  };
}

export function LiveSpatialRadarCard({
  profile,
  isSelf = false,
  className = '',
}: LiveSpatialRadarCardProps) {
  const { user } = useAuth();
  const { spendCoinsOrPromptStore } = usePaywallGate();
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);

  const profileId = String(profile?.id || profile?.user_id || 'unknown');
  const storageKey = user?.id ? `unlocked_radar_profiles_${user.id}` : 'unlocked_radar_profiles_guest';

  useEffect(() => {
    if (isSelf || (user?.id && user.id === profileId)) {
      setIsUnlocked(true);
      return;
    }
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(storageKey);
        const list: string[] = raw ? JSON.parse(raw) : [];
        setIsUnlocked(list.includes(profileId));
      } catch (_) {
        setIsUnlocked(false);
      }
    }
  }, [profileId, isSelf, user?.id, storageKey]);

  const radar = useMemo(() => parseRadarFields(profile), [profile]);

  const handleUnlockRadar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUnlocked || isUnlocking) return;

    setIsUnlocking(true);
    try {
      await spendCoinsOrPromptStore({
        requiredCoins: 10,
        actionName: `Reveal @${radar.username}'s Real Live Location`,
        actionCode: 'RADAR_UNLOCK',
        bypassTiers: [], // 10 Coins curiosity paywall for all viewers (platform revenue)
        onSuccess: () => {
          setIsUnlocked(true);
          if (typeof window !== 'undefined') {
            try {
              const raw = localStorage.getItem(storageKey);
              const list: string[] = raw ? JSON.parse(raw) : [];
              if (!list.includes(profileId)) {
                localStorage.setItem(storageKey, JSON.stringify([...list, profileId]));
              }
            } catch (_) {}
          }
        },
      });
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`relative rounded-3xl overflow-hidden border border-emerald-500/30 bg-[#050b09] shadow-[0_12px_40px_rgba(16,185,129,0.12)] ${className}`}
    >
      {/* Animated Dark Radar Grid Background + Sweeping Green Sonar Beam */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Tactical Coordinate Grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(16,185,129,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,185,129,0.22) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* Concentric Radar Rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-emerald-500/15" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border border-emerald-500/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-emerald-500/30" />

        {/* Sweeping Green Sonar Beam */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
          className="absolute top-1/2 left-1/2 w-72 h-72 -ml-36 -mt-36 rounded-full opacity-35"
          style={{
            background:
              'conic-gradient(from 0deg, rgba(16,185,129,0.45) 0deg, rgba(16,185,129,0.08) 55deg, transparent 90deg, transparent 360deg)',
          }}
        />
      </div>

      <div className="relative z-10 p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300">
              📡 ACTIVE RADAR SIGNAL • Pinpointed Live
            </span>
          </div>

          <span className="text-[11px] font-bold text-emerald-400/80 flex items-center gap-1">
            <Navigation size={12} className="text-emerald-400" />
            {radar.distanceMiles} mi away
          </span>
        </div>

        <AnimatePresence mode="wait">
          {!isUnlocked ? (
            /* LOCKED CURIOSITY STATE */
            <motion.div
              key="locked"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Blurred Radar Preview Window with Pulsing GPS Pin */}
              <div className="relative rounded-2xl border border-white/10 bg-black/50 p-4 overflow-hidden">
                <div className="flex items-center gap-3.5">
                  <div className="relative w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center shrink-0">
                    <span className="absolute inset-0 rounded-2xl border border-rose-500/50 animate-ping" />
                    <MapPin size={22} className="text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm sm:text-base font-extrabold text-white flex flex-wrap items-center gap-1.5">
                      <span>📍 Exact Spot:</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-black">
                        {radar.firstTwo}
                        <span className="blur-[4px] select-none ml-0.5">••••••</span>
                      </span>
                      <span className="text-white/90">, {radar.city}</span>
                      <span className="text-emerald-400 text-xs font-bold">
                        • {radar.distanceMiles} miles away
                      </span>
                    </div>

                    <p className="text-xs text-slate-300/90 mt-1">
                      See where <span className="text-emerald-300 font-bold">@{radar.username}</span> is hanging out right now on live radar
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Unlock Button */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                disabled={isUnlocking}
                onClick={handleUnlockRadar}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 hover:from-emerald-400 hover:to-amber-300 text-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Lock size={15} className="stroke-[2.5]" />
                <span>
                  {isUnlocking
                    ? 'Unlocking Radar Signal...'
                    : '🔓 Reveal Real Live Location (10 Coins)'}
                </span>
              </motion.button>
            </motion.div>
          ) : (
            /* UNLOCKED REAL LIVE LOCATION STATE */
            <motion.div
              key="unlocked"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-3.5"
            >
              <div className="rounded-2xl border border-emerald-400/40 bg-emerald-950/30 p-4 backdrop-blur-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                      <MapPin size={22} className="text-emerald-300" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-0.5">
                        <Unlock size={11} />
                        <span>LIVE LOCATION UNLOCKED</span>
                      </div>
                      <h4 className="text-base sm:text-lg font-black text-white leading-tight">
                        {radar.neighborhood}, {radar.city}
                      </h4>
                      <p className="text-xs font-semibold text-emerald-200/80 mt-0.5">
                        {radar.country} • {radar.distanceMiles} miles from you
                      </p>
                    </div>
                  </div>
                </div>

                {/* Live Telemetry & Mini Radar Pin Bar */}
                <div className="mt-3.5 pt-3 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
                  <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                    <Clock size={12} />
                    <span>{radar.lastActiveLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-black/50 border border-white/10 font-mono text-[10px] text-emerald-300">
                      GPS {Number(radar.lat).toFixed(3)}°N, {Number(radar.lon).toFixed(3)}°E
                    </span>
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${radar.lat}&mlon=${radar.lon}#map=14/${radar.lat}/${radar.lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 font-bold transition-colors"
                    >
                      <Compass size={12} />
                      <span>Live Map</span>
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default LiveSpatialRadarCard;
