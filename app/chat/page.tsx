'use client';

import React, { useState, useRef, useEffect } from 'react';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'other';
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
};

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! How can I help you today?',
      sender: 'other',
      timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
    },
    {
      id: '2',
      text: 'Hi! I have a question about my recent order.',
      sender: 'user',
      timestamp: new Date(Date.now() - 1000 * 60 * 4), // 4 mins ago
      status: 'read',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
      status: 'sent',
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');

    // Simulate delivery/read status updates
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

    // Simulate response
    setTimeout(() => {
      const responseMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'I can certainly help you with that. Could you provide your order number?',
        sender: 'other',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, responseMessage]);
    }, 2000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderStatus = (status?: 'sent' | 'delivered' | 'read') => {
    if (!status) return null;
    return (
      <span className="ml-1 text-[10px]">
        {status === 'sent' && <span className="text-gray-300">✓</span>}
        {status === 'delivered' && <span className="text-gray-300">✓✓</span>}
        {status === 'read' && <span className="text-blue-300">✓✓</span>}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans sm:max-w-md sm:mx-auto sm:border-x sm:border-gray-200">
      {/* Header */}
      <header className="bg-white px-4 py-3 border-b border-gray-200 shadow-sm flex items-center shrink-0">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
          S
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-800 leading-tight">Support</h1>
          <p className="text-xs text-green-500 font-medium">Online</p>
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isUser = message.sender === 'user';
          return (
            <div
              key={message.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 relative ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-sm'
                }`}
              >
                <p className="text-[15px] leading-relaxed break-words">
                  {message.text}
                </p>
                <div
                  className={`flex items-center justify-end mt-1 space-x-1 ${
                    isUser ? 'text-blue-100' : 'text-gray-400'
                  }`}
                >
                  <span className="text-[10px]">{formatTime(message.timestamp)}</span>
                  {isUser && renderStatus(message.status)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="bg-white p-3 border-t border-gray-200 shrink-0">
        <form
          onSubmit={handleSendMessage}
          className="flex items-center bg-gray-100 rounded-full pr-1 pl-4 py-1"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-gray-800 placeholder-gray-500 py-2 outline-none text-[15px]"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="ml-2 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:bg-gray-400 transition-colors"
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
      </footer>
    </div>
  );
}
