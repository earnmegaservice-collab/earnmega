export const NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'BAPdpvB9mqx3QzCUIeGJbg-vEFEHrNt8lGr6ou823W-zubM35dj93ZP-lTQmUlKzmVIkUDM38kmoD-bFZ6golro';

export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        try {
            const subscribeOptions = {
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(NEXT_PUBLIC_VAPID_PUBLIC_KEY)
            };
            const pushSubscription = await registration.pushManager.subscribe(subscribeOptions);

            console.log('Received PushSubscription:', JSON.stringify(pushSubscription));

            await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                },
                body: JSON.stringify(pushSubscription),
            });
            return true;
        } catch (err) {
            console.error('Failed to subscribe user:', err);
            return false;
        }
    }
    return false;
}
