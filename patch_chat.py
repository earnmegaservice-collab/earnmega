import re

with open('components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

# 1. Add isChatsLoading state
content = content.replace(
    "const [exploreUsers, setExploreUsers] = useState<UserProfileDetails[]>([]);",
    "const [exploreUsers, setExploreUsers] = useState<UserProfileDetails[]>([]);\n  const [isChatsLoading, setIsChatsLoading] = useState(true);"
)

# 2. Update isChatsLoading to false at end of fetchExploreUsers
fetch_end_old = """
        // Sort descending
        allUsers.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

        setExploreUsers(allUsers);
      };
"""
fetch_end_new = """
        // Sort descending
        allUsers.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

        setExploreUsers(allUsers);
        setIsChatsLoading(false);
      };
"""
content = content.replace(fetch_end_old.strip(), fetch_end_new.strip())

# 3. Pass isLoading down to ChatList
chat_list_old = """
                <ChatList
                  exploreUsers={exploreUsers}
                  getStatusRingClass={getStatusRingClass}
                  currentUserProfile={currentUserProfile}
                  setShowVerificationGateModal={setShowVerificationGateModal}
                  setOtherUserProfile={setOtherUserProfile}
                />
"""

chat_list_new = """
                <ChatList
                  exploreUsers={exploreUsers}
                  getStatusRingClass={getStatusRingClass}
                  currentUserProfile={currentUserProfile}
                  setShowVerificationGateModal={setShowVerificationGateModal}
                  setOtherUserProfile={setOtherUserProfile}
                  isLoading={isChatsLoading}
                />
"""
content = content.replace(chat_list_old.strip(), chat_list_new.strip())

with open('components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)

with open('components/chat/ChatList.tsx', 'r') as f:
    chatlist_content = f.read()

# Modify ChatList props
chatlist_props_old = """
interface ChatListProps {
  exploreUsers: UserProfileDetails[];
  getStatusRingClass: (userId: string) => string;
  currentUserProfile: UserProfileDetails | null;
  setShowVerificationGateModal: (show: boolean) => void;
  setOtherUserProfile: (user: UserProfileDetails) => void;
}

export default function ChatList({
  exploreUsers,
  getStatusRingClass,
  currentUserProfile,
  setShowVerificationGateModal,
  setOtherUserProfile
}: ChatListProps) {
"""

chatlist_props_new = """
interface ChatListProps {
  exploreUsers: UserProfileDetails[];
  getStatusRingClass: (userId: string) => string;
  currentUserProfile: UserProfileDetails | null;
  setShowVerificationGateModal: (show: boolean) => void;
  setOtherUserProfile: (user: UserProfileDetails) => void;
  isLoading?: boolean;
}

export default function ChatList({
  exploreUsers,
  getStatusRingClass,
  currentUserProfile,
  setShowVerificationGateModal,
  setOtherUserProfile,
  isLoading
}: ChatListProps) {
"""
chatlist_content = chatlist_content.replace(chatlist_props_old.strip(), chatlist_props_new.strip())

# Change filteredUsers.length === 0 logic and add skeleton loader
chatlist_render_old = """
        {filteredUsers.length === 0 && (
          <div className="text-center text-gray-500 mt-10 text-sm">
            No chats found.
          </div>
        )}
"""

chatlist_render_new = """
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
chatlist_content = chatlist_content.replace(chatlist_render_old.strip(), chatlist_render_new.strip())

with open('components/chat/ChatList.tsx', 'w') as f:
    f.write(chatlist_content)
