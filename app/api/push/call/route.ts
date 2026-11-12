import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'placeholder_service_key';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const vapidPublicKey =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BAPdpvB9mqx3QzCUIeGJbg-vEFEHrNt8lGr6ou823W-zubM35dj93ZP-lTQmUlKzmVIkUDM38kmoD-bFZ6golro';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';

let vapidConfigured = false;
if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails('mailto:horpalservice@gmail.com', vapidPublicKey, vapidPrivateKey);
    vapidConfigured = true;
  } catch (e) {
    console.warn('[Push Call API] VAPID init warning:', e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      callId,
      roomId,
      callerId,
      callerName,
      callerAvatar,
      callType = 'audio',
      isGroup = false,
      groupId,
      groupName,
      participantIds = [],
    } = body;

    const targetIds: string[] = Array.isArray(participantIds)
      ? participantIds.filter((id: string) => id && id !== callerId)
      : [];

    if (targetIds.length === 0) {
      return NextResponse.json({ success: true, sent: 0 });
    }

    if (!vapidConfigured) {
      return NextResponse.json({
        success: true,
        sent: 0,
        note: 'VAPID_PRIVATE_KEY not set in env; client ServiceWorker notification active',
      });
    }

    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .in('user_id', targetIds);

    if (error || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, sent: 0 });
    }

    const pushPayload = JSON.stringify({
      type: 'INCOMING_CALL',
      title: callerName || 'HorPal Call',
      body: 'Incoming HorPal Call - Tap to Answer',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: 'incoming-call',
      callId,
      roomId,
      callerId,
      callerName: callerName || 'HorPal User',
      callerAvatar: callerAvatar || '',
      callType,
      isGroup: !!isGroup,
      groupId: groupId || '',
      groupName: groupName || '',
      data: {
        type: 'INCOMING_CALL',
        callId,
        roomId,
        callerId,
        callerName: callerName || 'HorPal User',
        callerAvatar: callerAvatar || '',
        callType,
        isGroup: !!isGroup,
        groupId: groupId || '',
        groupName: groupName || '',
        url: callId ? `/?incomingCallId=${encodeURIComponent(callId)}` : '/',
      },
    });

    let sentCount = 0;
    await Promise.allSettled(
      subscriptions.map(async (sub: any) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };
        try {
          await webpush.sendNotification(pushSubscription, pushPayload, {
            TTL: 45,
            urgency: 'high',
          });
          sentCount++;
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
          }
        }
      })
    );

    return NextResponse.json({ success: true, sent: sentCount });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Push call dispatch error' }, { status: 500 });
  }
}
