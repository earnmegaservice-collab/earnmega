import re

with open('components/chat/CreateGroupModal.tsx', 'r') as f:
    content = f.read()

# Fix double promise execution
old_promise_code = r"""      toast.promise(createPromise(), {
          loading: 'Securing Group Channel...',
          success: 'Group Chat Created Successfully!',
          error: (err) => `Creation Failed: ${err.message}`
      });

      try {
          await createPromise();
          onGroupCreated();
          onClose();
      } catch (err) {
          // Toast handles the error display
      }"""

new_promise_code = r"""      const promise = createPromise();
      toast.promise(promise, {
          loading: 'Securing Group Channel...',
          success: 'Group Chat Created Successfully!',
          error: (err) => `Creation Failed: ${err.message}`
      });

      try {
          await promise;
          onGroupCreated();
          onClose();
      } catch (err) {
          // Toast handles the error display
      }"""

content = content.replace(old_promise_code, new_promise_code)

# Fix early return blocking exit animations
content = content.replace("  if (!isOpen) return null;", "  // removed early return to allow AnimatePresence exit animation")

with open('components/chat/CreateGroupModal.tsx', 'w') as f:
    f.write(content)
