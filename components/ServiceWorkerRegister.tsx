'use client';
import { useEffect } from 'react';
import { subscribeToPush } from '../lib/push';
import { useAuth } from '../context/AuthContext';

export function ServiceWorkerRegister() {
  const { user } = useAuth();

  useEffect(() => {
    async function registerServiceWorker() {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;

        if ('Notification' in window) {
          if (Notification.permission === 'default') {
            try {
              const perm = await Notification.requestPermission();
              if (perm === 'granted' && 'PushManager' in window) {
                await subscribeToPush(user?.id);
              }
            } catch {}
          } else if (Notification.permission === 'granted' && 'PushManager' in window) {
            await subscribeToPush(user?.id);
          }
        }
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }

    registerServiceWorker();

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PLAY_AUDIO') {
        const audio = new Audio('/premium-chime.mp3');
        audio.play().catch((e) => console.error('Error playing premium chime:', e));
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
  }, [user?.id]);

  return null;
}
