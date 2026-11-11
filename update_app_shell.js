const fs = require('fs');
const path = 'components/layout/AppShell.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /else if \(notif\.type === 'MESSAGE' \|\| notif\.type === 'GROUP_INVITE' \|\| notif\.type === 'chat_gift' \|\| notif\.type === 'GIFT'\) setActiveTab\('chats'\);/g,
  `else if (notif.type === 'MESSAGE' || notif.type === 'GROUP_INVITE' || notif.type === 'chat_gift' || notif.type === 'GIFT') {
           setActiveTab('chats');
           // Try to route to specific chat thread
           if (notif.actor_id) {
               window.dispatchEvent(new CustomEvent('open_profile', { detail: { id: notif.actor_id } }));
           }
        }`
);

fs.writeFileSync(path, content);
console.log("Updated components/layout/AppShell.tsx");
