with open("components/chat/ChatInterface.tsx", "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "Double-tap a message to react" in line and "</p>" in lines[i+1]:
        lines.insert(i+2, "        </>\n        )}\n")
        break

with open("components/chat/ChatInterface.tsx", "w") as f:
    f.writelines(lines)
