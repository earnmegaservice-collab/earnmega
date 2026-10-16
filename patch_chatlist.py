with open('components/chat/ChatList.tsx', 'r') as f:
    content = f.read()

# Replace the current isLoading logic with the new Holographic Skeleton Loader and update the chat map
old_render = """
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={`skeleton-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
                className="flex items-center w-full p-4 rounded-2xl bg-white/5"
              >
                <div className="w-14 h-14 rounded-full bg-white/10 flex-shrink-0" />
                <div className="flex-1 ml-4 space-y-2">
                  <div className="h-4 bg-white/10 rounded-full w-1/3" />
                  <div className="h-3 bg-white/10 rounded-full w-2/3" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
        {!isLoading && filteredUsers.length === 0 && (
          <div className="text-center text-gray-500 mt-10 text-sm">
            No chats found.
          </div>
        )}
"""

new_render = """
        {isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-[2rem] bg-white/5 border border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="w-14 h-14 rounded-full bg-white/10 flex-shrink-0" />
                <div className="flex flex-col gap-2 flex-1">
                  <div className="w-1/2 h-4 rounded-full bg-white/10" />
                  <div className="w-3/4 h-3 rounded-full bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center text-gray-500 mt-10 text-sm">
            No chats found.
          </div>
        ) : null}
"""
content = content.replace(old_render.strip(), new_render.strip())

with open('components/chat/ChatList.tsx', 'w') as f:
    f.write(content)
