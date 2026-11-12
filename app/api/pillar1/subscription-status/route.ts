import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'placeholder_service_key';
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function POST(request: Request) {
  try {
    const { userId: bodyUserId } = await request.json().catch(() => ({}));

    // 1. Resolve user ID
    let userId: string | null = null;
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user?.id) userId = user.id;
    }
    if (!userId && bodyUserId) userId = bodyUserId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, email, subscription_tier, subscription_started_at, subscription_expires_at, is_pro, is_premium')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const currentTier = String(profile.subscription_tier || 'free').toLowerCase();
    const expiresAt = profile.subscription_expires_at ? new Date(profile.subscription_expires_at).getTime() : null;
    const now = Date.now();

    // Check if expired
    if ((currentTier === 'pro' || currentTier === 'premium') && expiresAt && now >= expiresAt) {
      // 1. Move back to free
      await supabase
        .from('profiles')
        .update({
          subscription_tier: 'free',
          is_pro: false,
          is_premium: false,
        })
        .eq('id', userId);

      // 2. Insert alert into admin_subscription_alerts
      await supabase
        .from('admin_subscription_alerts')
        .insert({
          user_id: userId,
          username: profile.username || 'user',
          email: profile.email || null,
          previous_tier: currentTier,
          expired_at: new Date(expiresAt).toISOString(),
          admin_acknowledged: false,
          action_taken: 'auto_downgraded_to_free',
        });

      return NextResponse.json({
        downgraded: true,
        tier: 'free',
        message: `Your ${currentTier.toUpperCase()} subscription has expired and was downgraded to Free.`,
      });
    }

    return NextResponse.json({
      downgraded: false,
      tier: currentTier,
      expiresAt: profile.subscription_expires_at,
      remainingMs: expiresAt ? Math.max(0, expiresAt - now) : null,
    });
  } catch (err: any) {
    console.error('subscription-status error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
