// public/sw.js

self.addEventListener('push', function(event) {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    // Check if it's a VoIP Call
    if (data.type === 'incoming_call') {
      const options = {
        body: `${data.callerName} is calling...`,
        icon: data.callerAvatar || '/icon.svg',
        badge: '/icon.svg',
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
           icon: data.icon || '/icon.svg',
           badge: '/icon.svg',
           vibrate: [200, 100, 200],
           data: {
               url: data.url || '/'
           }
       };

       event.waitUntil(
           self.registration.showNotification(data.title || 'EarnMega', options).then(() => {
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
    console.error('Error parsing push data', e);
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
      return clients.openWindow(event.notification.data.url);
    })
  );
});
