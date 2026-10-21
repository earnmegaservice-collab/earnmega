import re

with open('./components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

# I also need to remove userCoins prop from StatusViewer
content = re.sub(
    r"\s*userCoins=\{balance\}",
    "",
    content
)

with open('./components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)

print("Patch 7 applied to ChatInterface.tsx")
