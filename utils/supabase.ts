import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
});

// Guard supabase.channel so stale/already-subscribed channels never crash with
// "cannot add 'postgres_changes' callbacks for realtime:... after 'subscribe()'"
const originalChannel = supabase.channel.bind(supabase);
supabase.channel = ((name: string, opts?: any) => {
  try {
    const existingChannels = typeof supabase.getChannels === 'function' ? supabase.getChannels() : [];
    const topic = `realtime:${name}`;
    for (const ch of existingChannels) {
      if (ch.topic === topic && ((ch as any).joinedOnce || (ch as any).state === 'joined' || (ch as any).state === 'joining')) {
        try {
          void supabase.removeChannel(ch);
          const arr = (supabase as any).realtime?.channels;
          if (Array.isArray(arr)) {
            const idx = arr.indexOf(ch);
            if (idx !== -1) arr.splice(idx, 1);
          }
        } catch {}
      }
    }
  } catch {}

  const ch = originalChannel(name, opts);
  if (ch && typeof ch.on === 'function' && !(ch as any).__safeOnWrapped) {
    const origOn = ch.on.bind(ch);
    (ch as any).on = (...args: any[]) => {
      try {
        return origOn(...(args as [any, any, any]));
      } catch (err) {
        console.warn('Realtime fallback to polling:', err);
        return ch;
      }
    };
    const origSubscribe = ch.subscribe.bind(ch);
    (ch as any).subscribe = (...args: any[]) => {
      try {
        return origSubscribe(...args);
      } catch (err) {
        console.warn('Realtime fallback to polling:', err);
        return ch;
      }
    };
    (ch as any).__safeOnWrapped = true;
  }
  return ch;
}) as typeof supabase.channel;

