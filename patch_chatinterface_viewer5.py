import re

with open('./components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

# Let's remove the onUnlock prop using string replacement, it's safer
start_index = content.find("onUnlock={async (statusId) => {")
if start_index != -1:
    # Find the closing brace of the onUnlock prop
    # It ends with: toast.error("Failed to unlock status");\n                 }\n              }}
    end_str = 'toast.error("Failed to unlock status");\n                 }\n              }}'
    end_index = content.find(end_str, start_index)
    if end_index != -1:
        content = content[:start_index] + content[end_index + len(end_str):]
        print("Removed onUnlock prop.")
    else:
        print("Could not find end of onUnlock prop.")
else:
    print("Could not find onUnlock prop.")

with open('./components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)
