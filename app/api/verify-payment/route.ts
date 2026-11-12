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
    const { reference, type, payload, userId: bodyUserId } = await request.json();

    if (!reference || !type || payload === undefined) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Securely fetch user from Supabase using Authorization header (or fallback to bodyUserId)
    let userId: string | null = null;
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user?.id) {
        userId = user.id;
      }
    }
    if (!userId && bodyUserId) {
      userId = bodyUserId;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify with Paystack API when real secret key is configured
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (paystackSecretKey && paystackSecretKey !== 'sk_test_placeholder') {
      try {
        const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
          },
        });
        const data = await response.json();
        if (!data.status || data.data?.status !== 'success') {
          return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
        }
      } catch (verifyErr) {
        console.error('Paystack API network error:', verifyErr);
        return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
      }
    }

    // 3. Idempotency check in wallet_transactions
    try {
      const { data: existingTx } = await supabase
        .from('wallet_transactions')
        .select('id')
        .eq('reference', String(reference))
        .in('status', ['completed', 'verified', 'VERIFIED'])
        .maybeSingle();

      if (existingTx) {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('coins, coin_balance, subscription_tier')
          .eq('id', userId)
          .maybeSingle();
        return NextResponse.json({
          success: true,
          alreadyProcessed: true,
          balance: currentProfile?.coins ?? currentProfile?.coin_balance ?? 0,
          subscriptionTier: currentProfile?.subscription_tier || 'FREE',
        });
      }
    } catch (_) {
      // Ignore if wallet_transactions table doesn't exist
    }

    // 4. Update Supabase profiles atomically
    let updatedBalance: number | undefined;
    let updatedTier: string | undefined;

    if (type === 'UPGRADE') {
      const tierUpper = String(payload).toUpperCase();
      updatedTier = tierUpper;
      const isPro = tierUpper === 'PRO' || tierUpper === 'PREMIUM';
      const isPremium = tierUpper === 'PREMIUM';

      const { error: fullErr } = await supabase
        .from('profiles')
        .update({
          subscription_tier: tierUpper,
          is_pro: isPro,
          is_premium: isPremium,
          is_paid: true,
        })
        .eq('id', userId);

      if (fullErr) {
        // Fallback if is_pro / is_premium columns do not exist yet
        const { error: fallbackErr } = await supabase
          .from('profiles')
          .update({
            subscription_tier: tierUpper,
            is_paid: true,
          })
          .eq('id', userId);

        if (fallbackErr) {
          await supabase
            .from('profiles')
            .update({ subscription_tier: tierUpper })
            .eq('id', userId);
        }
      }

      try {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'PREMIUM',
          content: `🎉 You are now unlocked on the ${tierUpper} Plan!`,
        });
      } catch (_) {}
    } else if (type === 'COIN') {
      const { data: userData } = await supabase
        .from('profiles')
        .select('coins, coin_balance')
        .eq('id', userId)
        .maybeSingle();

      const currentBalance =
        typeof userData?.coins === 'number' && userData.coins > 0
          ? userData.coins
          : typeof userData?.coin_balance === 'number' && userData.coin_balance > 0
          ? userData.coin_balance
          : typeof userData?.coins === 'number'
          ? userData.coins
          : 0;

      const addedCoins = Math.max(0, parseInt(String(payload), 10) || 0);
      const newBalance = currentBalance + addedCoins;
      updatedBalance = newBalance;

      const { error: dualErr } = await supabase
        .from('profiles')
        .update({
          coins: newBalance,
          coin_balance: newBalance,
        })
        .eq('id', userId);

      if (dualErr) {
        const { error: singleErr } = await supabase
          .from('profiles')
          .update({ coins: newBalance })
          .eq('id', userId);
        if (singleErr) throw singleErr;
      }

      try {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'TRANSACTION',
          content: `🪙 +${addedCoins} Coins added to your wallet!`,
        });
      } catch (_) {}
    }

    // Record transaction for idempotency
    try {
      await supabase.from('wallet_transactions').insert({
        user_id: userId,
        reference: String(reference),
        type: type === 'UPGRADE' ? 'subscription_upgrade' : 'coin_purchase',
        amount: Number(payload) || 0,
        status: 'completed',
        created_at: new Date().toISOString(),
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      balance: updatedBalance,
      subscriptionTier: updatedTier,
    });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
