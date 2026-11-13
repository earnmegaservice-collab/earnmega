import { NextResponse } from 'next/server';
import { getAdminClient, paywallErrorResponse, requireAuthedUser } from '@/lib/server/paywall';

export async function POST(request: Request) {
  try {
    const admin = getAdminClient();
    const user = await requireAuthedUser(request, admin);
    const userId = user.id;

    const { data: profile, error } = await admin
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
      await admin
        .from('profiles')
        .update({
          subscription_tier: 'free',
          is_pro: false,
          is_premium: false,
        })
        .eq('id', userId);

      await admin
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
    if (err?.name === 'PaywallError') return paywallErrorResponse(err);
    console.error('subscription-status error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
