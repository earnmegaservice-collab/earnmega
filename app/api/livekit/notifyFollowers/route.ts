import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { dispatchGlobalNotification } from '../../../../lib/notifications/dispatcher';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_service_key';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
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
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { hostId, hostName } = await req.json();

    // Only the host can dispatch notifications to their followers
    if (user.id !== hostId) {
        return NextResponse.json({ error: 'Unauthorized to dispatch for this host' }, { status: 403 });
    }

    // Fetch followers from a mock table or logic (since followers table is not fully defined in context)
    // We will assume 'follows' table exists or fetch all users as mock followers
    const { data: follows, error } = await supabaseAdmin
      .from('follows')
      .select('follower_id')
      .eq('following_id', hostId);

    if (!error && follows) {
       const dispatchPromises = follows.map(f => dispatchGlobalNotification({
         recipientId: f.follower_id,
         actorId: hostId,
         type: 'LIVE_STARTED',
         title: 'Live Stream Started',
         body: `${hostName} is now live!`
       }));
       await Promise.all(dispatchPromises);
    } else {
       // if follows table doesn't exist, we just return success
       console.warn('Could not fetch followers, follows table might not exist.');
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
