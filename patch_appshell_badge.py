import re

with open('./components/layout/AppShell.tsx', 'r') as f:
    content = f.read()

# Fix the badge count capping logic to just be exact as requested
old_badge = """{unreadCount > 9 ? '9+' : unreadCount}"""
new_badge = """{unreadCount}"""

content = content.replace(old_badge, new_badge)

with open('./components/layout/AppShell.tsx', 'w') as f:
    f.write(content)
