import re

with open('./components/status/StatusViewer.tsx', 'r') as f:
    content = f.read()

# Remove isUnlocked from StatusItem interface
content = re.sub(r"\s*isUnlocked: boolean;\n", "\n", content)

with open('./components/status/StatusViewer.tsx', 'w') as f:
    f.write(content)

print("Patch 2 applied to StatusViewer.tsx")
