import re

with open('context/CallContext.tsx', 'r') as f:
    content = f.read()

content = content.replace("import DevicePermissionsModal from '../components/chat/DevicePermissionsModal';", "import { DevicePermissionsModal } from '../components/chat/DevicePermissionsModal';")

with open('context/CallContext.tsx', 'w') as f:
    f.write(content)
