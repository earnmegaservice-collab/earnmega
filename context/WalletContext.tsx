'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const CoinStoreModal = dynamic(() => import('../components/wallet/CoinStoreModal'), { ssr: false });

export type SubscriptionTier = 'FREE' | 'PRO' | 'PREMIUM';
export type NormalizedTier = 'free' | 'pro' | 'premium';

export interface PaywallModalConfig {
  title: string;
  subtitle?: string;
  payButtonLabel?: string;
  upgradeButtonLabel?: string;
  highlightPlan?: 'PRO' | 'PREMIUM';
  badgeText?: string;
  icon?: string;
}

export interface SpendCoinsOptions {
  requiredCoins: number;
  actionName?: string;
  actionLabel?: string;
  actionCode?: string;
  actionKey?: string;
  bypassTiers?: NormalizedTier[];
  allowedTiers?: NormalizedTier[];
  receiverId?: string;
  onSuccess?: () => void | Promise<void>;
  onAllowed?: () => void | Promise<void>;
  showPaywallModal?: boolean;
  paywallModalTitle?: string;
  paywallModalSubtitle?: string;
  upgradeHighlight?: 'PRO' | 'PREMIUM';
  paywallModalConfig?: PaywallModalConfig;
}

export interface OpenCoinStoreOptions {
  initialTab?: 'UPGRADES' | 'BUY_COINS';
  bannerMessage?: string | null;
  highlightedPlan?: 'PRO' | 'PREMIUM' | null;
  onSuccess?: () => void | Promise<void>;
}

interface WalletState {
  balance: number;
  subscriptionTier: SubscriptionTier;
  currency: string;
}

interface ActivePaywallPrompt {
  options: SpendCoinsOptions;
  resolve: (success: boolean) => void;
}

interface WalletToast {
  id: string;
  message: string;
  variant: 'spend' | 'success' | 'warning';
}

interface WalletContextType {
  balance: number;
  subscriptionTier: SubscriptionTier;
  tier: NormalizedTier;
  isPro: boolean;
  isPremium: boolean;
  currency: string;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  setSubscriptionTier: React.Dispatch<React.SetStateAction<SubscriptionTier>>;
  setCurrency: React.Dispatch<React.SetStateAction<string>>;
  refreshWallet: () => Promise<void>;
  spendCoinsOrPromptStore: (options: SpendCoinsOptions) => Promise<boolean>;
  openCoinStore: (options?: OpenCoinStoreOptions) => void;
  closeCoinStore: () => void;
  storeBannerMessage: string | null;
  highlightedStorePlan: 'PRO' | 'PREMIUM' | null;
  triggerToast: (message: string, variant?: 'spend' | 'success' | 'warning') => void;
}

