import re

with open('./components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

# Let's write a targeted regex for the onUnlock prop
content = re.sub(
    r"\s*onUnlock=\{async \(statusId\) => \{[\s\S]*?toast\.error\(\"Failed to unlock status\"\);\n                 \}\n              \}\}",
    "",
    content
)

with open('./components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)

print("Patch 4 applied to ChatInterface.tsx")
