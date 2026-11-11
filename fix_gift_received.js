const fs = require('fs');
const path = 'components/chat/ChatInterface.tsx';
let content = fs.readFileSync(path, 'utf8');

// The earlier regex for handleGiftSent accidently replaced part of the gift_received broadcast handler.
// We need to restore the gift_received broadcast handler.

content = content.replace(
  /if \(payload\.payload\.senderId !== currentUserProfile\?\.id\) \{[\s\S]*?const customEvent = new CustomEvent\('gift_received_local', \{ detail: \{ giftData: giftData, senderId: currentUserProfile\?\.id, receiverId: currentOtherUserProfile\?\.id, isSender: true \} \}\);\s*window\.dispatchEvent\(customEvent\);/m,
  `if (payload.payload.senderId !== currentUserProfile?.id) {
          // Trigger local animation via custom event so GiftOverlay can pick it up instantly for the receiver
          const customEvent = new CustomEvent('gift_received_local', { detail: { giftData: payload.payload.gift_type, senderId: payload.payload.senderId, receiverId: payload.payload.receiverId } });
          window.dispatchEvent(customEvent);

          const newMessage: Message = {
            id: payload.payload.messageId || Date.now().toString(),
            text: \`Received a \${payload.payload.gift_type.name} (\${payload.payload.gift_type.cost} Coins)\`,
            sender: 'other',
            timestamp: new Date(),
            reactions: [],
            messageType: 'gift',
            giftName: payload.payload.gift_type.name,
            giftCost: payload.payload.gift_type.cost,
          };

          // Strict Thread Isolation
          const isToMe = payload.payload.receiverId === currentUserProfile?.id;
          const isFromOtherToMe = isToMe && payload.payload.senderId === currentOtherUserRef.current?.id;
          const isGroupMatch = payload.payload.roomId && currentOtherUserRef.current?.id === payload.payload.roomId;

          if (isFromOtherToMe || isGroupMatch) {
             setMessages((prev) => {
               if (prev.some(m => m.id === newMessage.id)) return prev;
               return [...prev, newMessage];
             });
          } else {
             // Dispatch toast or let standard push notifications handle the background alert
             // The NotificationDrawer will pick it up via postgres_changes anyway.
          }
        }`
);

// We need to fix the `user_inbox_${user.id}` channel since `user` might be null initially.
content = content.replace(
  /const channel = supabase\.channel\(\`user_inbox_\$\{user\.id\}\`\)/g,
  "if (!user) return;\n    const channel = supabase.channel(`user_inbox_${user.id}`)"
);


fs.writeFileSync(path, content);
console.log("Fixed gift_received handler in components/chat/ChatInterface.tsx");
