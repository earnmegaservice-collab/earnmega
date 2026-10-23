import re

with open('components/chat/ChatList.tsx', 'r') as f:
    content = f.read()

# Add activeFilterTab state
state_code = r"""  // Filter State
  const [activeFilterTab, setActiveFilterTab] = useState<'All' | 'Unread' | 'Groups'>('All');

  // Ref to trigger re-renders"""

content = content.replace("  // Ref to trigger re-renders", state_code)

# Add Filter Pills below the Search Bar
search_bar_old = r"""          <div className="relative flex items-center">
            <Search size={18} className="absolute left-4 text-white/40" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 backdrop-blur-md rounded-[20px] pl-12 pr-4 py-3.5 text-sm text-white font-medium placeholder-white/30 outline-none border border-white/10 focus:border-fuchsia-500/50 focus:bg-white/10 transition-all shadow-inner"
            />
          </div>
        </motion.div>"""

search_bar_new = r"""          <div className="relative flex items-center">
            <Search size={18} className="absolute left-4 text-white/40" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 backdrop-blur-md rounded-[20px] pl-12 pr-4 py-3.5 text-sm text-white font-medium placeholder-white/30 outline-none border border-white/10 focus:border-fuchsia-500/50 focus:bg-white/10 transition-all shadow-inner"
            />
          </div>

          {/* Horizontal Filter Pills */}
          <div className="flex items-center space-x-2 mt-4 overflow-x-auto custom-scrollbar pb-1">
            {['All', 'Unread', 'Groups'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilterTab(tab as any)}
                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all shadow-sm flex-shrink-0 ${
                  activeFilterTab === tab
                    ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.2)]'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/5 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </motion.div>"""

content = content.replace(search_bar_old, search_bar_new)

# Apply filter before sorting
filter_old = r"""  const sortedUsers = [...filteredUsers].sort((a, b) => {"""
filter_new = r"""  const finalFilteredUsers = filteredUsers.filter(u => {
    if (activeFilterTab === 'Unread') return (u.unreadCount ?? 0) > 0;
    if (activeFilterTab === 'Groups') return u.isGroup === true;
    return true;
  });

  const sortedUsers = [...finalFilteredUsers].sort((a, b) => {"""

content = content.replace(filter_old, filter_new)

# Apply group visual styling in avatar
avatar_old = r"""                    <div className={`relative w-[64px] h-[64px] rounded-full flex-shrink-0 flex items-center justify-center shadow-xl transition-transform active:scale-90 ${
                      isPremiumUser ? 'p-[2px]' : 'border-2 border-white/10 bg-white/5'
                    } ${getStatusRingClass(u.id)}`}>
                      {isPremiumUser && (
                        <div className="absolute inset-[-2px] rounded-full bg-gradient-to-tr from-amber-400 via-fuchsia-500 to-amber-400 animate-spin-slow shadow-[0_0_15px_rgba(217,70,239,0.3)]" />
                      )}
                      <div className="relative w-full h-full rounded-full bg-[#111418] flex items-center justify-center overflow-hidden z-10 border-2 border-[#050505]">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <span className="text-white font-black text-xl">{u.avatarInitials}</span>
                        )}
                      </div>
                      {u.isOnline && (
                        <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-[3px] border-[#050505] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)] z-20" />
                      )}
                    </div>"""

avatar_new = r"""                    <div className={`relative w-[64px] h-[64px] rounded-full flex-shrink-0 flex items-center justify-center shadow-xl transition-transform active:scale-90 ${
                      u.isGroup ? 'p-[2px]' : (isPremiumUser ? 'p-[2px]' : 'border-2 border-white/10 bg-white/5')
                    } ${getStatusRingClass(u.id)}`}>
                      {u.isGroup && (
                        <div className="absolute inset-[-2px] rounded-full bg-gradient-to-tr from-fuchsia-600 via-purple-500 to-indigo-500 opacity-80 shadow-[0_0_15px_rgba(168,85,247,0.4)]" />
                      )}
                      {isPremiumUser && !u.isGroup && (
                        <div className="absolute inset-[-2px] rounded-full bg-gradient-to-tr from-amber-400 via-fuchsia-500 to-amber-400 animate-spin-slow shadow-[0_0_15px_rgba(217,70,239,0.3)]" />
                      )}
                      <div className="relative w-full h-full rounded-full bg-[#111418] flex items-center justify-center overflow-hidden z-10 border-2 border-[#050505]">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          u.isGroup ? (
                              <div className="w-full h-full flex flex-wrap items-center justify-center bg-white/10 p-1">
                                 <Users size={28} className="text-white/70" />
                              </div>
                          ) : (
                              <span className="text-white font-black text-xl">{u.avatarInitials}</span>
                          )
                        )}
                      </div>
                      {u.isOnline && (
                        <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-[3px] border-[#050505] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)] z-20" />
                      )}
                    </div>"""

content = content.replace(avatar_old, avatar_new)

if 'Users' not in content:
    content = content.replace('MoreVertical, Pin, Trash2, Bell, Check, X', 'MoreVertical, Pin, Trash2, Bell, Check, X, Users')

with open('components/chat/ChatList.tsx', 'w') as f:
    f.write(content)

print("ChatList patched.")
