import re

with open('context/CallContext.tsx', 'r') as f:
    content = f.read()

# Fix 1: The caller must join their own ID room for 1-on-1 calls, so the receiver joins the caller's room.
# In executeInitiateCall:
# currentRoomIdRef.current = receiverId; -> currentRoomIdRef.current = isGroup ? receiverId : user!.id;
# await joinCallRoom(receiverId); -> await joinCallRoom(isGroup ? receiverId : user!.id);

content = content.replace("currentRoomIdRef.current = receiverId;", "currentRoomIdRef.current = isGroup ? receiverId : user!.id;")
content = content.replace("await joinCallRoom(receiverId);", "await joinCallRoom(isGroup ? receiverId : user!.id);")

with open('context/CallContext.tsx', 'w') as f:
    f.write(content)

with open('components/chat/CallOverlay.tsx', 'r') as f:
    overlay_content = f.read()

# Fix 2: Don't attach to audio tag if it's a video call.
# <audio ref={audioRef} autoPlay playsInline className="hidden" />
# -> {stream.getVideoTracks().length === 0 && !isLocal && <audio ref={audioRef} autoPlay playsInline className="hidden" />}

overlay_content = overlay_content.replace("{!isLocal && <audio ref={audioRef} autoPlay playsInline className=\"hidden\" />}", "{stream.getVideoTracks().length === 0 && !isLocal && <audio ref={audioRef} autoPlay playsInline className=\"hidden\" />}")

with open('components/chat/CallOverlay.tsx', 'w') as f:
    f.write(overlay_content)
