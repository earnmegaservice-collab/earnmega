'use client';

import EarnmegaWalletHeader from "../../components/chat/EarnmegaWalletHeader";
import React, { useState, useRef, useEffect } from 'react';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'other';
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
  reactions: string[];
};

const DEFAULT_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏'];

// Helper to parse basic formatting
const formatText = (text: string) => {
  // Simple regex for **bold**, *italic*, ~strikethrough~
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|~.*?~)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('~') && part.endsWith('~')) {
      return <del key={index} className="opacity-70">{part.slice(1, -1)}</del>;
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
};

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! Welcome to **Earnmega**. How can I help you today?',
      sender: 'other',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      reactions: ['👋'],
    },
    {
      id: '2',
      text: 'Hi! I wanted to check out the new features. *Looks great!*',
      sender: 'user',
      timestamp: new Date(Date.now() - 1000 * 60 * 4),
      status: 'read',
      reactions: ['❤️'],
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [activeReactionId, setActiveReactionId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle outside clicks to close reaction tray
  useEffect(() => {
    const handleClickOutside = () => setActiveReactionId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
      status: 'sent',
      reactions: [],
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');

    // Simulate delivery statuses
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessage.id ? { ...msg, status: 'delivered' } : msg
        )
      );
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === newMessage.id ? { ...msg, status: 'read' } : msg
          )
        );
      }, 1500);
    }, 1000);

    // Simulate automated response
    setTimeout(() => {
      const responseMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Thanks for exploring! Let me know if you need ~help~ anything else.',
        sender: 'other',
        timestamp: new Date(),
        reactions: [],
      };
      setMessages((prev) => [...prev, responseMessage]);
    }, 2000);
  };

  const handleReaction = (messageId: string, emoji: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          const hasReaction = msg.reactions.includes(emoji);
          return {
            ...msg,
            reactions: hasReaction
              ? msg.reactions.filter((r) => r !== emoji)
              : [...msg.reactions, emoji],
          };
        }
        return msg;
      })
    );
    setActiveReactionId(null);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderStatus = (status?: 'sent' | 'delivered' | 'read') => {
    if (!status) return null;
    return (
      <span className="ml-1 flex items-center shrink-0">
        {status === 'sent' && (
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {status === 'delivered' && (
          <div className="flex -space-x-1.5">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {status === 'read' && (
          <div className="flex -space-x-1.5">
            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-950 font-sans sm:max-w-md sm:mx-auto sm:border-x sm:border-gray-800 text-gray-100 selection:bg-purple-500/30">
      {/* Header */}
      <EarnmegaWalletHeader />
      <header className="bg-gray-900/80 backdrop-blur-md px-4 py-3.5 border-b border-gray-800 shadow-sm flex items-center shrink-0 sticky top-0 z-20">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 mr-3 shrink-0">
           <span className="text-white font-bold text-sm tracking-tighter">EM</span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-gray-100 leading-tight truncate">Earnmega Support</h1>
          <div className="flex items-center space-x-1.5">
             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <p className="text-[11px] text-gray-400 font-medium">Active now</p>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <main
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-6"
      >
        {messages.map((message) => {
          const isUser = message.sender === 'user';
          const isTrayOpen = activeReactionId === message.id;

          return (
            <div
              key={message.id}
              className={`flex flex-col group ${isUser ? 'items-end' : 'items-start'}`}
            >
              {/* Message Bubble Row */}
              <div className={`flex items-end space-x-2 max-w-[85%] relative`}>

                {/* Avatar for other */}
                {!isUser && (
                  <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center shrink-0 mb-1 border border-gray-700">
                    <span className="text-[10px] text-gray-400">EM</span>
                  </div>
                )}

                {/* Bubble Container */}
                <div className="relative flex flex-col">
                  {/* Reaction Tray (Popover) */}
                  {isTrayOpen && (
                    <div
                      className={`absolute bottom-full mb-2 ${isUser ? 'right-0' : 'left-0'} z-30 flex items-center space-x-1 p-1.5 bg-gray-800 border border-gray-700 rounded-full shadow-xl`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {DEFAULT_EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={(e) => handleReaction(message.id, emoji, e)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-gray-700 rounded-full hover:scale-110 transition-transform focus:outline-none"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setActiveReactionId(isTrayOpen ? null : message.id);
                    }}
                    className={`px-4 py-2.5 relative transition-all duration-200 cursor-pointer ${
                      isUser
                        ? 'bg-blue-600 hover:bg-blue-700 text-white rounded-2xl rounded-tr-sm shadow-sm'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-100 border border-gray-700 shadow-sm rounded-2xl rounded-tl-sm'
                    }`}
                  >
                    <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap font-medium">
                      {formatText(message.text)}
                    </p>

                    {/* Meta Row (Time & Status) */}
                    <div
                      className={`flex items-center justify-end mt-1.5 space-x-1.5 opacity-80 ${
                        isUser ? 'text-blue-100' : 'text-gray-400'
                      }`}
                    >
                      <span className="text-[10px] tracking-wide font-medium">{formatTime(message.timestamp)}</span>
                      {isUser && renderStatus(message.status)}
                    </div>
                  </div>

                  {/* Active Reactions Display */}
                  {message.reactions.length > 0 && (
                     <div className={`absolute -bottom-3.5 ${isUser ? 'right-2' : 'left-2'} z-10 flex items-center bg-gray-800 border border-gray-700 rounded-full px-1.5 py-0.5 shadow-sm`}>
                       {message.reactions.map((r, i) => (
                         <span key={i} className="text-[11px] leading-none">{r}</span>
                       ))}
                     </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} className="h-2" />
      </main>

      {/* Input Area */}
      <footer className="bg-gray-900 border-t border-gray-800 p-3 pb-safe shrink-0">
        <form
          onSubmit={handleSendMessage}
          className="flex items-end bg-gray-800 rounded-3xl pr-1.5 pl-4 py-1.5 focus-within:ring-1 focus-within:ring-gray-700 transition-shadow shadow-inner"
        >
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder="Type a message... (use **bold** or *italic*)"
            rows={1}
            className="flex-1 bg-transparent border-none focus:ring-0 text-gray-100 placeholder-gray-500 py-2.5 outline-none text-[15px] resize-none min-h-[44px] max-h-32"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="ml-2 w-10 h-10 shrink-0 bg-blue-600 text-white rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:bg-gray-700 transition-colors self-end mb-0.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5 -mr-0.5"
            >
              <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
            </svg>
          </button>
        </form>
        <p className="text-center text-[10px] text-gray-600 mt-2 font-medium tracking-wide">
          Double-tap a message to react
        </p>
      </footer>
    </div>
  );
}
