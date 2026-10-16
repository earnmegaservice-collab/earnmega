import re

with open('./components/chat/GiftOverlay.tsx', 'r') as f:
    content = f.read()

# Add useAuth
content = content.replace("import { motion, AnimatePresence } from 'framer-motion';", "import { motion, AnimatePresence } from 'framer-motion';\nimport { useAuth } from '../../context/AuthContext';")

# Add useAuth hook
content = content.replace("export default function GiftOverlay() {", "export default function GiftOverlay() {\n  const { user } = useAuth();")

# Replace recipient logic and update timeouts
old_effect = """  useEffect(() => {
    // Listen for custom event triggered by ChatInterface when a gift is sent or received
    const handleGiftEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { giftData, senderId } = customEvent.detail;

      const newGift: GiftEvent = {
        id: Date.now().toString(),
        sender_id: senderId,
        recipient_id: '', // Not strictly needed for this local display implementation
        gift_name: giftData.name.toLowerCase(),
        gift_cost: giftData.cost
      };

      setActiveGift(newGift);

      // Sensory Engine (Haptics)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        if (giftData.cost === 10) navigator.vibrate(50);
        else if (giftData.cost === 50) navigator.vibrate([100, 50, 100]);
        else if (giftData.cost === 500) navigator.vibrate([200, 100, 200, 100, 200]);
        else if (giftData.cost === 1000) navigator.vibrate([200, 100, 200]); // Crown: requested [200, 100, 200]
        else if (giftData.cost === 1500) navigator.vibrate([500, 100, 500]); // Galaxy: requested [500, 100, 500]
      }

      // Strict 4-second unmount to prevent memory leaks
      setTimeout(() => {
        setActiveGift(current => current?.id === newGift.id ? null : current);
      }, 4000);
    };

    window.addEventListener('gift_received_local', handleGiftEvent);
    return () => window.removeEventListener('gift_received_local', handleGiftEvent);
  }, []);"""

new_effect = """  useEffect(() => {
    // Listen for custom event triggered by ChatInterface when a gift is sent or received
    const handleGiftEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { giftData, senderId, receiverId } = customEvent.detail;

      // SECURITY GATE: Only show if the current authenticated user is the sender or receiver
      if (user && user.id !== senderId && user.id !== receiverId) {
        return;
      }

      const newGift: GiftEvent = {
        id: Date.now().toString(),
        sender_id: senderId,
        recipient_id: receiverId || '',
        gift_name: giftData.name.toLowerCase(),
        gift_cost: giftData.cost
      };

      setActiveGift(newGift);

      // Sensory Engine (Haptics)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        if (giftData.cost === 10) navigator.vibrate(50);
        else if (giftData.cost === 50) navigator.vibrate([100, 50, 100]);
        else if (giftData.cost === 500) navigator.vibrate([200, 100, 200, 100, 200]);
        else if (giftData.cost === 1000) navigator.vibrate([200, 100, 200]); // Crown: requested [200, 100, 200]
        else if (giftData.cost === 1500) navigator.vibrate([500, 100, 500]); // Galaxy: requested [500, 100, 500]
      }

      // Strict 5-second unmount to prevent memory leaks
      const timer = setTimeout(() => {
        setActiveGift(current => current?.id === newGift.id ? null : current);
      }, 5000);

      // Cleanup timer if another gift arrives (handled by state, but good practice to clear if unmounting)
      // Actually we just let it run, if it matches ID it clears.
    };

    window.addEventListener('gift_received_local', handleGiftEvent);
    return () => window.removeEventListener('gift_received_local', handleGiftEvent);
  }, [user]);"""

content = content.replace(old_effect, new_effect)

with open('./components/chat/GiftOverlay.tsx', 'w') as f:
    f.write(content)
