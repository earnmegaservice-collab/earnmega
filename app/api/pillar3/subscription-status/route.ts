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

    let userId: string | null = null;
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      if (user?.id) userId = user.id;
    }
    if (!userId && bodyUserId) userId = bodyUserId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select(
        'id, username, email, has_paid_pillar3, pillar3_tier, pillar3_started_at, pillar3_expires_at'
      )
      .eq('id', userId)
      .maybeSingle();

    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const currentTier = String(profile.pillar3_tier || 'none').toLowerCase();
    const expiresAtMs = profile.pillar3_expires_at
      ? new Date(profile.pillar3_expires_at).getTime()
      : null;
    const now = Date.now();

    const isExpired =
      (profile.has_paid_pillar3 === true && (!expiresAtMs || now >= expiresAtMs)) ||
      (currentTier !== 'none' && expiresAtMs !== null && now >= expiresAtMs);

    if (isExpired) {
      const prevTier =
        currentTier === 'weekly' || currentTier === 'pro' || currentTier === 'premium'
          ? currentTier
          : 'pro';

      await supabase
        .from('profiles')
        .update({
          has_paid_pillar3: false,
          pillar3_tier: 'none',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      // Avoid duplicate unacknowledged alerts within the last 5 minutes for the same user
      const fiveMinAgo = new Date(now - 5 * 60 * 1000).toISOString();
      const { data: existingAlert } = await supabase
        .from('admin_subscription_alerts')
        .select('id')
        .eq('user_id', userId)
        .eq('action_taken', 'pillar3_auto_expired')
        .gte('expired_at', fiveMinAgo)
        .maybeSingle();

      if (!existingAlert) {
        await supabase.from('admin_subscription_alerts').insert({
          user_id: userId,
          username: profile.username || (profile.email ? profile.email.split('@')[0] : 'user'),
          email: profile.email || null,
          previous_tier: `pillar3_${prevTier}`,
          expired_at: expiresAtMs ? new Date(expiresAtMs).toISOString() : new Date().toISOString(),
          admin_acknowledged: false,
          action_taken: 'pillar3_auto_expired',
        });
      }

      const tierDisplay =
        prevTier === 'weekly' ? 'Weekly' : prevTier === 'premium' ? 'Premium' : 'Pro';

      return NextResponse.json({
        expired: true,
        has_paid_pillar3: false,
        previousTier: prevTier,
        tier: 'none',
        message: `⏰ Your Pillar 3 ${tierDisplay} Pass has expired! Select a plan to continue using Earnmega AI Studio.`,
      });
    }

    return NextResponse.json({
      expired: false,
      has_paid_pillar3: Boolean(profile.has_paid_pillar3 && expiresAtMs && expiresAtMs > now),
      tier: currentTier,
      startedAt: profile.pillar3_started_at,
      expiresAt: profile.pillar3_expires_at,
      remainingMs: expiresAtMs ? Math.max(0, expiresAtMs - now) : 0,
    });
  } catch (err: any) {
    console.error('pillar3 subscription-status error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
