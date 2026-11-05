// public/sw.js

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event) {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    // Check if it's a VoIP Call
    if (data.type === 'incoming_call') {
      const options = {
        body: `${data.callerName} is calling...`,
        icon: data.callerAvatar || '/icon-192x192.png',
        badge: '/badge.png',
        vibrate: [1000, 500, 1000, 500, 1000, 500, 1000], // Heavy VoIP vibration
        requireInteraction: true, // Notification stays on screen until answered
        data: {
          url: data.url || '/',
          callerId: data.callerId
        },
        actions: [
          { action: 'answer', title: 'Answer Call' },
          { action: 'decline', title: 'Decline' }
        ]
      };

      event.waitUntil(
        self.registration.showNotification(`Incoming ${data.callType} Call`, options).then(() => {
           return clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
             clientList.forEach(client => {
               client.postMessage({
                 type: 'PLAY_AUDIO',
                 payload: 'incoming_call'
               });
             });
           });
        })
      );
    } else {
       // Other types of push notifications (e.g. stream start)
       const options = {
           body: data.body || 'New notification',
           icon: '/favicon.ico',
           badge: '/favicon.ico',
           vibrate: [200, 100, 200],
           renotify: true,
           requireInteraction: false,
           silent: false, // MANDATORY: Overrides silent delivery
           data: {
               url: data.url || '/'
           }
       };

       event.waitUntil(
           self.registration.showNotification(data.title || 'HorPal', options).then(() => {
               return clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
                   clientList.forEach(client => {
                       client.postMessage({
                           type: 'PLAY_AUDIO',
                           payload: 'default'
                       });
                   });
               });
           })
       );
    }
  } catch (e) {
    try {
      const text = event.data.text();
      const options = {
        body: text || 'New notification',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200],
        renotify: true,
        requireInteraction: false,
        data: { url: '/' }
      };
      event.waitUntil(self.registration.showNotification('EarnMega', options));
    } catch (err) {
      console.error('Error parsing push data', e);
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'decline') {
    // Silently close
    return;
  }
  
  // If Answer tapped, open the app and route to the call
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

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(event.data.title || 'HubPal', {
       body: event.data.body || 'You have a new notification',
       icon: '/favicon.ico',
       badge: '/favicon.ico',
       tag: event.data.tag || 'hubpal-notif-' + Date.now(),
       renotify: true,
       vibrate: [200, 100, 200],
       data: { url: event.data.url || '/' }
     });
  }
});
