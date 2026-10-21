import re

with open('./components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

# Remove unlockModalState
content = re.sub(r"const \[unlockModalState, setUnlockModalState\] = useState<[^>]+>\(null\);\n\s*", "", content)

# Remove unlockedStatuses
content = re.sub(r"const \[unlockedStatuses, setUnlockedStatuses\] = useState<Set<string>>\(new Set\(\)\);\n\s*", "", content)

# Remove UnlockModal import
content = re.sub(r"const UnlockModal = dynamic\(\(\) => import\(\"../../components/status/UnlockModal\"\), \{ ssr: false \}\);\n\s*", "", content)

# Modify handleStatusClick
new_handleStatusClick = """  const handleStatusClick = (groupId: string, statuses: any[], profile: any) => {
    setViewingStatuses({ groupId, statuses, profile });
  };"""
content = re.sub(
    r"const handleStatusClick = \(groupId: string, statuses: any\[\], profile: any\) => \{[\s\S]*?\n  \};\n",
    new_handleStatusClick + "\n",
    content
)

# Modify StatusViewer usage
# Replace isUnlocked: ... with isUnlocked: true
content = re.sub(
    r"isUnlocked: user\?.id === viewingStatuses\.groupId \|\| unlockedStatuses\.has\(viewingStatuses\.groupId\),",
    "isUnlocked: true,",
    content
)

# Remove onUnlock from StatusViewer
content = re.sub(
    r"              onUnlock=\{async \(statusId\) => \{[\s\S]*?toast\.success\(\"Unlocked successfully!\"\);\n                 \} catch \(error\) \{\n                     toast\.error\(\"Failed to unlock status\"\);\n                 \}\n              \}\}",
    "",
    content
)

with open('./components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)

print("Patch applied to ChatInterface.tsx")
