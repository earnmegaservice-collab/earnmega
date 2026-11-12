'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Check, Globe } from 'lucide-react';
import {
  ALL_WORLD_CURRENCIES,
  BASE_PASS_AMOUNT_GHS,
  POPULAR_CURRENCY_CODES,
  WorldCurrency,
  formatConvertedPrice,
} from '../../utils/worldCurrencies';
import { useModalBackHandler } from '../../utils/useModalBackHandler';

interface WorldwideCurrencyPickerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCode: string;
  onSelect: (code: string) => void;
  liveRates: Record<string, number> | null;
}

export default function WorldwideCurrencyPicker({
  isOpen,
  onClose,
  selectedCode,
  onSelect,
  liveRates,
}: WorldwideCurrencyPickerProps) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [searchUnlocked, setSearchUnlocked] = useState(false);
  const touchHandledRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useModalBackHandler(isOpen, onClose, 'horpalCurrencyPicker');

  // Lock input briefly on mount & blur any active background element so mobile keyboard never pops up automatically
  useEffect(() => {
    if (!isOpen) {
      setSearchUnlocked(false);
      setQuery('');
      return;
    }

    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const timer = window.setTimeout(() => {
      setSearchUnlocked(true);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [isOpen]);

  const safeTap = (fn: () => void) => ({
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault();
    },
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      if (t) touchStartRef.current = { x: t.clientX, y: t.clientY };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const start = touchStartRef.current;
      const t = e.changedTouches[0];
      touchStartRef.current = null;
      if (start && t && (Math.abs(t.clientX - start.x) > 10 || Math.abs(t.clientY - start.y) > 10)) {
        return; // Ignore scroll/swipe gestures
      }
      e.stopPropagation();
      touchHandledRef.current = Date.now();
      fn();
    },
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (Date.now() - touchHandledRef.current < 450) return;
      fn();
    },
  });

  const popularCurrencies = useMemo(() => {
    const byCode = new Map(ALL_WORLD_CURRENCIES.map((c) => [c.code, c]));
    return POPULAR_CURRENCY_CODES.map((code) => byCode.get(code)).filter(Boolean) as WorldCurrency[];
  }, []);

  const filteredCurrencies = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_WORLD_CURRENCIES;
    return ALL_WORLD_CURRENCIES.filter((c) => {
      return (
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.countries.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
      );
    });
  }, [query]);

  const handleChoose = (code: string) => {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onSelect(code);
    setQuery('');
    onClose();
  };

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
          className="fixed inset-0 z-[99999] flex items-start justify-center pt-12 px-3 sm:px-4 bg-black/80 backdrop-blur-md overflow-y-auto overscroll-contain"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#0B0B13] border border-amber-500/35 rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden mb-6"
          >
            {/* Header */}
            <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
                  <Globe size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-white truncate">
                    Worldwide Currency Converter
                  </h3>
                  <p className="text-[11px] text-zinc-400 truncate">
                    Tap a currency or search {ALL_WORLD_CURRENCIES.length}+ currencies
                  </p>
                </div>
              </div>

              <button
                type="button"
                {...safeTap(onClose)}
                aria-label="Close currency picker"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer touch-manipulation shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick-Tap Popular Currency Chips at Very Top (No Keyboard Needed) */}
            <div className="px-4 sm:px-5 pt-3 pb-2.5 border-b border-white/10 bg-[#0A0A12] shrink-0">
              <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-2">
                Popular Currencies (Tap to Convert)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {popularCurrencies.map((c) => {
                  const active = selectedCode === c.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      {...safeTap(() => handleChoose(c.code))}
                      className={`min-h-[38px] px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 border transition cursor-pointer touch-manipulation ${
                        active
                          ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.45)]'
                          : 'bg-white/5 text-zinc-100 border-white/15 hover:bg-white/10 active:scale-95'
                      }`}
                    >
                      <span>{c.flag}</span>
                      <span>{c.code}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Search Bar (No autoFocus, readOnly for 350ms on open, 16px text-base prevents iOS zoom) */}
            <div className="px-4 sm:px-5 py-3 border-b border-white/10 bg-[#08080F] shrink-0">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  readOnly={!searchUnlocked}
                  inputMode="search"
                  enterKeyHint="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!searchUnlocked) {
                      setSearchUnlocked(true);
                      window.setTimeout(() => {
                        inputRef.current?.focus();
                      }, 0);
                    }
                  }}
                  placeholder="Search country or currency (e.g., Nigeria, USA, Euro)..."
                  className="w-full min-h-[46px] pl-10 pr-10 py-2.5 rounded-xl bg-black/70 border border-white/20 text-white placeholder-zinc-500 text-base leading-normal focus:outline-none focus:border-amber-400 transition"
                />
                {query && (
                  <button
                    type="button"
                    {...safeTap(() => setQuery(''))}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer touch-manipulation"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Fixed-Height Keyboard-Safe Scrollable Currency List */}
            <div className="max-h-[60vh] overflow-y-auto px-3 sm:px-4 py-2 divide-y divide-white/5 overscroll-contain">
              {filteredCurrencies.length === 0 ? (
                <div className="py-10 text-center text-sm text-zinc-400">
                  No currencies found matching &ldquo;{query}&rdquo;. Try USD, NGN, GBP, EUR, or a country name.
                </div>
              ) : (
                filteredCurrencies.map((c) => {
                  const isSelected = selectedCode === c.code;
                  const converted = formatConvertedPrice(BASE_PASS_AMOUNT_GHS, c.code, liveRates);
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleChoose(c.code)}
                      className={`w-full min-h-[56px] px-3 py-2.5 my-0.5 rounded-2xl flex items-center justify-between gap-3 text-left transition cursor-pointer touch-manipulation ${
                        isSelected
                          ? 'bg-amber-500/15 border border-amber-400/50'
                          : 'hover:bg-white/[0.05] active:bg-white/[0.08] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl leading-none shrink-0">{c.flag}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-white">{c.code}</span>
                            <span className="text-xs font-semibold text-zinc-300 truncate">{c.name}</span>
                          </div>
                          <p className="text-[11px] text-zinc-500 truncate">{c.countries}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="text-right">
                          <div className="text-xs sm:text-sm font-black text-amber-300">
                            {c.code === 'GHS' ? 'GH₵ 50.00' : `≈ ${converted.formattedValue}`}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono">{c.symbol}</div>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-amber-400 text-black flex items-center justify-center shrink-0">
                            <Check size={14} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
