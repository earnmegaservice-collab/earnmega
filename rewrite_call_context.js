const fs = require('fs');

const path = 'context/CallContext.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace peerConnectionRef with peerConnectionsRef Map
content = content.replace(/const peerConnectionRef = useRef<RTCPeerConnection \| null>\(null\);/, 'const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());');

fs.writeFileSync(path, content);
