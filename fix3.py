with open("components/chat/ChatInterface.tsx", "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "Double-tap a message to react" in line and "</p>" in lines[i+1]:
        # Need to fix AnimatePresence which is closed at line 2703 but opened before
        pass

with open("components/chat/ChatInterface.tsx", "w") as f:
    f.writelines(lines)
