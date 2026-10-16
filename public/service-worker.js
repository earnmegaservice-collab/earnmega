self.addEventListener('push', function(event) {
  const data = event.data ? event.data.text() : 'Unknown Caller';

  const options = {
    body: 'Incoming from ' + data,
    icon: '/icon.svg',
    badge: '/icon.svg',
    requireInteraction: true,
    vibrate: [1000, 500, 1000, 500, 1000, 500],
    tag: 'call',
    actions: [
      { action: 'answer', title: 'Answer' },
      { action: 'decline', title: 'Decline' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Incoming Video Call', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'answer') {
    // Ideally focus or open the app and trigger an answer
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(windowClients => {
        for (var i = 0; i < windowClients.length; i++) {
          var client = windowClients[i];
          if (client.url.indexOf('/') !== -1 && 'focus' in client) {
             client.postMessage({ type: 'CALL_ANSWER_ACTION' });
             return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});
