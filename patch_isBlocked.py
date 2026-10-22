with open("components/chat/ChatInterface.tsx", "r") as f:
    text = f.read()

# Make sure we ignore incoming payloads if blocked
# Look for on('broadcast', { event: 'new_message' }
text = text.replace("""      .on('broadcast', { event: 'new_message' }, async (payload) => {
        if (payload.payload.receiverId === currentUserProfile?.id || (payload.payload.roomId && Array.from(exploreUsers).some((u: any) => u.isGroup && u.id === payload.payload.roomId))) {""", """      .on('broadcast', { event: 'new_message' }, async (payload) => {
        if (isBlockedRef.current) return;
        if (payload.payload.receiverId === currentUserProfile?.id || (payload.payload.roomId && Array.from(exploreUsers).some((u: any) => u.isGroup && u.id === payload.payload.roomId))) {""")

with open("components/chat/ChatInterface.tsx", "w") as f:
    f.write(text)
