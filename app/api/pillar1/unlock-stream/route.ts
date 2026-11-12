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
    const { streamId, userId: bodyUserId } = await request.json();

    if (!streamId) {
      return NextResponse.json({ error: 'Missing streamId' }, { status: 400 });
    }

    // 1. Resolve user ID from Bearer token or request body
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

    // 2. Check if already unlocked
    const { data: existingUnlock } = await supabase
      .from('live_stream_unlocks')
      .select('id')
      .eq('user_id', userId)
      .eq('stream_id', streamId)
      .maybeSingle();

    if (existingUnlock) {
      return NextResponse.json({
        success: true,
        alreadyUnlocked: true,
      });
    }

    // 3. Check stream host (host does not pay)
    const { data: streamRecord } = await supabase
      .from('live_streams')
      .select('id, host_id, user_id')
      .eq('id', streamId)
      .maybeSingle();

    const hostId = streamRecord?.host_id || (streamRecord as any)?.user_id;
    if (hostId && hostId === userId) {
      return NextResponse.json({
        success: true,
        isHost: true,
      });
    }

    // 4. Fetch viewer coins
    const { data: userProfile, error: profErr } = await supabase
      .from('profiles')
      .select('coins, coin_balance')
      .eq('id', userId)
      .single();

    if (profErr || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const currentCoins =
      typeof userProfile.coins === 'number'
        ? userProfile.coins
        : typeof userProfile.coin_balance === 'number'
        ? userProfile.coin_balance
        : 0;

    const STREAM_VIEW_COST = 10;
    if (currentCoins < STREAM_VIEW_COST) {
      return NextResponse.json({
        error: 'Insufficient coins',
        code: 'INSUFFICIENT_COINS',
        requiredCoins: STREAM_VIEW_COST,
        balance: currentCoins,
      }, { status: 402 });
    }

    const nextCoins = currentCoins - STREAM_VIEW_COST;

    // Deduct coins atomically
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        coins: nextCoins,
        coin_balance: nextCoins,
      })
      .eq('id', userId);

    if (updateErr) {
      await supabase
        .from('profiles')
        .update({ coins: nextCoins })
        .eq('id', userId);
    }

    // Record in live_stream_unlocks
    await supabase
      .from('live_stream_unlocks')
      .upsert({
        user_id: userId,
        stream_id: streamId,
        coins_paid: STREAM_VIEW_COST,
      }, { onConflict: 'user_id,stream_id' });

    // Optional notification
    try {
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'TRANSACTION',
        content: `🔴 Unlocked Full Live Stream access for ${STREAM_VIEW_COST} coins.`,
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      newBalance: nextCoins,
      unlocked: true,
    });
  } catch (err: any) {
    console.error('unlock-stream error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const streamId = searchParams.get('streamId');
    const userId = searchParams.get('userId');

    if (!streamId || !userId) {
      return NextResponse.json({ unlocked: false });
    }

    // Check host
    const { data: streamRecord } = await supabase
      .from('live_streams')
      .select('id, host_id, user_id')
      .eq('id', streamId)
      .maybeSingle();

    const hostId = streamRecord?.host_id || (streamRecord as any)?.user_id;
    if (hostId && hostId === userId) {
      return NextResponse.json({ unlocked: true, isHost: true });
    }

    const { data: existingUnlock } = await supabase
      .from('live_stream_unlocks')
      .select('id')
      .eq('user_id', userId)
      .eq('stream_id', streamId)
      .maybeSingle();

    return NextResponse.json({ unlocked: Boolean(existingUnlock) });
  } catch (_) {
    return NextResponse.json({ unlocked: false });
  }
}
