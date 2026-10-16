import re

with open('components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

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
