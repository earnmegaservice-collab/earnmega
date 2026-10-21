import re

with open('./components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

# Make sure onUnlock is completely removed
content = re.sub(
    r"              onUnlock=\{async \(statusId\) => \{[\s\S]*?toast\.error\(\"Failed to unlock status\"\);\s*\}\s*\}\}",
    "",
    content
)

# And remove UnlockModal usage if it's there
content = re.sub(
    r"          {unlockModalState\?.isOpen && \([\s\S]*?<UnlockModal[\s\S]*?/>\n          \)}",
    "",
    content
)

with open('./components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)

print("Patch 2 applied to ChatInterface.tsx")
