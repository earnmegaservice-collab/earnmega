import re

with open('components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

# Let's verify and force the updated_at DESC sorting for the main inbox query (exploreUsers/profiles)
old_query = ".from('profiles').select('*').limit(20)"
new_query = ".from('profiles').select('*').order('updated_at', { ascending: false }).limit(20)"
content = content.replace(old_query, new_query)

# Let's fix the event listener to be completely sure it's there
event_listener = """
  useEffect(() => {
    const handleInitiateCall = (e: any) => {
      initiateCall(e.detail.id, currentOtherUserProfile?.name || 'User', currentOtherUserProfile?.avatarUrl, e.detail.type);
    };
    window.addEventListener('initiate_call', handleInitiateCall);
    return () => window.removeEventListener('initiate_call', handleInitiateCall);
  }, [initiateCall, currentOtherUserProfile]);
"""
if "handleInitiateCall" not in content:
    content = content.replace(
        "const ChatInterface: React.FC<ChatInterfaceProps> = ({ activeTab, setAppTab }) => {\n  const { initiateCall } = useCall();",
        "const ChatInterface: React.FC<ChatInterfaceProps> = ({ activeTab, setAppTab }) => {\n  const { initiateCall } = useCall();\n" + event_listener
    )


with open('components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)
