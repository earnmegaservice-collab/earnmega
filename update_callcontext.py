import re

with open('context/CallContext.tsx', 'r') as f:
    content = f.read()

# I see it already has state properties like callState, isIncoming, callType, callerInfo, duration, isMuted, isSpeaker, isPiP.
# It also has refs for peerConnectionRef, localStreamRef, remoteVideoRef, localVideoRef, remoteAudioRef.
# The only things missing based on the plan are:
# - Add the vibrate call
# - Add hidden audio tag `<audio id="global-ringtone" loop src="/ringtone.mp3" className="hidden" />`

content = content.replace(
    """if (ringtoneRef.current) {
           ringtoneRef.current.play().catch(console.error);
        }""",
    """if (ringtoneRef.current) {
           ringtoneRef.current.play().catch(console.error);
        }

        try {
           const globalRingtone = document.getElementById('global-ringtone') as HTMLAudioElement;
           if (globalRingtone) globalRingtone.play().catch(console.error);
        } catch (e) {}

        if (navigator.vibrate) {
            navigator.vibrate([1000, 1000, 1000, 1000, 1000]);
        }"""
)

content = content.replace(
    """{children}""",
    """{children}
      <audio id="global-ringtone" loop src="/ringtone.mp3" className="hidden" />"""
)

with open('context/CallContext.tsx', 'w') as f:
    f.write(content)
