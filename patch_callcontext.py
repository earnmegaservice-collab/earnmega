import re

with open('context/CallContext.tsx', 'r') as f:
    content = f.read()

# Import the modal
content = content.replace("import { createPortal } from 'react-dom';", "import { createPortal } from 'react-dom';\nimport { DevicePermissionsModal } from '../components/chat/DevicePermissionsModal';")

# Add state
content = content.replace("const [permissionsError, setPermissionsError] = useState(false);", "const [permissionsError, setPermissionsError] = useState(false);\n  const [showPermissionsModal, setShowPermissionsModal] = useState(false);\n  const [pendingCallType, setPendingCallType] = useState<'audio' | 'video' | null>(null);")

# Add initLocalStream wrapper
init_local_stream_str = """const initLocalStream = async (type: 'audio' | 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000 },
        video: type === 'video' ? { facingMode: "user", width: { ideal: 1920 } } : false
      });"""

new_init_local_stream_str = """const initLocalStream = async (type: 'audio' | 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video' ? { width: { ideal: 3840, min: 1920 }, frameRate: { ideal: 60, min: 30 }, facingMode: "user" } : false,
        audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true, sampleRate: 48000, channelCount: 2 }
      });"""

content = content.replace(init_local_stream_str, new_init_local_stream_str)

# We need to wrap initiateCall and acceptCall to check for permissions first, or check inside initLocalStream.
# Wait, checking inside initLocalStream using a Promise that resolves when modal is granted is hard because React state updates.
# Let's change initiateCall and acceptCall:

initiateCall_str = """const initiateCall = async (receiverId: string, receiverName: string, receiverAvatar: string | undefined, type: 'audio' | 'video') => {
     if (!user) return;
     try {
       await initLocalStream(type);"""

new_initiateCall_str = """const initiateCall = async (receiverId: string, receiverName: string, receiverAvatar: string | undefined, type: 'audio' | 'video') => {
     if (!user) return;

     // Check permissions
     if (!localStorage.getItem('av_permissions_granted')) {
         setPendingCallType(type);
         setShowPermissionsModal(true);
         // Stash args
         setCallerInfo({ id: receiverId, name: receiverName, avatar: receiverAvatar || '' });
         setIsIncoming(false);
         setCallState('idle'); // Don't proceed yet
         return;
     }

     executeInitiateCall(receiverId, receiverName, receiverAvatar, type);
  };

  const executeInitiateCall = async (receiverId: string, receiverName: string, receiverAvatar: string | undefined, type: 'audio' | 'video') => {
     try {
       await initLocalStream(type);"""
content = content.replace(initiateCall_str, new_initiateCall_str)

# also need to handle acceptCall
acceptCall_str = """const acceptCall = async () => {
    stopSounds();
    if (!user) return;
    try {
      await initLocalStream(callType);"""

new_acceptCall_str = """const acceptCall = async () => {
    stopSounds();
    if (!user) return;

    if (!localStorage.getItem('av_permissions_granted')) {
         setPendingCallType(callType);
         setShowPermissionsModal(true);
         return;
    }

    executeAcceptCall();
  };

  const executeAcceptCall = async () => {
    try {
      await initLocalStream(callType);"""
content = content.replace(acceptCall_str, new_acceptCall_str)


# Now add the modal to the render
render_modal_str = """<AnimatePresence>
        {permissionsError && ("""

new_render_modal_str = """<AnimatePresence>
        {showPermissionsModal && (
            <DevicePermissionsModal
                onGrant={() => {
                    setShowPermissionsModal(false);
                    localStorage.setItem('av_permissions_granted', 'true');
                    if (isIncoming) {
                        executeAcceptCall();
                    } else if (pendingCallType) {
                        executeInitiateCall(callerInfo.id, callerInfo.name, callerInfo.avatar, pendingCallType);
                    }
                }}
                onDeny={() => {
                    setShowPermissionsModal(false);
                    setPendingCallType(null);
                    if (isIncoming) {
                        declineCall();
                    }
                }}
            />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {permissionsError && ("""
content = content.replace(render_modal_str, new_render_modal_str)


with open('context/CallContext.tsx', 'w') as f:
    f.write(content)
