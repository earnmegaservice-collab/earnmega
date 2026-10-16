import re

with open('components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

# Fix syntax error caused by incomplete removal
content = re.sub(r'const handleAcceptCall.*?\} catch \(err\) \{.*?handleEndCall\(\);\n\s*\}\n\s*\};\n', '', content, flags=re.DOTALL)
content = re.sub(r'const handleInitiateCall.*?\} catch \(err\) \{.*?handleEndCall\(\);\n\s*\}\n\s*\};\n', '', content, flags=re.DOTALL)

with open('components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)
