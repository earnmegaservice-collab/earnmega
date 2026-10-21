import re

with open('./components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

start_index = content.find("onUnlock={async (statusId) => {")
if start_index != -1:
    # Let's find the closing tag for StatusViewer.
    # We will just replace everything between onUnlock and onSendReply
    end_str = '              onSendReply={async (statusId, text, mediaPreview) => {'
    end_index = content.find(end_str, start_index)
    if end_index != -1:
        content = content[:start_index] + content[end_index:]
        print("Removed onUnlock prop.")
    else:
        print("Could not find onSendReply.")

with open('./components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)
