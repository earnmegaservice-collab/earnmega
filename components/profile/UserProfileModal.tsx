'use client';

import React from 'react';

type SubscriptionTier = 'FREE' | 'PRO' | 'PREMIUM';

export interface UserProfileDetails {
  id: string;
  name: string;
  avatarInitials: string;
  bio: string;
  joinDate: string;
  tier: SubscriptionTier;
  isOnline: boolean;
  coinsGifted: number;
  isSelf: boolean;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfileDetails | null;
  onUpgradeClick: () => void;
}

export default function UserProfileModal({ isOpen, onClose, user, onUpgradeClick }: UserProfileModalProps) {
  if (!isOpen || !user) return null;

  const isProOrHigher = user.tier === 'PRO' || user.tier === 'PREMIUM';
  const isPremium = user.tier === 'PREMIUM';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden text-gray-100 flex flex-col">
        {/* Banner Section */}
        <div className="h-32 relative flex-shrink-0 group">
          {isProOrHigher ? (
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-80" />
          ) : user.isSelf ? (
             <div
               className="absolute inset-0 bg-gray-800 flex items-center justify-center cursor-pointer hover:bg-gray-700 transition-colors"
               onClick={onUpgradeClick}
             >
                <div className="flex flex-col items-center opacity-60">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                   </svg>
                   <span className="text-xs font-semibold uppercase tracking-wider">Banner Locked</span>
                </div>
             </div>
          ) : (
            <div className="absolute inset-0 bg-gray-800" />
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-colors z-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Section */}
        <div className="px-6 pb-6 pt-0 relative flex-1 flex flex-col">
          {/* Avatar container */}
          <div className="relative -mt-12 mb-3 flex justify-between items-end">
            <div className={`relative rounded-full p-1 bg-gray-900 shadow-xl inline-block
              ${isPremium ? 'bg-gradient-to-tr from-yellow-400 via-amber-500 to-yellow-600' : ''}
            `}>
              <div className={`w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center border-4 border-gray-900 shrink-0 relative overflow-hidden
                 ${isPremium ? '' : 'border-gray-800'}
              `}>
                 <span className="text-2xl font-bold text-gray-300">{user.avatarInitials}</span>
                 {isPremium && (
                   <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-transparent" />
                 )}
              </div>

              {/* Online Status Indicator */}
              <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-gray-900 ${user.isOnline ? 'bg-emerald-500' : 'bg-gray-500'}`} />
            </div>

            {/* Actions / Badges Area */}
            <div className="mb-2 flex gap-2">
              {isPremium && (
                <div className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 text-[10px] font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                  VIP
                </div>
              )}
              {!isPremium && user.tier === 'PRO' && (
                <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/50 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                  PRO
                </div>
              )}
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex flex-col space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {user.name}
              </h2>
              <p className="text-sm text-gray-400 mt-1">Joined {user.joinDate}</p>
            </div>

            <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
              <p className="text-sm text-gray-300 leading-relaxed italic">
                "{user.bio}"
              </p>
            </div>

            {/* Premium Stats */}
            {isPremium && (
              <div className="flex items-center justify-between bg-yellow-500/5 p-3 rounded-xl border border-yellow-500/20">
                <span className="text-sm text-gray-400 font-medium">Coins Gifted</span>
                <span className="text-sm font-bold text-yellow-500 flex items-center gap-1">
                  {user.coinsGifted.toLocaleString()} 🪙
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
