with open("components/chat/ChatInterface.tsx", "r") as f:
    text = f.read()

# Make sure we ignore incoming payloads if blocked for postgres_changes
text = text.replace("""    const channel = supabase.channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload: any) => {
          if (payload.new && (payload.new.receiver_id === user.id || payload.new.sender_id === user.id || payload.new.room_id)) {""", """    const channel = supabase.channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload: any) => {
          if (isBlockedRef.current) return;
          if (payload.new && (payload.new.receiver_id === user.id || payload.new.sender_id === user.id || payload.new.room_id)) {""")

with open("components/chat/ChatInterface.tsx", "w") as f:
    f.write(text)
