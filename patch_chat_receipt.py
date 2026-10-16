import re

with open('./components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

# Update handleGiftSent optimistic text
old_handleGiftSent = """    const newMessage: Message = {
      id: Date.now().toString(),
      text: `🎁 Sent a **${giftData.name}** gift!`,
      sender: 'user',
      timestamp: new Date(),
      status: 'sent',
      reactions: [],
      messageType: 'gift',
      giftName: giftData.name,
      giftCost: giftData.cost,
    };"""

new_handleGiftSent = """    const newMessage: Message = {
      id: Date.now().toString(),
      text: `Sent a ${giftData.name} (${giftData.cost} Coins)`,
      sender: 'user',
      timestamp: new Date(),
      status: 'sent',
      reactions: [],
      messageType: 'gift',
      giftName: giftData.name,
      giftCost: giftData.cost,
    };"""

content = content.replace(old_handleGiftSent, new_handleGiftSent)

# Render the luxury chat receipt in ChatInterface.tsx instead of standard text bubble
# Find where message is rendered
old_message_render = """              <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[75%]`}>
                {message.replyToId && (
                  <div className="mb-1 text-xs opacity-70 bg-black/20 rounded p-1 max-w-xs truncate cursor-pointer hover:opacity-100" onClick={() => {
                     // In a real app, this would scroll to the replied message
                  }}>
                    Replying to {message.replyToSender === 'user' ? 'yourself' : currentOtherUserProfile?.name}: {message.replyToText}
                  </div>
                )}

                <motion.div
                  onDoubleClick={() => !message.isDeleted && handleReaction(message.id, '❤️')}
                  {...bindLongPress(message.id)}
                  className={`relative p-3 shadow-lg ${
                    message.isDeleted ? 'bg-transparent border border-white/10 text-gray-500 italic rounded-2xl' :
                    message.messageType === 'missed_call' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl backdrop-blur-xl' :
                    message.messageType === 'completed_call' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl backdrop-blur-xl' :
                    isUser
                      ? 'bg-gradient-to-br from-amber-500/20 to-orange-600/20 backdrop-blur-xl border border-amber-500/30 text-white rounded-2xl rounded-tr-sm'
                      : 'bg-white/5 backdrop-blur-xl border border-white/10 text-gray-100 rounded-2xl rounded-tl-sm'
                  }`}
                >"""

new_message_render = """              <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[75%]`}>
                {message.replyToId && (
                  <div className="mb-1 text-xs opacity-70 bg-black/20 rounded p-1 max-w-xs truncate cursor-pointer hover:opacity-100" onClick={() => {
                     // In a real app, this would scroll to the replied message
                  }}>
                    Replying to {message.replyToSender === 'user' ? 'yourself' : currentOtherUserProfile?.name}: {message.replyToText}
                  </div>
                )}

                <motion.div
                  onDoubleClick={() => !message.isDeleted && handleReaction(message.id, '❤️')}
                  {...bindLongPress(message.id)}
                  className={`relative p-3 shadow-lg ${
                    message.isDeleted ? 'bg-transparent border border-white/10 text-gray-500 italic rounded-2xl' :
                    message.messageType === 'missed_call' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl backdrop-blur-xl' :
                    message.messageType === 'completed_call' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl backdrop-blur-xl' :
                    message.messageType === 'gift' ? (
                       (message.giftCost && message.giftCost >= 1000)
                       ? 'bg-black/40 backdrop-blur-3xl border-2 border-transparent bg-gradient-to-r from-purple-500 via-fuchsia-500 to-amber-500 bg-[length:200%_auto] animate-gradient text-white font-bold rounded-3xl'
                       : 'bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-xl border border-pink-500/40 text-white font-semibold rounded-3xl'
                    ) :
                    isUser
                      ? 'bg-gradient-to-br from-amber-500/20 to-orange-600/20 backdrop-blur-xl border border-amber-500/30 text-white rounded-2xl rounded-tr-sm'
                      : 'bg-white/5 backdrop-blur-xl border border-white/10 text-gray-100 rounded-2xl rounded-tl-sm'
                  }`}
                  style={message.messageType === 'gift' && message.giftCost && message.giftCost >= 1000 ? {
                     backgroundClip: 'padding-box, border-box',
                     backgroundOrigin: 'padding-box, border-box',
                     backgroundImage: 'linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), linear-gradient(to right, #a855f7, #d946ef, #f59e0b)'
                  } : {}}
                >"""

content = content.replace(old_message_render, new_message_render)

# Format text inside for gifts
old_text_render = """                  {/* Text Content */}
                  {message.text && !message.isDeleted && (
                    <div className="text-[15px] leading-snug whitespace-pre-wrap break-words">
                      {formatText(message.text)}
                    </div>
                  )}"""

new_text_render = """                  {/* Text Content */}
                  {message.text && !message.isDeleted && (
                    <div className="text-[15px] leading-snug whitespace-pre-wrap break-words">
                      {message.messageType === 'gift' && message.giftCost && message.giftCost >= 1000 ? (
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-amber-200 animate-pulse drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] flex items-center space-x-2">
                           <Gift size={18} className="text-amber-400 mr-2" />
                           {formatText(message.text)}
                        </span>
                      ) : message.messageType === 'gift' ? (
                        <span className="flex items-center text-pink-100 drop-shadow-md">
                           <Gift size={16} className="text-pink-400 mr-2" />
                           {formatText(message.text)}
                        </span>
                      ) : (
                        formatText(message.text)
                      )}
                    </div>
                  )}"""

content = content.replace(old_text_render, new_text_render)

with open('./components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)
