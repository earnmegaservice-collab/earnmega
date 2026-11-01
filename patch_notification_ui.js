const fs = require('fs');

const file = 'components/notifications/NotificationDrawer.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "case 'MATCH_FOUND':",
  "case 'MATCH_FOUND':\n    case 'match':"
);

content = content.replace(
  "case 'LIVE_STARTED':",
  "case 'LIVE_STARTED':\n    case 'live_stream':"
);

content = content.replace(
  "case 'STATUS_VIEW':",
  "case 'status_view':\n    case 'STATUS_VIEW':"
);

fs.writeFileSync(file, content);
