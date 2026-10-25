import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HelpBotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpBotModal({ isOpen, onClose }: HelpBotModalProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([{role: 'assistant', content: 'Hello! I am your 24/7 AI Concierge. How can I help you today?'}]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // In a real app, this should call an API, we mock it or call the actual chat route if ready.
      // We will try calling the actual route, but pass a flag or something.
      // For HelpBot we just need a simple response for now or call the route.
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          userId: user?.id,
          botId: 'help-bot-id', // Use a pseudo ID
        }),
      });

      if (!res.ok) {
          throw new Error('Network response was not ok');
      }

      // Handle streaming response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let assistantMessage = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      if (reader) {
          while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            const chunkValue = decoder.decode(value, { stream: true });

            // Basic parsing of Vercel AI SDK stream (0:"text"\n)
            const lines = chunkValue.split('\n');
            for (const line of lines) {
                if (line.startsWith('0:')) {
                    try {
                       const text = JSON.parse(line.slice(2));
                       assistantMessage += text;
                       setMessages(prev => {
                          const newMessages = [...prev];
                          newMessages[newMessages.length - 1].content = assistantMessage;
                          return newMessages;
                       });
                    } catch (e) {}
                }
            }
          }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I am having trouble connecting right now.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 w-full h-[80vh] z-[100000] bg-[#050505]/95 backdrop-blur-3xl border-t border-green-500/30 rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.9)] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-green-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                <Bot className="text-green-400" size={24} />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">24/7 AI Concierge</h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white/70 hover:text-white">
              <X size={24} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-tr-sm shadow-[0_5px_15px_rgba(34,197,94,0.2)]'
                    : 'bg-white/5 border border-white/10 text-white/90 rounded-tl-sm backdrop-blur-md'
                }`}>
                  <p className="text-[15px] leading-relaxed font-medium">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                 <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-5 py-3 flex gap-1.5 items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-black/50 border-t border-white/5 pb-safe">
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full pl-6 pr-2 py-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me anything..."
                className="flex-1 bg-transparent text-white placeholder-white/40 outline-none text-[15px] font-medium"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-full bg-green-500 text-black flex items-center justify-center disabled:opacity-50 disabled:bg-white/10 disabled:text-white/40 hover:bg-green-400 active:scale-95 transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)]"
              >
                <Send size={18} className="mr-0.5 mt-0.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
