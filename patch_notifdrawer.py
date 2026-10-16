with open('components/notifications/NotificationDrawer.tsx', 'r') as f:
    content = f.read()

# Replace the notification map logic to match the new Vision Pro style
old_map = """
              {notifications.length === 0 ? (
                <p className="text-white/50 text-center mt-10">No notifications yet</p>
              ) : (
                notifications.map(notif => (
                  <motion.div
                    key={notif.id}
                    variants={{
                      hidden: { opacity: 0, x: 20 },
                      show: { opacity: 1, x: 0 }
                    }}
                    className={`p-3 rounded-xl border ${notif.is_read ? 'bg-white/5 border-white/5' : 'bg-amber-500/10 border-amber-500/20'}`}
                  >
                    <p className={`text-sm ${notif.is_read ? 'text-white/70' : 'text-amber-100 font-medium'}`}>{notif.content}</p>
                    <p className="text-xs text-white/40 mt-2">{new Date(notif.created_at).toLocaleString()}</p>
                  </motion.div>
                ))
              )}
"""

new_map = """
              {notifications.length === 0 ? (
                <p className="text-white/50 text-center mt-10">No notifications yet</p>
              ) : (
                <div className="flex flex-col gap-1 p-2">
                  {notifications.map((notif, idx) => (
                    <motion.div
                      key={notif.id}
                      variants={{
                        hidden: { opacity: 0, x: 20 },
                        show: { opacity: 1, x: 0 }
                      }}
                      className={`relative flex items-start gap-4 p-4 rounded-2xl transition-all ${notif.is_read ? 'hover:bg-white/5' : 'bg-indigo-500/10 border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.1)]'}`}
                    >
                      {!notif.is_read && <div className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] animate-pulse" />}
                      <div className="flex flex-col flex-1 pl-4">
                        <span className="text-sm font-bold text-white leading-tight">Notification</span>
                        <span className="text-xs text-white/50 mt-1">{notif.content}</span>
                        <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider mt-2">{new Date(notif.created_at).toLocaleString()}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
"""

content = content.replace(old_map.strip(), new_map.strip())

# The container already matches somewhat the requested UI, but let's update the Drawer container classes
old_drawer = """
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-80 bg-neutral-950/95 backdrop-blur-3xl border-l border-white/10 z-50 flex flex-col shadow-2xl"
          >
"""

new_drawer = """
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, scale: 0.95, filter: "blur(10px)" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute top-20 right-4 w-[340px] max-h-[500px] overflow-y-auto bg-neutral-950/80 backdrop-blur-[60px] border border-white/10 rounded-[2rem] shadow-[0_40px_100px_rgba(0,0,0,0.9)] z-[999] p-2 flex flex-col"
          >
"""
content = content.replace(old_drawer.strip(), new_drawer.strip())

# Let's clean up header of the drawer
old_header = """
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex flex-row items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-amber-400 hover:text-amber-300 font-medium">Mark all read</button>
                )}
                <button onClick={() => onClose?.()} className="p-2 text-white/60 hover:text-white rounded-full bg-white/5">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
"""

new_header = """
             <div className="flex justify-between items-center px-5 py-4 border-b border-white/5">
               <h3 className="text-white font-black text-lg tracking-tight">Activity</h3>
               <div className="flex flex-row items-center gap-3">
                  <button onClick={markAllAsRead} className="text-[11px] uppercase tracking-widest text-indigo-400 font-bold hover:text-indigo-300 transition-colors">Mark Read</button>
                  <button onClick={() => onClose?.()} className="text-white/60 hover:text-white"><X size={16}/></button>
               </div>
             </div>
"""
content = content.replace(old_header.strip(), new_header.strip())

with open('components/notifications/NotificationDrawer.tsx', 'w') as f:
    f.write(content)
