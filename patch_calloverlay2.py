with open('components/chat/CallOverlay.tsx', 'r') as f:
    content = f.read()

# Add imports for the new icons if needed
if "import { Phone, PhoneOff" in content and "Mic, MicOff, Volume2, VolumeX, SwitchCamera, Maximize2" not in content:
    content = content.replace("import { Phone, PhoneOff } from 'lucide-react';", "import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, SwitchCamera, Maximize2 } from 'lucide-react';")

# Replace the single End Call button for 'connected' state with a control grid
old_footer = """
        ) : (
          <button onClick={onEnd} className="w-24 h-24 mx-auto rounded-full bg-rose-600/90 backdrop-blur-xl flex items-center justify-center text-white shadow-[0_0_40px_rgba(225,29,72,0.6)] border border-rose-400/50 transition-all active:scale-90">
            <PhoneOff size={40} strokeWidth={2.5}/>
          </button>
        )}
"""

new_footer = """
        ) : callState === 'connected' ? (
          <div className="grid grid-cols-3 gap-6 w-full max-w-sm mx-auto p-6 bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <button onClick={onToggleMute} className={`flex flex-col items-center justify-center w-16 h-16 rounded-full transition-all active:scale-90 mx-auto ${isMuted ? 'bg-white/20' : 'bg-white/10'}`}>
              {isMuted ? <MicOff size={24} className="text-white" /> : <Mic size={24} className="text-white" />}
            </button>
            <button onClick={onToggleSpeaker} className={`flex flex-col items-center justify-center w-16 h-16 rounded-full transition-all active:scale-90 mx-auto ${isSpeaker ? 'bg-white/20' : 'bg-white/10'}`}>
              {isSpeaker ? <Volume2 size={24} className="text-white" /> : <VolumeX size={24} className="text-white" />}
            </button>
            <button onClick={onFlipCamera} className="flex flex-col items-center justify-center w-16 h-16 rounded-full transition-all active:scale-90 mx-auto bg-white/10">
              <SwitchCamera size={24} className="text-white" />
            </button>
            <button onClick={onTogglePiP} className="flex flex-col items-center justify-center w-16 h-16 rounded-full transition-all active:scale-90 mx-auto bg-white/10 col-start-2">
              <Maximize2 size={24} className="text-white" />
            </button>
            <button onClick={onEnd} className="flex flex-col items-center justify-center w-16 h-16 rounded-full transition-all active:scale-90 mx-auto bg-rose-600/90 shadow-[0_0_20px_rgba(225,29,72,0.6)] col-start-3">
              <PhoneOff size={24} className="text-white" />
            </button>
          </div>
        ) : (
          <button onClick={onEnd} className="w-24 h-24 mx-auto rounded-full bg-rose-600/90 backdrop-blur-xl flex items-center justify-center text-white shadow-[0_0_40px_rgba(225,29,72,0.6)] border border-rose-400/50 transition-all active:scale-90">
            <PhoneOff size={40} strokeWidth={2.5}/>
          </button>
        )}
"""

content = content.replace(old_footer.strip(), new_footer.strip())

with open('components/chat/CallOverlay.tsx', 'w') as f:
    f.write(content)
