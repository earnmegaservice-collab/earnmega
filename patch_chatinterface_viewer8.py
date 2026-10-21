import re

with open('./components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

# I also need to remove isUnlocked: true from StatusViewer mapping
content = re.sub(
    r"\s*isUnlocked: true,",
    "",
    content
)

with open('./components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)

print("Patch 8 applied to ChatInterface.tsx")
