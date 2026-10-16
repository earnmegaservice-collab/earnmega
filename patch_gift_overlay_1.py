import re

with open('./components/chat/GiftOverlay.tsx', 'r') as f:
    content = f.read()

# Replace the unmount timer and add auth hook
new_content = re.sub(
    r"import \{ motion, AnimatePresence \} from 'framer-motion';",
    r"import { motion, AnimatePresence } from 'framer-motion';\nimport { useAuth } from '../../context/AuthContext';",
    content
)

new_content = re.sub(
    r"export default function GiftOverlay\(\) \{",
    r"export default function GiftOverlay() {\n  const { user } = useAuth();",
    new_content
)

new_content = re.sub(
    r"recipient_id: '', // Not strictly needed for this local display implementation",
    r"recipient_id: customEvent.detail.recipientId || '',",
    new_content
)

# Replace the timeout and routing logic
old_logic = """
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
"""

new_logic = """
      // SECURITY GATE: Only show if the current user is the sender or recipient
      const isParticipant = user && (user.id === senderId || user.id === customEvent.detail.recipientId);

      // But wait, the context `user` might be stale in this event listener if not using a ref.
      // Actually, we can check `user?.id` if it's in the dependency array or using a ref.
      // Better yet, we can check `user.id` when rendering, or update the event handler dependencies.
"""
# Let's write a better patch to replace the useEffect entirely
