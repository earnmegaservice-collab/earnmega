with open('components/chat/ChatInterface.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
has_use_call_import = False
for i, line in enumerate(lines):
    # remove duplicate imports
    if 'import { useCall } from "../../context/CallContext";' in line:
        if has_use_call_import:
            continue
        has_use_call_import = True

    new_lines.append(line)

lines = new_lines
new_lines = []
has_initiate_call_decl = False

for line in lines:
    if 'const { initiateCall } = useCall();' in line:
        if has_initiate_call_decl:
            continue
        has_initiate_call_decl = True

    new_lines.append(line)

with open('components/chat/ChatInterface.tsx', 'w') as f:
    f.write("".join(new_lines))
