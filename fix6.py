with open("components/chat/ChatInterface.tsx", "r") as f:
    text = f.read()

text = text.replace("""                                 reporterId: user?.id,
                                 reportedId: currentOtherUserProfile?.id,
                                 reason: reportReason""", """                                 reporterId: user?.id,
                                 reporterName: currentUserProfile?.name,
                                 accusedId: currentOtherUserProfile?.id,
                                 accusedName: currentOtherUserProfile?.name,
                                 category: reportReason,
                                 description: reportReason,
                                 time: new Date().toISOString(),
                                 recentMessages: messages.slice(-5)""")

with open("components/chat/ChatInterface.tsx", "w") as f:
    f.write(text)
