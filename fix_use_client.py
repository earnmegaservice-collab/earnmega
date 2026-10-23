with open('components/chat/ChatInterface.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.strip() == "import CreateGroupModal from './CreateGroupModal';":
        pass
    else:
        new_lines.append(line)

for i, line in enumerate(new_lines):
    if line.strip() == "import MessageForwardModal from './MessageForwardModal';":
        new_lines.insert(i + 1, "import CreateGroupModal from './CreateGroupModal';\n")
        break

with open('components/chat/ChatInterface.tsx', 'w') as f:
    f.writelines(new_lines)
