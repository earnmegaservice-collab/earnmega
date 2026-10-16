import re

with open('components/chat/ChatInterface.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
brace_count = 0

def start_skip(line):
    global skip, brace_count
    skip = True
    brace_count = line.count('{') - line.count('}')
    if brace_count == 0 and '{' in line and '}' in line:
        skip = False # single line block?

def update_skip(line):
    global skip, brace_count
    brace_count += line.count('{') - line.count('}')
    if brace_count <= 0:
        skip = False

skip_declarations = [
    "const [isCallActive, setIsCallActive] = useState",
    "const [isRinging, setIsRinging] = useState",
    "const [incomingCall, setIncomingCall] = useState",
    "const ringtoneRef = useRef",
    "const dialToneRef = useRef",
    "const [callState, setCallState] = useState",
    "const [callDuration, setCallDuration] = useState",
    "const [isMuted, setIsMuted] = useState",
    "const [isSpeaker, setIsSpeaker] = useState",
    "const [isPiP, setIsPiP] = useState",
    "const durationTimerRef = useRef",
    "const iceCandidateQueueRef = useRef",
    "const localVideoRef = useRef",
    "const remoteVideoRef = useRef",
    "const remoteAudioRef = useRef",
    "const peerConnectionRef = useRef",
    "const localStreamRef = useRef",
    "const isCallActiveRef = useRef",
    "const hasCallConnectedRef = useRef",
    "const servers =",
    "const setOpusCodec =",
    "const createPeerConnection =",
    "const handleInitiateCall =",
    "const processIceCandidateQueue =",
    "const handleToggleMute =",
    "const handleToggleSpeaker =",
    "const handleTogglePiP =",
    "const flipCamera =",
    "const handleAcceptCall =",
    "const handleEndCall =",
]

skip_hooks = [
    "useEffect(() => { ringtoneRef.current",
    "useEffect(() => { dialToneRef.current",
    "useEffect(() => { currentUserProfileRef.current",
    "useEffect(() => { isCallActiveRef.current",
]

in_call_overlay = False

for line in lines:
    if skip:
        update_skip(line)
        continue

    if in_call_overlay:
        if '/>' in line or '</CallOverlay>' in line:
            in_call_overlay = False
        continue

    # Detect if we should skip
    matched_decl = False
    for decl in skip_declarations:
        if decl in line:
            start_skip(line)
            matched_decl = True
            break

    if matched_decl:
        continue

    matched_hook = False
    for hook in skip_hooks:
        if hook in line:
            start_skip(line)
            matched_hook = True
            break

    if matched_hook:
        continue

    # Also drop CallOverlay rendering
    if '<CallOverlay' in line:
        if '/>' not in line:
            in_call_overlay = True
        continue

    # Also strip out the Realtime `.on` listeners for calls
    # We will do this via a regex over the whole file later, or just remove lines matching them?
    # They are part of a larger chain, so regex over the string is better.

    # Strip CallOverlay import
    if "import { CallOverlay } from" in line:
        continue

    new_lines.append(line)

content = "".join(new_lines)

# Now regex out the real-time event listeners from `supabase.channel('chat-events')`
listeners_to_remove = [
    r'\.on\(\s*[\'"]broadcast[\'"]\s*,\s*\{\s*event:\s*[\'"]incoming_call[\'"]\s*\}\s*,\s*\(payload\)\s*=>\s*\{[\s\S]*?\}\)(?=\s*\.on|\s*\.subscribe)',
    r'\.on\(\s*[\'"]broadcast[\'"]\s*,\s*\{\s*event:\s*[\'"]call_ringing[\'"]\s*\}\s*,\s*\(payload\)\s*=>\s*\{[\s\S]*?\}\)(?=\s*\.on|\s*\.subscribe)',
    r'\.on\(\s*[\'"]broadcast[\'"]\s*,\s*\{\s*event:\s*[\'"]call_answered[\'"]\s*\}\s*,\s*async\s*\(payload\)\s*=>\s*\{[\s\S]*?\}\)(?=\s*\.on|\s*\.subscribe)',
    r'\.on\(\s*[\'"]broadcast[\'"]\s*,\s*\{\s*event:\s*[\'"]webrtc_ice_candidate[\'"]\s*\}\s*,\s*async\s*\(payload\)\s*=>\s*\{[\s\S]*?\}\)(?=\s*\.on|\s*\.subscribe)',
    r'\.on\(\s*[\'"]broadcast[\'"]\s*,\s*\{\s*event:\s*[\'"]call_ended[\'"]\s*\}\s*,\s*\(payload\)\s*=>\s*\{[\s\S]*?\}\)(?=\s*\.on|\s*\.subscribe)'
]

for pat in listeners_to_remove:
    content = re.sub(pat, '', content, flags=re.DOTALL)

# Add useCall
content = content.replace(
    'import { useWallet } from "../../context/WalletContext";',
    'import { useWallet } from "../../context/WalletContext";\nimport { useCall } from "../../context/CallContext";'
)

# Use initiateCall instead of handleInitiateCall
content = content.replace(
    "const { subscriptionTier, balance, setBalance } = useWallet();",
    "const { subscriptionTier, balance, setBalance } = useWallet();\n  const { initiateCall } = useCall();"
)

content = content.replace(
    "onClick={() => handleInitiateCall('audio')}",
    "onClick={() => { if (currentOtherUserProfile) initiateCall(currentOtherUserProfile.id, currentOtherUserProfile.name, currentOtherUserProfile.avatarUrl, 'audio'); }}"
)
content = content.replace(
    "onClick={() => handleInitiateCall('video')}",
    "onClick={() => { if (currentOtherUserProfile) initiateCall(currentOtherUserProfile.id, currentOtherUserProfile.name, currentOtherUserProfile.avatarUrl, 'video'); }}"
)


with open('components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)
