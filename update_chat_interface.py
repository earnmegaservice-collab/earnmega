import re

with open('components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

# Remove the inline group modal state and logic
content = re.sub(r'  const \[isGroupModalOpen, setIsGroupModalOpen\] = useState\(false\);\n  const \[groupName, setGroupName\] = useState\(\'\'\);\n  const \[selectedGroupUsers, setSelectedGroupUsers\] = useState<Set<string>>\(new Set\(\)\);\n  const \[isFetchingModalUsers, setIsFetchingModalUsers\] = useState\(false\);\n  const \[modalUsers, setModalUsers\] = useState<UserProfileDetails\[\]>\(\[\]\);\n\n  useEffect\(\(\) => \{\n    if \(isGroupModalOpen && user\) \{\n.*?\n  \}, \[isGroupModalOpen, user\]\);', '  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);', content, flags=re.DOTALL)

content = re.sub(r'  const handleCreateGroup = async \(\) => \{.*?\n  \};\n', '', content, flags=re.DOTALL)

# Add the CreateGroupModal import
import_stmt = "import CreateGroupModal from './CreateGroupModal';\n"
if "import CreateGroupModal" not in content:
    content = content.replace("import MessageForwardModal from './MessageForwardModal';", f"import MessageForwardModal from './MessageForwardModal';\n{import_stmt}")

# Replace the inline group modal JSX with the new component
old_modal_jsx = r'      <AnimatePresence>\n         \{isGroupModalOpen && \(\n            <div className="fixed inset-0 z-\[100\].*?            </div>\n         \)\}\n      </AnimatePresence>'
new_modal_jsx = r"""      <AnimatePresence>
         {isGroupModalOpen && (
            <CreateGroupModal
               isOpen={isGroupModalOpen}
               onClose={() => setIsGroupModalOpen(false)}
               userId={user?.id || ''}
               onGroupCreated={() => {
                   setIsGroupModalOpen(false);
                   setRefreshChatsKey(prev => prev + 1);
               }}
            />
         )}
      </AnimatePresence>"""

content = re.sub(old_modal_jsx, new_modal_jsx, content, flags=re.DOTALL)

with open('components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)

print("Update completed.")
