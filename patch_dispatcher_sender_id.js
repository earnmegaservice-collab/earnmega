const fs = require('fs');

const file = 'lib/notifications/dispatcher.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "actor_id: payload.actorId || null,",
  "sender_id: payload.actorId || null,"
);

fs.writeFileSync(file, content);
