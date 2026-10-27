"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Users } from 'lucide-react';

interface GuestRequestDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    requests: any[];
    onAccept: (request: any) => void;
    onDecline?: (request: any) => void;
}

export default function GuestRequestDrawer({ isOpen, onClose, requests, onAccept, onDecline }: GuestRequestDrawerProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100000]"
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 h-[65dvh] bg-[#0A0A0A] rounded-t-3xl z-[100001] flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-white/10"
                    >
                        <div className="flex items-center justify-between p-5 border-b border-white/5">
                            <h3 className="font-bold text-lg text-white flex items-center gap-2">
                                <Users className="w-5 h-5 text-cyan-400" />
                                Guest Requests
                                <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs font-medium ml-2">{requests.length}</span>
                            </h3>
                            <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                                <X className="w-5 h-5 text-white/70" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {requests.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-white/40 py-12">
                                    <Users className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="text-sm font-medium">No guest requests right now.</p>
                                    <p className="text-xs text-white/30 mt-1">Viewers can request to join your broadcast as a co-host.</p>
                                </div>
                            ) : (
                                requests.map(req => (
                                    <div key={req.user?.id || req.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-md">
                                        <div className="flex items-center gap-3">
                                            <img src={req.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.user?.username || 'Guest'}`} className="w-12 h-12 rounded-full border border-white/20 object-cover bg-neutral-900" />
                                            <div>
                                                <h4 className="font-bold text-white text-sm">@{req.user?.username || 'User'}</h4>
                                                <p className="text-xs text-cyan-400 font-medium">Wants to join your LIVE</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => onDecline ? onDecline(req) : null}
                                                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => { onAccept(req); onClose(); }} className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:scale-105 transition-transform">
                                                <Check className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
