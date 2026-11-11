const fs = require('fs');

const path = 'components/chat/ChatInterface.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /const channel = supabase\.channel\('chat-events'\)/g,
  "const channel = supabase.channel(`user_inbox_${user.id}`)"
);

content = content.replace(
  /\}, \[currentUserProfile\?\.id\]\);/g,
  "}, [user?.id, currentUserProfile?.id, setMessages, setExploreUsers]);"
);

// We need to fix the dependency array for the channel subscription
// But we must also check where the channel is set up and if user is available there
fs.writeFileSync(path, content);
console.log("Updated channel in components/chat/ChatInterface.tsx");
