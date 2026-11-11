const fs = require('fs');

const path = 'components/chat/ChatInterface.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /const newMessage: Message = \{\s*id: Date\.now\(\)\.toString\(\),[\s\S]*?giftCost: giftData\.cost,\s*\};\s*setMessages\(\(prev\) => \[\.\.\.prev, newMessage\]\);\s*\/\/ Insert the luxury gift receipt into the database[\s\S]*?window\.dispatchEvent\(customEvent\);/,
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
    window.dispatchEvent(customEvent);`
);

content = content.replace(
  /if \(channelRef\.current\) \{\s*channelRef\.current\.send\(\{[\s\S]*?type: 'broadcast',\s*event: 'new_message',[\s\S]*?\}\);\s*\}/,
  `// Broadcast gift event via Supabase Realtime using a temporary receiver channel
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

fs.writeFileSync(path, content);
console.log("Updated handleGiftSent in components/chat/ChatInterface.tsx");
