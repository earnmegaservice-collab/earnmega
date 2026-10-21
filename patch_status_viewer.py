import re

with open('./components/status/StatusViewer.tsx', 'r') as f:
    content = f.read()

# Remove userCoins from props
content = re.sub(r"\s*userCoins: number;\n", "\n", content)
content = re.sub(r"\s*userCoins,\n", "\n", content)

# Remove onUnlock from props
content = re.sub(r"\s*onUnlock: \(statusId: string\) => Promise<boolean>;\n", "\n", content)
content = re.sub(r"\s*onUnlock,\n", "\n", content)

# Remove isUnlocking state
content = re.sub(r"\s*const \[isUnlocking, setIsUnlocking\] = useState\(false\);\n", "\n", content)

# Remove isUnlocked state since it will always be true
content = re.sub(r"\s*const \[isUnlocked, setIsUnlocked\] = useState\(statuses\[0\]\?.isUnlocked \|\| statuses\[0\]\?.isOwner\);\n\s*React\.useEffect\(\(\) => \{ setIsUnlocked\(status\?.isUnlocked \|\| status\?.isOwner\) \}, \[currentIndex, status\]\);\n", "\n", content)

# Replace !isUnlocked checks to just be empty strings or truthy values to bypass
content = re.sub(r"\!isUnlocked \? 'filter blur-3xl scale-110 brightness-50' : 'filter-none scale-100'", "'filter-none scale-100'", content)
content = re.sub(r"\!isUnlocked \? 'filter blur-2xl brightness-50' : ''", "''", content)
content = re.sub(r"loop=\{isUnlocked\}", "loop={true}", content)
content = re.sub(r"if \(\!isUnlocked\) return;", "", content)

# Remove the paywall div
paywall_regex = r"\{/\* 10-COIN PAYWALL \*/\}\s*\{\!isUnlocked && \([\s\S]*?</div>\n\s*\)\}"
content = re.sub(paywall_regex, "", content)

# Replace {isUnlocked && !isCinematic && ( with {!isCinematic && (
content = re.sub(r"\{isUnlocked && \!isCinematic && \(", "{!isCinematic && (", content)

# Remove handleUnlockClick
unlock_click_regex = r"const handleUnlockClick = async \(\) => \{[\s\S]*?setIsUnlocking\(false\);\n  \};\n"
content = re.sub(unlock_click_regex, "", content)

# submitReply check for !isUnlocked
content = re.sub(r"if \(\!replyText\.trim\(\) \|\| \!isUnlocked\) return;", "if (!replyText.trim()) return;", content)


with open('./components/status/StatusViewer.tsx', 'w') as f:
    f.write(content)

print("Patch applied to StatusViewer.tsx")
