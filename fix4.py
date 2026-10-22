with open("components/chat/ChatInterface.tsx", "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "         {isGroupModalOpen && (" in line:
        lines.insert(i, "      <AnimatePresence>\n")
        break

with open("components/chat/ChatInterface.tsx", "w") as f:
    f.writelines(lines)
