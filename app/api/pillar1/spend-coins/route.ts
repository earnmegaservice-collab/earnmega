import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'placeholder_service_key';

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export type NormalizedTier = 'free' | 'pro' | 'premium';

function resolveNormalizedTier(profile: any): NormalizedTier {
  if (!profile) return 'free';
  const rawTier = String(profile.subscription_tier || '').trim().toLowerCase();
  if (profile.is_premium === true || rawTier === 'premium' || rawTier === 'vip') {
    return 'premium';
  }
  if (profile.is_pro === true || rawTier === 'pro') {
    return 'pro';
  }
  return 'free';
}

function resolveCoinBalance(profile: any): number {
  if (!profile) return 0;
  if (typeof profile.coins === 'number' && profile.coins > 0) return profile.coins;
  if (typeof profile.coin_balance === 'number' && profile.coin_balance > 0) return profile.coin_balance;
  if (typeof profile.coins === 'number') return profile.coins;
  if (typeof profile.coin_balance === 'number') return profile.coin_balance;
  return 0;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      action,
      actionName,
      requiredCoins,
      bypassTiers = [],
      receiverId,
      userId: bodyUserId,
      metadata = {},
    } = body;

    const coinsToSpend = Math.max(0, Number(requiredCoins || 0));

    // 1. Authenticate user via Authorization Bearer token (or bodyUserId fallback)
    let userId: string | null = null;
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: authData } = await adminSupabase.auth.getUser(token);
      if (authData?.user?.id) {
        userId = authData.user.id;
      }
    }
    if (!userId && bodyUserId) {
      userId = bodyUserId;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    // 2. Fetch sender profile from Supabase
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found', code: 'PROFILE_NOT_FOUND' },
        { status: 404 }
      );
    }

    const activeTier = resolveNormalizedTier(profile);
    const currentCoins = resolveCoinBalance(profile);

    // 3. Enforce strict tier bypass rules
    // Note: GO_LIVE only ever bypasses for 'premium' (never 'pro')
    const normalizedBypassTiers: NormalizedTier[] = Array.isArray(bypassTiers)
      ? bypassTiers
          .map((t: string) => String(t).toLowerCase() as NormalizedTier)
          .filter((t): t is NormalizedTier => {
            if (action === 'GO_LIVE' && t === 'pro') return false;
            return t === 'pro' || t === 'premium';
          })
      : [];

    if (!receiverId && normalizedBypassTiers.includes(activeTier)) {
      return NextResponse.json({
        success: true,
        bypassed: true,
        tier: activeTier,
        deducted: 0,
        balance: currentCoins,
        action,
      });
    }

    // 4. Verify coin balance
    if (currentCoins < coinsToSpend) {
      return NextResponse.json(
        {
          success: false,
          code: 'INSUFFICIENT_COINS',
          error: `You need ${coinsToSpend} Coins to ${actionName || 'unlock this feature'}. Top up now!`,
          requiredCoins: coinsToSpend,
          balance: currentCoins,
          tier: activeTier,
        },
        { status: 402 }
      );
    }

    // 5. Atomically deduct requiredCoins from spender's balance
    const newSenderBalance = Math.max(0, currentCoins - coinsToSpend);

    const { error: updateDualError } = await adminSupabase
      .from('profiles')
      .update({
        coins: newSenderBalance,
        coin_balance: newSenderBalance,
      })
      .eq('id', userId);

    if (updateDualError) {
      // Fallback if only `coins` column exists
      const { error: updateCoinsOnlyError } = await adminSupabase
        .from('profiles')
        .update({ coins: newSenderBalance })
        .eq('id', userId);

      if (updateCoinsOnlyError) {
        console.error('Failed to deduct coins:', updateCoinsOnlyError);
        return NextResponse.json(
          { error: 'Failed to deduct coins', code: 'DEDUCTION_FAILED' },
          { status: 500 }
        );
      }
    }

    // 6. Exception — 1-on-1 DM Chat Gifts: Credit 100% of coins to receiver's balance
    let receiverNewBalance: number | null = null;
    if (receiverId && coinsToSpend > 0) {
      const { data: receiverProfile } = await adminSupabase
        .from('profiles')
        .select('*')
        .eq('id', receiverId)
        .maybeSingle();

      if (receiverProfile) {
        const currentReceiverCoins = resolveCoinBalance(receiverProfile);
        receiverNewBalance = currentReceiverCoins + coinsToSpend;

        const { error: creditDualError } = await adminSupabase
          .from('profiles')
          .update({
            coins: receiverNewBalance,
            coin_balance: receiverNewBalance,
          })
          .eq('id', receiverId);

        if (creditDualError) {
          await adminSupabase
            .from('profiles')
            .update({ coins: receiverNewBalance })
            .eq('id', receiverId);
        }
      }
    }

    // 7. Best-effort audit log in wallet_transactions (non-blocking)
    try {
      await adminSupabase.from('wallet_transactions').insert({
        user_id: userId,
        reference: `p1_${action || 'spend'}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: receiverId ? 'gift_transfer' : 'coin_spend',
        amount: coinsToSpend,
        status: 'completed',
        created_at: new Date().toISOString(),
      });
    } catch (_) {
      // Ignore if table schema differs
    }

    return NextResponse.json({
      success: true,
      bypassed: false,
      deducted: coinsToSpend,
      balance: newSenderBalance,
      receiverBalance: receiverNewBalance,
      tier: activeTier,
      action,
      metadata,
    });
  } catch (error: any) {
    console.error('Error in /api/pillar1/spend-coins:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
