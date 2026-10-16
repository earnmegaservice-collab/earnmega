with open('components/chat/EarnmegaWalletHeader.tsx', 'r') as f:
    content = f.read()

# Make it subscribe to unread count via supabase directly inside the header, or just pass state. Since NotificationDrawer already fetches notifications, we can lift that state or just duplicate the listener since it's lightweight.
# The prompt says: "The TopNav Bell is completely broken. Wire a Supabase Realtime listener to public.notifications in a useEffect inside the TopNav component."
# Our "TopNav" is EarnmegaWalletHeader.tsx.

imports_old = """
import { Store, Coins, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
"""

imports_new = """
import { Store, Coins, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
"""
if "import { supabase }" not in content:
    content = content.replace(imports_old.strip(), imports_new.strip())

state_old = """
  const { balance, subscriptionTier } = useWallet();
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
"""

state_new = """
  const { user } = useAuth();
  const { balance, subscriptionTier } = useWallet();
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchInitialUnread = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (!error && data) {
        setUnreadNotifications(data.length);
      }
    };
    fetchInitialUnread();

    const channel = supabase.channel('header_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
         setUnreadNotifications(prev => prev + 1);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
         // handle mark as read
         if (payload.new.is_read) {
             setUnreadNotifications(prev => Math.max(0, prev - 1));
         }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Handle Mark All Read logic updates the state from the drawer by listening to UPDATE events or reloading. Wait, the drawer sets all to read via an RPC, so it won't emit individual UPDATE events if done in bulk unless the DB triggers them. To be safe, if we open the drawer, we could clear it when closed.
"""
content = content.replace(state_old.strip(), state_new.strip())

bell_old = """
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsNotificationsOpen(true)}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors relative"
          >
            <Bell size={16} className="text-white/80" />
          </motion.button>
"""

bell_new = """
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setIsNotificationsOpen(true);
              setUnreadNotifications(0); // Optimistically clear
            }}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors relative"
          >
            <Bell size={16} className="text-white/80" />
            {unreadNotifications > 0 && (
                <motion.span
                   initial={{ scale: 0 }}
                   animate={{ scale: 1 }}
                   className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"
                />
            )}
          </motion.button>
"""
content = content.replace(bell_old.strip(), bell_new.strip())

with open('components/chat/EarnmegaWalletHeader.tsx', 'w') as f:
    f.write(content)
