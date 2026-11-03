import re

def fix_chat_interface():
    with open('components/chat/ChatInterface.tsx', 'r') as f:
        content = f.read()

    # 1. Type guard formatText
    content = content.replace("const formatText = (text: string) => {", "const formatText = (text: string) => {\n  if (typeof text !== 'string') return text;\n")

    # 2. Block 1 & 2: Update realtime channel dependencies and currentOtherUserProfileRef
    content = re.sub(
        r'const channel = supabase\.channel\(channelId\)',
        r'const currentOtherUserProfileRef = useRef(currentOtherUserProfile);\n    const groupMembersRef = useRef(groupMembers);\n\n    useEffect(() => {\n        currentOtherUserProfileRef.current = currentOtherUserProfile;\n    }, [currentOtherUserProfile]);\n    useEffect(() => {\n        groupMembersRef.current = groupMembers;\n    }, [groupMembers]);\n\n    const channel = supabase.channel(channelId)',
        content
    )

    # 3. Use Ref in postgres_changes
    content = content.replace("if (currentOtherUserProfile && !(currentOtherUserProfile as any).isGroup)", "const activeProfile = currentOtherUserProfileRef.current;\n              if (activeProfile && !(activeProfile as any).isGroup)")
    content = content.replace("if (currentOtherUserProfile && (currentOtherUserProfile as any).isGroup)", "if (activeProfile && (activeProfile as any).isGroup)")
    content = content.replace("currentOtherUserProfile.id", "activeProfile.id")

    with open('components/chat/ChatInterface.tsx', 'w') as f:
        f.write(content)

fix_chat_interface()
