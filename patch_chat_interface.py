import re

with open('components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

# Add call_started handling

call_started_ui = """  if (message.messageType === 'call_started') {
  return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col p-4 rounded-3xl bg-emerald-950/40 border border-emerald-500/40 w-[300px] my-3 backdrop-blur-xl shadow-2xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
             <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <Video size={24}/>
             </div>
             <div className="flex flex-col">
                <span className="text-emerald-400 font-extrabold text-[16px] tracking-wide">Call in Progress</span>
                <span className="text-emerald-300/60 text-xs font-medium mt-0.5 animate-pulse">Live now</span>
             </div>
          </div>

          <button
             onClick={() => window.dispatchEvent(new CustomEvent('join_call', { detail: { roomId: message.room_id || message.sender_id, type: 'video' } }))}
             className="w-full py-3.5 bg-emerald-500/20 hover:bg-emerald-500/40 rounded-2xl text-sm font-black text-emerald-300 transition-all active:scale-95 border border-emerald-500/30 uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
          >
             <Phone size={16} /> Join Call
          </button>
        </motion.div>
     );
  }"""

content = content.replace("  if (message.messageType === 'completed_call') {", call_started_ui + "\n\n  if (message.messageType === 'completed_call') {")

with open('components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)
