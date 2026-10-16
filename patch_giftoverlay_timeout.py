import re

with open('./components/chat/GiftOverlay.tsx', 'r') as f:
    content = f.read()

# Fix the timeout unmount cleanup in GiftOverlay.tsx
old_effect = """      // Strict 5-second unmount to prevent memory leaks
      const timer = setTimeout(() => {
        setActiveGift(current => current?.id === newGift.id ? null : current);
      }, 5000);

      // Cleanup timer if another gift arrives (handled by state, but good practice to clear if unmounting)
      // Actually we just let it run, if it matches ID it clears.
    };

    window.addEventListener('gift_received_local', handleGiftEvent);
    return () => window.removeEventListener('gift_received_local', handleGiftEvent);
  }, [user]);"""

new_effect = """      // Strict 5-second unmount to prevent memory leaks
      const timerId = setTimeout(() => {
        setActiveGift(current => current?.id === newGift.id ? null : current);
      }, 5000);

      // Store the timer so we can clean it up
      (window as any).__giftTimer = timerId;
    };

    window.addEventListener('gift_received_local', handleGiftEvent);
    return () => {
       window.removeEventListener('gift_received_local', handleGiftEvent);
       if ((window as any).__giftTimer) {
         clearTimeout((window as any).__giftTimer);
       }
    };
  }, [user]);"""

content = content.replace(old_effect, new_effect)

with open('./components/chat/GiftOverlay.tsx', 'w') as f:
    f.write(content)
