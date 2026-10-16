import re

with open('components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

# Remove the CallOverlay import
content = re.sub(r'import\s+\{\s*CallOverlay\s*\}\s*from\s+[\'"]\./CallOverlay[\'"];\n?', '', content)

# Replace the phone/video button onClick with `initiateCall` from `useCall` hook
content = content.replace(
    'const { subscriptionTier, balance, setBalance } = useWallet();',
    'const { subscriptionTier, balance, setBalance } = useWallet();\n  const { initiateCall } = useCall();'
)
content = content.replace('import { useCall } from "../../context/CallContext";\n', '')
content = content.replace('import { useWallet } from "../../context/WalletContext";', 'import { useWallet } from "../../context/WalletContext";\nimport { useCall } from "../../context/CallContext";')

content = content.replace(
    "onClick={() => handleInitiateCall('audio')}",
    "onClick={() => { if (currentOtherUserProfile) initiateCall(currentOtherUserProfile.id, currentOtherUserProfile.name, currentOtherUserProfile.avatarUrl, 'audio'); }}"
)
content = content.replace(
    "onClick={() => handleInitiateCall('video')}",
    "onClick={() => { if (currentOtherUserProfile) initiateCall(currentOtherUserProfile.id, currentOtherUserProfile.name, currentOtherUserProfile.avatarUrl, 'video'); }}"
)

# Strip out states and refs related to calls
states_to_remove = [
    r'const\s+\[isCallActive,\s*setIsCallActive\]\s*=\s*useState\(false\);',
    r'const\s+\[isRinging,\s*setIsRinging\]\s*=\s*useState\(false\);',
    r'const\s+\[incomingCall,\s*setIncomingCall\].*?;',
    r'const\s+\[callState,\s*setCallState\].*?;',
    r'const\s+\[callDuration,\s*setCallDuration\].*?;',
    r'const\s+\[isMuted,\s*setIsMuted\].*?;',
    r'const\s+\[isSpeaker,\s*setIsSpeaker\].*?;',
    r'const\s+\[isPiP,\s*setIsPiP\].*?;',
    r'const\s+ringtoneRef\s*=\s*useRef.*?;\s*useEffect\(\(\)\s*=>\s*\{.*?\},\s*\[\]\);',
    r'const\s+durationTimerRef\s*=\s*useRef.*?;\s*const\s+dialToneRef\s*=\s*useRef.*?;.*?useEffect\(\(\)\s*=>\s*\{.*?\},\s*\[\]\);',
    r'const\s+iceCandidateQueueRef\s*=\s*useRef.*?;',
    r'const\s+localVideoRef\s*=\s*useRef.*?;',
    r'const\s+remoteVideoRef\s*=\s*useRef.*?;',
    r'const\s+remoteAudioRef\s*=\s*useRef.*?;',
    r'const\s+peerConnectionRef\s*=\s*useRef.*?;',
    r'const\s+localStreamRef\s*=\s*useRef.*?;',
    r'const\s+isCallActiveRef\s*=\s*useRef.*?;\s*const\s+hasCallConnectedRef\s*=\s*useRef.*?;\s*useEffect\(\(\)\s*=>\s*\{.*?isCallActive.*?\},\s*\[isCallActive\]\);',
    r'//\s*Phase 3 States\n',
    r'//\s*Call States & Machine\n',
    r'//\s*Ice Candidate Queue\n',
]

for pat in states_to_remove:
    content = re.sub(pat, '', content, flags=re.DOTALL)

# Remove functions
funcs_to_remove = [
    r'const\s+servers\s*=\s*\{[\s\S]*?\]\s*\};\n',
    r'const\s+setOpusCodec\s*=\s*\(sdp:\s*string\)\s*=>\s*\{[\s\S]*?\};\n',
    r'const\s+createPeerConnection\s*=\s*\(targetId:\s*string\)\s*=>\s*\{[\s\S]*?return\s+pc;\n\s*\};\n',
    r'const\s+handleInitiateCall\s*=\s*async\s*\(type:\s*[\'"]audio[\'"]\s*\|\s*[\'"]video[\'"]\)\s*=>\s*\{[\s\S]*?catch\s*\(err\)\s*\{[\s\S]*?handleEndCall\(\);\n\s*\}\n\s*\};\n',
    r'const\s+processIceCandidateQueue\s*=\s*async\s*\(\)\s*=>\s*\{[\s\S]*?\};\n',
    r'const\s+handleToggleMute\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\};\n',
    r'const\s+handleToggleSpeaker\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\};\n',
    r'const\s+handleTogglePiP\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\};\n',
    r'const\s+flipCamera\s*=\s*async\s*\(\)\s*=>\s*\{[\s\S]*?\};\n',
    r'const\s+handleAcceptCall\s*=\s*async\s*\(\)\s*=>\s*\{[\s\S]*?\};\n',
    r'const\s+handleEndCall\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\};\n',
]

for pat in funcs_to_remove:
    content = re.sub(pat, '', content, flags=re.DOTALL)

# Remove real-time listeners for calls
listeners_to_remove = [
    r'\.on\([\'"]broadcast[\'"],\s*\{\s*event:\s*[\'"]incoming_call[\'"]\s*\},\s*\(payload\)\s*=>\s*\{[\s\S]*?\}\)(?=\s*\.on|\s*\.subscribe)',
    r'\.on\([\'"]broadcast[\'"],\s*\{\s*event:\s*[\'"]call_ringing[\'"]\s*\},\s*\(payload\)\s*=>\s*\{[\s\S]*?\}\)(?=\s*\.on|\s*\.subscribe)',
    r'\.on\([\'"]broadcast[\'"],\s*\{\s*event:\s*[\'"]call_answered[\'"]\s*\},\s*async\s*\(payload\)\s*=>\s*\{[\s\S]*?\}\)(?=\s*\.on|\s*\.subscribe)',
    r'\.on\([\'"]broadcast[\'"],\s*\{\s*event:\s*[\'"]webrtc_ice_candidate[\'"]\s*\},\s*async\s*\(payload\)\s*=>\s*\{[\s\S]*?\}\)(?=\s*\.on|\s*\.subscribe)',
    r'\.on\([\'"]broadcast[\'"],\s*\{\s*event:\s*[\'"]call_ended[\'"]\s*\},\s*\(payload\)\s*=>\s*\{[\s\S]*?\}\)(?=\s*\.on|\s*\.subscribe)',
]

for pat in listeners_to_remove:
    content = re.sub(pat, '', content, flags=re.DOTALL)

# Remove CallOverlay from the return
calloverlay_jsx = r'<CallOverlay[\s\S]*?isPiP=\{isPiP\}\s*/>'
content = re.sub(calloverlay_jsx, '', content, flags=re.DOTALL)

with open('components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)
