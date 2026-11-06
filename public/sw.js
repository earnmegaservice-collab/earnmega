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
