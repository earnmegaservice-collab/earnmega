import re

with open('components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

# I need to hook up join_call to the CallContext in ChatInterface
# But ChatInterface already uses useCall, let's check its imports.

# First, find where useCall is destructured inside ChatInterface
# "const { initiateCall } = useCall();"
# Replace with "const { initiateCall, joinCall } = useCall();"

content = content.replace("const { initiateCall } = useCall();", "const { initiateCall, joinCall } = useCall();")

# Then add a useEffect to listen for join_call
join_call_effect = """  useEffect(() => {
    const handleJoinCall = (e: CustomEvent) => {
       if (e.detail && e.detail.roomId) {
           joinCall(e.detail.roomId, e.detail.type || 'video');
       }
    };
    window.addEventListener('join_call', handleJoinCall as EventListener);
    return () => window.removeEventListener('join_call', handleJoinCall as EventListener);
  }, [joinCall]);
"""

# Let's place it right after const { initiateCall, joinCall } = useCall();
content = content.replace("const { initiateCall, joinCall } = useCall();\n", "const { initiateCall, joinCall } = useCall();\n" + join_call_effect + "\n")

with open('components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)
