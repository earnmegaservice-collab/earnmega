import re

with open('components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

# I will use a reliable regex approach for removing AST nodes. I'll search for the function signature and remove it by finding the matching bracket.
def remove_block(text, search_str):
    idx = text.find(search_str)
    if idx == -1: return text
    # find first brace after search_str
    brace_idx = text.find('{', idx)
    if brace_idx == -1: return text

    count = 1
    end_idx = -1
    for i in range(brace_idx + 1, len(text)):
        if text[i] == '{': count += 1
        elif text[i] == '}':
            count -= 1
            if count == 0:
                end_idx = i
                break
    if end_idx != -1:
        # Check if there is a semicolon
        if end_idx + 1 < len(text) and text[end_idx + 1] == ';':
            end_idx += 1
        return text[:idx] + text[end_idx+1:]
    return text

content = remove_block(content, "const setOpusCodec = (sdp: string) =>")
content = remove_block(content, "const createPeerConnection = (targetId: string) =>")
content = remove_block(content, "const handleInitiateCall = async (type: 'audio' | 'video') =>")
content = remove_block(content, "const processIceCandidateQueue = async () =>")
content = remove_block(content, "const handleToggleMute = () =>")
content = remove_block(content, "const handleToggleSpeaker = () =>")
content = remove_block(content, "const handleTogglePiP = () =>")
content = remove_block(content, "const flipCamera = async () =>")
content = remove_block(content, "const handleAcceptCall = async () =>")
content = remove_block(content, "const handleEndCall = () =>")

# remove vars
vars_to_remove = [
    "const [isCallActive, setIsCallActive] = useState(false);",
    "const [isRinging, setIsRinging] = useState(false);",
    "const [incomingCall, setIncomingCall] = useState<{ callerId: string, callerName: string, callId: string, callType: 'audio'|'video', offer?: RTCSessionDescriptionInit } | null>(null);",
    "const ringtoneRef = useRef<HTMLAudioElement | null>(null);",
    "useEffect(() => { ringtoneRef.current = new Audio('/ringtone.mp3'); ringtoneRef.current.loop = true; return () => { ringtoneRef.current?.pause(); ringtoneRef.current = null; }; }, []);",
    "const [callState, setCallState] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'reconnecting' | 'ended'>('idle');",
    "const [callDuration, setCallDuration] = useState(0);",
    "const [isMuted, setIsMuted] = useState(false);",
    "const [isSpeaker, setIsSpeaker] = useState(true);",
    "const [isPiP, setIsPiP] = useState(false);",
    "const durationTimerRef = useRef<NodeJS.Timeout | null>(null);",
    "const dialToneRef = useRef<HTMLAudioElement | null>(null);",
    "const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);",
    "const localVideoRef = useRef<HTMLVideoElement>(null);",
    "const remoteVideoRef = useRef<HTMLVideoElement>(null);",
    "const remoteAudioRef = useRef<HTMLAudioElement>(null);",
    "const peerConnectionRef = useRef<RTCPeerConnection | null>(null);",
    "const localStreamRef = useRef<MediaStream | null>(null);",
    "const isCallActiveRef = useRef(isCallActive);",
    "const hasCallConnectedRef = useRef(false);",
    "useEffect(() => { isCallActiveRef.current = isCallActive; }, [isCallActive]);",
    "const servers = {\n     iceServers: [\n        { urls: 'stun:stun.l.google.com:19302' },\n        { urls: 'stun:stun1.l.google.com:19302' },\n        { urls: 'stun:stun.services.mozilla.com' }\n     ]\n  };"
]
for v in vars_to_remove:
    content = content.replace(v, "")

# remove dialtone effect
content = remove_block(content, "useEffect(() => {\n    dialToneRef.current = new Audio('/dialtone.mp3');")

# remove listeners
listeners_to_remove = [
    r'\.on\([\'"]broadcast[\'"],\s*\{\s*event:\s*[\'"]incoming_call[\'"]\s*\},\s*\(payload\)\s*=>\s*\{[\s\S]*?\}\)(?=\s*\.on|\s*\.subscribe)',
    r'\.on\([\'"]broadcast[\'"],\s*\{\s*event:\s*[\'"]call_ringing[\'"]\s*\},\s*\(payload\)\s*=>\s*\{[\s\S]*?\}\)(?=\s*\.on|\s*\.subscribe)',
    r'\.on\([\'"]broadcast[\'"],\s*\{\s*event:\s*[\'"]call_answered[\'"]\s*\},\s*async\s*\(payload\)\s*=>\s*\{[\s\S]*?\}\)(?=\s*\.on|\s*\.subscribe)',
    r'\.on\([\'"]broadcast[\'"],\s*\{\s*event:\s*[\'"]webrtc_ice_candidate[\'"]\s*\},\s*async\s*\(payload\)\s*=>\s*\{[\s\S]*?\}\)(?=\s*\.on|\s*\.subscribe)',
    r'\.on\([\'"]broadcast[\'"],\s*\{\s*event:\s*[\'"]call_ended[\'"]\s*\},\s*\(payload\)\s*=>\s*\{[\s\S]*?\}\)(?=\s*\.on|\s*\.subscribe)'
]

for pat in listeners_to_remove:
    content = re.sub(pat, '', content, flags=re.DOTALL)

# Add useCall
content = content.replace(
    'import { useWallet } from "../../context/WalletContext";',
    'import { useWallet } from "../../context/WalletContext";\nimport { useCall } from "../../context/CallContext";'
)
content = content.replace('import { CallOverlay } from "./CallOverlay";', '')

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

# Remove CallOverlay jsx
content = re.sub(r'<CallOverlay[\s\S]*?isPiP=\{isPiP\}\s*/>', '', content)


with open('components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)
