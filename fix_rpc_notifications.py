import re

with open('components/notifications/NotificationDrawer.tsx', 'r') as f:
    content = f.read()

# Change the mark all as read to use a Supabase RPC
rpc_call = """
  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    const { error } = await supabase.rpc('mark_all_notifications_read', { p_user_id: user.id });

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("All caught up!");
    } else {
      toast.error("Failed to mark as read");
    }
  };
"""

content = re.sub(r'const markAllAsRead = async \(\) => \{[\s\S]*?toast\.error\("Failed to mark as read"\);\s*\}\s*\};', rpc_call.strip(), content)

with open('components/notifications/NotificationDrawer.tsx', 'w') as f:
    f.write(content)
