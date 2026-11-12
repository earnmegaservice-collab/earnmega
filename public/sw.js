// public/sw.js

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function buildIncomingCallNotificationOptions(callData) {
  const callId = callData.callId || callData.id || '';
  const roomId = callData.roomId || callData.room_id || '';
  const callerName = callData.callerName || callData.caller_name || 'HorPal Caller';
  const callType = callData.callType || callData.call_type || 'audio';
  const isGroup = !!(callData.isGroup || callData.is_group);
  const groupId = callData.groupId || callData.group_id || '';
  const groupName = callData.groupName || callData.group_name || '';
  const targetUrl = callId
    ? `/?incomingCallId=${encodeURIComponent(callId)}&roomId=${encodeURIComponent(roomId)}&callType=${encodeURIComponent(callType)}`
    : '/';

  return {
    callerName,
    options: {
      body: 'Incoming HorPal Call - Tap to Answer',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: 'incoming-call',
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: [500, 250, 500, 250, 500, 250, 500],
      actions: [
        { action: 'answer', title: 'Answer' },
        { action: 'decline', title: 'Decline' },
      ],
      data: {
        type: 'INCOMING_CALL',
        callId,
        roomId,
        callerId: callData.callerId || callData.caller_id || '',
        callerName,
        callerAvatar: callData.callerAvatar || callData.caller_avatar || '',
        callType,
        isGroup,
        groupId,
        groupName,
        url: targetUrl,
      },
    },
  };
}

self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (
    event.data.type === 'INCOMING_CALL' ||
    event.data.type === 'SHOW_CALL_NOTIFICATION' ||
    (event.data.type === 'SHOW_NOTIFICATION' &&
      event.data.payload &&
      event.data.payload.type === 'INCOMING_CALL')
  ) {
    const callData = event.data.payload || event.data.data || event.data;
    const { callerName, options } = buildIncomingCallNotificationOptions(callData);
    event.waitUntil(self.registration.showNotification(callerName, options));
    return;
  }

  if (event.data.type === 'CLOSE_CALL_NOTIFICATION') {
    event.waitUntil(
      self.registration.getNotifications({ tag: 'incoming-call' }).then((notifications) => {
        notifications.forEach((n) => n.close());
      })
    );
    return;
  }

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const payload = event.data.payload || {};
    const title = payload.title || event.data.title || 'HorPal Alert';

    const options = {
      body: payload.body || event.data.body || '',
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/icon-192x192.png',
      tag: payload.tag || 'horpal-alert-' + Date.now(),
      renotify: true,
      silent: false,
      requireInteraction: true,
      vibrate: [300, 120, 300, 120, 400],
      data: payload.data || { url: '/' },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener('push', function (event) {
  if (!event.data) return;

  try {
    const data = event.data.json();

    // Incoming Call Web Push handling
    if (
      data.type === 'INCOMING_CALL' ||
      (data.data && data.data.type === 'INCOMING_CALL')
    ) {
      const callData = data.type === 'INCOMING_CALL' ? data : { ...data, ...data.data };
      const { callerName, options } = buildIncomingCallNotificationOptions(callData);
      event.waitUntil(self.registration.showNotification(callerName, options));
      return;
    }

    const options = {
      body: data.body || 'New notification',
      icon: data.icon || '/icon-192x192.png',
      badge: data.badge || '/icon-192x192.png',
      tag: data.tag || 'horpal-alert-' + Date.now(),
      renotify: true,
      silent: false,
      requireInteraction: true,
      vibrate: [300, 120, 300, 120, 400],
      data: data.data || { url: '/' },
    };
    event.waitUntil(self.registration.showNotification(data.title || 'HorPal', options));
  } catch (e) {
    try {
      const text = event.data.text();
      const options = {
        body: text || 'New notification',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: 'horpal-alert-' + Date.now(),
        renotify: true,
        silent: false,
        requireInteraction: true,
        vibrate: [300, 120, 300, 120, 400],
        data: { url: '/' },
      };
      event.waitUntil(self.registration.showNotification('HorPal', options));
    } catch (err) {
      console.error('Error parsing push data', e);
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const notifData = event.notification.data || {};
  const action = event.action;

  if (notifData.type === 'INCOMING_CALL' || event.notification.tag === 'incoming-call') {
    const isDecline = action === 'decline';
    const messageType = isDecline ? 'DECLINE_CALL_FROM_OS' : 'ACCEPT_CALL_FROM_OS';
    const targetUrl =
      notifData.url ||
      (notifData.callId ? `/?incomingCallId=${encodeURIComponent(notifData.callId)}` : '/');

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        if (clientList && clientList.length > 0) {
          let targetClient = clientList[0];
          for (const client of clientList) {
            if (client.focused) {
              targetClient = client;
              break;
            }
          }
          for (const client of clientList) {
            try {
              client.postMessage({ type: messageType, data: notifData });
            } catch (err) {}
          }
          if (!isDecline && 'focus' in targetClient) {
            return targetClient.focus();
          }
          return;
        }
        if (!isDecline && clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
    );
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow(notifData.url || '/');
    })
  );
});
