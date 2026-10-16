with open('components/chat/ChatInterface.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if "setOtherUserProfile={setOtherUserProfile}" in line and "isLoading" not in lines[i+1]:
        new_lines.append(line)
        new_lines.append("                  isLoading={isChatsLoading}\n")
    else:
        new_lines.append(line)

with open('components/chat/ChatInterface.tsx', 'w') as f:
    f.writelines(new_lines)
