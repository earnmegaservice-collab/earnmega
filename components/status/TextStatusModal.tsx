'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';

interface TextStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPost: (text: string, gradient: string) => Promise<void>;
}

const PREMIUM_GRADIENTS = [
  'bg-gradient-to-br from-indigo-950 via-purple-900 to-black',
  'bg-gradient-to-br from-orange-500 via-rose-500 to-purple-800',
  'bg-gradient-to-br from-emerald-600 via-teal-700 to-gray-900',
  'bg-gradient-to-br from-violet-900 via-fuchsia-800 to-black',
  'bg-gradient-to-br from-black via-zinc-900 to-zinc-800',
  'bg-gradient-to-br from-orange-300 via-amber-500 to-rose-400',
];

export default function TextStatusModal({ isOpen, onClose, onPost }: TextStatusModalProps) {
  const [text, setText] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(PREMIUM_GRADIENTS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setIsSubmitting(true);
    await onPost(text, selectedGradient);
    setIsSubmitting(false);
    setText('');
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/90 flex flex-col justify-between"
      >
        <div className={`absolute inset-0 ${selectedGradient} transition-colors duration-500`} />

        <div className="relative z-10 flex items-center justify-between p-6 bg-black/20 backdrop-blur-md">
          <button onClick={onClose} className="p-2 bg-black/40 rounded-full border border-white/10 text-white backdrop-blur-xl shadow-lg">
            <X size={24} />
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || isSubmitting}
            className="p-2 px-6 bg-white text-black font-bold rounded-full disabled:opacity-50 flex items-center space-x-2 shadow-lg"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Post</span>
                <Check size={18} />
              </>
            )}
          </button>
        </div>

        <div className="relative z-10 flex-1 flex items-center justify-center p-8">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a status..."
            className={`w-full h-full bg-transparent text-center text-4xl md:text-5xl font-black text-white tracking-wide resize-none focus:outline-none placeholder-white/30 drop-shadow-2xl ${selectedGradient === PREMIUM_GRADIENTS[4] ? 'text-amber-100 placeholder-amber-100/30' : ''}`}
            maxLength={200}
          />
        </div>

        <div className="relative z-10 p-6 pb-12 bg-black/40 backdrop-blur-xl border-t border-white/10 flex space-x-4 overflow-x-auto snap-x shadow-[0_-8px_32px_rgba(0,0,0,0.5)]">
          {PREMIUM_GRADIENTS.map((gradient, i) => (
            <button
              key={i}
              onClick={() => setSelectedGradient(gradient)}
              className={`w-14 h-14 shrink-0 rounded-full snap-center border-2 transition-transform active:scale-90 ${gradient} ${selectedGradient === gradient ? 'border-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.4)]' : 'border-transparent'}`}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
