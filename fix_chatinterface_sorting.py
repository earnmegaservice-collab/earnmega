import re

with open('components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

# Let's restore from original git state to do this cleanly
import subprocess
subprocess.run(["git", "checkout", "components/chat/ChatInterface.tsx"])