const defaultState: WalletState = {
  balance: 0,
  subscriptionTier: 'FREE',
  currency: 'GHS',
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

function playCoinChime(type: 'spend' | 'success' = 'spend') {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'spend') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.09);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.16);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(880, now + 0.08);
      osc.frequency.setValueAtTime(1174.66, now + 0.16);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch (_) {
    // Ignore audio context autoplay restrictions
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState<number>(defaultState.balance);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>(
    defaultState.subscriptionTier
  );
  const [currency, setCurrency] = useState<string>(defaultState.currency);
  const { user, session } = useAuth();

  // Global Store Modal State
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [storeInitialTab, setStoreInitialTab] = useState<'UPGRADES' | 'BUY_COINS'>('BUY_COINS');
  const [storeBannerMessage, setStoreBannerMessage] = useState<string | null>(null);
  const [highlightedStorePlan, setHighlightedStorePlan] = useState<'PRO' | 'PREMIUM' | null>(null);
  const pendingStoreSuccessRef = useRef<(() => void | Promise<void>) | null>(null);

  // Global Paywall Choice Modal State (e.g., Group Call 10 Coins vs Pro/Premium, Go Live 20 Coins vs Premium)
  const [activePaywallPrompt, setActivePaywallPrompt] = useState<ActivePaywallPrompt | null>(null);
  const [isProcessingSpend, setIsProcessingSpend] = useState(false);

  // Floating Toasts
  const [toasts, setToasts] = useState<WalletToast[]>([]);

  const triggerToast = useCallback(
    (message: string, variant: 'spend' | 'success' | 'warning' = 'spend') => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, message, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3200);
    },
    []
  );

  const normalizedTier: NormalizedTier = (() => {
    const raw = String(subscriptionTier || 'FREE').trim().toLowerCase();
    if (raw === 'premium' || raw === 'vip') return 'premium';
    if (raw === 'pro') return 'pro';
    return 'free';
  })();

  const isPro = normalizedTier === 'pro' || normalizedTier === 'premium';
  const isPremium = normalizedTier === 'premium';

  const refreshWallet = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        const verifiedCoins =
          typeof data.coins === 'number' && data.coins > 0
            ? data.coins
            : typeof data.coin_balance === 'number' && data.coin_balance > 0
            ? data.coin_balance
            : typeof data.coins === 'number'
            ? data.coins
            : typeof data.coin_balance === 'number'
            ? data.coin_balance
            : 0;
        setBalance(verifiedCoins);

        const rawTier = String(data.subscription_tier || '').toUpperCase();
        if (data.is_premium === true || rawTier === 'PREMIUM' || rawTier === 'VIP') {
          setSubscriptionTier('PREMIUM');
        } else if (data.is_pro === true || rawTier === 'PRO') {
          setSubscriptionTier('PRO');
        } else if (rawTier === 'FREE') {
          setSubscriptionTier('FREE');
        }
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    }
  }, [user]);

  useEffect(() => {
    refreshWallet();

    if (!user) return;
    const channel = supabase
      .channel(`wallet_updates_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        () => {
          refreshWallet();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshWallet]);

  const openCoinStore = useCallback((options?: OpenCoinStoreOptions) => {
    setStoreInitialTab(options?.initialTab || 'BUY_COINS');
    setStoreBannerMessage(options?.bannerMessage || null);
    setHighlightedStorePlan(options?.highlightedPlan || null);
    pendingStoreSuccessRef.current = options?.onSuccess || null;
    setIsStoreOpen(true);
  }, []);

  const closeCoinStore = useCallback(() => {
    setIsStoreOpen(false);
    setStoreBannerMessage(null);
    setHighlightedStorePlan(null);
  }, []);

  const executeAtomicDeduction = useCallback(
    async (options: SpendCoinsOptions): Promise<boolean> => {
      const { requiredCoins, receiverId } = options;
      const actionName = options.actionName || options.actionLabel || 'Complete Action';
      const actionCode = options.actionCode || options.actionKey;
      const bypassTiers = options.bypassTiers || options.allowedTiers || [];
      const onSuccess = options.onSuccess || options.onAllowed;

      // Double check if user's tier bypasses this paywall
      const effectiveBypassTiers = bypassTiers.filter((t) => {
        if (actionCode === 'GO_LIVE' && t === 'pro') return false;
        return true;
      });

      if (!receiverId && effectiveBypassTiers.includes(normalizedTier)) {
        await onSuccess?.();
        return true;
      }

      // Check coin balance
      if (balance < requiredCoins) {
        openCoinStore({
          initialTab: 'BUY_COINS',
          bannerMessage: `You need ${requiredCoins} Coin${
            requiredCoins === 1 ? '' : 's'
          } to ${actionName}. Top up now!`,
          highlightedPlan: actionCode === 'GO_LIVE' ? 'PREMIUM' : null,
          onSuccess: async () => {
            await onSuccess?.();
          },
        });
        return false;
      }

      // Optimistic header coin deduction + sound/toast
      const previousBalance = balance;
      const optimisticBalance = Math.max(0, balance - requiredCoins);
      setBalance(optimisticBalance);
      playCoinChime('spend');
      triggerToast(
        `-${requiredCoins} Coin${requiredCoins === 1 ? '' : 's'} • ${actionName}`,
        'spend'
      );

      setIsProcessingSpend(true);
      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const res = await fetch('/api/pillar1/spend-coins', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: actionCode || actionName,
            actionName,
            requiredCoins,
            bypassTiers: effectiveBypassTiers,
            receiverId,
            userId: user?.id,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.status === 402 || data?.code === 'INSUFFICIENT_COINS') {
          // Server balance was lower than client state
          if (typeof data.balance === 'number') {
            setBalance(data.balance);
          } else {
            setBalance(previousBalance);
          }
          openCoinStore({
            initialTab: 'BUY_COINS',
            bannerMessage: `You need ${requiredCoins} Coin${
              requiredCoins === 1 ? '' : 's'
            } to ${actionName}. Top up now!`,
            highlightedPlan: actionCode === 'GO_LIVE' ? 'PREMIUM' : null,
            onSuccess: async () => {
              await onSuccess?.();
            },
          });
          return false;
        }

        if (res.ok && data?.success) {
          if (typeof data.balance === 'number') {
            setBalance(data.balance);
          }
        } else if (user?.id) {
          // Direct Supabase client fallback if API route had a transient failure
          const { error: directErr } = await supabase
            .from('profiles')
            .update({ coins: optimisticBalance, coin_balance: optimisticBalance })
            .eq('id', user.id);
          if (directErr) {
            await supabase
              .from('profiles')
              .update({ coins: optimisticBalance })
              .eq('id', user.id);
          }
        }

        await onSuccess?.();
        return true;
      } catch (err) {
        console.error('Error in spendCoinsOrPromptStore:', err);
        if (user?.id) {
          await supabase
            .from('profiles')
            .update({ coins: optimisticBalance })
            .eq('id', user.id);
        }
        await onSuccess?.();
        return true;
      } finally {
        setIsProcessingSpend(false);
      }
    },
    [balance, normalizedTier, openCoinStore, session?.access_token, triggerToast, user?.id]
  );

  const spendCoinsOrPromptStore = useCallback(
    async (rawOptions: SpendCoinsOptions): Promise<boolean> => {
      const normalizedActionName = rawOptions.actionName || rawOptions.actionLabel || 'Complete Action';
      const normalizedActionCode = rawOptions.actionCode || rawOptions.actionKey;
      const normalizedBypassTiers = rawOptions.bypassTiers || rawOptions.allowedTiers || [];
      const normalizedOnSuccess = rawOptions.onSuccess || rawOptions.onAllowed;
      const normalizedModalConfig: PaywallModalConfig | undefined =
        rawOptions.paywallModalConfig ||
        (rawOptions.paywallModalTitle
          ? {
              title: rawOptions.paywallModalTitle,
              subtitle: rawOptions.paywallModalSubtitle,
              highlightPlan: rawOptions.upgradeHighlight || 'PRO',
            }
          : undefined);

      const options: SpendCoinsOptions = {
        ...rawOptions,
        actionName: normalizedActionName,
        actionCode: normalizedActionCode,
        bypassTiers: normalizedBypassTiers,
        onSuccess: normalizedOnSuccess,
        paywallModalConfig: normalizedModalConfig,
      };

      const { bypassTiers = [], actionCode, receiverId, showPaywallModal, onSuccess } = options;

      // 1. Check tier bypass first (Zero friction for bypassed tiers)
      const effectiveBypassTiers = bypassTiers.filter((t) => {
        if (actionCode === 'GO_LIVE' && t === 'pro') return false;
        return true;
      });

      if (!receiverId && effectiveBypassTiers.includes(normalizedTier)) {
        await onSuccess?.();
        return true;
      }

      // 2. If a Paywall Choice Modal is requested (e.g., Group Call or Go Live or 1-on-1 Call)
      if (showPaywallModal) {
        return new Promise<boolean>((resolve) => {
          setActivePaywallPrompt({
            options,
            resolve,
          });
        });
      }

      // 3. Otherwise perform direct coin check & atomic deduction
      return executeAtomicDeduction(options);
    },
    [normalizedTier, executeAtomicDeduction]
  );

  return (
    <WalletContext.Provider
      value={{
        balance,
        subscriptionTier,
        tier: normalizedTier,
        isPro,
        isPremium,
        currency,
        setBalance,
        setSubscriptionTier,
        setCurrency,
        refreshWallet,
        spendCoinsOrPromptStore,
        openCoinStore,
        closeCoinStore,
        storeBannerMessage,
        highlightedStorePlan,
        triggerToast,
      }}
    >
      {children}

      {/* Floating Coin Spend / Unlock Toasts */}
      <div className="fixed top-4 right-4 z-[2147483647] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -16, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.92 }}
              className={`px-4 py-2.5 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-2.5 text-xs sm:text-sm font-extrabold tracking-wide ${
                toast.variant === 'spend'
                  ? 'bg-amber-950/90 border-amber-400/50 text-amber-200 shadow-amber-500/20'
                  : toast.variant === 'success'
                  ? 'bg-emerald-950/90 border-emerald-400/50 text-emerald-200 shadow-emerald-500/20'
                  : 'bg-rose-950/90 border-rose-400/50 text-rose-200'
              }`}
            >
              <span className="text-base">
                {toast.variant === 'spend' ? '🪙' : toast.variant === 'success' ? '✨' : '⚡'}
              </span>
              <span>{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Sleek Paywall Choice Modal (Pay X Coins OR Upgrade to Pro / Premium) */}
      <AnimatePresence>
        {activePaywallPrompt && (
          <div className="fixed inset-0 z-[2147483645] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              className="w-full max-w-md rounded-3xl bg-gradient-to-b from-[#131926] to-[#0b0f17] border border-white/15 p-6 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.85)] text-center relative overflow-hidden"
            >
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-56 h-56 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[11px] font-extrabold uppercase tracking-widest mb-4">
                <span>{activePaywallPrompt.options.paywallModalConfig?.icon || '⚡'}</span>
                <span>
                  {activePaywallPrompt.options.paywallModalConfig?.badgeText ||
                    'VIP / COIN ACCESS GATEWAY'}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-extrabold text-white leading-snug mb-2.5">
                {activePaywallPrompt.options.paywallModalConfig?.title ||
                  `${activePaywallPrompt.options.actionName} for ${activePaywallPrompt.options.requiredCoins} Coins`}
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
                {activePaywallPrompt.options.paywallModalConfig?.subtitle ||
                  `Your current balance is ${balance} Coins (${subscriptionTier} Tier). Choose how you'd like to proceed:`}
              </p>

              <div className="space-y-3">
                {/* Button 1: Pay X Coins */}
                <button
                  type="button"
                  disabled={isProcessingSpend}
                  onClick={async () => {
                    const currentPrompt = activePaywallPrompt;
                    setActivePaywallPrompt(null);
                    const ok = await executeAtomicDeduction(currentPrompt.options);
                    currentPrompt.resolve(ok);
                  }}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-extrabold text-sm sm:text-base shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                >
                  <span>🪙</span>
                  <span>
                    {activePaywallPrompt.options.paywallModalConfig?.payButtonLabel ||
                      `Pay ${activePaywallPrompt.options.requiredCoins} Coins`}
                  </span>
                  <span className="text-xs font-bold bg-black/20 px-2 py-0.5 rounded-full">
                    Bal: {balance}
                  </span>
                </button>

                {/* Button 2: Upgrade to Pro / Premium */}
                <button
                  type="button"
                  onClick={() => {
                    const currentPrompt = activePaywallPrompt;
                    setActivePaywallPrompt(null);
                    openCoinStore({
                      initialTab: 'UPGRADES',
                      bannerMessage:
                        currentPrompt.options.paywallModalConfig?.title ||
                        `Upgrade now for unlimited access to ${currentPrompt.options.actionName}!`,
                      highlightedPlan:
                        currentPrompt.options.paywallModalConfig?.highlightPlan || 'PRO',
                      onSuccess: async () => {
                        await currentPrompt.options.onSuccess?.();
                        currentPrompt.resolve(true);
                      },
                    });
                  }}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                >
                  <span>👑</span>
                  <span>
                    {activePaywallPrompt.options.paywallModalConfig?.upgradeButtonLabel ||
                      'Upgrade to Pro / Premium'}
                  </span>
                </button>

                {/* Cancel */}
                <button
                  type="button"
                  onClick={() => {
                    const currentPrompt = activePaywallPrompt;
                    setActivePaywallPrompt(null);
                    currentPrompt.resolve(false);
                  }}
                  className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global HorPal Store Modal (mounted only when open to avoid SSR window errors in react-paystack) */}
      {isStoreOpen && (
        <CoinStoreModal
          isOpen={isStoreOpen}
          onClose={closeCoinStore}
          initialTab={storeInitialTab}
          bannerMessage={storeBannerMessage}
          highlightedPlan={highlightedStorePlan}
          onPurchaseSuccess={async () => {
            playCoinChime('success');
            if (pendingStoreSuccessRef.current) {
              const cb = pendingStoreSuccessRef.current;
              pendingStoreSuccessRef.current = null;
              await cb();
            }
          }}
        />
      )}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
