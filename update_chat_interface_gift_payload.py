import re

with open('./components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

# Update the custom event payloads to include receiverId
content = content.replace(
    "const customEvent = new CustomEvent('gift_received_local', { detail: { giftData: payload.payload.gift_type, senderId: payload.payload.senderId } });",
    "const customEvent = new CustomEvent('gift_received_local', { detail: { giftData: payload.payload.gift_type, senderId: payload.payload.senderId, receiverId: currentUserProfile?.id } });"
)

content = content.replace(
    "const customEvent = new CustomEvent('gift_received_local', { detail: { giftData: giftData, senderId: currentUserProfile?.id, isSender: true } });",
    "const customEvent = new CustomEvent('gift_received_local', { detail: { giftData: giftData, senderId: currentUserProfile?.id, receiverId: currentOtherUserProfile?.id, isSender: true } });"
)

with open('./components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)
