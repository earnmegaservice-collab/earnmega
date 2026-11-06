// public/sw.js

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const payload = event.data.payload || {};
    const title = payload.title || event.data.title || 'HorPal Alert';

    const options = {
       body: payload.body || event.data.body || '',
       icon: payload.icon || '/favicon.ico',
       badge: payload.badge || '/favicon.ico',
       tag: (payload.tag || 'horpal-alert') + '-' + Date.now(),
       renotify: true,
       silent: false,
       requireInteraction: true,
       vibrate: [300, 120, 300, 120, 400],
       data: payload.data || { url: '/' }
     };

    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener('push', function(event) {
  if (!event.data) return;
  
  try {
    const data = event.data.json();

    // Custom INCOMING_CALL handling
    if (data.type === 'INCOMING_CALL' || (data.data && data.data.type === 'INCOMING_CALL')) {
      const callData = data.type === 'INCOMING_CALL' ? data : data.data;
      const callerName = callData.callerName || 'Someone';
      const callType = callData.callType || 'video';
      const roomId = callData.roomId;

      const title = callType === 'video' ? `📹 Incoming Video Call from ${callerName}` : `📞 Incoming Voice Call from ${callerName}`;
      event.waitUntil(
        self.registration.showNotification(title, {
          body: 'Tap to answer',
          icon: '/icon-192x192.png',
          tag: 'horpal-incoming-call',
          renotify: true,
          requireInteraction: true,
          silent: false, // Force OS sound
          vibrate: [500, 1000, 500, 1000, 500, 1000, 500], // Aggressive ringing vibration
          data: { url: '/', roomId, type: 'INCOMING_CALL', callType }
        })
      );
      return;
    }

    const options = {
        body: data.body || 'New notification',
        icon: data.icon || '/favicon.ico',
        badge: data.badge || '/favicon.ico',
        tag: (data.tag || 'horpal-alert') + '-' + Date.now(),
        renotify: true,
        silent: false,
        requireInteraction: true,
        vibrate: [300, 120, 300, 120, 400],
        data: data.data || { url: '/' }
    };
    event.waitUntil(self.registration.showNotification(data.title || 'HorPal', options));
  } catch (e) {
    try {
      const text = event.data.text();
      const options = {
        body: text || 'New notification',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'horpal-alert-' + Date.now(),
        renotify: true,
        silent: false,
        requireInteraction: true,
        vibrate: [300, 120, 300, 120, 400],
        data: { url: '/' }
      };
      event.waitUntil(self.registration.showNotification('HorPal', options));
    } catch (err) {
      console.error('Error parsing push data', e);
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.notification.data && event.notification.data.type === 'INCOMING_CALL') {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            client.focus();
            client.postMessage({ type: 'ACCEPT_CALL_FROM_OS', data: event.notification.data });
            return;
          }
        }
        if (clients.openWindow) return clients.openWindow('/');
      })
    );
    return;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow(event.notification.data?.url || '/');
    })
  );
});
