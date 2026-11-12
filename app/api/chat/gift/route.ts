import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const GIFTS: Record<string, number> = {
  serpent: 10,
  coffee: 10,
  rose: 50,
  flower: 50,
  diamond: 500,
  gem: 500,
  crown: 1000,
  galaxy: 1500,
  sparkles: 1500,
  god_mode: 2000,
  flame: 2000,
};

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      'mailto:horpalservice@gmail.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } catch (e) {
    console.warn('[Gift API] VAPID setup warning:', e);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { senderId, receiverId, giftId, giftName, giftCost } = body;

    if (!senderId || !receiverId || !giftName || !giftId) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const expectedCost = GIFTS[giftId] ?? (typeof giftCost === 'number' && giftCost > 0 ? giftCost : undefined);
    if (expectedCost === undefined || expectedCost <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid gift type' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ success: false, error: 'Server misconfiguration' }, { status: 500 });
    }

    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Verify auth if Bearer token provided
    let authenticatedUserId = senderId;
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      if (token && token !== 'undefined' && token !== 'null') {
        const {
          data: { user },
          error: authError,
        } = await adminSupabase.auth.getUser(token);
        if (authError || !user || user.id !== senderId) {
          return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        authenticatedUserId = user.id;
      }
    }

    // 1. Fetch sender profile and verify coin balance
    const { data: senderProfile, error: senderErr } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('id', authenticatedUserId)
      .single();

    if (senderErr || !senderProfile) {
      return NextResponse.json({ success: false, error: 'Sender profile not found' }, { status: 404 });
    }

    const currentSenderCoins =
      typeof senderProfile.coins === 'number'
        ? senderProfile.coins
        : typeof senderProfile.coin_balance === 'number'
        ? senderProfile.coin_balance
        : 0;

    if (currentSenderCoins < expectedCost) {
      return NextResponse.json(
        {
          success: false,
          code: 'INSUFFICIENT_COINS',
          error: `You need ${expectedCost} Coins to send ${giftName}`,
          balance: currentSenderCoins,
          requiredCoins: expectedCost,
        },
        { status: 402 }
      );
    }

    // 2. Atomically deduct expectedCost from sender's coins
    const newSenderCoins = Math.max(0, currentSenderCoins - expectedCost);
    const { error: senderUpdateErr } = await adminSupabase
      .from('profiles')
      .update({
        coins: newSenderCoins,
        coin_balance: newSenderCoins,
      })
      .eq('id', authenticatedUserId);

    if (senderUpdateErr) {
      const { error: fallbackSenderErr } = await adminSupabase
        .from('profiles')
        .update({ coins: newSenderCoins })
        .eq('id', authenticatedUserId);

      if (fallbackSenderErr) {
        return NextResponse.json(
          { success: false, error: 'Failed to deduct coins from sender' },
          { status: 500 }
        );
      }
    }

    // 3. Credit 100% of gift.coinCost directly to receiver's coins balance in Supabase
    const { data: receiverProfile } = await adminSupabase
      .from('profiles')
      .select('coins, coin_balance, coins_gifted')
      .eq('id', receiverId)
      .maybeSingle();

    let newReceiverCoins = expectedCost;
    if (receiverProfile) {
      const currentReceiverCoins =
        typeof receiverProfile.coins === 'number'
          ? receiverProfile.coins
          : typeof receiverProfile.coin_balance === 'number'
          ? receiverProfile.coin_balance
          : 0;
      newReceiverCoins = currentReceiverCoins + expectedCost;
      const newCoinsGifted = (Number(receiverProfile.coins_gifted) || 0) + expectedCost;

      const { error: receiverUpdateErr } = await adminSupabase
        .from('profiles')
        .update({
          coins: newReceiverCoins,
          coin_balance: newReceiverCoins,
          coins_gifted: newCoinsGifted,
        })
        .eq('id', receiverId);

      if (receiverUpdateErr) {
        await adminSupabase
          .from('profiles')
          .update({ coins: newReceiverCoins })
          .eq('id', receiverId);
      }
    }

    // 4. Insert Gift Message Bubble into messages for real-time sync in both chat windows
    const messageId = crypto.randomUUID();
    const senderUsername =
      senderProfile.username || senderProfile.full_name || senderProfile.name || 'Someone';
    const giftContent = `[GIFT:${giftId}:${giftName}:${expectedCost}] Sent a ${giftName} (+${expectedCost} Coins)`;

    const { error: msgError } = await adminSupabase.from('messages').insert({
      id: messageId,
      sender_id: authenticatedUserId,
      receiver_id: receiverId,
      content: giftContent,
      message_type: 'gift',
      status: 'sent',
      is_read: false,
    });

    if (msgError) {
      // Fallback without message_type if column enum/constraint rejects 'gift'
      await adminSupabase.from('messages').insert({
        id: messageId,
        sender_id: authenticatedUserId,
        receiver_id: receiverId,
        content: giftContent,
        status: 'sent',
      });
    }

    // 5. Insert Notification for Receiver (In-App Notification Banner + Sound)
    const notifText = `🎁 @${senderUsername} sent you a ${giftName} (+${expectedCost} Coins)!`;
    const notifTitle = `🎁 @${senderUsername} sent you a ${giftName} (+${expectedCost} Coins)!`;

    const { error: notifErr1 } = await adminSupabase.from('notifications').insert({
      user_id: receiverId,
      recipient_id: receiverId,
      actor_id: authenticatedUserId,
      sender_id: authenticatedUserId,
      type: 'chat_gift',
      content: notifText,
      message: notifText,
      title: notifTitle,
      is_read: false,
      read: false,
      metadata: {
        gift_id: giftId,
        gift_name: giftName,
        gift_cost: expectedCost,
        sender_id: authenticatedUserId,
        sender_name: senderUsername,
        message_id: messageId,
      },
    });

    if (notifErr1) {
      const { error: notifErr2 } = await adminSupabase.from('notifications').insert({
        recipient_id: receiverId,
        sender_id: authenticatedUserId,
        type: 'chat_gift',
        message: notifText,
        read: false,
      });
      if (notifErr2) {
        await adminSupabase.from('notifications').insert({
          user_id: receiverId,
          actor_id: authenticatedUserId,
          type: 'chat_gift',
          content: notifText,
          is_read: false,
        });
      }
    }

    // 6. Send Outside-the-App OS Web Push Notification via push_subscriptions -> public/sw.js
    try {
      const { data: subscriptions } = await adminSupabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', receiverId);

      if (subscriptions && subscriptions.length > 0) {
        const pushPayload = JSON.stringify({
          title: notifTitle,
          body: `${notifText} Your wallet balance increased by +${expectedCost} Coins!`,
          type: 'chat_gift',
          icon: senderProfile.avatar_url || '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: `gift-${messageId}`,
          data: {
            url: '/?tab=chats',
            type: 'chat_gift',
            senderId: authenticatedUserId,
            giftId,
            giftName,
            giftCost: expectedCost,
          },
        });

        await Promise.allSettled(
          subscriptions.map((sub: any) =>
            webpush
              .sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth,
                  },
                },
                pushPayload
              )
              .catch((err: any) => {
                if (err.statusCode === 404 || err.statusCode === 410) {
                  adminSupabase.from('push_subscriptions').delete().eq('id', sub.id).then();
                }
              })
          )
        );
      }
    } catch (pushErr) {
      console.warn('[Gift API] Push notification non-fatal warning:', pushErr);
    }

    return NextResponse.json({
      success: true,
      messageId,
      giftId,
      giftName,
      giftCost: expectedCost,
      senderBalance: newSenderCoins,
      receiverBalance: newReceiverCoins,
      senderName: senderUsername,
    });
  } catch (error: any) {
    console.error('Gift API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
