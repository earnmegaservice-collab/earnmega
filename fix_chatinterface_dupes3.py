with open('components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

import re

# Looks like it's inside `call_ended` listener which I failed to fully remove.
listeners_to_remove = [
    r'\.on\([\'"]broadcast[\'"],\s*\{\s*event:\s*[\'"]call_ended[\'"]\s*\},\s*\(payload\)\s*=>\s*\{[\s\S]*?\}\)(?=\s*\.on|\s*\.subscribe|;)',
]

for pat in listeners_to_remove:
    content = re.sub(pat, '', content, flags=re.DOTALL)

with open('components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)
