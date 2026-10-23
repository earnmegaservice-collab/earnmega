with open('components/chat/ChatList.tsx', 'r') as f:
    content = f.read()

content = content.replace("setActiveFilterTab(tab as any)", "setActiveFilterTab(tab as 'All' | 'Unread' | 'Groups')")

with open('components/chat/ChatList.tsx', 'w') as f:
    f.write(content)
