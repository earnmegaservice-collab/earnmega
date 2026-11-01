import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const subscription = await req.json();

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
        // Fallback for mock auth for dev
        return NextResponse.json({ success: true, message: 'Skipped DB insert (unauthenticated)' });
    }

    if (subscription && subscription.endpoint && subscription.keys) {
       const { error } = await supabase.from('push_subscriptions').upsert({
           user_id: user.id,
           endpoint: subscription.endpoint,
           p256dh: subscription.keys.p256dh,
           auth: subscription.keys.auth,
       }, { onConflict: 'user_id,endpoint' });

       if (error) {
           console.error('Error saving subscription:', error);
           return NextResponse.json({ error: 'Database error' }, { status: 500 });
       }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error in subscribe route:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
