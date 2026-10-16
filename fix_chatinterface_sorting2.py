with open('components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

# Instead of regex matching huge blocks which failed, we can use Babel to remove nodes or write a careful script.
# It's safer to just write a simple AST script in Node.js to strip WebRTC logic.
