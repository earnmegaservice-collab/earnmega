import re

with open('components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

# Let's cleanly match handleAcceptCall from line "const handleAcceptCall = async () => {" to the closing matching bracket.
def find_matching_brace(text, start_index):
    count = 0
    for i in range(start_index, len(text)):
        if text[i] == '{':
            count += 1
        elif text[i] == '}':
            count -= 1
            if count == 0:
                return i
    return -1

# Remove handleAcceptCall
match = re.search(r'const\s+handleAcceptCall\s*=\s*async\s*\(\)\s*=>\s*\{', content)
if match:
    start_idx = match.start()
    brace_idx = content.find('{', start_idx)
    end_idx = find_matching_brace(content, brace_idx)
    if end_idx != -1:
        # Also include the closing semicolon/newline if present
        if end_idx + 1 < len(content) and content[end_idx+1] == ';':
            end_idx += 1
        content = content[:start_idx] + content[end_idx+1:]

# Do the same for handleCreateGroup (wait, I should keep handleCreateGroup, but wait, there was no handleCreateGroup error, error was line 401 which is part of handleAcceptCall or similar)
# Also remove handleEndCall
match = re.search(r'const\s+handleEndCall\s*=\s*\(\)\s*=>\s*\{', content)
if match:
    start_idx = match.start()
    brace_idx = content.find('{', start_idx)
    end_idx = find_matching_brace(content, brace_idx)
    if end_idx != -1:
        if end_idx + 1 < len(content) and content[end_idx+1] == ';':
            end_idx += 1
        content = content[:start_idx] + content[end_idx+1:]

with open('components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)
