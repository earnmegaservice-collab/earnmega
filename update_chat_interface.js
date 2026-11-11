const fs = require('fs');

const path = 'components/chat/ChatInterface.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Change chat-events to user_inbox_${user.id}
content = content.replace(
  /const channel = supabase\.channel\('chat-events'\)/g,
  "if (!user) return;\n    const channel = supabase.channel(`user_inbox_${user.id}`)"
);

content = content.replace(
  /\}, \[currentUserProfile\?\.id\]\);/g,
  "}, [user?.id, currentUserProfile?.id, setMessages, setExploreUsers]);"
);

// 2. Fix the receiver's gift_received event handler to only append if match
content = content.replace(
  /if \(payload\.payload\.senderId !== currentUserProfile\?\.id\) \{[\s\S]*?if \(currentOtherUserRef\.current\?\.id === payload\.payload\.senderId\) \{[\s\S]*?\}\s*\}/m,
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
          }
        }`
);


// 3. Update handleGiftSent to use the messageId, not do local DB inserts, and broadcast using a dynamic channel.
content = content.replace(
  /const newMessage: Message = \{\s*id: Date\.now\(\)\.toString\(\),[\s\S]*?text: `Sent a \$\{giftData\.name\} \(\$\{giftData\.cost\} Coins\)`,\s*sender: 'user',\s*timestamp: new Date\(\),\s*status: 'sent',\s*reactions: \[\],\s*messageType: 'gift',\s*giftName: giftData\.name,\s*giftCost: giftData\.cost,\s*\};\s*setMessages\(\(prev\) => \[\.\.\.prev, newMessage\]\);\s*\/\/ Insert the luxury gift receipt into the database[\s\S]*?if \(channelRef\.current\) \{[\s\S]*?channelRef\.current\.send\(\{[\s\S]*?type: 'broadcast',[\s\S]*?event: 'new_message',[\s\S]*?\}\);\s*\}/m,
  `const newMessage: Message = {
      id: giftData.messageId || Date.now().toString(),
      text: \`Sent a \${giftData.name} (\${giftData.cost} Coins)\`,
      sender: 'user',
      timestamp: new Date(),
      status: 'sent',
      reactions: [],
      messageType: 'gift',
      giftName: giftData.name,
      giftCost: giftData.cost,
    };
    setMessages((prev) => {
        if (prev.some(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
    });

    // Trigger local animation via custom event for sender
    const customEvent = new CustomEvent('gift_received_local', { detail: { giftData: giftData, senderId: currentUserProfile?.id, receiverId: currentOtherUserProfile?.id, isSender: true } });
    window.dispatchEvent(customEvent);

    // Broadcast gift event via Supabase Realtime using a temporary receiver channel
    if (currentOtherUserProfile?.id) {
      const tempChannel = supabase.channel(\`user_inbox_\${currentOtherUserProfile.id}\`);
      tempChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          tempChannel.send({
            type: 'broadcast',
            event: 'gift_received',
            payload: { messageId: newMessage.id, gift_type: giftData, senderId: currentUserProfile?.id, senderName: currentUserProfile?.name, senderAvatar: currentUserProfile?.avatarUrl, receiverId: currentOtherUserProfile?.id }
          });

          tempChannel.send({
            type: 'broadcast',
            event: 'new_message',
            payload: {
               messageId: newMessage.id,
               senderId: user?.id,
               receiverId: currentOtherUserProfile?.id
            }
          });

          setTimeout(() => {
             supabase.removeChannel(tempChannel);
          }, 1000);
        }
      });
    }`
);

// We need to also replace channelRef.current?.send with the dynamic receiver channel for normal messages, but there are multiple occurrences.
// For now, let's keep channelRef.current pointing to the user_inbox_ if that's what it was doing.
// Actually, sending a message should broadcast to the OTHER user's inbox so they get it instantly.
// Wait, the prompt says "Maintain a global user-level inbox channel (`user_inbox_${currentUser.id}`) in addition to the active room channel so Kofi receives Ama's messages and gifts instantly"

fs.writeFileSync(path, content);
console.log("Updated components/chat/ChatInterface.tsx");
