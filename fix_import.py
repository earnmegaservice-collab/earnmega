with open('components/chat/ChatList.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { MoreVertical, Pin, Trash2, Bell, Check, X } from 'lucide-react';", "import { MoreVertical, Pin, Trash2, Bell, Check, X, Users } from 'lucide-react';")

with open('components/chat/ChatList.tsx', 'w') as f:
    f.write(content)
