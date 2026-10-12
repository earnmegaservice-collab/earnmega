'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Compass, MessageCircle, PlaySquare, User } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'EXPLORE' | 'CHATS' | 'STATUS' | 'PROFILE';
  onTabChange: (tab: 'EXPLORE' | 'CHATS' | 'STATUS' | 'PROFILE') => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: 'EXPLORE', icon: <Compass size={24} />, label: 'Explore' },
    { id: 'CHATS', icon: <MessageCircle size={24} />, label: 'Chats' },
    { id: 'STATUS', icon: <PlaySquare size={24} />, label: 'Status' },
    { id: 'PROFILE', icon: <User size={24} />, label: 'Profile' },
  ] as const;

  return (
    <>
      <div className="h-[80px] shrink-0 w-full" />
      <div className="fixed bottom-0 w-full bg-black/80 backdrop-blur-3xl border-t border-white/10 z-50 px-6 py-4 flex justify-between items-center pb-safe">
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center space-y-1 transition-colors ${
              activeTab === tab.id ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <div className="relative">
              {tab.icon}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,1)]"
                />
              )}
            </div>
            <span className="text-[10px] font-bold tracking-wide">{tab.label}</span>
          </motion.button>
        ))}
      </div>
    </>
  );
}
