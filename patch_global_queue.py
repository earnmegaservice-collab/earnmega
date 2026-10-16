import re

with open('./components/layout/AppShell.tsx', 'r') as f:
    content = f.read()

# Make sure we also check the queue on app open if there are unread gift notifications.
# Modify fetchUnreadCount to also check for unread gift notifications and trigger them
old_fetch = """    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (!error && count !== null) {
        setUnreadCount(count);
      }
    };

    fetchUnreadCount();"""

new_fetch = """    const fetchUnreadCount = async () => {
      const { data, count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (!error && data) {
        setUnreadCount(count || 0);

        // App-Open Supernova: Check for unread gift notifications in the queue
        const unreadGifts = data.filter(n => n.type === 'gift');
        if (unreadGifts.length > 0) {
           // Instantly trigger cinematic 3D gift animation globally for the first unread gift
           // To avoid overlapping, we just show the most recent one or queue them.
           // For simplicity, trigger the first one.
           const latestGift = unreadGifts[0];
           if (latestGift.content) {
             try {
               const parts = latestGift.content.split(':');
               if (parts.length >= 3) {
                 const giftData = { name: parts[1], cost: parseInt(parts[2]) };
                 const senderId = parts.length > 3 ? parts[3] : '';
                 const customEvent = new CustomEvent('gift_received_local', {
                   detail: { giftData: giftData, senderId: senderId, receiverId: user.id }
                 });
                 // Small delay to allow portal to mount
                 setTimeout(() => window.dispatchEvent(customEvent), 500);

                 // Mark as read so it doesn't trigger on next load
                 await supabase.from('notifications').update({ is_read: true }).eq('id', latestGift.id);
               }
             } catch(e) {
               console.error("Error parsing queued gift notification", e);
             }
           }
        }
      }
    };

    fetchUnreadCount();"""

content = content.replace(old_fetch, new_fetch)

with open('./components/layout/AppShell.tsx', 'w') as f:
    f.write(content)
