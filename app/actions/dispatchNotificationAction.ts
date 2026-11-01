'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { dispatchGlobalNotification, NotificationPayload } from '../../lib/notifications/dispatcher';

export async function dispatchNotificationAction(payload: NotificationPayload) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return (cookieStore as any).get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          (cookieStore as any).set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          (cookieStore as any).set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  // Authorize dispatching
  // A user can dispatch a notification to themselves OR dispatch a notification where they are the actor.
  if (payload.recipientId !== user.id && payload.actorId !== user.id) {
    throw new Error('Unauthorized dispatch request.');
  }

  await dispatchGlobalNotification(payload);
}
