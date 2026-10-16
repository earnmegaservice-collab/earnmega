import re

with open('./components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

# Fix the payload for broadcast in handleGiftSent to include receiverId
old_broadcast = """    // Broadcast gift event via Supabase Realtime
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'gift_received',
        payload: { gift_type: giftData, senderId: currentUserProfile?.id }
      });
    }"""

new_broadcast = """    // Broadcast gift event via Supabase Realtime
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'gift_received',
        payload: { gift_type: giftData, senderId: currentUserProfile?.id, receiverId: currentOtherUserProfile?.id }
      });
    }"""

content = content.replace(old_broadcast, new_broadcast)

# Fix the broadcast listener to use receiverId from payload
old_listener = """  useEffect(() => {
    const channel = supabase.channel('chat-events')
      .on('broadcast', { event: 'gift_received' }, (payload) => {
        if (payload.payload.senderId !== currentUserProfile?.id) {
          // Trigger local animation via custom event so GiftOverlay can pick it up instantly for the receiver
          const customEvent = new CustomEvent('gift_received_local', { detail: { giftData: payload.payload.gift_type, senderId: payload.payload.senderId, receiverId: currentUserProfile?.id } });
          window.dispatchEvent(customEvent);

          // We don't necessarily need to add the message here if it's already in the DB and will be fetched,
          // but for optimistic UI (like normal messages), we can add it.
          // Wait, 'new_message' broadcast might already trigger a fetch for this if it's a normal message.
          // Actually, our handleGiftSent does NOT broadcast 'new_message', it only broadcasts 'gift_received'.
          // So we should add it optimistically or fetch. We'll add it optimistically.

          const newMessage: Message = {
            id: Date.now().toString(),
            text: `Received a ${payload.payload.gift_type.name} (${payload.payload.gift_type.cost} Coins)`,
            sender: 'other',
            timestamp: new Date(),
            reactions: [],
            messageType: 'gift',
            giftName: payload.payload.gift_type.name,
            giftCost: payload.payload.gift_type.cost,
          };
          setMessages((prev) => [...prev, newMessage]);
        }
      })"""

new_listener = """  useEffect(() => {
    const channel = supabase.channel('chat-events')
      .on('broadcast', { event: 'gift_received' }, (payload) => {
        // SECURITY GATE: Before mounting the 3D portal or inserting the receipt into the chat feed,
        // verify that the authenticated user's ID exactly matches either the sender_id or receiver_id.
        // If it does not match, ignore the payload entirely.
        if (currentUserProfile?.id !== payload.payload.senderId && currentUserProfile?.id !== payload.payload.receiverId) {
          return; // Ignore entirely if not sender or receiver
        }

        if (payload.payload.senderId !== currentUserProfile?.id) {
          // Trigger local animation via custom event so GiftOverlay can pick it up instantly for the receiver
          const customEvent = new CustomEvent('gift_received_local', { detail: { giftData: payload.payload.gift_type, senderId: payload.payload.senderId, receiverId: payload.payload.receiverId } });
          window.dispatchEvent(customEvent);

          const newMessage: Message = {
            id: Date.now().toString(),
            text: `Received a ${payload.payload.gift_type.name} (${payload.payload.gift_type.cost} Coins)`,
            sender: 'other',
            timestamp: new Date(),
            reactions: [],
            messageType: 'gift',
            giftName: payload.payload.gift_type.name,
            giftCost: payload.payload.gift_type.cost,
          };

          // Only add to chat feed if the current active chat is with the sender
          if (currentOtherUserProfile?.id === payload.payload.senderId) {
             setMessages((prev) => [...prev, newMessage]);
          }
        }
      })"""

content = content.replace(old_listener, new_listener)

with open('./components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)
