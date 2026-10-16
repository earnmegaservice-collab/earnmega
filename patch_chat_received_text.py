import re

with open('./components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

# Make sure received messages also format optimistic text similarly
old_received = """          const newMessage: Message = {
            id: Date.now().toString(),
            text: `🎁 Received a **${payload.payload.gift_type.name}** gift!`,
            sender: 'other',
            timestamp: new Date(),
            reactions: [],
            messageType: 'gift',
            giftName: payload.payload.gift_type.name,
            giftCost: payload.payload.gift_type.cost,
          };"""

new_received = """          const newMessage: Message = {
            id: Date.now().toString(),
            text: `Received a ${payload.payload.gift_type.name} (${payload.payload.gift_type.cost} Coins)`,
            sender: 'other',
            timestamp: new Date(),
            reactions: [],
            messageType: 'gift',
            giftName: payload.payload.gift_type.name,
            giftCost: payload.payload.gift_type.cost,
          };"""

content = content.replace(old_received, new_received)

with open('./components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)
