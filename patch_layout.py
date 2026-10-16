import re

with open('app/layout.tsx', 'r') as f:
    content = f.read()

# I need to add 'use client' and useEffect to layout.tsx? Wait, layout.tsx is a server component because it exports metadata.
# I can instead add the service worker registration to the existing `CallProvider` inside `context/CallContext.tsx` or a new client component. `CallContext.tsx` is perfect since it is already 'use client' and manages calls.

with open('context/CallContext.tsx', 'r') as f:
    callcontext = f.read()

sw_registration = """useEffect(() => { setMounted(true);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(console.error);
    }
  }, []);"""

callcontext = callcontext.replace("useEffect(() => setMounted(true), []);", sw_registration)

with open('context/CallContext.tsx', 'w') as f:
    f.write(callcontext)
