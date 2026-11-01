import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export type NotificationType = 'REPORT_SUCCESS' | 'MATCH_FOUND' | 'LIVE_STARTED' | 'STATUS_POSTED' | 'STATUS_LIKED' | 'NEW_FOLLOWER' | 'GROUP_INVITE' | 'SYSTEM_ALERT';

export interface NotificationPayload {
  recipientId: string;
  actorId?: string;
  type: NotificationType;
  title: string;
  body: string;
  referenceId?: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_service_key';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Safely initialize web-push if keys are available
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@earnmega.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('[Notification Dispatcher] VAPID keys missing. Web-push will not work.');
}

export async function dispatchGlobalNotification(payload: NotificationPayload) {
  try {
    // Insert into notifications table
    const { error: dbError } = await supabaseAdmin.from('notifications').insert({
      user_id: payload.recipientId,
      sender_id: payload.actorId || null,
      type: payload.type,
      content: payload.body,
    });

    if (dbError) {
      console.error('[Notification Dispatcher] DB Insert Failed:', dbError);
    }

    // Fetch user push subscriptions
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', payload.recipientId);

    if (subError) {
      console.error('[Notification Dispatcher] Failed to fetch subscriptions:', subError);
      return;
    }

    if (!subscriptions || subscriptions.length === 0) return;

    // Dispatch Web-Push payload
    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      type: payload.type,
      icon: '/icon-192x192.png',
      referenceId: payload.referenceId
    });

    const sendPromises = subscriptions.map((sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      return webpush.sendNotification(pushSubscription, pushPayload).catch(err => {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription has expired or is no longer valid, delete it
          console.log('[Notification Dispatcher] Subscription expired, deleting.');
          supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id).then();
        } else {
          console.error('[Notification Dispatcher] Push failed:', err);
        }
      });
    });

    await Promise.all(sendPromises);

  } catch (error) {
    console.error('[Notification Dispatcher] Dispatch failed:', error);
  }
}
