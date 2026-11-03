import re

def fix():
    with open('components/chat/GroupInfoDrawer.tsx', 'r') as f:
        content = f.read()

    # Add missing import to GroupInfoDrawer
    if "import { saveGroupSettings" not in content:
        content = content.replace("import { supabase } from '../../utils/supabase';", "import { supabase } from '../../utils/supabase';\nimport { saveGroupSettings, fetchGroupSettings } from '../../utils/groupSettingsStore';")

    with open('components/chat/GroupInfoDrawer.tsx', 'w') as f:
        f.write(content)


    with open('components/chat/ChatInterface.tsx', 'r') as f2:
        content2 = f2.read()

    # groupSettings is undefined because my previous patch that defined it got replaced or wasn't injected correctly.
    # Let's see where I tried to define it.

    # Let's inject it cleanly at the top of the component
    match = re.search(r"const isGroupChat = \(\(currentOtherUserProfile as any\)\?\.isGroup\) \|\| false;", content2)
    if match:
         original = match.group(0)
         replacement = """const isGroupChat = ((currentOtherUserProfile as any)?.isGroup) || false;

  const [groupSettings, setGroupSettings] = useState<any>(null);
  useEffect(() => {
     if (isGroupChat && currentOtherUserProfile?.id) {
         supabase.from('messages')
            .select('content')
            .eq('room_id', currentOtherUserProfile.id)
            .eq('system_event_type', 'group_config_sync')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle().then(({data}) => {
                if (data && typeof data.content === 'string' && data.content.startsWith('[GROUP_CONFIG_JSON]')) {
                    try {
                        setGroupSettings(JSON.parse(data.content.replace('[GROUP_CONFIG_JSON]', '')));
                    } catch(e) {}
                }
            });
     }
  }, [currentOtherUserProfile?.id, isGroupChat]);"""
         content2 = content2.replace(original, replacement)
    else:
        # If isGroupChat is missing, it's weird. Let's find another anchor.
        pass

    with open('components/chat/ChatInterface.tsx', 'w') as f2:
        f2.write(content2)


fix()
