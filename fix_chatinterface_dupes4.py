with open('components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

import re

# Fix syntax around line 879
content = content.replace(";\n         }\n      });\n\n    channel.subscribe", ";\n\n    channel.subscribe")

with open('components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)
