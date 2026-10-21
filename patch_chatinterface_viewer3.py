import re

with open('./components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

# Let's write a targeted regex for the onUnlock prop
content = re.sub(
    r"\s*onUnlock=\{async \(statusId\) => \{[\s\S]*?toast\.error\(\"Failed to unlock status\"\);\n\s*\}\n\s*\}\}",
    "",
    content
)

# And remove UnlockModal usage if it's there
content = re.sub(
    r"\s*\{unlockModalState\?.isOpen && \([\s\S]*?<UnlockModal[\s\S]*?/>\n\s*\)\}",
    "",
    content
)

with open('./components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)

print("Patch 3 applied to ChatInterface.tsx")
