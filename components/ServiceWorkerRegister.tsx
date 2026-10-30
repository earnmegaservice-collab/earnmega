'use client';
import { useEffect } from 'react';
import { subscribeToPush } from '../lib/push';

export function ServiceWorkerRegister() {
  useEffect(() => {
    async function registerServiceWorker() {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered with scope:', registration.scope);

          if (Notification.permission === 'granted') {
             await subscribeToPush();
          }
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      }
    }

    registerServiceWorker();

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PLAY_AUDIO') {
        const audio = new Audio('/premium-chime.mp3');
        audio.play().catch(e => console.error("Error playing premium chime:", e));
      }
    };

    if ('serviceWorker' in navigator) {
       navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    return () => {
       if ('serviceWorker' in navigator) {
           navigator.serviceWorker.removeEventListener('message', handleMessage);
       }
    };
  }, []);

  return null;
}
