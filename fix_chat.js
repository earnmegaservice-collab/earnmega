const fs = require('fs');

const path = 'components/chat/ChatInterface.tsx';
let content = fs.readFileSync(path, 'utf8');

// The file got completely corrupted in the previous regex step (gift sending logic got inside the event listener).
// So I will reload the original file from git.
