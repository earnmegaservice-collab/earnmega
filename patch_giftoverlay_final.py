import re

with open('./components/chat/GiftOverlay.tsx', 'r') as f:
    content = f.read()

# Fix AnimatePresence bug
old_return = """  if (!activeGift) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {activeGift && ("""

new_return = """  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {activeGift && ("""

content = content.replace(old_return, new_return)

# Fix Tailwind class for Crown
content = content.replace("clip-polygon-[50%_0,100%_100%,0_100%]", "[clip-path:polygon(50%_0,100%_100%,0_100%)]")

with open('./components/chat/GiftOverlay.tsx', 'w') as f:
    f.write(content)
