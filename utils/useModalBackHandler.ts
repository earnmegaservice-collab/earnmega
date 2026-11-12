'use client';

import { useEffect, useRef } from 'react';

/**
 * Closes a modal/drawer cleanly on Escape or mobile browser Back gesture (`popstate`)
 * without triggering a full page refresh or leaving stale history entries behind.
 */
export function useModalBackHandler(
  isOpen: boolean,
  onClose: () => void,
  stateKey = 'horpalModalOpen'
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const pushedRef = useRef(false);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const currentState = window.history.state || {};
    if (!currentState[stateKey]) {
      window.history.pushState({ ...currentState, [stateKey]: true }, '');
      pushedRef.current = true;
    }

    const handlePopState = () => {
      if (pushedRef.current) {
        pushedRef.current = false;
        onCloseRef.current();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);

      if (pushedRef.current) {
        pushedRef.current = false;
        // Only pop our synthetic state if it is still the active history entry
        if (window.history.state?.[stateKey]) {
          try {
            window.history.back();
          } catch (_) {}
        }
      }
    };
  }, [isOpen, stateKey]);
}
