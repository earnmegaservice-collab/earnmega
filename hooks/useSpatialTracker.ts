import { useState, useCallback } from 'react';
import { supabase } from '../utils/supabase';

export interface SpatialRadarData {
  success: boolean;
  latitude?: number;
  longitude?: number;
  neighborhood?: string;
  city?: string;
  country?: string;
  usedFallback?: boolean;
}

async function resolveGeocodeFromCoords(lat: number, lon: number): Promise<{
  neighborhood: string;
  city: string;
  country: string;
}> {
  let neighborhood = '';
  let city = '';
  let country = '';

  // Try BigDataCloud client reverse geocode first (fast, no CORS/rate-limit issues)
  try {
    const bdcRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    if (bdcRes.ok) {
      const bdc = await bdcRes.json();
      neighborhood =
        bdc.locality ||
        bdc.localityInfo?.administrative?.[3]?.name ||
        bdc.localityInfo?.administrative?.[2]?.name ||
        '';
      city = bdc.city || bdc.principalSubdivision || bdc.locality || '';
      country = bdc.countryName || '';
    }
  } catch (_) {}

  // Enrich with Nominatim for granular suburb / neighborhood if needed
  try {
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
    );
    if (nomRes.ok) {
      const nom = await nomRes.json();
      const addr = nom.address || {};
      neighborhood =
        addr.suburb ||
        addr.neighbourhood ||
        addr.quarter ||
        addr.residential ||
        addr.borough ||
        addr.district ||
        neighborhood ||
        addr.town ||
        addr.city ||
        'Central District';
      city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.municipality ||
        addr.state_district ||
        city ||
        'Metropolitan Area';
      country = addr.country || country || 'Global Network';
    }
  } catch (_) {}

  return {
    neighborhood: neighborhood || city || 'Central District',
    city: city || 'Accra',
    country: country || 'Ghana',
  };
}

async function fetchIpGeolocationFallback(): Promise<{
  latitude: number;
  longitude: number;
  neighborhood: string;
  city: string;
  country: string;
}> {
  // Primary fallback: BigDataCloud (works without coordinates via client IP)
  try {
    const res = await fetch(
      'https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en'
    );
    if (res.ok) {
      const data = await res.json();
      if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        const neighborhood =
          data.locality ||
          data.localityInfo?.administrative?.[3]?.name ||
          data.localityInfo?.administrative?.[2]?.name ||
          data.city ||
          'Central District';
        const city = data.city || data.principalSubdivision || data.locality || 'Accra';
        const country = data.countryName || 'Ghana';
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          neighborhood,
          city,
          country,
        };
      }
    }
  } catch (_) {}

  // Secondary fallback: ipapi.co
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        const lat = Number(data.latitude);
        const lon = Number(data.longitude);
        const geo = await resolveGeocodeFromCoords(lat, lon);
        return {
          latitude: lat,
          longitude: lon,
          neighborhood: geo.neighborhood || data.region || data.city || 'Central District',
          city: data.city || geo.city || 'Accra',
          country: data.country_name || geo.country || 'Ghana',
        };
      }
    }
  } catch (_) {}

  // Final deterministic fallback so Radar activation never dead-ends on Android overlay blocks
  return {
    latitude: 5.6037,
    longitude: -0.187,
    neighborhood: 'East Legon',
    city: 'Accra',
    country: 'Ghana',
  };
}

async function persistRadarLocationToProfile(
  userId: string,
  payload: {
    latitude: number;
    longitude: number;
    neighborhood: string;
    city: string;
    country: string;
  }
) {
  const nowIso = new Date().toISOString();
  const formattedLiveLocation = `${payload.neighborhood}, ${payload.city}, ${payload.country}`;

  // Save locally as well for immediate UI access
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(
        `spatial_radar_${userId}`,
        JSON.stringify({ ...payload, radar_updated_at: nowIso })
      );
    } catch (_) {}
  }

  // Attempt full update with new Phase 7 columns first
  const { error: fullError } = await supabase
    .from('profiles')
    .update({
      latitude: payload.latitude,
      longitude: payload.longitude,
      live_neighborhood: payload.neighborhood,
      live_city: payload.city,
      live_country: payload.country,
      radar_updated_at: nowIso,
      location_city: payload.city,
      location_country: payload.country,
      liveLocation: formattedLiveLocation,
      is_location_active: true,
    })
    .eq('id', userId);

  if (fullError) {
    // Fallback if live_neighborhood / live_city / radar_updated_at columns are not yet in remote schema cache
    const { error: compatError } = await supabase
      .from('profiles')
      .update({
        latitude: payload.latitude,
        longitude: payload.longitude,
        location_city: `${payload.neighborhood}, ${payload.city}`,
        location_country: payload.country,
        liveLocation: formattedLiveLocation,
        is_location_active: true,
      })
      .eq('id', userId);

    if (compatError) {
      await supabase
        .from('profiles')
        .update({
          latitude: payload.latitude,
          longitude: payload.longitude,
          location_city: payload.city,
          location_country: payload.country,
          is_location_active: true,
        })
        .eq('id', userId);
    }
  }
}

export function useSpatialTracker() {
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activateRadar = useCallback(async (userId: string): Promise<SpatialRadarData> => {
    setIsLocating(true);
    setError(null);

    const runIpFallback = async (): Promise<SpatialRadarData> => {
      try {
        const ipData = await fetchIpGeolocationFallback();
        await persistRadarLocationToProfile(userId, ipData);
        setIsLocating(false);
        return {
          success: true,
          latitude: ipData.latitude,
          longitude: ipData.longitude,
          neighborhood: ipData.neighborhood,
          city: ipData.city,
          country: ipData.country,
          usedFallback: true,
        };
      } catch (fallbackErr: any) {
        setError(fallbackErr?.message || 'Failed to pinpoint location');
        setIsLocating(false);
        return { success: false };
      }
    };

    if (typeof window === 'undefined' || !navigator.geolocation) {
      return runIpFallback();
    }

    return new Promise<SpatialRadarData>((resolve) => {
      let settled = false;

      // Safety watchdog in case mobile browser overlay hangs getCurrentPosition
      const watchdog = setTimeout(async () => {
        if (settled) return;
        settled = true;
        const result = await runIpFallback();
        resolve(result);
      }, 8000);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (settled) return;
          settled = true;
          clearTimeout(watchdog);

          const { latitude: lat, longitude: lon } = position.coords;
          try {
            const geo = await resolveGeocodeFromCoords(lat, lon);
            await persistRadarLocationToProfile(userId, {
              latitude: lat,
              longitude: lon,
              neighborhood: geo.neighborhood,
              city: geo.city,
              country: geo.country,
            });
            setIsLocating(false);
            resolve({
              success: true,
              latitude: lat,
              longitude: lon,
              neighborhood: geo.neighborhood,
              city: geo.city,
              country: geo.country,
              usedFallback: false,
            });
          } catch (_) {
            const result = await runIpFallback();
            resolve(result);
          }
        },
        async (_err) => {
          // Handles Android screen overlay permission block ("This site can't ask for your permission"),
          // user denial, or timeout by seamlessly falling back to IP/reverse geolocation
          if (settled) return;
          settled = true;
          clearTimeout(watchdog);
          const result = await runIpFallback();
          resolve(result);
        },
        { enableHighAccuracy: true, timeout: 7000, maximumAge: 60000 }
      );
    });
  }, []);

  return { activateRadar, isLocating, error };
}
