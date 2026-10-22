with open("components/chat/ChatInterface.tsx", "r") as f:
    text = f.read()

text = text.replace("""                           await supabase.from('messages').insert({
                              sender_id: user?.id,
                              receiver_id: 'system',
                              message_text: `[SYSTEM_REPORT] User ${user?.id} reported ${currentOtherUserProfile?.id} for: ${reportReason}. Please investigate.`,
                              message_type: 'text'
                           });""", """                           // Send silent email trigger via API Route
                           await fetch('/api/report', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                 reporterId: user?.id,
                                 reportedId: currentOtherUserProfile?.id,
                                 reason: reportReason
                              })
                           });""")

with open("components/chat/ChatInterface.tsx", "w") as f:
    f.write(text)
