with open('components/chat/ChatInterface.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if "setIncomingCall(null);" in line or "setIsCallActive(false);" in line or "if (localStreamRef.current) {" in line or "if (peerConnectionRef.current) {" in line:
        pass
    else:
        new_lines.append(line)

with open('components/chat/ChatInterface.tsx', 'w') as f:
    f.write("".join(new_lines))
