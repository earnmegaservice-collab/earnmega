const fs = require('fs');

const path = 'components/chat/ChatInterface.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace channelRef.current?.send with broadcasting to receiver for standard text messages
content = content.replace(
  /channelRef\.current\?\.send\(\{[\s]*?type: 'broadcast',[\s]*?event: 'new_message',[\s]*?payload: \{[\s]*?messageId: optimisticMessage\.id,[\s]*?senderId: user\.id,[\s]*?receiverId: \(currentOtherUserProfile as any\)\.isGroup \? null : currentOtherUserProfile\.id,[\s]*?roomId: \(currentOtherUserProfile as any\)\.isGroup \? currentOtherUserProfile\.id : undefined[\s]*?\}[\s]*?\}\);/g,
  `const targetId = (currentOtherUserProfile as any).isGroup ? currentOtherUserProfile.id : currentOtherUserProfile.id;
      if (targetId) {
          const tempChannel = supabase.channel(\`user_inbox_\${targetId}\`);
          tempChannel.subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                  tempChannel.send({
                      type: 'broadcast',
                      event: 'new_message',
                      payload: {
                          messageId: optimisticMessage.id,
                          senderId: user.id,
                          receiverId: (currentOtherUserProfile as any).isGroup ? null : targetId,
                          roomId: (currentOtherUserProfile as any).isGroup ? targetId : undefined
                      }
                  });
                  setTimeout(() => supabase.removeChannel(tempChannel), 1000);
              }
          });
      }`
);

fs.writeFileSync(path, content);
console.log("Updated channelRef.current?.send for text messages");
