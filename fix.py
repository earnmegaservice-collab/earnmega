with open("components/chat/ChatInterface.tsx", "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "onSubmit={handleSendMessage}" in line and "flex items-end bg-white/5 backdrop-blur-2xl border" in lines[i+1]:
        lines.insert(i, "        </AnimatePresence>\n        <form\n")
        break

with open("components/chat/ChatInterface.tsx", "w") as f:
    f.writelines(lines)
