import { useState, useEffect } from 'react';

export function useIOSDetection() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if we are on client side
    if (typeof window === 'undefined') return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);

    // Also check for iPad on iOS 13+ which sometimes claims to be Mac
    const isMacWithTouch = userAgent.includes('mac') && navigator.maxTouchPoints > 1;

    setIsIOS(isIOSDevice || isMacWithTouch);

    // Detect standalone mode (PWA installed)
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as any).standalone);

    setIsStandalone(!!isStandaloneMode);
  }, []);

  return {
    isIOS,
    isStandalone,
    shouldShowBanner: isIOS && !isStandalone
  };
}
