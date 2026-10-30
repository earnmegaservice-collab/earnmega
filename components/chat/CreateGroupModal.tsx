"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, Check } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import { UserProfileDetails } from '../profile/UserProfileModal';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onGroupCreated: () => void;
}

export default function CreateGroupModal({ isOpen, onClose, userId, onGroupCreated }: CreateGroupModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4">
       <motion.div
         initial={{ y: "100%", opacity: 0 }}
         animate={{ y: 0, opacity: 1 }}
         exit={{ y: "100%", opacity: 0 }}
         transition={{ type: "spring", damping: 25, stiffness: 200 }}
         className="bg-neutral-950/90 backdrop-blur-2xl border-t border-white/10 sm:border p-6 rounded-t-[32px] sm:rounded-3xl shadow-2xl w-full max-w-md relative pb-10 sm:pb-6"
       >
          <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 sm:hidden" />

          <h3 className="text-2xl font-black text-white mb-6 flex items-center tracking-tight">
              <Users className="mr-3 text-fuchsia-500" size={28} /> Group Setup
          </h3>

          <button
             onClick={onClose}
             className="w-full bg-white/10 hover:bg-white/20 text-white font-bold text-lg py-4 rounded-2xl transition-all mt-2 active:scale-[0.98]"
          >
             Cancel
          </button>
       </motion.div>
    </div>,
    document.body
  );
}
