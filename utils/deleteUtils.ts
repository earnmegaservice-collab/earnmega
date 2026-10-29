import { supabase } from './supabase';

export const deleteConversationPermanently = async (userId: string, roomId: string, isGroupChat: boolean, isAdmin: boolean = false) => {
  // 1. Add to local blacklist array for immediate safeguard
  try {
    const deletedList = JSON.parse(localStorage.getItem(`earnmega_deleted_rooms_${userId}`) || '[]');
    if (!deletedList.includes(roomId)) {
       deletedList.push(roomId);
       localStorage.setItem(`earnmega_deleted_rooms_${userId}`, JSON.stringify(deletedList));
    }
  } catch(e) {}

  if (!isGroupChat) {
     // Permanent deletion of 1-on-1 DM
     await supabase.from('messages')
      .delete()
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${roomId}),and(sender_id.eq.${roomId},receiver_id.eq.${userId})`);
  } else if (isGroupChat && isAdmin) {
     // Admin deleting entire Group
     await supabase.from('messages').delete().eq('room_id', roomId);
     await supabase.from('room_participants').delete().eq('room_id', roomId);
     await supabase.from('rooms').delete().eq('id', roomId);
  } else {
     // Non-admin exiting a group chat
     await supabase.from('room_participants').delete().match({ room_id: roomId, user_id: userId });

     // Check if any participants remain
     const { count } = await supabase.from('room_participants').select('*', { count: 'exact', head: true }).eq('room_id', roomId);

     if (count === 0) {
        await supabase.from('messages').delete().eq('room_id', roomId);
        await supabase.from('rooms').delete().eq('id', roomId);
     }
  }
};

export const clearChatPermanently = async (userId: string, roomId: string, isGroupChat: boolean, isAdmin: boolean = false) => {
   if (!isGroupChat) {
      // 1-on-1: Delete all messages
      await supabase.from('messages')
        .delete()
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${roomId}),and(sender_id.eq.${roomId},receiver_id.eq.${userId})`);
   } else if (isGroupChat && isAdmin) {
      // Admin: Delete all messages
      await supabase.from('messages').delete().eq('room_id', roomId);
   } else {
      // Non-admin in group: update cleared_at timestamp to hide previous messages
      await supabase.from('room_participants').update({ cleared_at: new Date().toISOString() }).match({ room_id: roomId, user_id: userId });
   }
};