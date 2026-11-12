'use client';

import React, { useState, useMemo, useRef } from 'react';
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
  const [query, setQuery] = useState('');
  const touchHandledRef = useRef(0);

  useModalBackHandler(isOpen, onClose, 'horpalCurrencyPicker');

  const safeTap = (fn: () => void) => ({
    onTouchEnd: (e: React.TouchEvent) => {
      e.stopPropagation();
      touchHandledRef.current = Date.now();
      fn();
    },
    onClick: (e: React.MouseEvent) => {
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
    onSelect(code);
    setQuery('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-[240] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg bg-[#0B0B13] border-t sm:border border-amber-500/35 rounded-t-3xl sm:rounded-3xl shadow-[0_-10px_60px_rgba(0,0,0,0.9)] flex flex-col max-h-[86dvh] overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-300">
                  <Globe size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    Worldwide Currency Converter
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Convert GH₵ 50.00 across {ALL_WORLD_CURRENCIES.length}+ world currencies
                  </p>
                </div>
              </div>

              <button
                type="button"
                {...safeTap(onClose)}
                aria-label="Close currency picker"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer touch-manipulation"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sticky Search Input */}
            <div className="px-4 sm:px-5 py-3 border-b border-white/10 bg-[#08080F] shrink-0">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400" />
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search any country or currency (e.g., Nigeria, USA, UK, Euro, Kenya, India, CFA)..."
                  className="w-full min-h-[46px] pl-10 pr-10 py-2.5 rounded-xl bg-black/70 border border-white/20 text-white placeholder-zinc-500 text-base sm:text-sm focus:outline-none focus:border-amber-400 transition"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Popular Quick Select Chips */}
              {!query.trim() && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {popularCurrencies.map((c) => {
                    const active = selectedCode === c.code;
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => handleChoose(c.code)}
                        className={`min-h-[34px] px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 border transition cursor-pointer touch-manipulation ${
                          active
                            ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                            : 'bg-white/5 text-zinc-200 border-white/15 hover:bg-white/10'
                        }`}
                      >
                        <span>{c.flag}</span>
                        <span>{c.code}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Scrollable Worldwide Currency List */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-2 divide-y divide-white/5 overscroll-contain">
              {filteredCurrencies.length === 0 ? (
                <div className="py-12 text-center text-sm text-zinc-400">
                  No currencies found matching &ldquo;{query}&rdquo;. Try typing USD, NGN, GBP, EUR, or a country name.
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
                          : 'hover:bg-white/[0.05] border border-transparent'
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
}
