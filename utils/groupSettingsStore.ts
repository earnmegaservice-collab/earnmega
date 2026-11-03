import { supabase } from './supabase';

export interface GroupConfigSnapshot {
  groupId: string;
  name?: string;
  bio?: string;
  avatar_url?: string;
  invite_code?: string;
  only_admins_can_send?: boolean;
  only_admins_can_edit_info?: boolean;
  only_admins_can_add_members?: boolean;
  approve_new_members?: boolean;
  updated_at: number;
}

export const saveGroupSettings = async (settings: GroupConfigSnapshot, userId: string) => {
  const { groupId, ...rest } = settings;

  // 1. Attempt normal column update (fail silently if columns don't exist)
  try {
    await supabase.from('chat_groups').update(rest).eq('id', groupId);
    await supabase.from('rooms').update(rest).eq('id', groupId);
    await supabase.from('conversations').update(rest).eq('id', groupId);
  } catch (e) {
    // Ignore schema errors
  }

  // 2. Save canonical JSON snapshot
  const jsonString = '[GROUP_CONFIG_JSON]' + JSON.stringify({ ...settings, updated_at: Date.now() });

  await supabase.from('messages').insert({
    room_id: groupId,
    sender_id: userId,
    receiver_id: groupId,
    message_type: 'system',
    system_event_type: 'group_config_sync',
    content: jsonString,
    is_system_message: true,
  });
};

export const fetchGroupSettings = async (groupId: string): Promise<GroupConfigSnapshot | null> => {
  const { data, error } = await supabase
    .from('messages')
    .select('content')
    .eq('room_id', groupId)
    .eq('system_event_type', 'group_config_sync')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data && data.content && typeof data.content === 'string' && data.content.startsWith('[GROUP_CONFIG_JSON]')) {
    try {
      const jsonStr = data.content.replace('[GROUP_CONFIG_JSON]', '');
      return JSON.parse(jsonStr) as GroupConfigSnapshot;
    } catch (e) {
      return null;
    }
  }
  return null;
};
