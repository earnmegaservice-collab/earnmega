'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type SubscriptionTier = 'FREE' | 'PRO' | 'PREMIUM';

export interface UserProfileDetails {
  id: string;
  name: string;
  avatarInitials: string;
  avatarUrl?: string;
  bio: string;
  joinDate: string;
  tier: SubscriptionTier;
  isOnline: boolean;
  last_seen?: string;
  coinsGifted: number;
  isSelf: boolean;
  ghost_mode?: boolean;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfileDetails | null;
  onUpgradeClick: () => void;
}

export default function UserProfileModal({ isOpen, onClose, user, onUpgradeClick }: UserProfileModalProps) {
  if (!isOpen || !user) return null;

  const [hasUnviewedStatus, setHasUnviewedStatus] = React.useState(false);
  const [hasStatus, setHasStatus] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<any>(null);

  React.useEffect(() => {
    import('../../utils/supabase').then(({ supabase }) => {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
           setCurrentUser(data.user);
        }
      });
    });
  }, []);

  React.useEffect(() => {
    if (!user || !currentUser) return;

    import('../../utils/supabase').then(({ supabase }) => {
      const checkStatuses = async () => {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: statuses } = await supabase
          .from('statuses')
          .select('id')
          .eq('user_id', user.id)
          .gt('created_at', twentyFourHoursAgo);

        if (statuses && statuses.length > 0) {
          setHasStatus(true);
          const { data: views } = await supabase
            .from('status_views')
            .select('status_id')
            .eq('user_id', currentUser.id);

          const viewedIds = new Set(views?.map(v => v.status_id) || []);
          const allViewed = statuses.every(s => viewedIds.has(s.id));
          setHasUnviewedStatus(!allViewed);
        } else {
          setHasStatus(false);
        }
      };

      checkStatuses();
    });
  }, [user, currentUser]);

  const statusRingClass = hasStatus
    ? (hasUnviewedStatus ? 'ring-4 ring-purple-500 ring-offset-4 ring-offset-black/50' : 'ring-4 ring-gray-500 ring-offset-4 ring-offset-black/50')
    : '';


  const isProOrHigher = user.tier === 'PRO' || user.tier === 'PREMIUM';
  const isPremium = user.tier === 'PREMIUM';

  return (
    <AnimatePresence>
      {isOpen && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden text-gray-100 flex flex-col"
          >
            {/* Banner Section */}
            <div className="h-32 relative flex-shrink-0 group overflow-hidden">
              {isProOrHigher ? (
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/80 to-purple-600/80 backdrop-blur-md" />
              ) : user.isSelf ? (
                 <div
                   className="absolute inset-0 bg-white/5 backdrop-blur-md flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
                   onClick={onUpgradeClick}
                 >
                    <div className="flex flex-col items-center opacity-60">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                       </svg>
                       <span className="text-xs font-bold text-white uppercase tracking-wider">Banner Locked</span>
                    </div>
                 </div>
              ) : (
                <div className="absolute inset-0 bg-white/5 backdrop-blur-md" />
              )}

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white backdrop-blur-xl transition-colors z-10"
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
                <div className={`relative rounded-full p-1 bg-gray-900/50 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] inline-block
                  ${isPremium ? 'bg-gradient-to-tr from-yellow-400 via-amber-500 to-yellow-600' : 'border border-white/10'}
                `}>
                  <div className={`w-20 h-20 rounded-full bg-gray-800/80 flex items-center justify-center border-4 border-transparent shrink-0 relative overflow-hidden`}>
                     {user.avatarUrl ? (
                       <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover relative z-10" />
                     ) : (
                       <span className="text-2xl font-bold text-white drop-shadow-md">{user.avatarInitials}</span>
                     )}
                     {isPremium && (
                       <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-transparent pointer-events-none z-20" />
                     )}
                  </div>

                  {/* Online Status Indicator */}
                  <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-black/50 ${user.isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-white/30'}`} />
                </div>

                {/* Actions / Badges Area */}
                <div className="mb-2 flex gap-2">
                  {isPremium && (
                    <div className="px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-[10px] font-extrabold uppercase tracking-wider shadow-[0_0_10px_rgba(251,191,36,0.5)]">
                      VIP
                    </div>
                  )}
                  {!isPremium && user.tier === 'PRO' && (
                    <div className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                      PRO
                    </div>
                  )}
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex flex-col space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2 drop-shadow-sm">
                    {user.name}
                  </h2>
                  <p className="text-sm text-white/50 mt-1 font-medium">Joined {user.joinDate}</p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl p-3 rounded-xl border border-white/10 shadow-inner">
                  <p className="text-sm text-white/80 leading-relaxed italic font-medium">
                    "{user.bio}"
                  </p>
                </div>

                {/* Premium Stats */}
                {isPremium && (
                  <div className="flex items-center justify-between bg-yellow-500/10 backdrop-blur-md p-3 rounded-xl border border-yellow-500/30 shadow-[0_4px_15px_rgba(234,179,8,0.1)]">
                    <span className="text-sm text-white/70 font-bold">Coins Gifted</span>
                    <span className="text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500 flex items-center gap-1 drop-shadow-sm">
                      {user.coinsGifted.toLocaleString()} 🪙
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
