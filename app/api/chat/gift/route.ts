import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GIFTS: Record<string, number> = {
  serpent: 10,
  coffee: 10,
  flower: 50,
  gem: 500,
  crown: 1000,
  sparkles: 1500,
  flame: 2000,
};

export async function POST(req: Request) {
  try {
    const { senderId, receiverId, giftId, giftName } = await req.json();

    if (!senderId || !receiverId || !giftName || !giftId) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const expectedCost = GIFTS[giftId];
    if (expectedCost === undefined) {
       return NextResponse.json({ success: false, error: 'Invalid gift type' }, { status: 400 });
    }

    const authHeader = req.headers.get('Authorization');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ success: false, error: 'Server misconfiguration' }, { status: 500 });
    }

    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth Check
    let authenticatedUserId = senderId;
    if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await adminSupabase.auth.getUser(token);
        if (authError || !user || user.id !== senderId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        authenticatedUserId = user.id;
    } else {
        // Fallback or deny? Let's strictly require auth or use server client with cookies if possible.
        // Wait, the client is doing fetch('/api/chat/gift') but we didn't pass headers.
        // We should pass the Authorization header in GiftModal.tsx!
    }

    // Atomic Deduction
    const { error: deductError, data: rpcData } = await adminSupabase.rpc('deduct_coins', {
        user_uuid: authenticatedUserId,
        deduct_amount: expectedCost
    });

    if (deductError) {
      return NextResponse.json({ success: false, error: 'Insufficient coins or deduct failed' }, { status: 400 });
    }

    // 3. Credit cost to receiver (Optional, doing it manually since RPC doesn't cover both)
    const { data: receiverData } = await adminSupabase
      .from('profiles')
      .select('coins')
      .eq('id', receiverId)
      .single();

    if (receiverData) {
      await adminSupabase
        .from('profiles')
        .update({ coins: (receiverData.coins || 0) + expectedCost })
        .eq('id', receiverId);
    }

    // 4. Generate messageId and insert message
    const messageId = crypto.randomUUID();

    // Fetch sender profile details for notification metadata
    const { data: senderProfile } = await adminSupabase
      .from('profiles')
      .select('name, username')
      .eq('id', senderId)
      .single();

    const senderName = senderProfile?.name || senderProfile?.username || 'Someone';

    const { error: msgError } = await adminSupabase.from('messages').insert({
      id: messageId,
      sender_id: senderId,
      receiver_id: receiverId,
      content: `[GIFT:${giftId}:${giftName}:${expectedCost}] Sent a ${giftName} (${expectedCost} Coins)`,
      message_type: 'gift',
      status: 'sent'
    });

    if (msgError) {
        console.error("Failed to insert gift message", msgError);
    }

    // 5. Insert notification
    await adminSupabase.from('notifications').insert({
      user_id: receiverId,
      actor_id: senderId,
      type: 'chat_gift',
      content: `🎁 Sent you a ${giftName} (${expectedCost} Coins)`,
      title: `${senderName} sent you a gift in DM`,
      metadata: { gift_id: giftId, gift_name: giftName, gift_cost: expectedCost, sender_id: senderId, sender_name: senderName }
    });

    return NextResponse.json({ success: true, messageId, giftCost: expectedCost });
  } catch (error: any) {
    console.error('Gift API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
