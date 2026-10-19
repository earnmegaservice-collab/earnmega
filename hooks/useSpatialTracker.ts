import { useState, useCallback } from 'react';
import { supabase } from '../utils/supabase';

export function useSpatialTracker() {
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activateRadar = useCallback(async (userId: string) => {
    setIsLocating(true);
    setError(null);

    return new Promise<{ success: boolean; city?: string; country?: string }>((resolve) => {
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by your browser');
        setIsLocating(false);
        resolve({ success: false });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude: lat, longitude: lon } = position.coords;

          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
            if (!res.ok) throw new Error('Reverse geocoding failed');

            const data = await res.json();
            const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || 'Unknown City';
            const country = data.address?.country || 'Unknown Country';

            // Phase 3: Supabase Broadcasting
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                latitude: lat,
                longitude: lon,
                location_city: city,
                location_country: country,
                is_location_active: true
              })
              .eq('id', userId);

            if (updateError) throw updateError;

            resolve({ success: true, city, country });
          } catch (err: any) {
            setError(err.message || 'Failed to pinpoint location');
            resolve({ success: false });
          } finally {
            setIsLocating(false);
          }
        },
        (err) => {
          setError(err.message || 'Permission denied or timeout');
          setIsLocating(false);
          resolve({ success: false });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }, []);

  return { activateRadar, isLocating, error };
}
