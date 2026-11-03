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

  try {
    await supabase.from('chat_groups').update(rest).eq('id', groupId);
    await supabase.from('rooms').update(rest).eq('id', groupId);
    await supabase.from('conversations').update(rest).eq('id', groupId);
  } catch (e) {
  }

  try {
    localStorage.setItem(`earnmega_group_settings_${groupId}`, JSON.stringify(settings));
  } catch (e) {}

  const jsonString = '[GROUP_CONFIG_JSON]' + JSON.stringify({ ...settings, updated_at: Date.now() });

  await supabase.from('messages').insert({
    room_id: groupId,
    sender_id: userId,
    content: jsonString,
    is_read: true
  });
};

export const fetchGroupSettings = async (groupId: string): Promise<GroupConfigSnapshot | null> => {
  let localSettings: GroupConfigSnapshot | null = null;
  try {
    const local = localStorage.getItem(`earnmega_group_settings_${groupId}`);
    if (local) {
      localSettings = JSON.parse(local);
    }
  } catch (e) {}

  const { data, error } = await supabase
    .from('messages')
    .select('content')
    .eq('room_id', groupId)
    .like('content', '[GROUP_CONFIG_JSON]%')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data && data.content && typeof data.content === 'string' && data.content.startsWith('[GROUP_CONFIG_JSON]')) {
    try {
      const jsonStr = data.content.replace('[GROUP_CONFIG_JSON]', '');
      return JSON.parse(jsonStr) as GroupConfigSnapshot;
    } catch (e) {
    }
  }

  return localSettings;
};
